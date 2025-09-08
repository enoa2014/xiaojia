import { api, mapError } from '../../services/api'
import { applyThemeByRole } from '../../services/theme'

Page({
  data: {
    theme: { headerBg: 'nav-header--green' },
    fromDate: '',
    toDate: '',
    action: '',
    actorId: '',
    page: 1,
    pageSize: 20,
    items: [],
    hasMore: true,
    loading: false,
    error: ''
  },
  onLoad(){
    applyThemeByRole(this)
    this.search(true)
  },
  onShow(){
    applyThemeByRole(this)
  },
  onPullDownRefresh(){ this.search(true) },
  onReachBottom(){ this.loadMore() },
  onFromDate(e){ this.setData({ fromDate: e.detail.value }) },
  onToDate(e){ this.setData({ toDate: e.detail.value }) },
  onAction(e){ this.setData({ action: e.detail.value }) },
  onActor(e){ this.setData({ actorId: e.detail.value }) },
  async search(reset){
    if (reset) this.setData({ page: 1, items: [], hasMore: true })
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ loading: true, error: '' })
    try {
      const filter = {}
      if (this.data.fromDate) filter.from = new Date(this.data.fromDate).getTime()
      if (this.data.toDate) filter.to = new Date(this.data.toDate + ' 23:59:59').getTime()
      if (this.data.action) filter.action = this.data.action
      if (this.data.actorId) filter.actorId = this.data.actorId
      const r = await api.audits.list({ page: this.data.page, pageSize: this.data.pageSize, filter })
      const list = (r && r.items) ? r.items : (Array.isArray(r)? r : [])
      const mapped = list.map(x => ({
        ...x,
        dtText: this.fmtTs(x.createdAt),
        targetText: this.safeTarget(x.target)
      }))
      const meta = r && r.meta
      this.setData({
        items: this.data.items.concat(mapped),
        page: this.data.page + 1,
        hasMore: meta ? !!meta.hasMore : (mapped.length >= this.data.pageSize)
      })
    } catch (e) {
      const code = (e && e.code) || 'E_INTERNAL'
      this.setData({ error: mapError(code) })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },
  loadMore(){ this.search(false) },
  fmtTs(ts){ try { const d = new Date(ts); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); const hh=String(d.getHours()).padStart(2,'0'); const mm=String(d.getMinutes()).padStart(2,'0'); return `${y}-${m}-${dd} ${hh}:${mm}` } catch(e){ return '' } },
  safeTarget(t){ try { return t ? JSON.stringify(t) : '{}' } catch(e){ return '{}' } }
})

