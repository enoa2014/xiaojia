import { api, mapError } from '../../services/api'

Page({
  data: {
    id: '',
    activity: null,
    myReg: null,
    loading: true,
    error: '',
    userRole: '',
    canManage: false
  },
  onLoad(opts){
    const id = (opts && opts.id) || ''
    this.setData({ id })
    this.checkPermissions()
    this.load()
    try { require('../../services/theme').applyThemeByRole(this) } catch(_) {}
  },
  onShow(){ try { require('../../services/theme').applyThemeByRole(this) } catch(_) {} },
  
  async checkPermissions(){
    try {
      const userInfo = wx.getStorageSync('userInfo') || {}
      const userRole = userInfo.role || ''
      const canManage = ['admin', 'social_worker'].includes(userRole)
      this.setData({ userRole, canManage })
    } catch (e) {
      console.error('Failed to check permissions:', e)
    }
  },
  async load(){
    try {
      this.setData({ loading: true, error: '' })
      const [activity, regs] = await Promise.all([
        api.activities.get(this.data.id),
        api.registrations.list({ activityId: this.data.id, userId: 'me' })
      ])
      this.setData({ activity, myReg: (Array.isArray(regs) && regs[0]) || null })
    } catch (e) {
      this.setData({ error: mapError(e.code) })
    } finally {
      this.setData({ loading: false })
    }
  },
  async doRegister(){
    try {
      await api.registrations.register(this.data.id)
      wx.showToast({ icon:'success', title:'已报名' })
      this.load()
    } catch (e) {
      const msg = e.code === 'E_CONFLICT' ? (e.message || '已报名/候补中') : mapError(e.code)
      wx.showToast({ icon:'none', title: msg })
    }
  },
  async doCancel(){
    try {
      await api.registrations.cancel(this.data.id)
      wx.showToast({ icon:'success', title:'已取消' })
      this.load()
    } catch (e) {
      wx.showToast({ icon:'none', title: mapError(e.code) })
    }
  },
  async doCheckin(){
    try {
      await api.registrations.checkin(this.data.id)
      wx.showToast({ icon:'success', title:'签到成功' })
      this.load()
    } catch (e) {
      wx.showToast({ icon:'none', title: mapError(e.code) })
    }
  },
  
  goToManagement(){
    wx.navigateTo({
      url: `/pages/activities/manage?id=${this.data.id}`
    })
  },
  
  goToRegistrations(){
    wx.navigateTo({
      url: `/pages/activities/registrations?id=${this.data.id}`
    })
  }
})
