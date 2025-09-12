import { api, mapError } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: {
    // 主题配置
    theme: {
      headerBg: 'nav-header--blue'
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
    
    // 视图模式控制
    viewMode: 'list', // list | calendar
    calendarViewMode: 'month', // month | week
    selectedDate: '',
    calendarActivities: [],
    
    // 骨架屏状态
    showSkeleton: false,
    skeletonTimer: null,
    
    // 活动列表
    list: [],
    loading: false,
    loadingMore: false,
    error: '',
    hasMore: true,
    currentPage: 1,
    pageSize: 10,
    // 游客模式与报名对话框
    guestMode: false,
    userStatus: null,
    guestDialogVisible: false,
    guestName: '',
    guestPhone: '',
    guestActivityId: null,
    
    // 缓存和性能
    lastRefreshTime: 0,
    refreshThreshold: 5 * 60 * 1000, // 5分钟刷新阈值
  },
  onGuestNameInput(e) { this.setData({ guestName: (e.detail && e.detail.value) || '' }) },
  onGuestPhoneInput(e) { this.setData({ guestPhone: (e.detail && e.detail.value) || '' }) },

  async onLoad(options) {
    try { require('../../services/theme').applyThemeByRole(this) } catch(_) {}
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
    try { require('../../services/theme').applyThemeByRole(this) } catch(_) {}
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
      const svrRole = profile.role || ''
      const userStatus = profile.status || null
      const guestMode = !svrRole || userStatus !== 'active'
      const currentUserId = profile.userId || profile._id || ''
      const permissions = this.getRolePermissions(svrRole)
      this.setData({
        userRole: svrRole || 'parent',
        currentUserId,
        canCreateActivity: permissions.canCreateActivity,
        canViewStats: permissions.canViewStats,
        guestMode,
        userStatus
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

      let items = []
      if (this.data.guestMode) {
        // 游客模式：展示“当前活动”和“近14天已完成”两个窗口
        const t0 = Date.now()
        const respCur = await api.activities.publicList({ window: 'current' })
        const curItems = Array.isArray(respCur?.items) ? respCur.items : []
        try { track('guest_activity_view', { window: 'current', count: curItems.length, duration: Date.now() - t0 }) } catch(_) {}
        const t1 = Date.now()
        const respHis = await api.activities.publicList({ window: 'last14d' })
        const hisItems = Array.isArray(respHis?.items) ? respHis.items : []
        try { track('guest_activity_view', { window: 'last14d', count: hisItems.length, duration: Date.now() - t1 }) } catch(_) {}
        // 插入分组标题占位，供 WXML 渲染分节
        const group = []
        group.push({ _id: '__group_current__', isGroup: true, groupTitle: '当前活动' })
        group.push(...curItems)
        group.push({ _id: '__group_last14d__', isGroup: true, groupTitle: '近14天已完成' })
        group.push(...hisItems)
        items = group
      } else {
        // 构建查询参数
        const params = this.buildQueryParams(append ? this.data.currentPage : 1)
        const response = await api.activities.list(params)
        items = Array.isArray(response) ? response : (response?.items || [])
      }
      
      // 处理返回数据
      const processedItems = items.map(item => this.processActivityItem(item))
      
      // 更新列表数据
      const newList = append ? [...this.data.list, ...processedItems] : processedItems
      
      this.setData({
        list: newList,
        hasMore: this.data.guestMode ? false : (items.length >= this.data.pageSize),
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

  // ========== 视图模式切换 ==========
  
  // 切换视图模式 (列表/日历)
  toggleViewMode() {
    const newViewMode = this.data.viewMode === 'list' ? 'calendar' : 'list'
    this.setData({ viewMode: newViewMode })
    
    if (newViewMode === 'calendar') {
      this.loadCalendarData()
    }
    
    track('activities_view_mode_change', { mode: newViewMode })
  },

  // 加载日历数据
  async loadCalendarData() {
    // 设置骨架屏延迟显示定时器（300ms）
    this.data.skeletonTimer = setTimeout(() => {
      this.setData({ showSkeleton: true })
    }, 300)

    try {
      this.setData({ loading: true, error: '' })
      
      // 获取当前月份的活动数据
      const currentDate = this.data.selectedDate || new Date().toISOString().split('T')[0]
      const [year, month] = currentDate.split('-')
      
      const params = {
        page: 1,
        pageSize: 100, // 获取更多数据用于日历显示
        filter: {}
      }
      // 使用 from/to（后端按 date 字段范围查询）
      const first = new Date(Number(year), Number(month)-1, 1)
      const last = new Date(Number(year), Number(month), 0)
      const pad2 = (n) => String(n).padStart(2, '0')
      const toDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`
      params.filter.from = toDateStr(first)
      params.filter.to = toDateStr(last)

      // 添加状态筛选（映射到后端枚举）
      if (this.data.filterOptions.status !== 'all') {
        const apiStatus = this.mapStatusForApi(this.data.filterOptions.status)
        if (apiStatus) {
          params.filter.status = apiStatus
        } else if (this.data.filterOptions.status === 'upcoming') {
          params.filter.startTime = Object.assign({}, params.filter.startTime || {}, { $gte: new Date().toISOString() })
        }
      }

      const response = await api.activities.list(params)
      const items = Array.isArray(response) ? response : (response?.items || [])
      
      const processedItems = items.map(item => this.processActivityItemForCalendar(item))
      
      this.setData({
        calendarActivities: processedItems
      })

    } catch (error) {
      console.error('加载日历数据失败:', error)
      this.setData({ error: mapError(error.code || error.message) })
    } finally {
      // 清理骨架屏
      this.clearSkeletonTimer()
      this.setData({ loading: false })
    }
  },

  // 处理活动数据用于日历显示
  processActivityItemForCalendar(item) {
    const startTime = new Date(item.startTime || item.createdAt)
    const endTime = item.endTime ? new Date(item.endTime) : null
    
    return {
      ...item,
      id: item._id || item.id,
      startTimeDisplay: this.formatTime(startTime),
      endTimeDisplay: endTime ? this.formatTime(endTime) : '',
      duration: endTime ? this.calculateDuration(startTime, endTime) : '',
      categoryName: this.getCategoryName(item.category),
      canRegister: this.canUserRegister(item),
      canCheckIn: this.canUserCheckIn(item)
    }
  },

  // 清理骨架屏定时器
  clearSkeletonTimer() {
    if (this.data.skeletonTimer) {
      clearTimeout(this.data.skeletonTimer)
      this.data.skeletonTimer = null
    }

    if (this.data.showSkeleton) {
      const skeletonComponent = this.selectComponent('#loading-skeleton')
      if (skeletonComponent && skeletonComponent.fadeOut) {
        skeletonComponent.fadeOut(() => {
          this.setData({ showSkeleton: false })
        })
      } else {
        this.setData({ showSkeleton: false })
      }
    }
  },

  // 格式化时间显示
  formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  },

  // 计算活动时长
  calculateDuration(startTime, endTime) {
    const diffMs = endTime.getTime() - startTime.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return diffMinutes > 0 ? `${diffHours}小时${diffMinutes}分钟` : `${diffHours}小时`
    } else {
      return `${diffMinutes}分钟`
    }
  },

  // 获取分类名称
  getCategoryName(category) {
    const categoryConfig = this.data.activityTypes.find(type => type.key === category)
    return categoryConfig ? categoryConfig.name : '其他'
  },

  // 检查用户是否可以报名
  canUserRegister(activity) {
    return (activity.status === 'published' || activity.status === 'open') && 
           activity.registrationEndTime && 
           new Date(activity.registrationEndTime) > new Date()
  },

  // 检查用户是否可以签到
  canUserCheckIn(activity) {
    return activity.status === 'ongoing' || 
           ((activity.status === 'published' || activity.status === 'open') && new Date(activity.startTime) <= new Date())
  },

  // ========== 日历视图事件处理 ==========

  // 日历视图模式切换 (月/周)
  onCalendarViewModeChange(e) {
    const { mode } = e.detail
    this.setData({ calendarViewMode: mode })
  },

  // 日历日期变更
  onCalendarDateChange(e) {
    const { date } = e.detail
    this.setData({ selectedDate: date })
    this.loadCalendarData()
  },

  // 日历日期选择
  onCalendarDateSelect(e) {
    const { date, activities } = e.detail
    this.setData({ selectedDate: date })
    
    track('activities_calendar_date_select', { 
      date, 
      activitiesCount: activities.length 
    })
  },

  // 点击日历中的活动
  onCalendarActivityTap(e) {
    const { activity } = e.detail
    this.navigateToActivity(activity)
  },

  // 日历中的活动报名
  onCalendarRegisterTap(e) {
    const { activity } = e.detail
    this.registerActivityFromCalendar(activity)
  },

  // 日历中的活动签到
  onCalendarCheckInTap(e) {
    const { activity } = e.detail
    this.checkInActivityFromCalendar(activity)
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
    
    // 添加状态筛选（映射到后端枚举）
    if (filterOptions.status !== 'all') {
      const apiStatus = this.mapStatusForApi(filterOptions.status)
      if (apiStatus) {
        params.filter.status = apiStatus
      } else if (filterOptions.status === 'upcoming') {
        params.filter.timeRange = 'future'
      }
    }
    
    // 添加时间筛选（转换为后端支持的 from/to: 'YYYY-MM-DD'）
    if (filterOptions.time && filterOptions.time !== 'all') {
      const range = this.computeDateRange(filterOptions.time)
      if (range.from) params.filter.from = range.from
      if (range.to) params.filter.to = range.to
    }
    
    // 基于用户角色的数据过滤
    if (userRole === 'volunteer' || userRole === 'parent') {
      // 志愿者和家长：公开/进行中/已结束
      params.filter.statusIn = ['open', 'ongoing', 'done']
    }
    
    return params
  },

  // 计算时间范围（today|week|month|future）→ { from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD' }
  computeDateRange(key) {
    const pad2 = (n) => String(n).padStart(2, '0')
    const toDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`
    const today = new Date()
    if (key === 'today') {
      const s = toDateStr(today)
      return { from: s, to: s }
    }
    if (key === 'week') {
      const d = new Date(today)
      const day = d.getDay() || 7 // 周一=1...周日=7
      const monday = new Date(d)
      monday.setDate(d.getDate() - (day - 1))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: toDateStr(monday), to: toDateStr(sunday) }
    }
    if (key === 'month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      const last = new Date(today.getFullYear(), today.getMonth()+1, 0)
      return { from: toDateStr(first), to: toDateStr(last) }
    }
    if (key === 'future') {
      return { from: toDateStr(today) }
    }
    return {}
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
      // 前端别名 published ≈ 后端 open
      published: '报名中',
      open: '报名中',
      ongoing: '进行中',
      upcoming: '即将开始',
      completed: '已结束',
      done: '已结束',
      cancelled: '已取消',
      closed: '已关闭'
    }
    return statusMap[status] || '未知状态'
  },

  // 将前端状态映射为后端枚举
  mapStatusForApi(status) {
    const map = { published: 'open', ongoing: 'ongoing', completed: 'done', closed: 'closed' }
    return map[status] || null
  },

  // 将后端枚举映射回前端筛选键值
  mapStatusForUi(status) {
    const map = { open: 'published', done: 'completed' }
    return map[status] || status
  },

  // 判断用户是否可以报名（用于列表项渲染，含角色判断）
  canUserRegister(activity, userRole) {
    if (!(activity.status === 'published' || activity.status === 'open')) return false
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
          const uiKey = this.mapStatusForUi(activity.status)
          statusCounts[uiKey] = (statusCounts[uiKey] || 0) + 1
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
    
    const updates = { activeFilter: key }
    if (key === 'upcoming') {
      updates['filterOptions.status'] = 'all'
      updates['filterOptions.time'] = 'future'
    } else {
      updates['filterOptions.status'] = key === 'all' ? 'all' : key
    }
    this.setData(updates)
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
      if (this.data.guestMode) {
        // 弹出补充资料对话框
        this.setData({ guestDialogVisible: true, guestActivityId: activityId, guestName: '', guestPhone: '' })
        return
      }
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
  },

  // 从日历点击活动跳转（navigateToActivity 的别名）
  navigateToActivity(activity) {
    if (!activity || !activity._id) return
    
    wx.navigateTo({ 
      url: `/pages/activities/detail?id=${activity._id}`,
      success: () => {
        track('activity_detail_view', { activityId: activity._id, from: 'calendar' })
      }
    })
  },

  // 从日历报名活动
  async registerActivityFromCalendar(activity) {
    if (!activity || !activity._id) return
    
    try {
      if (this.data.guestMode) {
        this.setData({ guestDialogVisible: true, guestActivityId: activity._id, guestName: '', guestPhone: '' })
        return
      }
      wx.showLoading({ title: '报名中...' })
      await api.registrations.register(activity._id)
      
      wx.hideLoading()
      wx.showToast({ title: '报名成功', icon: 'success' })
      
      // 更新日历数据中的活动状态
      this.updateCalendarActivityStatus(activity._id, true)
      
      track('activity_register', { activityId: activity._id, from: 'calendar' })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ 
        title: mapError(error.code || error.message), 
        icon: 'none' 
      })
    }
  },

  // 游客提交报名
  async onGuestSubmit() {
    const name = (this.data.guestName || '').trim()
    const phone = (this.data.guestPhone || '').trim()
    if (name.length < 2 || name.length > 30) { wx.showToast({ icon:'none', title:'姓名需2-30字' }); return }
    if (!/^1\d{10}$/.test(phone)) { wx.showToast({ icon:'none', title:'请输入11位手机号' }); return }
    const activityId = this.data.guestActivityId
    if (!activityId) { this.setData({ guestDialogVisible:false }); return }
    try {
      const startAt = Date.now()
      try { track('guest_registration_submit', { activityId }) } catch(_) {}
      wx.showLoading({ title: '报名中...' })
      await api.registrations.register(activityId, { name, phone })
      wx.hideLoading()
      wx.showToast({ icon:'none', title:'报名成功' })
      this.setData({ guestDialogVisible: false, guestActivityId: null, guestName: '', guestPhone: '' })
      this.updateActivityRegistrationStatus(activityId, true)
      try { track('guest_registration_result', { activityId, code: 'OK', duration: Date.now() - startAt }) } catch(_) {}
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ icon:'none', title: mapError(e.code || 'E_INTERNAL') })
      try { track('guest_registration_result', { activityId, code: e.code || 'E_INTERNAL' }) } catch(_) {}
    }
  },

  onGuestCancel() {
    this.setData({ guestDialogVisible: false, guestActivityId: null })
  },

  // 从日历签到活动
  async checkInActivityFromCalendar(activity) {
    if (!activity || !activity._id) return
    
    try {
      wx.showLoading({ title: '签到中...' })
      
      // 这里假设存在签到API，如果不存在则需要根据实际情况调整
      await api.registrations.checkIn(activity._id)
      
      wx.hideLoading()
      wx.showToast({ title: '签到成功', icon: 'success' })
      
      track('activity_checkin', { activityId: activity._id, from: 'calendar' })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ 
        title: mapError(error.code || error.message), 
        icon: 'none' 
      })
    }
  },

  // 更新日历中活动的状态
  updateCalendarActivityStatus(activityId, isRegistered) {
    const updatedActivities = this.data.calendarActivities.map(activity => {
      if (activity._id === activityId) {
        return {
          ...activity,
          isRegistered,
          registeredCount: isRegistered ? 
            (activity.registeredCount || 0) + 1 : 
            Math.max(0, (activity.registeredCount || 0) - 1),
          canRegister: !isRegistered && activity.canRegister
        }
      }
      return activity
    })
    
    this.setData({ calendarActivities: updatedActivities })
  },

  // 处理日历空状态操作
  onCalendarEmptyAction() {
    if (this.data.searchKeyword) {
      // 清除搜索条件
      this.clearSearch()
    } else {
      // 回到今天
      const today = new Date()
      this.setData({
        selectedDate: today.toISOString().split('T')[0]
      })
      this.loadCalendarData()
    }
  },


  // 处理列表空状态操作（已存在，但需要确保存在）
  onEmptyAction() {
    if (this.data.searchKeyword) {
      this.clearSearch()
    } else {
      this.refreshData()
    }
  },

  // 处理错误反馈（确保存在）
  onErrorFeedback() {
    wx.showToast({
      title: '感谢反馈，我们会及时处理',
      icon: 'none'
    })
  }
})
