import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: {
    // 主题配置
    theme: { headerBg: 'nav-header--blue' },
    ready: true,
    loading: false,
    error: '',
    
    // 权限和用户信息
    role: null,
    canView: true,
    
    // 时间维度
    timeRange: 'month', // week | month | quarter
    selectedMonth: '',
    selectedQuarter: '',
    
    // 数据
    summary: {
      totalServices: 0,
      completedServices: 0,
      avgRating: 0,
      mostPopularType: ''
    },
    
    // 图表数据
    servicesByType: [],
    servicesByWorker: [],
    ratingTrend: [],
    completionTrend: []
  },

  onLoad(options) {
    try { require('../../services/theme').applyThemeByRole(this) } catch(_) {}
    this.initTimeSelectors()
  },

  async onShow() {
    try { require('../../services/theme').applyThemeByRole(this) } catch(_) {}
    
    // 检查用户权限
    await this.checkUserPermissions()
    
    if (this.data.canView) {
      this.loadAnalysisData()
    }
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

  // 初始化时间选择器
  initTimeSelectors() {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const currentQuarter = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`
    
    this.setData({
      selectedMonth: currentMonth,
      selectedQuarter: currentQuarter
    })
  },

  // 加载分析数据
  async loadAnalysisData() {
    this.setData({ loading: true, error: '' })
    const requestId = genRequestId('services-analysis')
    const startTime = Date.now()

    try {
      // 并发请求多个数据接口
      const [summaryResult, typeResult, workerResult, ratingResult] = await Promise.all([
        this.loadServicesSummary(),
        this.loadServicesByType(),
        this.loadServicesByWorker(),
        this.loadRatingTrend()
      ])

      this.setData({
        summary: summaryResult,
        servicesByType: typeResult,
        servicesByWorker: workerResult,
        ratingTrend: ratingResult
      })

      // 埋点
      try {
        track('services_analysis_view', {
          requestId,
          timeRange: this.data.timeRange,
          duration: Date.now() - startTime
        })
      } catch(_) {}

    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      this.setData({ error: mapError(code) })
      
      try {
        track('services_analysis_error', {
          requestId,
          timeRange: this.data.timeRange,
          code,
          duration: Date.now() - startTime
        })
      } catch(_) {}
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载服务概览数据
  async loadServicesSummary() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.servicesAnalysis('summary', params)
      return result || {}
    } catch (e) {
      console.warn('Failed to load services summary:', e)
      return {}
    }
  },

  // 加载按服务类型统计
  async loadServicesByType() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.servicesAnalysis('by-type', params)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.warn('Failed to load services by type:', e)
      return []
    }
  },

  // 加载按工作人员统计
  async loadServicesByWorker() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.servicesAnalysis('by-worker', params)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.warn('Failed to load services by worker:', e)
      return []
    }
  },

  // 加载评分趋势
  async loadRatingTrend() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.servicesAnalysis('rating-trend', params)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.warn('Failed to load rating trend:', e)
      return []
    }
  },

  // 获取时间参数
  getTimeParams() {
    const { timeRange, selectedMonth, selectedQuarter } = this.data
    
    switch (timeRange) {
      case 'week':
        return { range: 'week' }
      case 'quarter':
        return { range: 'quarter', quarter: selectedQuarter }
      default:
        return { range: 'month', month: selectedMonth }
    }
  },

  // 时间范围切换
  onTimeRangeChange(e) {
    const timeRange = e.currentTarget.dataset.range
    if (timeRange === this.data.timeRange) return

    this.setData({ timeRange })
    this.loadAnalysisData()

    try {
      track('services_analysis_time_change', { timeRange })
    } catch(_) {}
  },

  // 月份选择
  onMonthChange(e) {
    const selectedMonth = e.detail.value
    if (selectedMonth === this.data.selectedMonth) return

    this.setData({ selectedMonth })
    if (this.data.timeRange === 'month') {
      this.loadAnalysisData()
    }
  },

  // 季度选择
  onQuarterChange(e) {
    const selectedQuarter = e.detail.value
    if (selectedQuarter === this.data.selectedQuarter) return

    this.setData({ selectedQuarter })
    if (this.data.timeRange === 'quarter') {
      this.loadAnalysisData()
    }
  },

  // 刷新数据
  onRefresh() {
    this.loadAnalysisData()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadAnalysisData()
    try {
      wx.stopPullDownRefresh && wx.stopPullDownRefresh()
    } catch(_) {}
  }
})