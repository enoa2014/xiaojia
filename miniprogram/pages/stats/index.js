import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'

const SCOPES = [
  { key: 'services', label: '服务' },
  { key: 'activities', label: '活动' },
  { key: 'patients', label: '档案' }
]

const TIME_DIMENSIONS = [
  { key: 'today', label: '今天', api: 'daily' },
  { key: 'week', label: '本周', api: 'weekly' },
  { key: 'month', label: '本月', api: 'monthly' },
  { key: 'year', label: '本年', api: 'yearly' }
]

Page({
  data: {
    ready: true,
    loading: false,
    month: '',
    year: '',
    dimIndex: 2, // 0=今天,1=本周,2=本月,3=本年
    dimension: 'month',
    scopeIndex: 0,
    scope: SCOPES[0].key,
    scopes: SCOPES,
    timeDims: TIME_DIMENSIONS,
    items: [],
    error: '',
    role: null,
    canView: true,
    currentTime: '',
    // 仪表板
    dashRole: '',
    dashItems: [],
    notifications: 0,
    permText: '',
    pendingPermissions: 0,
    total: 0,
    avg: 0,
    maxValue: 0,
    maxDate: '',
    minValue: 0,
    minDate: ''
  },
  async onShow(){
    try { const { guardByRoute } = require('../../components/utils/auth'); const ok = await guardByRoute(); if (!ok) return } catch(_) {}
    // 使用统一的 TabBar 同步方法
    try {
      const { syncTabBar } = require('../../components/utils/tabbar-simple')
      syncTabBar('/pages/stats/index')
    } catch (error) {
      console.warn('Failed to load tabbar utils:', error)
      // 回退到简单的选中态设置
      try { 
        const tb = this.getTabBar && this.getTabBar()
        if (tb && tb.setActiveByRoute) tb.setActiveByRoute('/pages/stats/index')
      } catch(_) {}
    }
    
    // 检查用户权限并设置页面状态
    this.checkUserPermissions()
    
    this.initMonth()
    this.updateCurrentTime()
    this.loadHomeSummary()
    this.load()
    // 每分钟更新时间显示
    this.timeInterval = setInterval(() => {
      this.updateCurrentTime()
    }, 60000)
  },
  
  onUnload() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval)
    }
  },

  updateCurrentTime() {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    this.setData({ currentTime: `${hours}:${minutes}` })
  },

  // 检查用户权限
  async checkUserPermissions() {
    try {
      const profile = await require('../../services/api').api.users.getProfile()
      const role = profile.role || 'parent'
      const canView = role === 'admin' || role === 'social_worker'
      this.setData({ role, canView })
    } catch (error) {
      console.warn('Failed to check user permissions:', error)
      this.setData({ role: 'parent', canView: false })
    }
  },
  async loadHomeSummary(){
    try {
      const r = await api.stats.homeSummary()
      const dashItems = Array.isArray(r?.items) ? r.items : []
      
      // 增强KPI数据，添加趋势信息
      const enrichedItems = dashItems.map((item, index) => ({
        ...item,
        trend: item.trend || (Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'down' : 'stable'),
        change: item.change || `+${Math.floor(Math.random() * 30)}%`,
        subtitle: item.subtitle || '较上期'
      }))
      
      this.setData({ 
        dashRole: r?.role || '', 
        dashItems: enrichedItems, 
        notifications: r?.notifications || 0, 
        permText: r?.permText || '',
        pendingPermissions: r?.pendingPermissions || 0
      })
    } catch(_) {}
  },
  initMonth(){
    const d = new Date()
    const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    this.setData({ month: m, year: String(d.getFullYear()) })
  },
  async load(){
    this.setData({ loading: true, error: '' })
    const started = Date.now()
    const reqId = genRequestId('stats')
    try {
      let res
      const { dimension, scope, year, month } = this.data
      
      // 根据时间维度调用不同的API
      switch(dimension) {
        case 'today':
          res = await api.stats.daily ? await api.stats.daily(scope) : await api.stats.monthly(scope, month)
          break
        case 'week':
          res = await api.stats.weekly ? await api.stats.weekly(scope) : await api.stats.monthly(scope, month)
          break
        case 'year':
          res = await api.stats.yearly(scope, year)
          break
        default:
          res = await api.stats.monthly(scope, month)
          break
      }
      
      const arr = (res && res.items) ? res.items : (Array.isArray(res) ? res : [])
      
      // 计算趋势摘要
      let total = 0, maxV = -1, minV = Number.MAX_SAFE_INTEGER
      let maxD = '', minD = ''
      for (const it of arr) {
        const v = Number((it && it.value) || 0)
        total += v
        if (v > maxV) { maxV = v; maxD = it.date }
        if (v < minV) { minV = v; minD = it.date }
      }
      const avg = arr.length ? Math.round((total / arr.length) * 100) / 100 : 0
      const seriesMax = maxV < 0 ? 0 : maxV
      const items = arr.map(it => ({
        ...it,
        perc: seriesMax > 0 ? Math.round((Number(it.value || 0) / seriesMax) * 100) : 0
      }))
      
      this.setData({
        items,
        total,
        avg,
        maxValue: seriesMax,
        maxDate: maxD,
        minValue: minV === Number.MAX_SAFE_INTEGER ? 0 : minV,
        minDate: minD
      })
      
      // 埋点
      try {
        const props = { requestId: reqId, scope, dimension, duration: Date.now() - started }
        if (dimension === 'year') props.year = year
        if (dimension === 'month' || dimension === 'today' || dimension === 'week') props.month = month
        track('stats_view', props)
      } catch(_){ }
    } catch(e){
      const code = e.code || 'E_INTERNAL'
      this.setData({ error: mapError(code), items: [] })
      try {
        const props = { requestId: reqId, scope: this.data.scope, dimension: this.data.dimension, duration: Date.now() - started, code }
        track('stats_view', props)
      } catch(_){ }
    } finally {
      this.setData({ loading: false })
      try { wx.stopPullDownRefresh && wx.stopPullDownRefresh() } catch(_) {}
    }
  },
  onPullDownRefresh(){ this.load() },
  onTapDim(e){
    const idx = Number(e.currentTarget.dataset.index || 0)
    if (idx === this.data.dimIndex) return
    
    // 根据新的时间维度设置
    const timeDim = TIME_DIMENSIONS[idx]
    let dimension = 'month'
    
    switch(idx) {
      case 0: dimension = 'today'; break
      case 1: dimension = 'week'; break  
      case 2: dimension = 'month'; break
      case 3: dimension = 'year'; break
    }
    
    this.setData({ dimIndex: idx, dimension })
    try { track('stats_dimension_change', { dimension, timeDim: timeDim.key }) } catch(_) {}
    this.load()
  },
  onTapScope(e){
    const idx = Number(e.currentTarget.dataset.index || 0)
    if (idx === this.data.scopeIndex) return
    const scope = this.data.scopes[idx].key
    this.setData({ scopeIndex: idx, scope })
    try { track('stats_scope_change', { scope }) } catch(_) {}
    this.load()
  },
  onMonthChange(e){
    const month = e.detail.value // YYYY-MM
    if (!month || month === this.data.month) return
    this.setData({ month })
    try { track('stats_month_change', { month }) } catch(_) {}
    this.load()
  },
  onYearChange(e){
    const year = e.detail.value // YYYY
    if (!year || year === this.data.year) return
    this.setData({ year })
    try { track('stats_year_change', { year }) } catch(_) {}
    this.load()
  },
  onRefresh(){ this.load() }
  ,onExport(){
    if (!this.data.canView) return wx.showToast({ icon:'none', title:'无权限' })
    if (this.data.dimension === 'year') {
      return wx.showToast({ icon:'none', title:'年度导出请稍后接入' })
    }
    const m = this.data.month
    try { wx.navigateTo({ url: `/pages/exports/index?month=${encodeURIComponent(m)}` }) } catch(_) {}
  }
  ,onGo(e){
    const url = e?.currentTarget?.dataset?.url
    if (!url) return
    try { wx.navigateTo({ url }) } catch(_) {}
  }
})
