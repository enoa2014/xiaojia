import { api, mapError } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: {
    title: '',
    date: '',
    location: '',
    capacity: 0,
    statusList: ['open','ongoing','done','closed'],
    statusIndex: 0,
    submitting: false
  },
  onLoad(){},
  onTitle(e){ this.setData({ title: e.detail.value }) },
  onDate(e){ this.setData({ date: e.detail.value }) },
  onLocation(e){ this.setData({ location: e.detail.value }) },
  onCapacity(e){
    const v = parseInt(e.detail.value || '0', 10)
    this.setData({ capacity: isNaN(v) ? 0 : v })
  },
  onStatusChange(e){ this.setData({ statusIndex: Number(e.detail.value) || 0 }) },
  async submit(){
    const { title, date, location, capacity, statusList, statusIndex } = this.data
    if (!title || title.length < 2 || title.length > 40) return wx.showToast({ icon:'none', title: '标题需 2–40 字' })
    if (!date) return wx.showToast({ icon:'none', title: '请选择日期' })
    if (!location || location.length > 80) return wx.showToast({ icon:'none', title: '地点需 ≤80 字' })
    if (typeof capacity !== 'number' || capacity < 0) return wx.showToast({ icon:'none', title: '容量需 ≥0' })
    const status = statusList[statusIndex]
    try {
      const requestId = `act-${Date.now()}-${Math.floor(Math.random()*1e6)}`
      const startAt = Date.now()
      this.setData({ submitting: true })
      // 提交前埋点
      track('activity_create_submit', { requestId, hasLocation: !!location, capacity, status })
      const clientToken = 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2)
      await api.activities.create({ title, date, location, capacity, status }, clientToken)
      // 成功埋点
      track('activity_create_result', { requestId, duration: Date.now() - startAt, code: 'OK' })
      wx.showToast({ icon: 'success', title: '创建成功' })
      setTimeout(() => {
        wx.navigateBack({})
      }, 300)
    } catch (e) {
      const code = (e && e.code) || 'E_INTERNAL'
      if (e && e.code === 'E_PERM') {
        wx.showToast({ icon:'none', title: '仅管理员/社工可发布' })
      } else {
        wx.showToast({ icon:'none', title: mapError(code) })
      }
      // 失败埋点（含权限错误）
      try { track('activity_create_result', { requestId, duration: Date.now() - startAt, code }) } catch(_){ }
    } finally {
      this.setData({ submitting: false })
    }
  }
})
