import { api, callWithRetry, mapError } from '../../services/api'

Page({
  data: {
    keyword: '',
    filterKey: 'all', // all | withId | noId
    fromDate: '',
    toDate: '',
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    stats: { patients: 0 }
  },
  onShow(){
    // 首次或返回时刷新头部统计，但不打断列表
    this.loadStats()
  },
  onLoad(){
    this.search(true)
  },
  async loadStats(){
    try {
      const res = await callWithRetry('stats','counts',{ collections: ['Patients'] })
      this.setData({ 'stats.patients': res.Patients || 0 })
    } catch(e) { /* 忽略统计错误 */ }
  },
  onInput(e){ this.setData({ keyword: e.detail.value }) },
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
      arr = arr.map(x => ({
        ...x,
        createdAtText: x.createdAt ? this.formatDate(x.createdAt) : '',
        initial: (x.name || '—').slice(0,1)
      }))
      this.setData({
        list: this.data.list.concat(arr.map(x => ({
          ...x,
          createdAtText: x.createdAt ? this.formatDate(x.createdAt) : '',
          initial: (x.name || '—').slice(0,1)
        }))),
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
  formatDate(ts){
    try { const d = new Date(typeof ts==='number'? ts : Number(ts)); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}` } catch(e){ return '' }
  }
})
