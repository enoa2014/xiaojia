import { api, mapError, genRequestId } from '../../services/api'

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
      { key: 'tenancies', label: '入住记录' },
      { key: 'services', label: '服务历史' }
    ],
    activeTab: 'base',
    // tab data
    svcLoading: false,
    services: [],
    tncLoading: false,
    tenancies: [],
    // role-based actions
    role: null,
    canEdit: false,
    canManage: false,
    canApply: true,
    inResidence: false,
    lastCheckInDate: null,
    lastTenancyId: null
  },
  async onLoad(opts){
    const id = opts && opts.id
    if (!id) { wx.showToast({ icon:'none', title:'缺少参数' }); return }
    this.setData({ id })
    await this.load()
    await this.syncRole()
  },
  async load(){
    this.setData({ loading: true })
    try {
      const reqId = genRequestId('patget')
      const p = await api.patients.get(this.data.id, reqId)
      // 计算剩余天数（如有）
      let daysLeft = null
      if (p && p.permission && p.permission.expiresAt) {
        const diff = p.permission.expiresAt - Date.now()
        if (diff > 0) daysLeft = Math.ceil(diff / (24*60*60*1000))
      }
      // 预计算展示字段（尽量避免 WXML 复杂表达式）
      const initial = (p && p.name && String(p.name).slice(0,1)) || '👤'
      const idDisplay = p?.id_card ? p.id_card : (p?.id_card_tail ? ('************' + p.id_card_tail) : '—')
      this.setData({ patient: p, daysLeft, initial, idDisplay })
      // 加载“在住”状态：取最近一条入住记录，未退住则显示在住
      try {
        const items = await api.tenancies.list({ page: 1, pageSize: 1, filter: { patientId: this.data.id }, sort: { checkInDate: -1 } })
        const arr = Array.isArray(items) ? items : []
        const last = arr[0]
        const inResidence = !!(last && !last.checkOutDate)
        const lastIn = last && last.checkInDate ? last.checkInDate : null
        const lastId = last ? (last._id || null) : null
        this.setData({ inResidence, lastCheckInDate: lastIn, lastTenancyId: lastId })
      } catch {}
      // 组合在住文案
      const residenceText = this.data.inResidence ? (`在住 · 入住于 ${this.data.lastCheckInDate || '—'}`) : '未在住'
      this.setData({ residenceText })
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
    if (key === 'tenancies' && !this._tncLoaded) this.loadTenancies()
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
  async loadTenancies(){
    if (this.data.tncLoading) return
    this.setData({ tncLoading: true })
    try {
      const items = await api.tenancies.list({ page: 1, pageSize: 20, filter: { patientId: this.data.id }, sort: { checkInDate: -1 } })
      const arr = (Array.isArray(items) ? items : []).map(x => ({
        ...x,
        checkInText: this.formatDate(x.checkInDate),
        checkOutText: x.checkOutDate ? this.formatDate(x.checkOutDate) : '—',
        statusText: x.checkOutDate ? '已退住' : '在住',
        roomText: (x.room || '') + (x.bed ? ('-' + x.bed) : '')
      }))
      this.setData({ tenancies: arr })
      this._tncLoaded = true
    } catch (e) {
      wx.showToast({ icon:'none', title: mapError(e.code || 'E_INTERNAL') })
    } finally {
      this.setData({ tncLoading: false })
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
  toCheckout(){
    if (!this.data.inResidence || !this.data.lastTenancyId) return
    wx.navigateTo({ url: `/pages/tenancies/checkout?tid=${this.data.lastTenancyId}` })
  },
  toCreateTenancy(){ wx.navigateTo({ url: `/pages/tenancies/form?pid=${this.data.id}` }) },
  toEdit(){ wx.navigateTo({ url: `/pages/patients/form?id=${this.data.id}` }) },
  async syncRole(){
    try {
      const prof = await require('../../services/api').api.users.getProfile()
      const role = prof && prof.role || null
      const canEdit = role === 'admin' || role === 'social_worker'
      const canManage = canEdit
      const canApply = role === 'admin' || role === 'social_worker' || role === 'volunteer'
      this.setData({ role, canEdit, canManage, canApply })
    } catch(_) { this.setData({ role: null, canEdit: false, canManage: false, canApply: true }) }
  },
  // mappings
  mapType(t){ return { visit:'探访', psych:'心理', goods:'物资', referral:'转介', followup:'随访' }[t] || t },
  mapStatus(s){ return { review:'待审核', approved:'已通过', rejected:'已驳回' }[s] || s },
  formatDate(iso){ if (!iso) return ''; try { return iso } catch(e){ return '' } }
})
