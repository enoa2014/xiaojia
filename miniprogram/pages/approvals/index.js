import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'
import { applyThemeByRole } from '../../services/theme'

Page({
  data: {
    theme: { headerBg: 'nav-header--purple' },
    // 权限和用户信息
    role: null,
    canView: false,
    currentCategory: 'permissions', // permissions | users
    
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
    pageSize: 20,

    // 用户注册审批分页/Tab
    userRegTab: 'pending', // pending | processed
    userRegsPending: [],
    userRegsProcessed: [],
    userRegsHasMore: true,
    userRegsPage: 1,
    userRegsPageSize: 20
  },

  onLoad() {
    applyThemeByRole(this)
    this.initPage()
  },

  async onShow() {
    applyThemeByRole(this)
    await this.checkUserPermissions()
    
    if (this.data.canView) {
      if (this.data.currentCategory === 'permissions') this.loadApprovals()
      else this.loadUserRegistrations(true)
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    if (!this.data.canView) {
      wx.stopPullDownRefresh()
      return
    }
    
    this.setData({ refreshing: true })
    if (this.data.currentCategory === 'permissions') {
      this.setData({ page: 1, hasMore: true })
      await this.loadApprovals(true)
    } else {
      this.setData({ userRegsPage: 1, userRegsHasMore: true })
      await this.loadUserRegistrations(true)
    }
    this.setData({ refreshing: false })
    wx.stopPullDownRefresh()
  },

  // 切换审批类型（权限 / 用户注册）
  onCategoryChange(e) {
    const cat = e.currentTarget.dataset.cat
    if (!cat || cat === this.data.currentCategory) return
    this.setData({ currentCategory: cat, page: 1, hasMore: true })
    if (cat === 'permissions') this.loadApprovals(true)
    else this.loadUserRegistrations(true)
  },

  onUserRegTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.userRegTab) return
    this.setData({ userRegTab: tab, userRegsPage: 1, userRegsHasMore: true })
    this.loadUserRegistrations(true)
  },

  // 用户注册审批列表
  async loadUserRegistrations(isRefresh = false) {
    if (!this.data.canView) return
    this.setData({ loading: !isRefresh, error: '' })
    try {
      const { userRegsPage, userRegsPageSize } = this.data
      const addInitial = (arr = []) => (arr || []).map(it => ({
        ...it,
        initial: ((it && it.name ? String(it.name) : '新') || '新').charAt(0)
      }))
      if (this.data.userRegTab === 'pending') {
        const { items, hasMore } = await api.users.listRegistrations({ page: userRegsPage, pageSize: userRegsPageSize, status: 'pending' })
        const next = addInitial(items)
        const list = userRegsPage === 1 ? next : [...(this.data.userRegsPending || []), ...next]
        this.setData({ userRegsPending: list, userRegsHasMore: !!hasMore })
      } else {
        const [a, r] = await Promise.all([
          api.users.listRegistrations({ page: 1, pageSize: 50, status: 'active' }),
          api.users.listRegistrations({ page: 1, pageSize: 50, status: 'rejected' })
        ])
        const processed = addInitial([...(a.items || []), ...(r.items || [])])
        this.setData({ userRegsProcessed: processed, userRegsHasMore: false })
      }
    } catch (e) {
      this.setData({ error: mapError(e.code || 'E_INTERNAL') })
    } finally {
      this.setData({ loading: false })
    }
  },

  async onUserApprove(e) {
    const openId = e.currentTarget.dataset.openId
    if (!openId) return
    const roles = ['volunteer','parent']
    const pick = await wx.showActionSheet({ itemList: ['志愿者','亲属'] }).catch(() => null)
    if (!pick) return
    const role = roles[pick.tapIndex]
    const startAt = Date.now()
    const reqId = genRequestId('register_review')
    try {
      wx.showLoading({ title: '通过中...', mask: true })
      await api.users.reviewRegistration({ openId, decision: 'approve', role })
      wx.showToast({ icon: 'none', title: '已通过' })
      this.loadUserRegistrations(true)
      try { track('register_review_action', { requestId: reqId, action: 'approve', role, duration: Date.now() - startAt, code: 'OK' }) } catch(_) {}
    } catch (e) {
      wx.showToast({ icon: 'none', title: mapError(e.code || 'E_INTERNAL') })
      const code = e.code || 'E_INTERNAL'
      try { track('register_review_action', { requestId: reqId, action: 'approve', role, duration: Date.now() - startAt, code }) } catch(_) {}
    } finally { wx.hideLoading() }
  },

  async onUserReject(e) {
    const openId = e.currentTarget.dataset.openId
    if (!openId) return
    // 支持填写原因（基础库支持 editable）
    const modal = await wx.showModal({ title: '拒绝注册', content: '请输入拒绝原因（可选）', confirmText: '拒绝', cancelText: '取消', editable: true, placeholderText: '如：信息不完整' })
    if (!modal.confirm) return
    const reason = (modal && (modal.content || '')) || ''
    const startAt = Date.now()
    const reqId = genRequestId('register_review')
    try {
      wx.showLoading({ title: '拒绝中...', mask: true })
      await api.users.reviewRegistration({ openId, decision: 'reject', reason })
      wx.showToast({ icon: 'none', title: '已拒绝' })
      this.loadUserRegistrations(true)
      try { track('register_review_action', { requestId: reqId, action: 'reject', duration: Date.now() - startAt, code: 'OK' }) } catch(_) {}
    } catch (e) {
      wx.showToast({ icon: 'none', title: mapError(e.code || 'E_INTERNAL') })
      const code = e.code || 'E_INTERNAL'
      try { track('register_review_action', { requestId: reqId, action: 'reject', duration: Date.now() - startAt, code }) } catch(_) {}
    } finally { wx.hideLoading() }
  },

  // 上拉加载
  async onReachBottom() {
    if (!this.data.canView || this.data.loading) return
    if (this.data.currentCategory === 'permissions') {
      if (!this.data.hasMore) return
      this.setData({ page: this.data.page + 1 })
      await this.loadApprovals()
    } else {
      if (this.data.userRegTab !== 'pending' || !this.data.userRegsHasMore) return
      this.setData({ userRegsPage: this.data.userRegsPage + 1 })
      await this.loadUserRegistrations()
    }
  },

  // 检查用户权限
  async checkUserPermissions() {
    try {
      const profile = await api.users.getProfile()
      const role = profile.role || 'parent'
      const canView = role === 'admin' || role === 'social_worker' // 管理员/社工可访问
      
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
      
      const requestsRaw = Array.isArray(result.items) ? result.items : []
      const requests = requestsRaw.map(it => ({
        ...it,
        requesterInitial: ((it && it.requesterName ? String(it.requesterName) : '用') || '用').charAt(0)
      }))
      
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
