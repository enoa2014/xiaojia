import { api, mapError, genRequestId } from '../../services/api'

Page({
  data: {
    // 过滤与列表状态
    tabs: [
      { key: 'all', text: '全部' },
      { key: 'review', text: '待审核' },
      { key: 'approved', text: '已通过' },
      { key: 'rejected', text: '已驳回' }
    ],
    tabKey: 'all',
    typeChips: [
      { key: 'all', text: '全部类型' },
      { key: 'visit', text: '探访' },
      { key: 'psych', text: '心理' },
      { key: 'goods', text: '物资' },
      { key: 'referral', text: '转介' },
      { key: 'followup', text: '随访' }
    ],
    typeKey: 'all',
    mineOnly: false,
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    canReview: false,
    canCreate: false
  },
  onShow(){
    // 首次进入或返回刷新
    if (!this._inited) {
      this._inited = true
      this.refresh(true)
    }
    this.syncRole()
    try { const tb = this.getTabBar && this.getTabBar(); if (tb && tb.setActiveByRoute) tb.setActiveByRoute('/pages/services/index') } catch(_) {}
  },
  onPullDownRefresh(){ this.refresh(true) },
  onReachBottom(){ this.refresh(false) },
  setTab(e){ this.setData({ tabKey: e.currentTarget.dataset.key }); this.refresh(true) },
  setType(e){ this.setData({ typeKey: e.currentTarget.dataset.key }); this.refresh(true) },
  toggleMine(){ this.setData({ mineOnly: !this.data.mineOnly }); this.refresh(true) },
  buildFilter(){
    const filter = {}
    if (this.data.tabKey !== 'all') filter.status = this.data.tabKey
    if (this.data.typeKey !== 'all') filter.type = this.data.typeKey
    // mineOnly 依赖服务端 createdBy，不过由于没有用户态，这里占位：可在云函数端根据 OPENID 处理
    // 传递 createdBy: 'me' 可由后端解析当前用户 OPENID（示例占位）
    if (this.data.mineOnly) filter.createdBy = 'me'
    return filter
  },
  async refresh(reset){
    if (reset) this.setData({ page: 1, list: [], hasMore: true })
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ loading: true })
    try {
      const filter = this.buildFilter()
      const items = await api.services.list({ page: this.data.page, pageSize: 20, filter, sort: { date: -1 } })
      const arr = (Array.isArray(items) ? items : []).map(x => ({
        ...x,
        dateText: this.formatDate(x.date),
        typeText: this.mapType(x.type),
        statusText: this.mapStatus(x.status)
      }))
      this.setData({
        list: this.data.list.concat(arr),
        page: this.data.page + 1,
        hasMore: arr.length >= 20
      })
    } catch (e) {
      wx.showToast({ icon: 'none', title: mapError(e.code || 'E_INTERNAL') })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },
  toCreate(){ wx.navigateTo({ url: '/pages/services/form' }) },
  toDetail(e){
    const id = e.currentTarget.dataset.id
    wx.showToast({ icon:'none', title:'详情页占位' })
  },
  async syncRole(){
    try {
      const prof = await require('../../services/api').api.users.getProfile()
      const canR = prof && (prof.role === 'admin' || prof.role === 'social_worker')
      const canC = prof && (['admin','social_worker','volunteer'].includes(prof.role))
      this.setData({ canReview: !!canR, canCreate: !!canC })
      try { const tb = this.getTabBar && this.getTabBar(); if (tb && tb.setRole) tb.setRole(prof.role || 'social_worker') } catch(_) {}
    } catch(_) { this.setData({ canReview: false }) }
  },
  async onApprove(e){
    const id = e.currentTarget.dataset.id
    try {
      const requestId = genRequestId('srvrev')
      await api.services.review(id, 'approved', undefined, requestId)
      wx.showToast({ title:'已通过' })
      this.setData({ page: 1, list: [], hasMore: true })
      this.refresh(false)
    } catch(err){
      wx.showToast({ icon:'none', title: this.mapErrMsg(err) })
    }
  },
  async onReject(e){
    const id = e.currentTarget.dataset.id
    try {
      const res = await wx.showModal({ title:'填写驳回理由', editable: true, placeholderText: '不少于20字' })
      if (!res.confirm) return
      const reason = (res.content || '').trim()
      if (!reason || reason.length < 20) { wx.showToast({ icon:'none', title:'理由需≥20字' }); return }
      const requestId = genRequestId('srvrev')
      await api.services.review(id, 'rejected', reason, requestId)
      wx.showToast({ title:'已驳回' })
      this.setData({ page: 1, list: [], hasMore: true })
      this.refresh(false)
    } catch(err){
      wx.showToast({ icon:'none', title: this.mapErrMsg(err) })
    }
  },
  mapErrMsg(err){ const code = (err && err.code) || 'E_INTERNAL'; return { E_PERM:'需要审核权限', E_CONFLICT:'状态已变化，请刷新', E_VALIDATE:'填写有误' }[code] || mapError(code) },
  mapType(t){ return { visit:'探访', psych:'心理', goods:'物资', referral:'转介', followup:'随访' }[t] || t },
  mapStatus(s){ return { review:'待审核', approved:'已通过', rejected:'已驳回' }[s] || s },
  formatDate(iso){ if (!iso) return ''; try { return iso } catch(e){ return '' } }
})
