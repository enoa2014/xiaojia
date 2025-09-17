import { callWithRetry, mapError } from '../../services/api'
import { applyThemeByRole } from '../../services/theme'
import { track } from '../../services/analytics'

Page({
  data: {
    user: {
      name: '李社工',
      roleName: '社工',
      roleKey: '',
      status: null,
      avatar: '🧑‍💼',
      permText: '档案管理 • 服务审核',
      todayDone: 5,
      todayTotal: 12,
      now: ''
    },
    // 角色主题（按设计稿：不同角色不同色系）
    theme: { headerBg: 'nav-header--green', userBg: 'user-status--green', userBorder: 'user-status--green-border', text: 'theme-text--green' },
    actions: [],
    stats: [],
    // 顶部工具栏
    notifications: 3,
    isRefreshing: false,
    // 快速操作选中高亮
    selectedActionKey: null,
    tasks: [
      { id: 't1', title: '李小明档案权限待审批', desc: '申请时间: 09:15  剩余: 6小时', color: '#F59E0B' },
      { id: 't2', title: '王大伟入住申请待处理', desc: '提交时间: 昨天  优先级: 高', color: '#EF4444' },
      { id: 't3', title: '周末亲子活动报名即将截止', desc: '截止: 明天18:00  已报12人', color: '#22C55E' }
    ],
    updates: [
      { id: 'u1', time: '15:30', text: '陈志愿者 提交了探访记录' },
      { id: 'u2', time: '14:45', text: '活动“康复训练”状态变更' },
      { id: 'u3', time: '13:20', text: '新患者“赵小朋友”建档完成' }
    ]
  },
  onLoad(){
    this.setData({ loading: true })
    this.refreshData()
    // 恢复调试身份
    try {
      const role = wx.getStorageSync('debug_role')
      if (role && role.name) {
        this.setData({ 'user.roleName': role.name, 'user.avatar': role.avatar, 'user.roleKey': role.key })
        this.applyRole(role.key)
      }
    } catch(_) {}
    // 写入/同步用户档案（若无则写入“李社工”占位）
    this.ensureUserProfile()
  },
  onShow() {
    applyThemeByRole(this)
    const now = this.formatNow()
    this.setData({ 'user.now': now })
    // 同步用户资料与角色
    this.syncRoleFromServer()
    // 使用统一的 TabBar 同步方法
    try {
      const { syncTabBar } = require('../../components/utils/tabbar-simple')
      syncTabBar('/pages/index/index')
    } catch (error) {
      console.warn('Failed to load tabbar utils:', error)
      // 回退到简单的选中态设置
      try { 
        const tb = this.getTabBar && this.getTabBar()
        if (tb && tb.setActiveByRoute) tb.setActiveByRoute('/pages/index/index')
      } catch(_) {}
    }
  },
  async ensureUserProfile(){
    try {
      const prof = await require('../../services/api').api.users.getProfile()
      
      // 如果用户有角色，才设置对应的名称
      if (prof?.role) {
        if (!prof?.name) {
          const roleNameMap = {
            admin: '管理员',
            social_worker: '社工',
            volunteer: '志愿者', 
            parent: '家长'
          }
          const defaultName = roleNameMap[prof.role] || '用户'
          try { await require('../../services/api').api.users.setProfile({ name: defaultName, avatar: '🙂' }) } catch(_) {}
          this.setData({ 'user.name': defaultName })
        } else {
          this.setData({ 'user.name': prof.name })
        }
      } else {
        // 没有角色的用户设置为访客状态
        this.setData({ 'user.name': '访客' })
      }
      
      await this.syncRoleFromServer()
    } catch(_) { /* 忽略错误，保持本地占位 */ }
  },
  onPullDownRefresh(){
    this.refreshData(true)
  },
  async refreshData(stopPullDown){
    try {
      // 模拟数据聚合加载延迟
      await new Promise(r => setTimeout(r, 200))
      // TODO: 可接入真实聚合接口，填充 actions/stats/tasks/updates
      const roleKey = this.data && this.data.user && this.data.user.roleKey
      if (roleKey) await this.loadHomeSummary(roleKey)
    } finally {
      this.setData({ loading: false })
      if (stopPullDown) wx.stopPullDownRefresh()
    }
  },
  // 顶部刷新按钮
  async refreshTap(){
    if (this.data.isRefreshing) return
    this.setData({ isRefreshing: true })
    try {
      await this.refreshData()
    } finally {
      this.setData({ isRefreshing: false })
    }
  },
  computeActions(roleKey){
    // 对齐 docs/uiux/xiaojia_homepage.tsx 的角色快速入口
    const map = {
      admin: [
        { key: 'global-search', icon: '🔎', title: '全局搜索', subtitle: '跨域查询' },
        { key: 'perm-approval', icon: '🛡️', title: '权限审批', subtitle: '待处理' },
        { key: 'system-stats', icon: '📊', title: '系统统计', subtitle: '实时监控' },
        { key: 'settings', icon: '⚙️', title: '系统设置', subtitle: '配置管理' }
      ],
      social_worker: [
        { key: 'patient-files', icon: '📁', title: '档案管理', subtitle: '新建/编辑' },
        { key: 'service-review', icon: '✅', title: '服务审核', subtitle: '待审核' },
        { key: 'activity-manage', icon: '📅', title: '活动组织', subtitle: '创建/管理' },
        { key: 'family-contact', icon: '📞', title: '家属联系', subtitle: '紧急联系人' }
      ],
      volunteer: [
        { key: 'service-record', icon: '❤️', title: '服务记录', subtitle: '快速填写' },
        { key: 'patient-view', icon: '🧑‍🤝‍🧑', title: '档案查看', subtitle: '脱敏显示' },
        { key: 'my-activities', icon: '📅', title: '我的活动', subtitle: '已报名' },
        { key: 'service-guide', icon: '📘', title: '服务指南', subtitle: '操作手册' }
      ],
      parent: [
        { key: 'my-child', icon: '🧒', title: '我的孩子', subtitle: '' },
        { key: 'service-progress', icon: '📄', title: '服务记录', subtitle: '查看进展' },
        { key: 'family-activities', icon: '🧩', title: '亲子活动', subtitle: '可参与' },
        { key: 'community', icon: '💬', title: '互助社区', subtitle: '经验分享' }
      ]
    }
    return map[roleKey] || []
  },
  computeStats(roleKey){
    const map = {
      admin: [
        { key: 'sys', icon: '✅', label: '系统状态', value: '正常', change: '' },
        { key: 'online', icon: '👥', label: '在线用户', value: '12人', change: '+2' },
        { key: 'pending', icon: '⚠️', label: '待处理事项', value: '5个', change: '-1' },
        { key: 'sync', icon: '🔄', label: '数据同步', value: '2分钟前', change: '' }
      ],
      social_worker: [
        { key: 'work', icon: '📈', label: '今日工作量', value: '8/15', change: '' },
        { key: 'review', icon: '⏳', label: '待审核', value: '2个', change: '-1' },
        { key: 'patients', icon: '📁', label: '本月档案', value: '23个', change: '+8' },
        { key: 'activities', icon: '📅', label: '活动组织', value: '3个', change: '+1' }
      ],
      volunteer: [
        { key: 'svc', icon: '❤️', label: '本月服务', value: '12次', change: '+3' },
        { key: 'next', icon: '📅', label: '下次活动', value: '周三', change: '' },
        { key: 'hours', icon: '⏱️', label: '服务时长', value: '24小时', change: '+4h' },
        { key: 'score', icon: '⭐', label: '志愿评分', value: '4.9', change: '+0.1' }
      ],
      parent: [
        { key: 'child', icon: '🧒', label: '关注患者', value: '1人', change: '' },
        { key: 'latest', icon: '⏰', label: '最新服务', value: '2小时前', change: '' },
        { key: 'join', icon: '🧩', label: '参与活动', value: '5次', change: '+1' },
        { key: 'points', icon: '🌟', label: '社区积分', value: '156', change: '+12' }
      ]
    }
    return map[roleKey] || []
  },
  computePermText(roleKey){
    const map = {
      admin: '权限审批 • 系统统计 • 配置管理',
      social_worker: '档案管理 • 服务审核 • 活动组织',
      volunteer: '服务记录 • 档案查看 • 我的活动',
      parent: '我的孩子 • 服务进展 • 亲子活动'
    }
    return map[roleKey] || '正常 ✅'
  },
  computeTheme(roleKey){
    const map = {
      admin:   { headerBg: 'nav-header--purple', userBg: 'user-status--purple', userBorder: 'user-status--purple-border', text: 'theme-text--purple' },
      social_worker: { headerBg: 'nav-header--blue', userBg: 'user-status--blue', userBorder: 'user-status--blue-border', text: 'theme-text--blue' },
      volunteer: { headerBg: 'nav-header--orange', userBg: 'user-status--orange', userBorder: 'user-status--orange-border', text: 'theme-text--orange' },
      parent:  { headerBg: 'nav-header--pink', userBg: 'user-status--pink', userBorder: 'user-status--pink-border', text: 'theme-text--pink' }
    }
    return map[roleKey] || { headerBg: 'nav-header--green', userBg: 'user-status--green', userBorder: 'user-status--green-border', text: 'theme-text--green' }
  },
  applyRole(roleKey){
    // Apply theme and actions immediately; stats/perm/notifications will refresh from server
    try { const app = getApp && getApp(); if (app) app.globalData = Object.assign({}, app.globalData, { roleKey }) } catch(_) {}
    this.setData({
      actions: this.computeActions(roleKey),
      theme: this.computeTheme(roleKey)
    })
    // Fallback text until server returns
    this.setData({ 'user.permText': this.computePermText(roleKey) })
    // Load real summary
    this.loadHomeSummary(roleKey)
    // Update native nav bar color
    try {
      const navColor = this.computeNavColor(roleKey)
      wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: navColor })
    } catch(_) {}
    // Update custom tabbar items and active state
    try {
      const tb = this.getTabBar && this.getTabBar()
      if (tb && tb.setRole) {
        tb.setRole(roleKey)
        tb.setActiveByRoute('/pages/index/index')
      }
    } catch(_) {}
  },
  computeNavColor(roleKey){
    const map = {
      admin: '#7C3AED',
      social_worker: '#2563EB',
      volunteer: '#F97316',
      parent: '#EC4899'
    }
    return map[roleKey] || '#16A34A'
  },
  async loadHomeSummary(roleKey){
    try {
      const { homeSummary } = require('../../services/api').api.stats
      const data = await homeSummary({ role: roleKey })
      if (data && data.items) this.setData({ stats: data.items })
      if (typeof data?.notifications === 'number') this.setData({ notifications: data.notifications })
      if (data?.permText) this.setData({ 'user.permText': data.permText })
    } catch (e) {
      // swallow, keep fallback UI
    }
  },
  formatNow() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,'0')
    const mm = String(d.getMinutes()).padStart(2,'0')
    return `${hh}:${mm}`
  },
  wip() {
    wx.showToast({ icon: 'none', title: '施工中，敬请期待' })
  },
  
  showAllActions() {
    const allActions = this.data.actions
    if (allActions.length <= 4) return
    
    const itemList = allActions.map(action => action.title)
    const { showActionSheetSafe } = require('../../services/ui')
    showActionSheetSafe({ itemList }).then(res => {
      if (!res) return
      const selectedAction = allActions[res.tapIndex]
      if (selectedAction) {
        this.onAction({ currentTarget: { dataset: { key: selectedAction.key } } })
      }
    })
  },
  async onAction(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ selectedActionKey: key })
    
    // 游客模式特殊处理
    const userMode = wx.getStorageSync('user_mode')
    if (userMode === 'guest') {
      this.handleGuestAction(key)
      return
    }
    
    switch (key) {
      // 管理员入口
      case 'global-search':
        wx.navigateTo({ url: '/pages/patients/index' })
        break
      case 'perm-approval':
        wx.navigateTo({ url: '/pages/approvals/index' })
        break
      case 'system-stats':
        wx.navigateTo({ url: '/pages/stats/index' })
        break
      case 'settings':
        this.wip(); break
      // 社工入口
      case 'patient-files':
        wx.navigateTo({ url: '/pages/patients/index' })
        break
      case 'service-review':
        wx.navigateTo({ url: '/pages/services/index' })
        break
      case 'activity-manage':
        wx.navigateTo({ url: '/pages/activities/index' })
        break
      case 'family-contact':
        this.wip(); break
      // 志愿者入口
      case 'service-record':
        wx.navigateTo({ url: '/pages/services/form' })
        break
      case 'patient-view':
        wx.navigateTo({ url: '/pages/patients/index' })
        break
      case 'my-activities':
        wx.navigateTo({ url: '/pages/activities/index' })
        break
      case 'service-guide':
        this.wip(); break
      // 家长入口
      case 'my-child':
        this.wip(); break
      case 'service-progress':
        wx.navigateTo({ url: '/pages/services/index' })
        break
      case 'family-activities':
        wx.navigateTo({ url: '/pages/activities/index' })
        break
      case 'community':
        this.wip(); break
      default:
        this.wip()
    }
  },
  async loadPatientsDemo() {
    try {
      const list = await callWithRetry('patients','list',{ page: 1, pageSize: 5 })
      wx.showToast({ icon: 'none', title: `示例载入${list.length}条` })
    } catch (e) {
      wx.showToast({ icon: 'none', title: mapError(e.code) })
      console.error(e)
    }
  }
  ,
  // 调试用：切换身份（管理员/社工/志愿者/家长）
  openRoleSwitcher(){
    const roles = [
      { key:'admin', name:'管理员', avatar:'👩‍💼' },
      { key:'social_worker', name:'社工', avatar:'🧑‍💼' },
      { key:'volunteer', name:'志愿者', avatar:'🙋' },
      { key:'parent', name:'家长', avatar:'👨‍👩‍👧' }
    ]
    const itemList = roles.map(r => r.name)
    const { showActionSheetSafe } = require('../../services/ui')
    showActionSheetSafe({ itemList }).then(res => {
      if (!res) return
      const idx = res.tapIndex
      const r = roles[idx]
      if (!r) return
      this.setData({ 'user.roleName': r.name, 'user.avatar': r.avatar, 'user.roleKey': r.key })
      this.applyRole(r.key)
      try { require('../../components/utils/auth').setUserRoles([r.key]) } catch(_) {}
      try { wx.setStorageSync('debug_role', r) } catch(_) {}
      // 同步到云端 Users 集合（用于后端 RBAC）
      wx.cloud.callFunction({ name: 'users', data: { action: 'setRole', payload: { role: r.key } } })
        .then(() => wx.showToast({ icon:'none', title: `已切换为${r.name}` }))
        .catch(err => wx.showToast({ icon:'none', title: (err && err.code) ? err.code : '网络异常' }))
    })
  },
  async syncRoleFromServer(){
    try {
      const prof = await require('../../services/api').api.users.getProfile()
      const map = {
        admin: { name:'管理员', avatar:'👩‍💼' },
        social_worker: { name:'社工', avatar:'🧑‍💼' },
        volunteer: { name:'志愿者', avatar:'🙋' },
        parent: { name:'家长', avatar:'👨‍👩‍👧' }
      }
      const m = map[prof.role]
      if (m) {
        this.setData({ 'user.roleName': m.name, 'user.avatar': prof.avatar || m.avatar, 'user.roleKey': prof.role, 'user.name': prof.name || this.data.user.name, 'user.status': prof.status || null })
        this.applyRole(prof.role)
        try { require('../../components/utils/auth').setUserRoles(prof.roles && Array.isArray(prof.roles) ? prof.roles : (prof.role ? [prof.role] : [])) } catch(_) {}
        try { wx.setStorageSync('debug_role', { key: prof.role, ...m }) } catch(_) {}
        try { track('home_profile_load', { result: 'OK', role: prof.role || null, status: prof.status || null }) } catch(_) {}
      }
      else {
        // 无角色：保留占位并写入状态
        this.setData({ 'user.status': prof.status || null, 'user.roleKey': '' })
        try { track('home_profile_load', { result: 'OK', role: null, status: prof.status || null }) } catch(_) {}
      }
    } catch(_) {}
  },

  // 游客模式操作处理
  handleGuestAction(key) {
    switch (key) {
      case 'activities-public':
        wx.switchTab({ url: '/pages/activities/index' })
        break
      case 'register-now':
        wx.redirectTo({ url: '/pages/welcome/index' })
        break
      case 'about-platform':
      case 'contact-us':
        wx.showToast({ icon: 'none', title: '功能开发中，敬请期待' })
        break
      default:
        this.wip()
    }
  },

  exitGuestMode() {
    // 退出游客模式，跳转到欢迎页
    try {
      wx.removeStorageSync('user_mode')
    } catch(_) {}
    wx.redirectTo({ url: '/pages/welcome/index' })
  },

  // 登出功能
  onLogout() {
    wx.showModal({
      title: '确认登出',
      content: '您确定要退出当前账号吗？',
      confirmText: '登出',
      confirmColor: '#DC2626',
      success: (res) => {
        if (res.confirm) {
          this.performLogout()
        }
      }
    })
  },

  async performLogout() {
    try {
      // 显示加载状态
      wx.showLoading({ title: '退出中...' })
      
      // 在服务器端清除用户状态
      try {
        await require('../../services/api').api.users.logout()
      } catch(_) {
        // 如果服务器登出失败，继续进行本地清除
        console.warn('Server logout failed, proceeding with local logout')
      }
      
      // 清除所有本地存储的用户相关数据
      try {
        wx.clearStorageSync() // 清除所有本地存储
      } catch(_) {
        // 如果clearStorageSync失败，逐个清除
        try {
          wx.removeStorageSync('debug_role')
          wx.removeStorageSync('user_mode')
          wx.removeStorageSync('userProfile')
          wx.removeStorageSync('userRole')
          wx.removeStorageSync('user_roles')
        } catch(_) {}
      }
      
      // 清除全局用户状态
      try { 
        const app = getApp && getApp()
        if (app && app.globalData) {
          app.globalData.roleKey = null
          app.globalData.userInfo = null
        }
      } catch(_) {}
      
      // 清除用户认证组件状态
      try { 
        require('../../components/utils/auth').clearUserRoles()
      } catch(_) {}
      
      wx.hideLoading()
      wx.showToast({ icon: 'success', title: '已退出登录' })
      
      // 立即跳转到登录页面，避免欢迎页的自动登录检查
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/auth/register/index' })
      }, 800)
      
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ icon: 'error', title: '退出失败，请重试' })
      console.error('Logout error:', error)
    }
  }
})
