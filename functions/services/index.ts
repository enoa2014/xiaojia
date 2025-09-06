
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { hasAnyRole } from '../packages/core-rbac'
import { mapZodIssues } from '../packages/core-utils/validation'
import { ok, err, errValidate } from '../packages/core-utils/errors'
import { ServicesListSchema, ServiceCreateSchema, ServiceReviewSchema } from './schema'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }

const IdSchema = z.object({ id: z.string() })

export const main = async (event:any): Promise<Resp<any>> => {
  try {
    const { action, payload } = event || {}
    const { OPENID } = cloud.getWXContext?.() || ({} as any)

    const canReview = async (): Promise<boolean> => hasAnyRole(db, OPENID, ['admin','social_worker'])
    switch (action) {
      case 'list': {
        const qp = ServicesListSchema.parse(payload || {})
        const { OPENID } = cloud.getWXContext?.() || ({} as any)
        const isManager = await hasAnyRole(db, OPENID, ['admin','social_worker'])
        let query: any = {}
        if (qp.filter) {
          const f = qp.filter as any
          if (f.patientId) query.patientId = f.patientId
          if (f.createdBy) {
            // 非管理员不可越权查询他人，强制限定为本人
            const val = (f.createdBy === 'me' && OPENID) ? OPENID : f.createdBy
            query.createdBy = isManager ? val : (OPENID || null)
          }
          if (f.type) query.type = f.type
          if (f.status) query.status = f.status
        }
        // 对志愿者等非管理角色，默认仅能查看本人记录
        if (!isManager) {
          query.createdBy = OPENID || null
        }
        let coll = db.collection('Services').where(query)
        if (qp.sort && Object.keys(qp.sort).length) {
          const [k, v] = Object.entries(qp.sort)[0]
          // @ts-ignore
          coll = (coll as any).orderBy(k, v === -1 ? 'desc' : 'asc')
        } else {
          // 默认按 date desc
          // @ts-ignore
          coll = (coll as any).orderBy('date','desc')
        }
        const res = await (coll as any)
          .skip((qp.page-1)*qp.pageSize)
          .limit(qp.pageSize)
          .get()
        return ok(res.data)
      }
      case 'get': {
        const { id } = IdSchema.parse(payload || {})
        const r = await db.collection('Services').doc(id).get()
        if (!r?.data) return err('E_NOT_FOUND', 'service not found')
        return ok(r.data)
      }
      case 'create': {
        const parsed = ServiceCreateSchema.safeParse(payload?.service || payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return errValidate(m.msg, parsed.error.issues)
        }
        const s = parsed.data
        const clientToken = (payload && (payload as any).clientToken) || null
        const { OPENID } = cloud.getWXContext?.() || ({} as any)
        // 幂等：若传入 clientToken，先查是否已存在
        if (clientToken) {
          const existed = await db.collection('Services').where({ clientToken }).limit(1).get()
          if (existed.data && existed.data.length) {
            return ok({ _id: existed.data[0]._id })
          }
        }
        const doc = { ...s, status: 'review', createdBy: OPENID || null, createdAt: Date.now(), ...(clientToken ? { clientToken } : {}) }
        const { _id } = await db.collection('Services').add({ data: doc as any })
        return ok({ _id })
      }
      case 'review': {
        const { id, decision, reason } = ServiceReviewSchema.parse(payload || {})
        // RBAC: only admin or social_worker can review
        if (!(await canReview())) return err('E_PERM','需要审核权限')
        if (decision === 'rejected' && !reason) return errValidate('审核驳回需填写理由')
        const r = await db.collection('Services').doc(id).get()
        const cur = r?.data
        if (!cur) return err('E_NOT_FOUND','service not found')
        if (cur.status !== 'review') return err('E_CONFLICT','当前状态不可审核')
        await db.collection('Services').doc(id).update({ data: { status: decision, reviewReason: reason || null, reviewedAt: Date.now() } })
        // audit
        try {
          await db.collection('AuditLogs').add({ data: { actorId: OPENID || null, action: 'services.review', target: { id, decision }, createdAt: Date.now() } })
        } catch {}
        return ok({ updated: 1 })
      }
      default:
        return err('E_ACTION','unknown action')
    }
  } catch (e:any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
