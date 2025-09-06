
import cloud from 'wx-server-sdk'
import { err } from '../packages/core-utils/errors'
import { hasAnyRole } from '../packages/core-rbac'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

export const main = async (event:any) => {
  const evt = event || {}
  const action = evt.action
  const { OPENID } = cloud.getWXContext?.() || ({} as any)
  const allowed = await hasAnyRole(db, OPENID, ['admin','social_worker'])
  if (!allowed) return err('E_PERM','需要权限')
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
