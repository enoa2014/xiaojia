import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'
import { applyThemeByRole } from '../../services/theme'

Page({
  data: {
    theme: { headerBg: 'nav-header--purple' },
    // 权限和用户信息
    role: null,
    canView: false,
    
    // 当前操作状态
    loading: true,
    refreshing: false,
    error: '',
    
    // 审批数据
    pendingRequests: [],
    processedRequests: [],
    
    // 筛选状态
    currentTab: 'pending', // pending | processed | all
    statusFilter: 'all', // all | pending | approved | rejected
    
    // 分页
    hasMore: true,
    page: 1,
    pageSize: 20
  },

  onLoad() {
    applyThemeByRole(this)
    this.initPage()
  },

  async onShow() {
    applyThemeByRole(this)
    await this.checkUserPermissions()
    
    if (this.data.canView) {
      this.loadApprovals()
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    if (!this.data.canView) {
      wx.stopPullDownRefresh()
      return
    }
    
    this.setData({ refreshing: true, page: 1, hasMore: true })
    await this.loadApprovals(true)
    this.setData({ refreshing: false })
    wx.stopPullDownRefresh()
  },

  // 上拉加载
  async onReachBottom() {
    if (!this.data.canView || !this.data.hasMore || this.data.loading) return
    
    this.setData({ page: this.data.page + 1 })
    await this.loadApprovals()
  },

  // 检查用户权限
  async checkUserPermissions() {
    try {
      const profile = await api.users.getProfile()
      const role = profile.role || 'parent'
      const canView = role === 'admin' // 仅管理员可访问审批页面
      
      this.setData({ role, canView })
      
      if (!canView) {
        track('approval_access_denied', { role })
      }
    } catch (error) {
      console.warn('Failed to check user permissions:', error)
      this.setData({ role: 'parent', canView: false })
    }
  },

  // 初始化页面
  initPage() {
    try {
      track('approval_page_visit', { source: 'direct' })
    } catch(_) {}
  },

  // 加载审批数据
  async loadApprovals(isRefresh = false) {
    if (isRefresh) {
      this.setData({ 
        pendingRequests: [], 
        processedRequests: [],
        page: 1,
        hasMore: true
      })
    }
    
    const requestId = genRequestId('approvals_list')
    const startTime = Date.now()
    
    this.setData({ loading: !isRefresh, error: '' })
    
    try {
      const { page, pageSize, statusFilter } = this.data
      
      const result = await api.permissions.list({
        page,
        pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
        includeProcessed: true
      }, requestId)
      
      const requests = Array.isArray(result.items) ? result.items : []
      
      // 分离待审批和已处理的请求
      const pending = requests.filter(req => req.status === 'pending')
      const processed = requests.filter(req => req.status !== 'pending')
      
      if (isRefresh || page === 1) {
        this.setData({
          pendingRequests: pending,
          processedRequests: processed,
          hasMore: result.hasMore || false
        })
      } else {
        // 追加数据
        this.setData({
          pendingRequests: [...this.data.pendingRequests, ...pending],
          processedRequests: [...this.data.processedRequests, ...processed],
          hasMore: result.hasMore || false
        })
      }
      
      track('approval_list_success', {
        requestId,
        count: requests.length,
        pendingCount: pending.length,
        processedCount: processed.length,
        duration: Date.now() - startTime
      })
      
    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      this.setData({ error: mapError(code) })
      
      track('approval_list_error', {
        requestId,
        code,
        duration: Date.now() - startTime
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 切换标签页
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return
    
    this.setData({ 
      currentTab: tab,
      page: 1,
      hasMore: true 
    })
    this.loadApprovals(true)
    
    track('approval_tab_switch', { from: this.data.currentTab, to: tab })
  },

  // 状态筛选
  onStatusFilterChange(e) {
    const status = e.detail.value
    this.setData({ 
      statusFilter: status,
      page: 1,
      hasMore: true 
    })
    this.loadApprovals(true)
    
    track('approval_filter_change', { status })
  },

  // 审批操作
  async onApprovalAction(e) {
    const { requestId, action } = e.currentTarget.dataset
    if (!requestId || !action) return
    
    const actionText = action === 'approve' ? '批准' : '拒绝'
    const result = await wx.showModal({
      title: `确认${actionText}`,
      content: `确定要${actionText}这个权限申请吗？`,
      confirmText: actionText,
      cancelText: '取消'
    })
    
    if (!result.confirm) return
    
    const startTime = Date.now()
    const trackingId = genRequestId('approval_action')
    
    try {
      wx.showLoading({ title: `${actionText}中...`, mask: true })
      
      await api.permissions.process({
        requestId,
        action,
        reason: '' // 可以后续扩展为输入原因
      }, trackingId)
      
      wx.showToast({ title: `${actionText}成功` })
      
      // 刷新列表
      this.loadApprovals(true)
      
      track('approval_action_success', {
        requestId: trackingId,
        permissionRequestId: requestId,
        action,
        duration: Date.now() - startTime
      })
      
    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      wx.showToast({ icon: 'none', title: `${actionText}失败：${mapError(code)}` })
      
      track('approval_action_error', {
        requestId: trackingId,
        permissionRequestId: requestId,
        action,
        code,
        duration: Date.now() - startTime
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 查看请求详情
  onViewDetail(e) {
    const { requestId } = e.currentTarget.dataset
    if (!requestId) return
    
    // 这里可以跳转到详情页或显示详情弹窗
    wx.showModal({
      title: '权限申请详情',
      content: '详情页面功能待开发',
      showCancel: false
    })
    
    track('approval_detail_view', { requestId })
  },

  // 重试加载
  onRetryLoad() {
    this.loadApprovals(true)
  },

  // 格式化时间显示
  formatTime(timestamp) {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
    
    if (diffDays === 0) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  },

  // 脱敏显示敏感字段
  maskSensitiveData(data, field) {
    if (!data || !data[field]) return '***'
    
    const value = data[field]
    switch (field) {
      case 'phone':
        return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      case 'idCard':
        return value.replace(/^(.{6}).*(.{4})$/, '$1**********$2')
      default:
        return '***'
    }
  }
})