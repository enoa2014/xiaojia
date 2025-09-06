import { api, mapError } from '../../services/api'

Page({
  data: {
    id: '',
    loading: true,
    patient: null
  },
  async onLoad(opts){
    const id = opts && opts.id
    if (!id) { wx.showToast({ icon:'none', title:'缺少参数' }); return }
    this.setData({ id })
    await this.load()
  },
  async load(){
    this.setData({ loading: true })
    try {
      const p = await api.patients.get(this.data.id)
      // 计算剩余天数（如有）
      let daysLeft = null
      if (p && p.permission && p.permission.expiresAt) {
        const diff = p.permission.expiresAt - Date.now()
        if (diff > 0) daysLeft = Math.ceil(diff / (24*60*60*1000))
      }
      this.setData({ patient: p, daysLeft })
    } catch (e) {
      wx.showToast({ icon:'none', title: mapError(e.code || 'E_INTERNAL') })
    } finally {
      this.setData({ loading: false })
    }
  },
  applyPermission(){
    const id = this.data.id
    wx.navigateTo({ url: `/pages/permissions/apply?pid=${id}` })
  },
  maskId(id){
    if (!id || id.length < 8) return '****'
    return id.slice(0,6) + '********' + id.slice(-4)
  }
})
