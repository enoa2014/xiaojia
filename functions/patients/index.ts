
import cloud from 'wx-server-sdk'
import { z } from 'zod'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }
const ListSchema = z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(10) })
export const main = async (event: any): Promise<Resp<any>> => {
  try {
    const { action, payload } = event || {}
    switch (action) {
      case 'list': {
        const qp = ListSchema.parse(payload || {})
        const res = await db.collection('Patients').orderBy('createdAt','desc').skip((qp.page-1)*qp.pageSize).limit(qp.pageSize).get()
        return { ok: true, data: res.data }
      }
      default:
        return { ok: false, error: { code: 'E_ACTION', msg: 'unknown action' } }
    }
  } catch (e:any) {
    return { ok: false, error: { code: e.code || 'E_INTERNAL', msg: e.message, details: e.stack } }
  }
}
