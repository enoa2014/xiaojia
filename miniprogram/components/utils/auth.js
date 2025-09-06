export const getUserRoles = () => {
  try {
    const roles = wx.getStorageSync('user_roles')
    if (Array.isArray(roles)) return roles
  } catch(_) {}
  try {
    const dbg = wx.getStorageSync('debug_role')
    if (dbg && dbg.key) return [dbg.key]
  } catch(_) {}
  return []
}

export const setUserRoles = (roles = []) => {
  try { wx.setStorageSync('user_roles', Array.isArray(roles) ? roles : []) } catch(_) {}
}

export const hasRole = (role, roles = null) => {
  const list = Array.isArray(roles) ? roles : getUserRoles()
  return list.includes(role)
}

export const hasAnyRole = (allow = [], roles = null) => {
  const list = Array.isArray(roles) ? roles : getUserRoles()
  if (!allow || allow.length === 0) return true
  return allow.some(r => list.includes(r))
}

export const ensurePerm = (allow = [], roles = null) => {
  const ok = hasAnyRole(allow, roles)
  if (!ok) wx.showToast({ icon: 'none', title: '无权限操作' })
  return ok
}

