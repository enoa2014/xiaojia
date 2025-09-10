
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { PatientsListSchema, PatientCreateSchema } from './schema'
import { ok, err, errValidate } from '../packages/core-utils/errors'
import { mapZodIssues } from '../packages/core-utils/validation'
import { hasAnyRole } from '../packages/core-rbac'
import { paginate } from '../packages/core-db'
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
    const { OPENID } = cloud.getWXContext?.() || ({} as any)
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
        const base = db.collection('Patients').where(query)
        const { items, meta } = await paginate(base, { page: qp.page, pageSize: qp.pageSize, sort: qp.sort }, { fallbackSort: { createdAt: -1 }, countQuery: db.collection('Patients').where(query) })
        // 角色：管理员/社工享受列表明文显示（合规前提下）
        const isPrivileged = await hasAnyRole(db, OPENID, ['admin','social_worker'])
        const listItems = (items || []) as any[]
        const ids = listItems.map((i: any) => String(i._id)).filter(Boolean)
        const statsMap: Record<string, { count: number; last: string | null }> = {}
        const toDateKey = (v: any): number => {
          if (!v) return 0
          try {
            if (typeof v === 'number') return v
            if (typeof v === 'string') {
              const d = new Date(v)
              return isNaN(d.getTime()) ? 0 : d.getTime()
            }
            const d = new Date(v)
            return isNaN(d.getTime()) ? 0 : d.getTime()
          } catch { return 0 }
        }
        const toDateStr = (v: any): string | null => {
          const t = typeof v === 'number' ? v : toDateKey(v)
          if (!t) return null
          const d = new Date(t)
          const y = d.getFullYear()
          const m = String(d.getMonth()+1).padStart(2,'0')
          const dd = String(d.getDate()).padStart(2,'0')
          return `${y}-${m}-${dd}`
        }
        if (ids.length) {
          try {
            const tSnap: any = await db
              .collection('Tenancies')
              .where({ patientId: _.in(ids) })
              .field({ patientId: true, checkInDate: true })
              .limit(1000)
              .get()
            for (const t of ((tSnap && tSnap.data) || []) as any[]) {
              const pid = String(t.patientId || '')
              const inDateKey = toDateKey(t.checkInDate)
              if (!pid || !inDateKey) continue
              const cur = statsMap[pid] || { count: 0, last: null as string | null }
              cur.count += 1
              const curKey = cur.last ? toDateKey(cur.last) : 0
              if (!cur.last || inDateKey > curKey) cur.last = toDateStr(inDateKey)
              statsMap[pid] = cur
            }
          } catch (e) {}
        }
        // Fallback: 某些 Tenancies 可能尚未写入 patientId（仅有 id_card），
        // 对仍无统计的患者按 id_card 聚合一次，避免显示“—”
        const missingPids = listItems
          .map((p: any) => String(p._id))
          .filter(pid => !statsMap[pid])
        if (missingPids.length) {
          const idCardToPid: Record<string, string> = {}
          const idCards: string[] = []
          for (const p of listItems as any[]) {
            const pid = String(p._id)
            if (!statsMap[pid] && p.id_card) {
              const idc = String(p.id_card).trim()
              if (idc) {
                idCards.push(idc)
                idCardToPid[idc] = pid
              }
            }
          }
          if (idCards.length) {
            try {
              const tSnap2: any = await db
                .collection('Tenancies')
                .where({ id_card: _.in(idCards) })
                .field({ id_card: true, checkInDate: true })
                .limit(1000)
                .get()
              for (const t of ((tSnap2 && tSnap2.data) || []) as any[]) {
                const idc = t.id_card ? String(t.id_card) : ''
                const pid = idCardToPid[idc]
                const inDateKey = toDateKey(t.checkInDate)
                if (!pid || !inDateKey) continue
                const cur = statsMap[pid] || { count: 0, last: null as string | null }
                cur.count += 1
                const curKey = cur.last ? toDateKey(cur.last) : 0
                if (!cur.last || inDateKey > curKey) cur.last = toDateStr(inDateKey)
                statsMap[pid] = cur
              }
            } catch (e) {}
          }
        }
        // Fallback by name: 对仍无统计且无 id_card 的患者，按姓名精确匹配 Tenancies.patientName
        {
          const missingByName = listItems.filter((p:any)=>{
            const pid = String(p._id)
            return !statsMap[pid] && !p.id_card && p.name
          })
          if (missingByName.length) {
            try {
              const names = missingByName.map((p:any)=>String(p.name)).filter(Boolean)
              if (names.length) {
                const nameToPids: Record<string, string[]> = {}
                for (const p of missingByName) {
                  const n = String(p.name)
                  const pid = String(p._id)
                  nameToPids[n] = (nameToPids[n] || []).concat(pid)
                }
                const tSnap3: any = await db
                  .collection('Tenancies')
                  .where({ patientName: _.in(names) })
                  .field({ patientName: true, checkInDate: true })
                  .limit(1000)
                  .get()
                for (const t of ((tSnap3 && tSnap3.data) || []) as any[]) {
                  const n = t.patientName ? String(t.patientName) : ''
                  const inDateKey = toDateKey(t.checkInDate)
                  const pids = nameToPids[n] || []
                  if (!n || !inDateKey || !pids.length) continue
                  for (const pid of pids) {
                    const cur = statsMap[pid] || { count: 0, last: null as string | null }
                    cur.count += 1
                    const curKey = cur.last ? toDateKey(cur.last) : 0
                    if (!cur.last || inDateKey > curKey) cur.last = toDateStr(inDateKey)
                    statsMap[pid] = cur
                  }
                }
              }
            } catch (e) {}
          }
        }
        const outItems = listItems.map((p: any) => {
          const st = statsMap[String(p._id)] || null
          const diag = p.hospitalDiagnosis || p.diagnosis || null
          const level = p.diagnosisLevel || p.diagnosis_enum || null
          const maskedDiag = diag ? (level ? `诊断级别：${level}` : '诊断信息已脱敏') : null
          return {
            ...p,
            hospitalDiagnosis: isPrivileged ? (diag ?? null) : (maskedDiag ?? p.hospitalDiagnosis ?? null),
            lastCheckInDate: st ? st.last : null,
            admissionCount: st ? st.count : 0,
          }
        })
        return ok({ items: outItems, meta })
      }
      case 'get': {
        const parsed = z.object({ id: z.string(), requestId: z.string().optional() }).safeParse(payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return errValidate(m.msg, parsed.error.issues)
        }
        const { id, requestId } = parsed.data
        const r = await db.collection('Patients').doc(id).get()
        if (!r?.data) return err('E_NOT_FOUND','patient not found')

        const patient = r.data as any
        const { OPENID } = cloud.getWXContext?.() || ({} as any)
        const now = Date.now()

        // 角色：管理员/社工直接视为批准敏感字段（并审计）
        const isPrivileged = await hasAnyRole(db, OPENID, ['admin','social_worker'])
        // 查找有效期内的审批记录
        let approvedFields = new Set<string>()
        let minExpires: number | null = null
        if (isPrivileged) {
          approvedFields = new Set(['id_card','phone','diagnosis'])
        } else if (OPENID) {
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

        // 附加 permission 信息（供前端 UI/脱敏控制）
        out.permission = {
          status: isPrivileged ? 'approved' : (approvedFields.size ? 'approved' : 'none'),
          fields: Array.from(approvedFields),
          expiresAt: minExpires,
          hasSensitive: approvedFields.size > 0,
          hasNamePermission: isPrivileged,
          hasContactPermission: isPrivileged,
          hasAddressPermission: isPrivileged,
          hasIdPermission: approvedFields.has('id_card') || isPrivileged
        }

        // 审计：如果返回了任一明文字段（字段规范：createdAt）
        if (OPENID && returnedFields.length) {
          try {
            await db.collection('AuditLogs').add({ data: {
              actorId: OPENID,
              action: 'patients.readSensitive',
              target: { patientId: id, fields: returnedFields },
              requestId: requestId || null,
              createdAt: now
            }})
          } catch {}
        }

        return ok(out)
      }
      case 'create': {
        // RBAC: 仅 admin|social_worker 可创建
        const canCreate = await hasAnyRole(db, OPENID, ['admin','social_worker'])
        if (!canCreate) return err('E_PERM','需要权限')
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
      case 'update': {
        const canEdit = await hasAnyRole(db, OPENID, ['admin','social_worker'])
        if (!canEdit) return err('E_PERM','需要权限')
        const parsed = PatientUpdateSchema.safeParse(payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return errValidate(m.msg, parsed.error.issues)
        }
        const { id, patch } = parsed.data as any
        const curRes = await db.collection('Patients').doc(String(id)).get()
        const cur = (curRes && (curRes as any).data) as any
        if (!cur) return err('E_NOT_FOUND','patient not found')
        if (patch.id_card) {
          if (!isValidChineseId(patch.id_card)) return errValidate('身份证格式或校验位错误')
          const existed = await db.collection('Patients').where({ id_card: patch.id_card }).limit(1).get()
          const existedDoc = existed?.data?.[0]
          if (existedDoc && String(existedDoc._id) != String(id)) return err('E_CONFLICT','身份证已存在，请检查')
        }
        if (patch.birthDate && !notAfterToday(patch.birthDate)) return errValidate('出生日期需早于或等于今日')
        const tail = (() => {
          const s = (patch.id_card || cur.id_card || '').replace(/\s/g,'')
          return s.length >= 4 ? s.slice(-4) : (cur.id_card_tail || null)
        })()
        const toSet: any = { ...patch }
        toSet.id_card_tail = tail
        const upd = await db.collection('Patients').doc(String(id)).update({ data: toSet })
        const updated = (upd && ((upd as any).updated || ((upd as any).stats && (upd as any).stats.updated))) || 0
        return updated ? ok({ updated }) : err('E_CONFLICT','未发生变更')
      }
      case 'admin.deleteByName': {
        const canAdmin = await hasAnyRole(db, OPENID, ['admin'])
        if (!canAdmin) return err('E_PERM','需要权限')
        const parsed = z.object({ name: z.string().min(1), dryRun: z.boolean().optional() }).safeParse(payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return errValidate(m.msg, parsed.error.issues)
        }
        const { name, dryRun } = parsed.data as any
        const ps = await db.collection('Patients').where({ name }).get()
        const patients = (ps && (ps as any).data) || []
        let delPatients=0, delTenancies=0, delServices=0
        for (const p of patients) {
          const pid = String(p._id)
          if (!dryRun) {
            try { const r1:any = await db.collection('Tenancies').where({ patientId: pid }).remove(); delTenancies += (r1?.deleted||r1?.stats?.removed||0) } catch {}
            try { if (p.id_card) { const r1b:any = await db.collection('Tenancies').where({ id_card: String(p.id_card) }).remove(); delTenancies += (r1b?.deleted||r1b?.stats?.removed||0) } } catch {}
            try { const r2:any = await db.collection('Services').where({ patientId: pid }).remove(); delServices += (r2?.deleted||r2?.stats?.removed||0) } catch {}
            try { const r0:any = await db.collection('Patients').doc(pid).remove(); delPatients += (r0?.deleted||r0?.stats?.removed||0) } catch {}
          }
        }
        return ok({ matched: patients.length, delPatients, delTenancies, delServices, dryRun: !!dryRun })
      }

      default:
        return err('E_ACTION','unknown action')
    }
  } catch (e:any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
