import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'
import { applyThemeByRole } from '../../services/theme'

Page({
  data: {
    theme: { headerBg: 'nav-header--indigo' },
    // 权限和用户信息
    role: null,
    canView: false,
    
    // 当前操作状态
    loading: true,
    refreshing: false,
    error: '',
    
    // 审计日志数据
    auditLogs: [],
    
    // 筛选条件
    actionFilter: 'all', // all | patients.readSensitive | permissions.* | exports.* | services.*
    dateRange: {
      start: '',
      end: ''
    },
    actorFilter: '', // 操作人筛选
    
    // 分页
    hasMore: true,
    page: 1,
    pageSize: 20,
    
    // 操作类型选项
    actionOptions: [
      { value: 'all', label: '全部操作' },
      { value: 'patients.readSensitive', label: '敏感信息访问' },
      { value: 'permissions.request.submit', label: '权限申请提交' },
      { value: 'permissions.approve', label: '权限批准' },
      { value: 'permissions.reject', label: '权限拒绝' },
      { value: 'services.review', label: '服务记录审核' },
      { value: 'exports.create', label: '数据导出创建' },
      { value: 'exports.status', label: '导出状态查询' }
    ]
  },

  onLoad() {
    applyThemeByRole(this)
    this.initDateRange()
  },

  async onShow() {
    applyThemeByRole(this)
    await this.checkUserPermissions()
    
    if (this.data.canView) {
      this.loadAuditLogs()
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    if (!this.data.canView) {
      wx.stopPullDownRefresh()
      return
    }
    
    this.setData({ refreshing: true, page: 1, hasMore: true })
    await this.loadAuditLogs(true)
    this.setData({ refreshing: false })
    wx.stopPullDownRefresh()
  },

  // 上拉加载
  async onReachBottom() {
    if (!this.data.canView || !this.data.hasMore || this.data.loading) return
    
    this.setData({ page: this.data.page + 1 })
    await this.loadAuditLogs()
  },

  // 检查用户权限
  async checkUserPermissions() {
    try {
      const profile = await api.users.getProfile()
      const role = profile.role || 'parent'
      const canView = role === 'admin' // 仅管理员可访问审计日志
      
      this.setData({ role, canView })
      
      if (!canView) {
        track('audit_access_denied', { role })
      }
    } catch (error) {
      console.warn('Failed to check user permissions:', error)
      this.setData({ role: 'parent', canView: false })
    }
  },

  // 初始化日期范围
  initDateRange() {
    const now = new Date()
    const endDate = now.toISOString().split('T')[0]
    
    // 默认查询最近7天
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    this.setData({
      'dateRange.start': startDate,
      'dateRange.end': endDate
    })
  },

  // 加载审计日志
  async loadAuditLogs(isRefresh = false) {
    if (isRefresh) {
      this.setData({ 
        auditLogs: [],
        page: 1,
        hasMore: true
      })
    }
    
    const requestId = genRequestId('audit_list')
    const startTime = Date.now()
    
    this.setData({ loading: !isRefresh, error: '' })
    
    try {
      const { page, pageSize, actionFilter, dateRange, actorFilter } = this.data
      
      const params = {
        page,
        pageSize,
        filter: {
          from: dateRange.start,
          to: dateRange.end
        }
      }
      
      // 添加操作类型筛选
      if (actionFilter !== 'all') {
        params.filter.action = actionFilter
      }
      
      // 添加操作人筛选
      if (actorFilter) {
        params.filter.actorId = actorFilter
      }
      
      const result = await api.audits.list(params, requestId)
      const logs = Array.isArray(result.items) ? result.items : []
      
      if (isRefresh || page === 1) {
        this.setData({
          auditLogs: logs,
          hasMore: result.hasMore || false
        })
      } else {
        // 追加数据
        this.setData({
          auditLogs: [...this.data.auditLogs, ...logs],
          hasMore: result.hasMore || false
        })
      }
      
      track('audit_list_success', {
        requestId,
        count: logs.length,
        actionFilter,
        duration: Date.now() - startTime
      })
      
    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      this.setData({ error: mapError(code) })
      
      track('audit_list_error', {
        requestId,
        code,
        duration: Date.now() - startTime
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 操作类型筛选
  onActionFilterChange(e) {
    const index = parseInt(e.detail.value)
    const action = this.data.actionOptions[index].value
    
    this.setData({ 
      actionFilter: action,
      page: 1,
      hasMore: true 
    })
    this.loadAuditLogs(true)
    
    track('audit_filter_change', { action })
  },

  // 日期范围选择
  onStartDateChange(e) {
    this.setData({ 
      'dateRange.start': e.detail.value,
      page: 1,
      hasMore: true 
    })
    this.loadAuditLogs(true)
  },

  onEndDateChange(e) {
    this.setData({ 
      'dateRange.end': e.detail.value,
      page: 1,
      hasMore: true 
    })
    this.loadAuditLogs(true)
  },

  // 操作人筛选输入
  onActorFilterInput(e) {
    const value = e.detail.value
    this.setData({ actorFilter: value })
    
    // 防抖搜索
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
    
    this.searchTimer = setTimeout(() => {
      this.setData({ page: 1, hasMore: true })
      this.loadAuditLogs(true)
    }, 500)
  },

  // 重试加载
  onRetryLoad() {
    this.loadAuditLogs(true)
  },

  // 查看日志详情
  onViewLogDetail(e) {
    const { logId } = e.currentTarget.dataset
    if (!logId) return
    
    // 这里可以跳转到详情页或显示详情弹窗
    wx.showModal({
      title: '审计日志详情',
      content: '详情页面功能待开发',
      showCancel: false
    })
    
    track('audit_detail_view', { logId })
  },

  // 格式化时间显示
  formatTime(timestamp) {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMinutes = Math.floor(diffMs / (60 * 1000))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMinutes < 1) {
      return '刚刚'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      return `${diffHours}小时前`
    } else if (diffDays === 1) {
      return '昨天'
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  },

  // 格式化操作类型显示
  formatAction(action) {
    const actionMap = {
      'patients.readSensitive': '敏感信息访问',
      'permissions.request.submit': '权限申请提交',
      'permissions.approve': '权限批准',
      'permissions.reject': '权限拒绝',
      'services.review': '服务记录审核',
      'exports.create': '数据导出创建',
      'exports.status': '导出状态查询',
      'patients.create': '创建患者档案',
      'patients.update': '更新患者档案',
      'tenancies.create': '创建入住记录',
      'services.create': '创建服务记录'
    }
    
    return actionMap[action] || action
  },

  // 获取操作图标
  getActionIcon(action) {
    const iconMap = {
      'patients.readSensitive': '🔓',
      'permissions.request.submit': '📝',
      'permissions.approve': '✅',
      'permissions.reject': '❌',
      'services.review': '👀',
      'exports.create': '📤',
      'exports.status': '📊',
      'patients.create': '👤',
      'patients.update': '✏️',
      'tenancies.create': '🏠',
      'services.create': '💝'
    }
    
    return iconMap[action] || '📋'
  },

  // 脱敏显示目标信息
  maskTargetInfo(target) {
    if (!target) return '***'
    
    // 不显示敏感的目标信息，只显示类型
    if (typeof target === 'object') {
      if (target.patientId) {
        return `患者ID: ***${target.patientId.slice(-4)}`
      }
      if (target.serviceId) {
        return `服务ID: ***${target.serviceId.slice(-4)}`
      }
      if (target.exportId) {
        return `导出ID: ***${target.exportId.slice(-4)}`
      }
    }
    
    return '***'
  },

  // 页面卸载清理
  onUnload() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
  }
})

