import { api, mapError } from '../../services/api'

Page({
  data: {
    id: '',
    loading: true,
    patient: null,
    daysLeft: null,
    // UI tabs per UI/UX spec
    tabs: [
      { key: 'base', label: '基础信息' },
      { key: 'medical', label: '医疗信息' },
      { key: 'services', label: '服务记录' },
      { key: 'actions', label: '操作' }
    ],
    activeTab: 'base',
    // tab data
    svcLoading: false,
    services: []
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
  // Tabs
  switchTab(e){
    const key = e.currentTarget.dataset.key
    if (!key || key === this.data.activeTab) return
    this.setData({ activeTab: key })
    if (key === 'services' && !this._svcLoaded) this.loadServices()
  },
  async loadServices(){
    if (this.data.svcLoading) return
    this.setData({ svcLoading: true })
    try {
      const items = await api.services.list({ page: 1, pageSize: 20, filter: { patientId: this.data.id }, sort: { date: -1 } })
      const arr = (Array.isArray(items) ? items : []).map(x => ({
        ...x,
        dateText: this.formatDate(x.date),
        typeText: this.mapType(x.type),
        statusText: this.mapStatus(x.status)
      }))
      this.setData({ services: arr })
      this._svcLoaded = true
    } catch (e) {
      wx.showToast({ icon:'none', title: mapError(e.code || 'E_INTERNAL') })
    } finally {
      this.setData({ svcLoading: false })
    }
  },
  applyPermission(){
    const id = this.data.id
    wx.navigateTo({ url: `/pages/permissions/apply?pid=${id}` })
  },
  maskId(id){
    if (!id || id.length < 8) return '****'
    return id.slice(0,6) + '********' + id.slice(-4)
  },
  toCreateService(){ wx.navigateTo({ url: `/pages/services/form?pid=${this.data.id}` }) },
  toCreateTenancy(){ wx.navigateTo({ url: `/pages/tenancies/form?pid=${this.data.id}` }) },
  // mappings
  mapType(t){ return { visit:'探访', psych:'心理', goods:'物资', referral:'转介', followup:'随访' }[t] || t },
  mapStatus(s){ return { review:'待审核', approved:'已通过', rejected:'已驳回' }[s] || s },
  formatDate(iso){ if (!iso) return ''; try { return iso } catch(e){ return '' } }
})
