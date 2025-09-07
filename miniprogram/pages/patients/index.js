import { api, callWithRetry, mapError } from '../../services/api'

Page({
  data: {
    // 搜索与筛选
    keyword: '',
    filterKey: 'all', // all | withId | noId
    fromDate: '',
    toDate: '',
    // 顶部状态 tabs（占位：后端支持后再填充）
    tabs: [
      { key: 'all', text: '全部' },
      { key: 'inhouse', text: '在住' },
      { key: 'upcoming', text: '即将出院' },
      { key: 'history', text: '历史' }
    ],
    tabKey: 'all',
    // 列表状态
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    // 统计
    stats: { patients: 0 },
    // 本地标星
    starred: {}
  },
  onShow(){
    // 首次或返回时刷新头部统计，但不打断列表
    this.loadStats()
    this.loadStarred()
    try { const tb = this.getTabBar && this.getTabBar(); if (tb && tb.setActiveByRoute) tb.setActiveByRoute('/pages/patients/index') } catch(_) {}
    this.syncRoleToTabbar()
  },
  async syncRoleToTabbar(){
    try { const prof = await require('../../services/api').api.users.getProfile(); const tb = this.getTabBar && this.getTabBar(); if (tb && tb.setRole) tb.setRole(prof.role || 'social_worker') } catch(_) {}
  },
  onLoad(){
    // 恢复缓存状态
    const cached = wx.getStorageSync('patients_list_state')
    if (cached && cached.list && cached.page) {
      this.setData({ ...this.data, ...cached })
    } else {
      this.search(true)
    }
  },
  onUnload(){
    // 缓存当前列表状态
    const { keyword, filterKey, fromDate, toDate, tabKey, list, page, hasMore } = this.data
    wx.setStorageSync('patients_list_state', { keyword, filterKey, fromDate, toDate, tabKey, list, page, hasMore })
  },
  async loadStats(){
    try {
      const res = await callWithRetry('stats','counts',{ collections: ['Patients'] })
      this.setData({ 'stats.patients': res.Patients || 0 })
    } catch(e) { /* 忽略统计错误 */ }
  },
  onInput(e){
    this.setData({ keyword: e.detail.value })
    // 300ms 防抖
    clearTimeout(this._debounce)
    this._debounce = setTimeout(()=> this.search(true), 300)
  },
  setFromDate(e){ this.setData({ fromDate: e.detail.value }); this.search(true) },
  setToDate(e){ this.setData({ toDate: e.detail.value }); this.search(true) },
  setTab(e){
    const key = e.currentTarget.dataset.key
    if (key === this.data.tabKey) return
    this.setData({ tabKey: key })
    this.search(true)
  },
  setFilter(e){
    const key = e.currentTarget.dataset.key
    if (key === this.data.filterKey) return
    this.setData({ filterKey: key })
    this.search(true)
  },
  buildFilter(){
    const keyword = (this.data.keyword||'').trim()
    const filter = {}
    if (keyword) {
      if (/^[0-9Xx]{4}$/.test(keyword)) filter.id_card_tail = keyword
      else filter.name = keyword
    }
    if (this.data.fromDate) filter.createdFrom = Date.parse(this.data.fromDate)
    if (this.data.toDate) {
      const d = new Date(this.data.toDate)
      filter.createdTo = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999).getTime()
    }
    // TODO: 根据 tabKey 拼接后端过滤（在住/出院等），当前占位
    return filter
  },
  async search(reset=false){
    if (reset) this.setData({ page: 1, hasMore: true, list: [] })
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ loading: true })
    try {
      const filter = this.buildFilter()
      const resp = await api.patients.list({ page: this.data.page, pageSize: 20, filter, sort: { createdAt: -1 } })
      const items = Array.isArray(resp) ? resp : (resp && resp.items) || []
      const meta = Array.isArray(resp) ? null : (resp && resp.meta) || null
      let arr = items
      // 客户端过滤（有证/无证）
      if (this.data.filterKey === 'withId') arr = arr.filter(x => !!x.id_card)
      if (this.data.filterKey === 'noId') arr = arr.filter(x => !x.id_card)
      arr = arr.map(x => this.computeItem(x))
      this.setData({
        list: this.data.list.concat(arr),
        page: this.data.page + 1,
        hasMore: meta ? meta.hasMore : (arr.length >= 20)
      })
    } catch (e) {
      wx.showToast({ icon: 'none', title: mapError(e.code || 'E_INTERNAL') })
    } finally {
      this.setData({ loading: false })
    }
  },
  onPullDownRefresh(){
    this.search(true)
    wx.stopPullDownRefresh()
  },
  onReachBottom(){ this.search(false) },
  toDetail(e){
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/patients/detail?id=${id}` })
  },
  toNew(){ wx.navigateTo({ url: '/pages/patients/form' }) },
  toService(e){
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/services/form?pid=${id}` })
  },
  toTenancy(e){
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/tenancies/form?pid=${id}` })
  },
  // 标星
  loadStarred(){
    try {
      const s = wx.getStorageSync('star_patients') || {}
      this.setData({ starred: s && typeof s==='object' ? s : {} })
    } catch(_){}
  },
  toggleStar(e){
    const id = e.currentTarget.dataset.id
    const s = { ...(this.data.starred || {}) }
    s[id] = !s[id]
    this.setData({ starred: s })
    try { wx.setStorageSync('star_patients', s) } catch(_){ }
  },
  // UI helpers
  computeItem(x){
    const name = x.name || '未命名'
    return {
      ...x,
      initial: name.slice(0,1),
      createdAtText: x.createdAt ? this.formatDate(x.createdAt) : '',
      ageText: this.calcAge(x.birthDate),
      tags: this.buildTags(x),
      recentText: this.buildRecent(x)
    }
  },
  calcAge(iso){
    if (!iso) return ''
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ''
      const t = new Date()
      let age = t.getFullYear() - d.getFullYear()
      const m = t.getMonth() - d.getMonth()
      if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--
      return age >= 0 ? `${age}岁` : ''
    } catch { return '' }
  },
  buildTags(x){
    const tags = []
    if (x.hospitalDiagnosis) tags.push(x.hospitalDiagnosis)
    if (x.status) tags.push(x.status)
    return tags
  },
  buildRecent(x){
    // 最近入住占位：需要后端提供最近入住 checkInDate 聚合；无数据则显示 '—'
    const d = x.lastCheckInDate || x.recentCheckIn || x.lastTenancyDate
    return d ? this.formatDate(d) : '—'
  },
  formatDate(ts){
    try { const d = new Date(typeof ts==='number'? ts : Number(ts)); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}` } catch(e){ return '' }
  }
})
