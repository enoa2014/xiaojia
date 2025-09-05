
import cloud from 'wx-server-sdk'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

export const main = async (event:any) => {
  const evt = event || {}
  const action = evt.action
  if (action === 'counts') {
    const cols: string[] = evt.collections || ['Patients','Tenancies','Activities','Registrations']
    const out: Record<string, number|null> = {}
    for (const name of cols) {
      try {
        const r = await db.collection(name as any).count()
        // @ts-ignore
        out[name] = (r && (r.total ?? r.count)) ?? 0
      } catch (e) {
        out[name] = null
      }
    }
    return { ok: true, data: out }
  }
  return ({ ok: true, data: { ping: 'stats' } })
}
