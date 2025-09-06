import { api, mapError } from '../../services/api'

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
      this.setData({ submitting: true })
      const clientToken = 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2)
      await api.activities.create({ title, date, location, capacity, status }, clientToken)
      wx.showToast({ icon: 'success', title: '创建成功' })
      setTimeout(() => {
        wx.navigateBack({})
      }, 300)
    } catch (e) {
      if (e && e.code === 'E_PERM') {
        wx.showToast({ icon:'none', title: '仅管理员/社工可发布' })
      } else {
        wx.showToast({ icon:'none', title: mapError(e.code) })
      }
    } finally {
      this.setData({ submitting: false })
    }
  }
})
