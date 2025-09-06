import { api, mapError } from '../../services/api'

Page({
  data: {
    tabs: [
      { key: 'open', label: '开放' },
      { key: 'ongoing', label: '进行中' },
      { key: 'done', label: '已结束' },
      { key: 'closed', label: '已关闭' }
    ],
    active: 'open',
    list: [],
    loading: false,
    error: ''
  },
  onShow() {
    this.load()
  },
  async load() {
    try {
      this.setData({ loading: true, error: '' })
      const res = await api.activities.list({ page: 1, pageSize: 20, filter: { status: this.data.active } })
      const items = Array.isArray(res) ? res : (res && res.items) || []
      this.setData({ list: items })
    } catch (e) {
      this.setData({ error: mapError(e.code) })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },
  onPullDownRefresh(){ this.load() },
  switchTab(e){
    const key = e.currentTarget.dataset.key
    if (key === this.data.active) return
    this.setData({ active: key }, () => this.load())
  },
  toCreate() { wx.navigateTo({ url: '/pages/activities/form' }) },
  toDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/activities/detail?id=${id}` })
  }
})
