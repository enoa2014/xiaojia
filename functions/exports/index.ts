
import cloud from 'wx-server-sdk'
import { err, ok } from '../packages/core-utils/errors'
import { hasAnyRole } from '../packages/core-rbac'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
export const main = async (event:any) => {
  const { OPENID } = cloud.getWXContext?.() || ({} as any)
  const allowed = await hasAnyRole(cloud.database(), OPENID, ['admin','social_worker'])
  if (!allowed) return err('E_PERM','需要权限')
  return ok({ ping: 'exports', event })
}
