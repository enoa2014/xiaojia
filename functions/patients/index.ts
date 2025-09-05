
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { PatientsListSchema, PatientCreateSchema } from './schema'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }
export const main = async (event: any): Promise<Resp<any>> => {
  try {
    const { action, payload } = event || {}
    switch (action) {
      case 'list': {
        const qp = PatientsListSchema.parse(payload || {})
        const res = await db.collection('Patients').orderBy('createdAt','desc').skip((qp.page-1)*qp.pageSize).limit(qp.pageSize).get()
        return { ok: true, data: res.data }
      }
      case 'get': {
        const { id } = z.object({ id: z.string() }).parse(payload || {})
        const r = await db.collection('Patients').doc(id).get()
        if (!r?.data) return { ok:false, error:{ code:'E_NOT_FOUND', msg:'patient not found' } }
        return { ok:true, data: r.data }
      }
      case 'create': {
        const { patient, clientToken } = (payload || {}) as any
        const p = PatientCreateSchema.parse(patient || {})
        // uniqueness check by id_card
        if (p.id_card) {
          const existed = await db.collection('Patients').where({ id_card: p.id_card }).limit(1).get()
          if (existed.data && existed.data.length) {
            return { ok:false, error:{ code:'E_CONFLICT', msg:'身份证已存在，请搜索后编辑' } }
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
        return { ok:true, data: { _id: addRes._id } }
      }
      default:
        return { ok: false, error: { code: 'E_ACTION', msg: 'unknown action' } }
    }
  } catch (e:any) {
    return { ok: false, error: { code: e.code || 'E_INTERNAL', msg: e.message, details: e.stack } }
  }
}
