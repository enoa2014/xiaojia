import { api, mapError } from '../../services/api'

Page({
  data: {
    keyword: '',
    mode: 'auto', // auto|name|tail
    list: [],
    loading: false,
    page: 1,
    hasMore: true
  },
  onLoad(opts) {
    const kw = (opts && opts.keyword) ? decodeURIComponent(opts.keyword) : ''
    const mode = (opts && opts.mode) ? opts.mode : 'auto'
    if (kw) {
      this.setData({ keyword: kw, mode })
      this.search(true)
    }
  },
  onInput(e) { this.setData({ keyword: e.detail.value }) },
  onMode(e) { this.setData({ mode: e.currentTarget.dataset.mode }) },
  async search(reset=false) {
    const keyword = (this.data.keyword || '').trim()
    if (reset) this.setData({ page: 1, hasMore: true, list: [] })
    if (!keyword) {
      this.setData({ list: [] })
      return
    }
    if (!this.data.hasMore) return
    this.setData({ loading: true })
    try {
      let filter = {}
      const isTail = this.data.mode === 'tail' || (/^[0-9Xx]{4}$/.test(keyword) && this.data.mode === 'auto')
      if (isTail) filter = { id_card_tail: keyword }
      else filter = { name: keyword }
      const res = await api.patients.list({ page: this.data.page, pageSize: 20, filter, sort: { createdAt: -1 } })
      const items = (Array.isArray(res) ? res : []).map(it => ({
        ...it,
        createdAtText: it.createdAt ? this.formatDate(it.createdAt) : ''
      }))
      this.setData({ list: this.data.list.concat(items), page: this.data.page + 1, hasMore: items.length >= 20 })
    } catch (e) {
      wx.showToast({ icon: 'none', title: mapError(e.code || 'E_INTERNAL') })
    } finally {
      this.setData({ loading: false })
    }
  },
  formatDate(ts){
    try {
      const d = new Date(typeof ts === 'number' ? ts : Number(ts))
      const y = d.getFullYear()
      const m = String(d.getMonth()+1).padStart(2,'0')
      const day = String(d.getDate()).padStart(2,'0')
      return `${y}-${m}-${day}`
    } catch(e) { return '' }
  },
  onReachBottom() { this.search(false) },
  toDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/patients/detail?id=${id}` })
  }
})
