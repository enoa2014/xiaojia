import type cloud from 'wx-server-sdk'

// RBAC helpers shared across functions. Usage pattern:
// const { OPENID } = cloud.getWXContext?.() || ({} as any)
// const ok = await isRole(db, OPENID, 'admin')

export type Role = 'admin' | 'social_worker' | string

export const isRole = async (db: any, openId: string | null | undefined, role: Role): Promise<boolean> => {
  if (!openId) return false
  try {
    const _ = db.command
    // 兼容多种用户记录形态：
    // 1) { openId, role }
    // 2) { _id: openId, role }
    // 3) { openId, roles: [] }
    const byOpenId = await db.collection('Users').where({ openId: openId, role } as any).limit(1).get()
    if (byOpenId?.data?.length) return true

    const byId = await db.collection('Users').where({ _id: openId, role } as any).limit(1).get()
    if (byId?.data?.length) return true

    const byRoles = await db.collection('Users').where({ openId: openId, roles: _.in([role]) } as any).limit(1).get()
    if (byRoles?.data?.length) return true
  } catch {}
  return false
}

export const hasAnyRole = async (db: any, openId: string | null | undefined, roles: Role[]): Promise<boolean> => {
  for (const r of roles) {
    if (await isRole(db, openId, r)) return true
  }
  return false
}

