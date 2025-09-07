import { api, mapError, genRequestId } from '../../services/api'

Page({
  data: {
    // 页面状态
    loading: true,
    error: null,
    hasMore: true,
    loadingMore: false,
    page: 1,
    
    // 主题配置
    theme: {
      headerBg: 'service-header'
    },
    
    // 用户权限
    userRole: '',
    canCreate: false,
    canReview: false,
    
    // 统计数据
    currentMonth: '',
    monthlyStats: {
      total: 0,
      pending: 0,
      approved: 0,
      efficiency: '0%'
    },
    
    // 服务类型配置
    serviceTypes: [
      { key: 'visit', name: '探访', icon: '👥', color: '#22C55E' },
      { key: 'psych', name: '心理', icon: '🧠', color: '#3B82F6' },
      { key: 'goods', name: '物资', icon: '📦', color: '#F59E0B' },
      { key: 'referral', name: '转介', icon: '🔄', color: '#8B5CF6' },
      { key: 'followup', name: '随访', icon: '📋', color: '#06B6D4' }
    ],
    
    // 筛选状态
    currentStatus: 'all',
    currentType: 'all',
    showMyOnly: false,
    
    // 筛选选项
    statusTabs: [
      { key: 'all', name: '全部', count: 0 },
      { key: 'pending', name: '待审核', count: 0 },
      { key: 'approved', name: '已通过', count: 0 },
      { key: 'rejected', name: '已驳回', count: 0 }
    ],
    
    typeFilters: [
      { key: 'all', name: '全部', icon: '📋' },
      { key: 'visit', name: '探访', icon: '👥' },
      { key: 'psych', name: '心理', icon: '🧠' },
      { key: 'goods', name: '物资', icon: '📦' },
      { key: 'referral', name: '转介', icon: '🔄' },
      { key: 'followup', name: '随访', icon: '📋' }
    ],
    
    // 数据列表
    allRecords: [],
    filteredRecords: [],
    
    // 空状态描述
    emptyStateDesc: '开始记录您的第一个服务吧'
  },

  async onLoad() {
    this.initCurrentMonth()
    await this.loadInitialData()
  },

  onShow() {
    this.updateTabBar()
  },

  onPullDownRefresh() {
    this.loadInitialData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    this.loadMoreRecords()
  },

  // 初始化数据
  async loadInitialData() {
    this.setData({ loading: true, error: null })
    
    try {
      const promises = [
        this.loadUserProfile(),
        this.loadServiceStats(),
        this.loadServiceRecords(true)
      ]
      
      await Promise.all(promises)
      
      this.setData({ loading: false })
    } catch (error) {
      this.setData({
        loading: false,
        error: { message: error.message || '加载服务数据失败，请重试' }
      })
    }
  },

  // 加载用户信息
  async loadUserProfile() {
    try {
      const profile = await api.users.getProfile()
      const canCreate = profile && ['admin', 'social_worker', 'volunteer'].includes(profile.role)
      const canReview = profile && ['admin', 'social_worker'].includes(profile.role)
      
      this.setData({
        userRole: profile.role || '',
        canCreate: !!canCreate,
        canReview: !!canReview
      })
      
      this.updateEmptyStateDesc()
    } catch (error) {
      console.warn('Failed to load user profile:', error)
      this.setData({ canCreate: false, canReview: false })
    }
  },

  // 加载统计数据
  async loadServiceStats() {
    try {
      // 使用现有的list API来获取统计数据
      const allRecords = await api.services.list({ 
        page: 1, 
        pageSize: 100,  // 获取更多数据用于统计
        filter: {}, 
        sort: { date: -1 } 
      })
      
      const records = Array.isArray(allRecords) ? allRecords : []
      const total = records.length
      const pending = records.filter(r => r.status === 'review').length
      const approved = records.filter(r => r.status === 'approved').length
      const rejected = records.filter(r => r.status === 'rejected').length
      const efficiency = total > 0 ? Math.round((approved / total) * 100) + '%' : '0%'
      
      this.setData({
        monthlyStats: {
          total,
          pending,
          approved,
          efficiency
        }
      })
      
      this.updateStatusTabCounts({
        all: total,
        pending,
        approved,
        rejected
      })
    } catch (error) {
      console.warn('Failed to load service stats:', error)
      // 设置默认统计数据
      this.setData({
        monthlyStats: {
          total: 0,
          pending: 0,
          approved: 0,
          efficiency: '0%'
        }
      })
    }
  },

  // 加载服务记录
  async loadServiceRecords(reset = false) {
    if (reset) {
      this.setData({ page: 1, allRecords: [], hasMore: true })
    }
    
    if (!this.data.hasMore && !reset) return
    
    try {
      const filter = this.buildCurrentFilter()
      const records = await api.services.list({
        page: this.data.page,
        pageSize: 20,
        filter,
        sort: { date: -1 }
      })
      
      const processedRecords = this.processServiceRecords(records || [])
      const newAllRecords = reset ? processedRecords : [...this.data.allRecords, ...processedRecords]
      
      this.setData({
        allRecords: newAllRecords,
        page: this.data.page + 1,
        hasMore: processedRecords.length >= 20
      })
      
      this.applyFilters()
    } catch (error) {
      throw new Error('Failed to load service records: ' + error.message)
    }
  },

  // 处理服务记录数据
  processServiceRecords(records) {
    const serviceTypeMap = {}
    this.data.serviceTypes.forEach(type => {
      serviceTypeMap[type.key] = type
    })
    
    return records.map(record => ({
      ...record,
      id: record._id || record.id,
      typeName: this.mapServiceType(record.type).name,
      typeIcon: this.mapServiceType(record.type).icon,
      typeColor: this.mapServiceType(record.type).color,
      statusText: this.mapServiceStatus(record.status),
      dateText: this.formatServiceDate(record.date),
      volunteerName: this.maskVolunteerName(record.volunteerName),
      patientName: this.maskPatientName(record.patientName),
      tags: this.buildServiceTags(record)
    }))
  },

  // 构建当前筛选条件
  buildCurrentFilter() {
    const filter = {}
    
    if (this.data.currentStatus !== 'all') {
      filter.status = this.data.currentStatus === 'pending' ? 'review' : this.data.currentStatus
    }
    
    if (this.data.currentType !== 'all') {
      filter.type = this.data.currentType
    }
    
    if (this.data.showMyOnly) {
      filter.createdBy = 'me'
    }
    
    return filter
  },

  // 应用筛选
  applyFilters() {
    let filtered = [...this.data.allRecords]
    
    // 状态筛选
    if (this.data.currentStatus !== 'all') {
      const targetStatus = this.data.currentStatus === 'pending' ? 'review' : this.data.currentStatus
      filtered = filtered.filter(record => record.status === targetStatus)
    }
    
    // 类型筛选
    if (this.data.currentType !== 'all') {
      filtered = filtered.filter(record => record.type === this.data.currentType)
    }
    
    // "只看我的"筛选
    if (this.data.showMyOnly) {
      // 这里应该根据实际的用户标识进行筛选
      // filtered = filtered.filter(record => record.createdBy === this.data.currentUserId)
    }
    
    this.setData({ filteredRecords: filtered })
    this.updateEmptyStateDesc()
  },

  // 状态切换
  onStatusChange(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ currentStatus: status })
    this.applyFilters()
  },

  // 类型切换
  onTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ currentType: type })
    this.applyFilters()
  },

  // 切换"只看我的"
  toggleMyOnly(e) {
    this.setData({ showMyOnly: e.detail.value })
    this.applyFilters()
  },

  // 快速记录
  quickRecord(e) {
    const type = e.currentTarget.dataset.type
    if (!this.data.canCreate) {
      wx.showToast({ icon: 'none', title: '没有创建权限' })
      return
    }
    
    wx.navigateTo({
      url: `/pages/services/form?type=${type}&quick=true`
    })
  },

  // 创建服务记录
  toCreateService() {
    if (!this.data.canCreate) {
      wx.showToast({ icon: 'none', title: '没有创建权限' })
      return
    }
    
    wx.navigateTo({ url: '/pages/services/form' })
  },

  // 记录详情
  onRecordTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/services/detail?id=${id}` })
  },

  // 记录详情（审核用）
  onRecordDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/services/detail?id=${id}&review=true` })
  },

  // 审核通过
  async onApprove(e) {
    const id = e.currentTarget.dataset.id
    
    try {
      wx.showLoading({ title: '处理中...' })
      
      await api.services.review(id, 'approved', '', genRequestId('approve'))
      
      wx.hideLoading()
      wx.showToast({ title: '审核通过', icon: 'success' })
      
      this.updateRecordStatus(id, 'approved')
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ 
        icon: 'none', 
        title: this.mapErrorMessage(error) 
      })
    }
  },

  // 审核驳回
  async onReject(e) {
    const id = e.currentTarget.dataset.id
    
    try {
      const result = await wx.showModal({
        title: '驳回服务记录',
        content: '请填写驳回理由',
        editable: true,
        placeholderText: '请详细说明驳回原因...'
      })
      
      if (!result.confirm) return
      
      const reason = (result.content || '').trim()
      if (!reason) {
        wx.showToast({ icon: 'none', title: '请填写驳回理由' })
        return
      }
      
      wx.showLoading({ title: '处理中...' })
      
      await api.services.review(id, 'rejected', reason, genRequestId('reject'))
      
      wx.hideLoading()
      wx.showToast({ title: '已驳回', icon: 'success' })
      
      this.updateRecordStatus(id, 'rejected')
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ 
        icon: 'none', 
        title: this.mapErrorMessage(error) 
      })
    }
  },

  // 更新记录状态
  updateRecordStatus(recordId, newStatus) {
    const updatedRecords = this.data.allRecords.map(record => {
      if (record.id === recordId) {
        return {
          ...record,
          status: newStatus,
          statusText: this.mapServiceStatus(newStatus)
        }
      }
      return record
    })
    
    this.setData({ allRecords: updatedRecords })
    this.applyFilters()
    this.loadServiceStats() // 刷新统计
  },

  // 加载更多
  async loadMoreRecords() {
    if (!this.data.hasMore || this.data.loadingMore) return
    
    this.setData({ loadingMore: true })
    
    try {
      await this.loadServiceRecords(false)
    } catch (error) {
      wx.showToast({ 
        icon: 'none', 
        title: '加载失败，请重试' 
      })
    } finally {
      this.setData({ loadingMore: false })
    }
  },

  // 重试加载
  retryLoad() {
    this.loadInitialData()
  },

  // 显示服务统计
  showServiceStats() {
    wx.navigateTo({ url: '/pages/stats/services' })
  },

  // 显示设置
  showSettings() {
    wx.navigateTo({ url: '/pages/settings/services' })
  },

  // 辅助函数
  initCurrentMonth() {
    const now = new Date()
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    this.setData({
      currentMonth: `${now.getFullYear()}年${monthNames[now.getMonth()]}`
    })
  },

  updateStatusTabCounts(stats) {
    const updatedTabs = this.data.statusTabs.map(tab => ({
      ...tab,
      count: stats[tab.key] || 0
    }))
    this.setData({ statusTabs: updatedTabs })
  },

  updateEmptyStateDesc() {
    let desc = '开始记录您的第一个服务吧'
    
    if (this.data.currentStatus !== 'all') {
      const statusName = this.data.statusTabs.find(tab => tab.key === this.data.currentStatus)?.name
      desc = `暂无${statusName}的服务记录`
    }
    
    if (this.data.currentType !== 'all') {
      const typeName = this.data.typeFilters.find(filter => filter.key === this.data.currentType)?.name
      desc = `暂无${typeName}服务记录`
    }
    
    if (this.data.showMyOnly) {
      desc = '您还没有创建任何服务记录'
    }
    
    this.setData({ emptyStateDesc: desc })
  },

  updateTabBar() {
    try {
      const tabBar = this.getTabBar && this.getTabBar()
      if (tabBar && tabBar.setActiveByRoute) {
        tabBar.setActiveByRoute('/pages/services/index')
      }
      if (tabBar && tabBar.setRole && this.data.userRole) {
        tabBar.setRole(this.data.userRole)
      }
    } catch (error) {
      console.warn('Failed to update tab bar:', error)
    }
  },

  // 映射函数
  mapServiceType(type) {
    return this.data.serviceTypes.find(t => t.key === type) || {
      name: type || '未知',
      icon: '❓',
      color: '#6B7280'
    }
  },

  mapServiceStatus(status) {
    const statusMap = {
      'review': '待审核',
      'pending': '待审核',
      'approved': '已通过',
      'rejected': '已驳回'
    }
    return statusMap[status] || status || '未知状态'
  },

  formatServiceDate(dateString) {
    if (!dateString) return '未知时间'
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) {
        return '今天 ' + date.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      } else if (diffDays === 1) {
        return '昨天'
      } else if (diffDays < 7) {
        return `${diffDays}天前`
      } else {
        return date.toLocaleDateString('zh-CN')
      }
    } catch (error) {
      return dateString
    }
  },

  maskVolunteerName(name) {
    if (!name || typeof name !== 'string') return '未知志愿者'
    if (name.length <= 2) return name
    return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1)
  },

  maskPatientName(name) {
    if (!name || typeof name !== 'string') return ''
    if (name.length <= 2) return name
    return name.charAt(0) + '*'.repeat(name.length - 1)
  },

  buildServiceTags(record) {
    const tags = []
    
    if (record.isUrgent) tags.push('紧急')
    if (record.hasImages) tags.push('有图片')
    if (record.followUpRequired) tags.push('需跟进')
    
    return tags
  },

  mapErrorMessage(error) {
    const errorMap = {
      'E_PERM': '权限不足',
      'E_NOT_FOUND': '记录不存在',
      'E_CONFLICT': '状态已变更',
      'E_VALIDATE': '数据验证失败'
    }
    
    const code = error?.code || 'E_INTERNAL'
    return errorMap[code] || mapError(code) || '操作失败'
  }
})
