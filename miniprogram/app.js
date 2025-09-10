
const { api } = require('./services/api')

App({
  globalData: {
    roleKey: ''
  },
  async onLaunch() {
    wx.cloud.init({ env: 'cloud1-3grb87gwaba26b64' })
    console.log('Cloud inited to cloud1-3grb87gwaba26b64')
    // 预取并缓存用户角色，供全局脱敏/主题使用
    try {
      let role = ''
      try { role = (wx.getStorageSync('user_role') || '').trim() } catch(_) {}
      if (!role) {
        const profile = await api.users.getProfile()
        role = (profile && profile.role) || ''
        try { wx.setStorageSync('user_role', role) } catch(_) {}
      }
      this.globalData.roleKey = role || this.globalData.roleKey || ''
    } catch (e) {
      console.warn('prefetch role failed:', e)
    }
  }
})
