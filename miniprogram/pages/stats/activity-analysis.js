import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: {
    // 主题配置
    theme: { headerBg: 'nav-header--orange' },
    ready: true,
    loading: false,
    error: '',
    
    // 权限和用户信息
    role: null,
    canView: true,
    
    // 时间维度
    timeRange: 'month',
    selectedMonth: '',
    selectedQuarter: '',
    
    // 数据
    summary: {
      totalActivities: 0,
      totalParticipants: 0,
      avgParticipationRate: 0,
      mostPopularActivity: ''
    },
    
    // 图表数据
    participationTrend: [],
    activitiesByType: [],
    participantsByAge: [],
    satisfactionRatings: []
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
    const currentQuarter = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`
    
    this.setData({
      selectedMonth: currentMonth,
      selectedQuarter: currentQuarter
    })
  },

  async loadAnalysisData() {
    this.setData({ loading: true, error: '' })
    const requestId = genRequestId('activity-analysis')
    const startTime = Date.now()

    try {
      const [summaryResult, trendResult, typeResult, ageResult] = await Promise.all([
        this.loadActivitySummary(),
        this.loadParticipationTrend(),
        this.loadActivitiesByType(),
        this.loadParticipantsByAge()
      ])

      this.setData({
        summary: summaryResult,
        participationTrend: trendResult,
        activitiesByType: typeResult,
        participantsByAge: ageResult
      })

      try {
        track('activity_analysis_view', {
          requestId,
          timeRange: this.data.timeRange,
          duration: Date.now() - startTime
        })
      } catch(_) {}

    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      this.setData({ error: mapError(code) })
      
      try {
        track('activity_analysis_error', {
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

  async loadActivitySummary() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.activityAnalysis('summary', params)
      return result || {}
    } catch (e) {
      console.warn('Failed to load activity summary:', e)
      return {}
    }
  },

  async loadParticipationTrend() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.activityAnalysis('participation-trend', params)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.warn('Failed to load participation trend:', e)
      return []
    }
  },

  async loadActivitiesByType() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.activityAnalysis('by-type', params)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.warn('Failed to load activities by type:', e)
      return []
    }
  },

  async loadParticipantsByAge() {
    try {
      const params = this.getTimeParams()
      const result = await api.stats.activityAnalysis('participants-by-age', params)
      return Array.isArray(result) ? result : []
    } catch (e) {
      console.warn('Failed to load participants by age:', e)
      return []
    }
  },

  getTimeParams() {
    const { timeRange, selectedMonth, selectedQuarter } = this.data
    
    switch (timeRange) {
      case 'quarter':
        return { range: 'quarter', quarter: selectedQuarter }
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
      track('activity_analysis_time_change', { timeRange })
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

  onQuarterChange(e) {
    const selectedQuarter = e.detail.value
    if (selectedQuarter === this.data.selectedQuarter) return

    this.setData({ selectedQuarter })
    if (this.data.timeRange === 'quarter') {
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