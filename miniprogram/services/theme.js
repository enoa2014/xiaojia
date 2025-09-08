// Shared theme helpers to keep pages consistent by role

export const computeTheme = (roleKey) => {
  const map = {
    admin: { headerBg: 'nav-header--purple' },
    social_worker: { headerBg: 'nav-header--blue' },
    volunteer: { headerBg: 'nav-header--orange' },
    parent: { headerBg: 'nav-header--pink' }
  }
  return map[roleKey] || { headerBg: 'nav-header--green' }
}

export const computeNavColor = (roleKey) => {
  const map = {
    admin: '#7C3AED',
    social_worker: '#2563EB',
    volunteer: '#F97316',
    parent: '#EC4899'
  }
  return map[roleKey] || '#16A34A'
}

export const getCurrentRole = () => {
  try {
    const app = getApp && getApp()
    if (app && app.globalData && app.globalData.roleKey) return app.globalData.roleKey
  } catch(_) {}
  try {
    const dbg = wx.getStorageSync('debug_role')
    if (dbg && dbg.key) return dbg.key
  } catch(_) {}
  return 'parent'
}

export const applyThemeByRole = (page) => {
  try {
    const role = getCurrentRole()
    const theme = computeTheme(role)
    page.setData && page.setData({ theme })
    try { wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: computeNavColor(role) }) } catch(_) {}
  } catch(_) {}
}

export default { computeTheme, computeNavColor, getCurrentRole, applyThemeByRole }

