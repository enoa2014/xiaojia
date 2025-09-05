
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { TenanciesListSchema, TenancyCreateSchema, TenancyUpdateSchema } from './schema'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }

const IdSchema = z.object({ id: z.string() })

export const main = async (event:any): Promise<Resp<any>> => {
  try {
    const { action, payload } = event || {}
    switch (action) {
      case 'list': {
        const qp = TenanciesListSchema.parse(payload || {})
        const res = await db.collection('Tenancies')
          .orderBy('checkInDate','desc')
          .skip((qp.page-1)*qp.pageSize)
          .limit(qp.pageSize)
          .get()
        return { ok: true, data: res.data }
      }
      case 'get': {
        const { id } = IdSchema.parse(payload || {})
        const r = await db.collection('Tenancies').doc(id).get()
        if (!r?.data) return { ok: false, error: { code: 'E_NOT_FOUND', msg: 'tenancy not found' } }
        return { ok: true, data: r.data }
      }
      case 'create': {
        const t = TenancyCreateSchema.parse(payload?.tenancy || payload || {})
        if (!t.patientId && !t.id_card) return { ok:false, error:{ code:'E_VALIDATE', msg:'patientId 或 id_card 必填' } }
        if (t.checkOutDate && t.checkOutDate < t.checkInDate) return { ok:false, error:{ code:'E_VALIDATE', msg:'退住日期不能早于入住日期' } }
        const doc = { ...t, createdAt: Date.now() }
        const { _id } = await db.collection('Tenancies').add({ data: doc as any })
        return { ok: true, data: { _id } }
      }
      case 'update': {
        const { id, patch } = TenancyUpdateSchema.parse(payload || {})
        if (patch.checkInDate && patch.checkOutDate && patch.checkOutDate < patch.checkInDate) {
          return { ok:false, error:{ code:'E_VALIDATE', msg:'退住日期不能早于入住日期' } }
        }
        await db.collection('Tenancies').doc(id).update({ data: patch as any })
        return { ok: true, data: { updated: 1 } }
      }
      default:
        return { ok: false, error: { code: 'E_ACTION', msg: 'unknown action' } }
    }
  } catch (e:any) {
    return { ok: false, error: { code: e.code || 'E_INTERNAL', msg: e.message, details: e.stack } }
  }
}
