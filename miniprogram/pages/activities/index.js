import { api, mapError } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: {
    tabs: [
      { key: 'open', label: '开放' },
      { key: 'ongoing', label: '进行中' },
      { key: 'done', label: '已结束' },
      { key: 'closed', label: '已关闭' }
    ],
    active: 'open',
    activeLabel: '开放',
    list: [],
    loading: false,
    error: ''
  },
  onShow() {
    this.updateActiveLabel()
    this.load()
    try { const tb = this.getTabBar && this.getTabBar(); if (tb && tb.setActiveByRoute) tb.setActiveByRoute('/pages/activities/index') } catch(_) {}
    this.syncRoleToTabbar()
  },
  async syncRoleToTabbar(){
    try { const prof = await require('../../services/api').api.users.getProfile(); const tb = this.getTabBar && this.getTabBar(); if (tb && tb.setRole) tb.setRole(prof.role || 'social_worker') } catch(_) {}
  },
  updateActiveLabel() {
    try {
      const tab = (this.data.tabs || []).find(t => t.key === this.data.active)
      this.setData({ activeLabel: tab ? tab.label : '' })
    } catch (_) {
      this.setData({ activeLabel: '' })
    }
  },
  async load() {
    const startAt = Date.now()
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
      // 列表埋点（按状态 Tab）
      try { track('activities_list_view', { statusTab: this.data.active, count: (this.data.list || []).length, duration: Date.now() - startAt }) } catch(_){ }
    }
  },
  onPullDownRefresh(){ this.load() },
  switchTab(e){
    const key = e.currentTarget.dataset.key
    if (key === this.data.active) return
    this.setData({ active: key }, () => { this.updateActiveLabel(); this.load() })
  },
  toCreate() { wx.navigateTo({ url: '/pages/activities/form' }) },
  toDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/activities/detail?id=${id}` })
  }
})
