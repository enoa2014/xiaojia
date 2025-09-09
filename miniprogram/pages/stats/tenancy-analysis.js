import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: {
    // 主题配置
    theme: { headerBg: 'nav-header--purple' },
    ready: true,
    loading: false,
    error: '',
    
    // 权限和用户信息
    role: null,
    canView: true,
    
    // 时间维度
    timeRange: 'month',
    selectedMonth: '',
    selectedYear: '',
    
    // 数据
    summary: {
      totalBeds: 0,
      occupiedBeds: 0,
      occupancyRate: 0,
      avgStayDuration: 0
    },
    
    // 图表数据
    occupancyTrend: [],
    roomUtilization: [],
    stayDurationDist: [],
    checkInOutStats: []
  },

  onLoad(options) {
    try { require('../../services/theme').applyThemeByRole(this) } catch(_) {}
    this.initTimeSelectors()
  },

  async onShow() {
    try { require('../../services/theme').applyThemeByRole(this) } catch(_) {}
    await this.checkUserPermissions()
    
    if (this.data.canView) {
      this.loadAnalysisData()
    }
  },

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

  initTimeSelectors() {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const currentYear = String(now.getFullYear())
    
    this.setData({
      selectedMonth: currentMonth,
      selectedYear: currentYear
    })
  },

  async loadAnalysisData() {
    this.setData({ loading: true, error: '' })
    const requestId = genRequestId('tenancy-analysis')
    const startTime = Date.now()

    try {
      const [summaryResult, occupancyResult, roomResult, durationResult] = await Promise.all([
        this.loadTenancySummary(),
        this.loadOccupancyTrend(),
        this.loadRoomUtilization(),
        this.loadStayDurationDist()
      ])

      this.setData({
        summary: summaryResult,
        occupancyTrend: occupancyResult,
        roomUtilization: roomResult,
        stayDurationDist: durationResult
      })

      try {
        track('tenancy_analysis_view', {
          requestId,
          timeRange: this.data.timeRange,
          duration: Date.now() - startTime
        })
      } catch(_) {}

    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      this.setData({ error: mapError(code) })
      
      try {
        track('tenancy_analysis_error', {
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

  async loadTenancySummary() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.tenancyAnalysis('summary', params)
      return result || {}
    } catch (e) {
      console.warn('Failed to load tenancy summary:', e)
      return {}
    }
  },

  async loadOccupancyTrend() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.tenancyAnalysis('occupancy-trend', params)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.warn('Failed to load occupancy trend:', e)
      return []
    }
  },

  async loadRoomUtilization() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.tenancyAnalysis('room-utilization', params)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.warn('Failed to load room utilization:', e)
      return []
    }
  },

  async loadStayDurationDist() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.tenancyAnalysis('stay-duration', params)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.warn('Failed to load stay duration:', e)
      return []
    }
  },

  getTimeParams() {
    const { timeRange, selectedMonth, selectedYear } = this.data
    
    switch (timeRange) {
      case 'year':
        return { range: 'year', year: selectedYear }
      default:
        return { range: 'month', month: selectedMonth }
    }
  },

  onTimeRangeChange(e) {
    const timeRange = e.currentTarget.dataset.range
    if (timeRange === this.data.timeRange) return

    this.setData({ timeRange })
    this.loadAnalysisData()

    try {
      track('tenancy_analysis_time_change', { timeRange })
    } catch(_) {}
  },

  onMonthChange(e) {
    const selectedMonth = e.detail.value
    if (selectedMonth === this.data.selectedMonth) return

    this.setData({ selectedMonth })
    if (this.data.timeRange === 'month') {
      this.loadAnalysisData()
    }
  },

  onYearChange(e) {
    const selectedYear = e.detail.value
    if (selectedYear === this.data.selectedYear) return

    this.setData({ selectedYear })
    if (this.data.timeRange === 'year') {
      this.loadAnalysisData()
    }
  },

  onRefresh() {
    this.loadAnalysisData()
  },

  onPullDownRefresh() {
    this.loadAnalysisData()
    try {
      wx.stopPullDownRefresh && wx.stopPullDownRefresh()
    } catch(_) {}
  }
})