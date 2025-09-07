import { api, mapError } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: {
    // 主题配置
    theme: {
      headerBg: 'primary-gradient'
    },
    
    // 用户权限
    userRole: '',
    currentUserId: '',
    canCreateActivity: false,
    canViewStats: false,
    
    // 活动类型配置（基于UX设计文档的6种类型）
    activityTypes: [
      { 
        key: 'rehabilitation', 
        name: '康复训练', 
        icon: '🏃‍♂️', 
        color: '#34C759',
        count: 0 
      },
      { 
        key: 'psychology', 
        name: '心理支持', 
        icon: '💚', 
        color: '#FF9500',
        count: 0 
      },
      { 
        key: 'education', 
        name: '教育培训', 
        icon: '📚', 
        color: '#007AFF',
        count: 0 
      },
      { 
        key: 'recreation', 
        name: '文娱活动', 
        icon: '🎭', 
        color: '#FF3B30',
        count: 0 
      },
      { 
        key: 'volunteer', 
        name: '志愿服务', 
        icon: '🤝', 
        color: '#5AC8FA',
        count: 0 
      },
      { 
        key: 'medical', 
        name: '医疗讲座', 
        icon: '👨‍⚕️', 
        color: '#AF52DE',
        count: 0 
      }
    ],
    
    // 筛选选项
    filterTabs: [
      { key: 'all', label: '全部', count: 0 },
      { key: 'published', label: '报名中', count: 0 },
      { key: 'ongoing', label: '进行中', count: 0 },
      { key: 'upcoming', label: '即将开始', count: 0 },
      { key: 'completed', label: '已结束', count: 0 }
    ],
    
    timeFilters: [
      { key: 'all', label: '全部时间' },
      { key: 'today', label: '今天' },
      { key: 'week', label: '本周' },
      { key: 'month', label: '本月' },
      { key: 'future', label: '未来活动' }
    ],
    
    statusFilters: [
      { key: 'all', label: '全部状态' },
      { key: 'draft', label: '草稿' },
      { key: 'pending', label: '待审核' },
      { key: 'published', label: '已发布' },
      { key: 'ongoing', label: '进行中' },
      { key: 'completed', label: '已结束' },
      { key: 'cancelled', label: '已取消' }
    ],
    
    // 当前筛选状态
    activeFilter: 'all',
    activeFilterLabel: '全部',
    filterOptions: {
      type: 'all',
      time: 'all',
      status: 'all'
    },
    
    // 搜索和筛选
    searchKeyword: '',
    showFilterModal: false,
    
    // 活动列表
    list: [],
    loading: false,
    loadingMore: false,
    error: '',
    hasMore: true,
    currentPage: 1,
    pageSize: 10,
    
    // 缓存和性能
    lastRefreshTime: 0,
    refreshThreshold: 5 * 60 * 1000, // 5分钟刷新阈值
  },

  async onLoad(options) {
    try { const { guardByRoute } = require('../../components/utils/auth'); const ok = await guardByRoute(); if (!ok) return } catch(_) {}
    // 处理外部跳转参数
    if (options.type) {
      this.setData({ 
        'filterOptions.type': options.type,
        activeFilter: 'all'
      })
    }
    
    this.initializeData()
  },

  onShow() {
    // 使用统一的 TabBar 同步方法
    try {
      const { syncTabBar } = require('../../components/utils/tabbar-simple')
      syncTabBar('/pages/activities/index')
    } catch (error) {
      console.warn('Failed to load tabbar utils:', error)
      // 回退到简单的选中态设置
      try { 
        const tb = this.getTabBar && this.getTabBar()
        if (tb && tb.setActiveByRoute) tb.setActiveByRoute('/pages/activities/index')
      } catch(_) {}
    }
    
    this.checkUserPermissions()
    
    // 检查是否需要刷新数据
    const now = Date.now()
    if (now - this.data.lastRefreshTime > this.data.refreshThreshold) {
      this.refreshData()
    } else {
      // 只在需要时更新统计
      this.updateActivityCounts()
    }
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  onReachBottom() {
    if (!this.data.loadingMore && this.data.hasMore) {
      this.loadMore()
    }
  },

  // 初始化数据
  async initializeData() {
    try {
      await Promise.all([
        this.checkUserPermissions(),
        this.loadActivityData(),
        this.updateActivityCounts()
      ])
    } catch (error) {
      console.error('初始化数据失败:', error)
      this.setData({ 
        error: '初始化失败，请重试',
        loading: false 
      })
    }
  },


  // 检查用户权限
  async checkUserPermissions() {
    try {
      // 先用本地身份快速渲染与刷新 TabBar
      let userRole = ''
      try { const dbg = wx.getStorageSync('debug_role'); if (dbg && dbg.key) userRole = dbg.key } catch(_) {}
      if (!userRole) {
        try { const auth = require('../../components/utils/auth'); const rs = auth.getUserRoles && auth.getUserRoles(); if (Array.isArray(rs) && rs[0]) userRole = rs[0] } catch(_) {}
      }
      if (!userRole) userRole = 'parent'
      // 基于角色设置权限（本地优先）
      const permissionsLocal = this.getRolePermissions(userRole)
      this.setData({ userRole, canCreateActivity: permissionsLocal.canCreateActivity, canViewStats: permissionsLocal.canViewStats })
      
      // 从服务器获取最新角色信息并覆盖
      const profile = await api.users.getProfile()
      const svrRole = profile.role || 'parent'
      const currentUserId = profile.userId || profile._id || ''
      const permissions = this.getRolePermissions(svrRole)
      this.setData({
        userRole: svrRole,
        currentUserId,
        canCreateActivity: permissions.canCreateActivity,
        canViewStats: permissions.canViewStats
      })
    } catch (error) {
      console.error('获取用户权限失败:', error)
      // 默认为家长权限
      this.setData({
        userRole: 'parent',
        currentUserId: '',
        canCreateActivity: false,
        canViewStats: false
      })
    }
  },

  // 获取角色权限配置
  getRolePermissions(role) {
    const rolePermissions = {
      admin: {
        canCreateActivity: true,
        canViewStats: true,
        canManageAll: true
      },
      social_worker: {
        canCreateActivity: true,
        canViewStats: true,
        canManageOwn: true
      },
      volunteer: {
        canCreateActivity: false,
        canViewStats: false,
        canRegister: true
      },
      parent: {
        canCreateActivity: false,
        canViewStats: false,
        canRegister: true
      }
    }
    
    return rolePermissions[role] || rolePermissions.parent
  },

  // 加载活动数据
  async loadActivityData(append = false) {
    const startTime = Date.now()
    
    try {
      if (!append) {
        this.setData({ 
          loading: true, 
          error: '',
          currentPage: 1
        })
      } else {
        this.setData({ loadingMore: true })
      }

      // 构建查询参数
      const params = this.buildQueryParams(append ? this.data.currentPage : 1)
      
      // 调用API
      const response = await api.activities.list(params)
      const items = Array.isArray(response) ? response : (response?.items || [])
      
      // 处理返回数据
      const processedItems = items.map(item => this.processActivityItem(item))
      
      // 更新列表数据
      const newList = append ? [...this.data.list, ...processedItems] : processedItems
      
      this.setData({
        list: newList,
        hasMore: items.length >= this.data.pageSize,
        currentPage: append ? this.data.currentPage + 1 : 2,
        lastRefreshTime: Date.now()
      })
      
      // 埋点统计
      track('activities_list_loaded', {
        filter: this.data.activeFilter,
        search: this.data.searchKeyword,
        count: processedItems.length,
        duration: Date.now() - startTime,
        append
      })
      
    } catch (error) {
      console.error('加载活动数据失败:', error)
      this.setData({ 
        error: mapError(error.code || error.message) 
      })
    } finally {
      this.setData({ 
        loading: false,
        loadingMore: false
      })
      wx.stopPullDownRefresh()
    }
  },

  // 构建查询参数
  buildQueryParams(page) {
    const { filterOptions, searchKeyword, pageSize, userRole } = this.data
    
    const params = {
      page,
      pageSize,
      filter: {}
    }
    
    // 添加搜索关键词
    if (searchKeyword.trim()) {
      params.search = searchKeyword.trim()
    }
    
    // 添加类型筛选
    if (filterOptions.type !== 'all') {
      params.filter.type = filterOptions.type
    }
    
    // 添加状态筛选
    if (filterOptions.status !== 'all') {
      params.filter.status = filterOptions.status
    }
    
    // 添加时间筛选
    if (filterOptions.time !== 'all') {
      params.filter.timeRange = filterOptions.time
    }
    
    // 基于用户角色的数据过滤
    if (userRole === 'volunteer' || userRole === 'parent') {
      // 志愿者和家长只能看到已发布的活动
      params.filter.statusIn = ['published', 'ongoing', 'upcoming', 'completed']
    }
    
    return params
  },

  // 处理活动数据项
  processActivityItem(item) {
    const userRole = this.data.userRole
    
    // 基本信息处理
    const processedItem = {
      ...item,
      // 格式化时间显示
      startTimeText: this.formatDateTime(item.startTime),
      createdTimeText: this.formatRelativeTime(item.createdAt),
      
      // 活动类型信息
      typeIcon: this.getTypeIcon(item.type),
      typeColor: this.getTypeColor(item.type),
      typeName: this.getTypeName(item.type),
      
      // 状态处理
      statusText: this.getStatusText(item.status),
      
      // 权限处理
      canRegister: this.canUserRegister(item, userRole),
      isRegistered: item.registrations?.some(r => r.userId === this.data.currentUserId) || false,
      
      // 数据脱敏处理
      needPrivacyMask: this.needPrivacyMask(item, userRole)
    }
    
    // 敏感数据脱敏
    if (processedItem.needPrivacyMask) {
      processedItem.organizerName = '***'
      processedItem.location = processedItem.location ? '***' : ''
      processedItem.description = '部分信息已隐藏'
    }
    
    return processedItem
  },

  // 获取活动类型图标
  getTypeIcon(type) {
    const typeConfig = this.data.activityTypes.find(t => t.key === type)
    return typeConfig?.icon || '📅'
  },

  // 获取活动类型颜色
  getTypeColor(type) {
    const typeConfig = this.data.activityTypes.find(t => t.key === type)
    return typeConfig?.color || '#007AFF'
  },

  // 获取活动类型名称
  getTypeName(type) {
    const typeConfig = this.data.activityTypes.find(t => t.key === type)
    return typeConfig?.name || '其他活动'
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      draft: '草稿',
      pending: '待审核',
      published: '报名中',
      ongoing: '进行中',
      upcoming: '即将开始',
      completed: '已结束',
      cancelled: '已取消'
    }
    return statusMap[status] || '未知状态'
  },

  // 判断用户是否可以报名
  canUserRegister(activity, userRole) {
    if (activity.status !== 'published') return false
    if (activity.capacity && activity.registeredCount >= activity.capacity) return false
    if (activity.registrationDeadline && new Date() > new Date(activity.registrationDeadline)) return false
    
    // 志愿者和家长可以报名
    return ['volunteer', 'parent'].includes(userRole)
  },

  // 判断是否需要数据脱敏
  needPrivacyMask(activity, userRole) {
    // 家长角色对非自己创建的活动进行部分脱敏
    return userRole === 'parent' && activity.createdBy !== this.data.currentUserId
  },

  // 格式化日期时间
  formatDateTime(dateTime) {
    if (!dateTime) return ''
    const date = new Date(dateTime)
    const now = new Date()
    
    // 判断是否为今天
    if (date.toDateString() === now.toDateString()) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    }
    
    // 判断是否为明天
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (date.toDateString() === tomorrow.toDateString()) {
      return `明天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    }
    
    // 其他日期
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  },

  // 格式化相对时间
  formatRelativeTime(dateTime) {
    if (!dateTime) return ''
    const date = new Date(dateTime)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return '刚刚'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`
    
    return date.toLocaleDateString('zh-CN')
  },

  // 更新活动类型统计
  async updateActivityCounts() {
    try {
      // 简化统计功能，只在数据量不大时进行统计
      // 实际项目中应该由后端提供统计API
      const statsResponse = await api.activities.list({ page: 1, pageSize: 100 })
      const activities = Array.isArray(statsResponse) ? statsResponse : (statsResponse?.items || [])
      
      if (activities.length === 0) return
      
      // 统计活动类型
      const typeCounts = {}
      const statusCounts = { all: activities.length }
      
      activities.forEach(activity => {
        // 统计类型
        if (activity.type) {
          typeCounts[activity.type] = (typeCounts[activity.type] || 0) + 1
        }
        
        // 统计状态
        if (activity.status) {
          statusCounts[activity.status] = (statusCounts[activity.status] || 0) + 1
        }
      })
      
      // 更新活动类型统计
      const updatedTypes = this.data.activityTypes.map(type => ({
        ...type,
        count: typeCounts[type.key] || 0
      }))
      
      // 更新筛选标签统计  
      const updatedFilterTabs = this.data.filterTabs.map(tab => ({
        ...tab,
        count: statusCounts[tab.key] || 0
      }))
      
      this.setData({
        activityTypes: updatedTypes,
        filterTabs: updatedFilterTabs
      })
    } catch (error) {
      console.error('更新活动统计失败:', error)
      // 静默失败，不影响主要功能
    }
  },

  // 搜索输入处理
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    
    // 实时搜索（防抖处理）
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      if (keyword !== this.data.searchKeyword) return
      this.performSearch()
    }, 500)
  },

  // 执行搜索
  performSearch() {
    track('activity_search', { keyword: this.data.searchKeyword })
    this.loadActivityData()
  },

  // 清除搜索关键词
  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.loadActivityData()
    track('activity_search_clear')
  },

  // 清除搜索条件
  clearFilters() {
    this.setData({
      searchKeyword: '',
      activeFilter: 'all',
      'filterOptions.type': 'all',
      'filterOptions.time': 'all',
      'filterOptions.status': 'all'
    })
    this.updateActiveFilterLabel()
    this.loadActivityData()
  },

  // 切换筛选标签
  switchFilter(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeFilter) return
    
    this.setData({ 
      activeFilter: key,
      'filterOptions.status': key === 'all' ? 'all' : key
    })
    this.updateActiveFilterLabel()
    this.loadActivityData()
    
    track('activity_filter_change', { filter: key })
  },

  // 按类型筛选
  filterByType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      'filterOptions.type': type,
      activeFilter: 'all'
    })
    this.updateActiveFilterLabel()
    this.loadActivityData()
    
    track('activity_type_filter', { type })
  },

  // 更新激活筛选标签
  updateActiveFilterLabel() {
    const { activeFilter, filterTabs } = this.data
    const activeTab = filterTabs.find(tab => tab.key === activeFilter)
    this.setData({ activeFilterLabel: activeTab?.label || '全部' })
  },

  // 显示筛选选项弹窗
  showFilterOptions() {
    this.setData({ showFilterModal: true })
  },

  // 隐藏筛选选项弹窗
  hideFilterModal() {
    this.setData({ showFilterModal: false })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 选择筛选类型
  selectFilterType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ 'filterOptions.type': type })
  },

  // 选择时间筛选
  selectFilterTime(e) {
    const time = e.currentTarget.dataset.time
    this.setData({ 'filterOptions.time': time })
  },

  // 选择状态筛选
  selectFilterStatus(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ 'filterOptions.status': status })
  },

  // 重置筛选选项
  resetFilters() {
    this.setData({
      'filterOptions.type': 'all',
      'filterOptions.time': 'all',
      'filterOptions.status': 'all'
    })
  },

  // 应用筛选选项
  applyFilters() {
    this.setData({ 
      showFilterModal: false,
      activeFilter: 'all'
    })
    this.updateActiveFilterLabel()
    this.loadActivityData()
    
    track('activity_advanced_filter', { 
      options: this.data.filterOptions 
    })
  },

  // 加载更多
  loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return
    this.loadActivityData(true)
  },

  // 刷新数据
  async refreshData() {
    try {
      this.setData({ lastRefreshTime: 0 })
      await this.loadActivityData()
      await this.updateActivityCounts()
    } catch (error) {
      console.error('刷新数据失败:', error)
    }
  },

  // 重试加载
  retryLoad() {
    this.setData({ error: '' })
    this.loadActivityData()
  },

  // 活动报名
  async registerActivity(e) {
    const activityId = e.currentTarget.dataset.id
    
    try {
      wx.showLoading({ title: '报名中...' })
      
      await api.registrations.register(activityId)
      
      wx.hideLoading()
      wx.showToast({ title: '报名成功', icon: 'success' })
      
      // 更新活动状态
      this.updateActivityRegistrationStatus(activityId, true)
      
      track('activity_register', { activityId })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ 
        title: mapError(error.code || error.message), 
        icon: 'none' 
      })
    }
  },

  // 更新活动报名状态
  updateActivityRegistrationStatus(activityId, isRegistered) {
    const updatedList = this.data.list.map(item => {
      if (item._id === activityId) {
        return {
          ...item,
          isRegistered,
          registeredCount: isRegistered ? 
            (item.registeredCount || 0) + 1 : 
            Math.max(0, (item.registeredCount || 0) - 1),
          canRegister: !isRegistered && item.canRegister
        }
      }
      return item
    })
    
    this.setData({ list: updatedList })
  },

  // 跳转到创建活动页面
  toCreate() {
    if (!this.data.canCreateActivity) {
      wx.showToast({ title: '暂无发布权限', icon: 'none' })
      return
    }
    
    wx.navigateTo({ 
      url: '/pages/activities/form',
      success: () => {
        track('activity_create_start', { from: 'list' })
      }
    })
  },

  // 跳转到活动详情页面
  toDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    
    wx.navigateTo({ 
      url: `/pages/activities/detail?id=${id}`,
      success: () => {
        track('activity_detail_view', { activityId: id })
      }
    })
  }
})
