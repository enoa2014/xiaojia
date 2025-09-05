
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
    switch (action) {
      case 'list': {
        const qp = ServicesListSchema.parse(payload || {})
        const res = await db.collection('Services')
          .orderBy('date','desc')
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
        const s = ServiceCreateSchema.parse(payload?.service || payload || {})
        const { OPENID } = cloud.getWXContext?.() || ({} as any)
        const doc = { ...s, status: 'review', createdBy: OPENID || null, createdAt: Date.now() }
        const { _id } = await db.collection('Services').add({ data: doc as any })
        return { ok: true, data: { _id } }
      }
      case 'review': {
        const { id, decision, reason } = ServiceReviewSchema.parse(payload || {})
        if (decision === 'rejected' && !reason) return { ok:false, error:{ code:'E_VALIDATE', msg:'审核驳回需填写理由' } }
        const r = await db.collection('Services').doc(id).get()
        const cur = r?.data
        if (!cur) return { ok:false, error:{ code:'E_NOT_FOUND', msg:'service not found' } }
        if (cur.status !== 'review') return { ok:false, error:{ code:'E_CONFLICT', msg:'当前状态不可审核' } }
        await db.collection('Services').doc(id).update({ data: { status: decision, reviewReason: reason || null, reviewedAt: Date.now() } })
        return { ok: true, data: { updated: 1 } }
      }
      default:
        return { ok: false, error: { code: 'E_ACTION', msg: 'unknown action' } }
    }
  } catch (e:any) {
    return { ok: false, error: { code: e.code || 'E_INTERNAL', msg: e.message, details: e.stack } }
  }
}
