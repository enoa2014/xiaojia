
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { ServicesListSchema, ServiceCreateSchema, ServiceReviewSchema } from './schema'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }

const IdSchema = z.object({ id: z.string() })

export const main = async (event:any): Promise<Resp<any>> => {
  try {
    const { action, payload } = event || {}
    const { OPENID } = cloud.getWXContext?.() || ({} as any)

    // RBAC helpers
    const isRole = async (role: 'admin'|'social_worker'): Promise<boolean> => {
      try {
        if (!OPENID) return false
        const _ = db.command
        // common shapes
        if (role === 'admin') {
          const byOpenId = await db.collection('Users').where({ openId: OPENID, role: 'admin' } as any).limit(1).get()
          if (byOpenId.data?.length) return true
          const byId = await db.collection('Users').where({ _id: OPENID, role: 'admin' } as any).limit(1).get()
          if (byId.data?.length) return true
          const byRoles = await db.collection('Users').where({ openId: OPENID, roles: _.in(['admin']) } as any).limit(1).get()
          if (byRoles.data?.length) return true
          return false
        }
        if (role === 'social_worker') {
          const byOpenId = await db.collection('Users').where({ openId: OPENID, role: 'social_worker' } as any).limit(1).get()
          if (byOpenId.data?.length) return true
          const byRoles = await db.collection('Users').where({ openId: OPENID, roles: _.in(['social_worker']) } as any).limit(1).get()
          if (byRoles.data?.length) return true
          return false
        }
      } catch {}
      return false
    }
    const canReview = async (): Promise<boolean> => (await isRole('admin')) || (await isRole('social_worker'))
    switch (action) {
      case 'list': {
        const qp = ServicesListSchema.parse(payload || {})
        const { OPENID } = cloud.getWXContext?.() || ({} as any)
        let query: any = {}
        if (qp.filter) {
          const f = qp.filter as any
          if (f.patientId) query.patientId = f.patientId
          if (f.createdBy) query.createdBy = (f.createdBy === 'me' && OPENID) ? OPENID : f.createdBy
          if (f.type) query.type = f.type
          if (f.status) query.status = f.status
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
        return { ok: true, data: res.data }
      }
      case 'get': {
        const { id } = IdSchema.parse(payload || {})
        const r = await db.collection('Services').doc(id).get()
        if (!r?.data) return { ok: false, error: { code: 'E_NOT_FOUND', msg: 'service not found' } }
        return { ok: true, data: r.data }
      }
      case 'create': {
        const parsed = ServiceCreateSchema.safeParse(payload?.service || payload || {})
        if (!parsed.success) {
          const issues = parsed.error.issues || []
          const first = issues[0]
          const path = (first && first.path && first.path.join('.')) || ''
          let msg = '填写有误'
          if (path.includes('patientId')) msg = '请先选择患者'
          else if (path.includes('type')) msg = '请选择服务类型'
          else if (path.includes('date')) msg = '请选择日期'
          else if (path.includes('images')) msg = '图片数量或格式不合法'
          return { ok:false, error:{ code:'E_VALIDATE', msg, details: issues } }
        }
        const s = parsed.data
        const clientToken = (payload && (payload as any).clientToken) || null
        const { OPENID } = cloud.getWXContext?.() || ({} as any)
        // 幂等：若传入 clientToken，先查是否已存在
        if (clientToken) {
          const existed = await db.collection('Services').where({ clientToken }).limit(1).get()
          if (existed.data && existed.data.length) {
            return { ok: true, data: { _id: existed.data[0]._id } }
          }
        }
        const doc = { ...s, status: 'review', createdBy: OPENID || null, createdAt: Date.now(), ...(clientToken ? { clientToken } : {}) }
        const { _id } = await db.collection('Services').add({ data: doc as any })
        return { ok: true, data: { _id } }
      }
      case 'review': {
        const { id, decision, reason } = ServiceReviewSchema.parse(payload || {})
        // RBAC: only admin or social_worker can review
        if (!(await canReview())) return { ok:false, error:{ code:'E_PERM', msg:'需要审核权限' } }
        if (decision === 'rejected' && !reason) return { ok:false, error:{ code:'E_VALIDATE', msg:'审核驳回需填写理由' } }
        const r = await db.collection('Services').doc(id).get()
        const cur = r?.data
        if (!cur) return { ok:false, error:{ code:'E_NOT_FOUND', msg:'service not found' } }
        if (cur.status !== 'review') return { ok:false, error:{ code:'E_CONFLICT', msg:'当前状态不可审核' } }
        await db.collection('Services').doc(id).update({ data: { status: decision, reviewReason: reason || null, reviewedAt: Date.now() } })
        // audit
        try {
          await db.collection('AuditLogs').add({ data: { actorId: OPENID || null, action: 'services.review', target: { id, decision }, createdAt: Date.now() } })
        } catch {}
        return { ok: true, data: { updated: 1 } }
      }
      default:
        return { ok: false, error: { code: 'E_ACTION', msg: 'unknown action' } }
    }
  } catch (e:any) {
    return { ok: false, error: { code: e.code || 'E_INTERNAL', msg: e.message, details: e.stack } }
  }
}
