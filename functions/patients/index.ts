
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { PatientsListSchema, PatientCreateSchema } from './schema'
import { ok, err, errValidate } from '../packages/core-utils/errors'
import { mapZodIssues } from '../packages/core-utils/validation'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }

// ========= Helpers =========
function isValidChineseId(id: string): boolean {
  const s = (id || '').toUpperCase().trim()
  if (!/^\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/.test(s)) return false
  const Wi = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2]
  const Val = ['1','0','X','9','8','7','6','5','4','3','2']
  let sum = 0
  for (let i = 0; i < 17; i++) sum += parseInt(s[i], 10) * Wi[i]
  const code = Val[sum % 11]
  return s[17] === code
}

function notAfterToday(iso?: string|null): boolean {
  if (!iso) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
  const today = new Date()
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return d.getTime() <= t
}
export const main = async (event: any): Promise<Resp<any>> => {
  try {
    const { action, payload } = event || {}
    switch (action) {
      case 'list': {
        const parsedList = PatientsListSchema.safeParse(payload || {})
        if (!parsedList.success) {
          const m = mapZodIssues(parsedList.error.issues)
          return errValidate(m.msg, parsedList.error.issues)
        }
        const qp = parsedList.data
        let query: any = {}
        if (qp.filter) {
          const f = qp.filter as any
          if (f.name) {
            // 前缀匹配（不区分大小写）
            query.name = db.RegExp({ regexp: `^${f.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`, options: 'i' })
          }
          if (f.id_card_tail) {
            query.id_card_tail = String(f.id_card_tail)
          }
          if (f.createdFrom || f.createdTo) {
            const range: any = {}
            if (f.createdFrom) range[_.gte] = f.createdFrom
            if (f.createdTo) range[_.lte] = f.createdTo
            query.createdAt = range
          }
        }
        let coll = db.collection('Patients').where(query)
        // sort 默认 createdAt desc
        if (qp.sort && Object.keys(qp.sort).length) {
          // 仅支持单字段排序（小程序端云数据库限制），取第一个
          const [k, v] = Object.entries(qp.sort)[0]
          coll = (coll as any).orderBy(k, v === -1 ? 'desc' : 'asc')
        } else {
          coll = (coll as any).orderBy('createdAt','desc')
        }
        // total for meta
        let total = 0
        try { const c = await db.collection('Patients').where(query).count() as any; total = (c.total ?? c.count) || 0 } catch {}
        const res = await (coll as any)
          .skip((qp.page-1)*qp.pageSize)
          .limit(qp.pageSize)
          .get()
        const items = res.data
        const hasMore = (qp.page * qp.pageSize) < total
        return ok({ items, meta: { total, hasMore } })
      }
      case 'get': {
        const parsed = z.object({ id: z.string() }).safeParse(payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return errValidate(m.msg, parsed.error.issues)
        }
        const { id } = parsed.data
        const r = await db.collection('Patients').doc(id).get()
        if (!r?.data) return err('E_NOT_FOUND','patient not found')

        const patient = r.data as any
        const { OPENID } = cloud.getWXContext?.() || ({} as any)
        const now = Date.now()

        // 查找有效期内的审批记录
        let approvedFields = new Set<string>()
        let minExpires: number | null = null
        if (OPENID) {
          try {
            const _ = db.command
            const apr = await db.collection('PermissionRequests')
              .where({ requesterId: OPENID, patientId: id, status: 'approved', expiresAt: _.gt(now) })
              .get()
            for (const pr of (apr.data || [])) {
              const fields: string[] = Array.isArray(pr.fields) ? pr.fields : []
              fields.forEach(f => approvedFields.add(f))
              const exp = pr.expiresAt as number
              if (typeof exp === 'number') minExpires = minExpires == null ? exp : Math.min(minExpires, exp)
            }
          } catch {}
        }

        // 脱敏工具
        const maskId = (s?: string|null): string|null => {
          const tail = patient.id_card_tail || (s ? (s.replace(/\s/g,'').slice(-4) || null) : null)
          return tail ? ('************' + String(tail)) : null
        }
        const maskPhone = (p?: string|null): string|null => {
          if (!p) return null
          const s = String(p)
          return s.length >= 4 ? ('***' + s.slice(-4)) : '***'
        }

        // 构造返回副本，按审批窗口决定是否明文
        const out: any = { ...patient }
        const returnedFields: string[] = []
        // id_card
        if (patient.id_card) {
          if (approvedFields.has('id_card')) {
            out.id_card = patient.id_card
            returnedFields.push('id_card')
          } else {
            out.id_card = maskId(patient.id_card)
          }
        }
        // phone
        if (patient.phone) {
          if (approvedFields.has('phone')) {
            out.phone = patient.phone
            returnedFields.push('phone')
          } else {
            out.phone = maskPhone(patient.phone)
          }
        }

        // diagnosis / hospitalDiagnosis（按矩阵：默认脱敏；批准窗口内返回明文）
        const diag = (patient as any).hospitalDiagnosis || (patient as any).diagnosis || null
        if (diag) {
          if (approvedFields.has('diagnosis')) {
            out.hospitalDiagnosis = diag
            returnedFields.push('diagnosis')
          } else {
            const level = (patient as any).diagnosisLevel || (patient as any).diagnosis_enum || null
            out.hospitalDiagnosis = level ? `诊断级别：${level}` : '诊断信息已脱敏'
          }
        }

        // 附加 permission 信息
        out.permission = {
          fields: Array.from(approvedFields),
          expiresAt: minExpires,
          hasSensitive: approvedFields.size > 0
        }

        // 审计：如果返回了任一明文字段
        if (OPENID && returnedFields.length) {
          try {
            await db.collection('AuditLogs').add({ data: {
              actorId: OPENID,
              action: 'patients.readSensitive',
              target: { patientId: id, fields: returnedFields },
              timestamp: now
            }})
          } catch {}
        }

        return ok(out)
      }
      case 'create': {
        const { patient, clientToken } = (payload || {}) as any
        const parsed = PatientCreateSchema.safeParse(patient || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return errValidate(m.msg, parsed.error.issues)
        }
        const p = parsed.data
        // 身份证严格校验（含校验位）
        if (!isValidChineseId(p.id_card)) {
          return errValidate('身份证格式或校验位错误')
        }
        // 出生日期不得晚于今日
        if (p.birthDate && !notAfterToday(p.birthDate)) {
          return errValidate('出生日期需早于或等于今日')
        }
        // uniqueness check by id_card
        if (p.id_card) {
          const existed = await db.collection('Patients').where({ id_card: p.id_card }).limit(1).get()
          if (existed.data && existed.data.length) {
            return err('E_CONFLICT','身份证已存在，请搜索后编辑')
          }
        }
        const tail = (() => {
          const s = (p.id_card || '').replace(/\s/g,'')
          return s.length >= 4 ? s.slice(-4) : null
        })()
        const doc: any = {
          ...p,
          id_card_tail: tail,
          createdAt: Date.now()
        }
        const addRes = await db.collection('Patients').add({ data: doc })
        return ok({ _id: addRes._id })
      }
      default:
        return err('E_ACTION','unknown action')
    }
  } catch (e:any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
