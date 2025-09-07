import { api, callWithRetry, mapError } from '../../services/api'

Page({
  data: {
    // 主题配置
    theme: {
      headerBg: 'nav-header--green'
    },
    isRefreshing: false,
    // 搜索与筛选
    keyword: '',
    filterKey: 'all', // all | withId | noId
    fromDate: '',
    toDate: '',
    // 初始筛选项
    statusFilters: [
      { key: 'inhouse', text: '在住', active: false },
      { key: 'upcoming', text: '即将出院', active: false },
      { key: 'discharged', text: '已出院', active: false }
    ],
    ageFilters: [
      { key: '0-3', text: '0-3岁', active: false },
      { key: '4-6', text: '4-6岁', active: false },
      { key: '7-12', text: '7-12岁', active: false },
      { key: '13-18', text: '13-18岁', active: false }
    ],
    activeFilterCount: 0,
    showAdvancedFilter: false,
    // 顶部状态 tabs（占位：后端支持后再填充）
    tabs: [
      { key: 'all', text: '全部' },
      { key: 'inhouse', text: '在住' },
      { key: 'upcoming', text: '即将出院' },
      { key: 'history', text: '历史' }
    ],
    tabKey: 'all',
    // 列表状态
    list: [],
    allList: [],
    starredList: [],
    inhouseList: [],
    historyList: [],
    page: 1,
    hasMore: true,
    loading: false,
    // 统计
    stats: { patients: 0 },
    // 本地标星
    starred: {},
    // 快速筛选
    quickTabs: [
      { key: 'all', text: '全部', emoji: '📋', count: 0 },
      { key: 'starred', text: '优先关注', emoji: '⭐', count: 0 },
      { key: 'inhouse', text: '在住', emoji: '🏠', count: 0 },
      { key: 'newAdmission', text: '新入住', emoji: '🆕', count: 0 },
      { key: 'discharge', text: '关注出院', emoji: '📤', count: 0 }
    ],
    activeQuickFilter: 'all',
    starredExpanded: true,
    historyExpanded: false,
    currentBuilding: '1号楼',
    showQuickActions: false,
    // 空态
    showEmptyState: false,
    emptyTitle: '暂无数据',
    emptySubtitle: '试试调整筛选或添加新档案',
    showEmptyAction: true,
    emptyActionText: '重新加载',
    emptyActionHandler: 'loadPatientData'
  },
  onShow(){
    // 首次或返回时刷新头部统计，但不打断列表
    this.loadStats()
    this.loadStarred()
    this.updateQuickFilterCounts()
    try { const tb = this.getTabBar && this.getTabBar(); if (tb && tb.setActiveByRoute) tb.setActiveByRoute('/pages/patients/index') } catch(_) {}
    this.syncRoleToTabbar()
  },
  async syncRoleToTabbar(){
    try { const prof = await require('../../services/api').api.users.getProfile(); const tb = this.getTabBar && this.getTabBar(); if (tb && tb.setRole) tb.setRole(prof.role || 'social_worker') } catch(_) {}
  },
  onLoad(){
    // 恢复缓存状态
    const cached = wx.getStorageSync('patients_list_state')
    if (cached && cached.starredList) {
      this.setData({ 
        starredList: cached.starredList || [],
        inhouseList: cached.inhouseList || [],
        historyList: cached.historyList || []
      })
    } else {
      this.loadPatientData(true)
    }
  },
  onUnload(){
    // 缓存当前列表状态
    const { starredList, inhouseList, historyList, keyword, fromDate, toDate, activeQuickFilter } = this.data
    wx.setStorageSync('patients_list_state', { 
      starredList, inhouseList, historyList, 
      keyword, fromDate, toDate, activeQuickFilter 
    })
  },
  async loadStats(){
    try {
      const res = await callWithRetry('stats','counts',{ collections: ['Patients'] })
      this.setData({ 'stats.patients': res.Patients || 0 })
    } catch(e) { /* 忽略统计错误 */ }
  },
  onInput(e){
    const keyword = e.detail.value
    this.setData({ keyword })
    
    if (keyword.trim()) {
      // 显示搜索结果
      clearTimeout(this._debounce)
      this._debounce = setTimeout(() => this.performSearch(keyword), 300)
    } else {
      // 清空搜索，回到分组显示
      this.setData({ 
        showSearchResults: false,
        searchResults: [],
        searchResultCount: 0
      })
      this.loadPatientData(false)
    }
  },
  setFromDate(e){ 
    this.setData({ fromDate: e.detail.value })
    this.updateActiveFilterCount()
    this.loadPatientData(true) 
  },
  setToDate(e){ 
    this.setData({ toDate: e.detail.value })
    this.updateActiveFilterCount()
    this.loadPatientData(true) 
  },
  
  setQuickFilter(e){
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeQuickFilter) return
    this.setData({ activeQuickFilter: key })
    this.applyQuickFilter(key)
  },
  
  // 高级筛选相关方法
  toggleAdvancedFilter(){
    this.setData({ showAdvancedFilter: !this.data.showAdvancedFilter })
  },
  
  toggleStatusFilter(e){
    const key = e.currentTarget.dataset.key
    const filters = this.data.statusFilters.map(f => 
      f.key === key ? { ...f, active: !f.active } : f
    )
    this.setData({ statusFilters: filters })
    this.updateActiveFilterCount()
  },
  
  toggleAgeFilter(e){
    const key = e.currentTarget.dataset.key
    const filters = this.data.ageFilters.map(f => 
      f.key === key ? { ...f, active: !f.active } : f
    )
    this.setData({ ageFilters: filters })
    this.updateActiveFilterCount()
  },
  
  resetFilters(){
    this.setData({
      statusFilters: this.data.statusFilters.map(f => ({...f, active: false})),
      ageFilters: this.data.ageFilters.map(f => ({...f, active: false})),
      fromDate: '',
      toDate: '',
      activeFilterCount: 0
    })
    this.loadPatientData(true)
  },
  
  applyFilters(){
    this.setData({ showAdvancedFilter: false })
    this.loadPatientData(true)
  },
  
  updateActiveFilterCount(){
    const statusActive = (this.data.statusFilters || []).filter(f => f.active).length
    const ageActive = (this.data.ageFilters || []).filter(f => f.active).length
    const dateActive = (this.data.fromDate ? 1 : 0) + (this.data.toDate ? 1 : 0)
    this.setData({ activeFilterCount: statusActive + ageActive + dateActive })
  },
  buildAdvancedFilter(){
    const filter = {}
    
    // 时间筛选
    if (this.data.fromDate) filter.createdFrom = Date.parse(this.data.fromDate)
    if (this.data.toDate) {
      const d = new Date(this.data.toDate)
      filter.createdTo = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999).getTime()
    }
    
    // 状态筛选
    const activeStatuses = this.data.statusFilters.filter(f => f.active).map(f => f.key)
    if (activeStatuses.length > 0) {
      filter.status = { $in: activeStatuses }
    }
    
    return filter
  },
  
  async loadPatientData(reset=false){
    if (this.data.loading) return
    this.setData({ loading: true })
    
    try {
      const filter = this.buildAdvancedFilter()
      const resp = await api.patients.list({ 
        page: 1, 
        pageSize: 100, // 加载更多数据用于分组
        filter, 
        sort: { createdAt: -1 } 
      })
      
      const items = Array.isArray(resp) ? resp : (resp && resp.items) || []
      const processedItems = items.map(x => this.processPatientItem(x))
      
      // 分组数据
      this.categorizePatients(processedItems)
      // 兜底：记录全部列表用于“全部”分组展示
      this.setData({ allList: processedItems })
      this.updateQuickFilterCounts()
      
      // 检查空状态
      const totalCount = processedItems.length
      this.setData({
        showEmptyState: totalCount === 0 && !this.data.keyword,
        // ‘全部’计数优先使用当前筛选后的数量，避免与数据库总量不一致
        'stats.patients': totalCount
      })
      
    } catch (e) {
      wx.showToast({ icon: 'none', title: mapError(e.code || 'E_INTERNAL') })
      this.setData({ 
        showEmptyState: true,
        emptyTitle: '数据加载失败',
        emptySubtitle: '请检查网络连接后重试',
        emptyActionText: '重新加载',
        emptyActionHandler: 'loadPatientData'
      })
    } finally {
      this.setData({ loading: false })
    }
  },
  onPullDownRefresh(){
    this.loadPatientData(true)
    wx.stopPullDownRefresh()
  },
  
  onReachBottom(){ 
    if (this.data.activeQuickFilter === 'history' && this.data.hasMoreHistory) {
      this.loadMoreHistory()
    }
  },
  toDetail(e){
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/patients/detail?id=${id}` })
  },
  toNew(){ wx.navigateTo({ url: '/pages/patients/form' }) },
  toService(e){
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/services/form?pid=${id}` })
  },
  toTenancy(e){
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/tenancies/form?pid=${id}` })
  },
  // 标星
  loadStarred(){
    try {
      const s = wx.getStorageSync('star_patients') || {}
      this.setData({ starred: s && typeof s==='object' ? s : {} })
    } catch(_){}
  },
  toggleStar(e){
    const id = e.currentTarget.dataset.id
    const s = { ...(this.data.starred || {}) }
    s[id] = !s[id]
    this.setData({ starred: s })
    try { wx.setStorageSync('star_patients', s) } catch(_){ }
  },
  // 处理患者数据项
  processPatientItem(x){
    const name = x.name || '未命名'
    const maskedName = this.maskPatientName(name)
    const ageText = this.calcAge(x.birthDate)
    const isStarred = this.data.starred[x._id]
    
    return {
      ...x,
      initial: name.slice(0,1),
      maskedName,
      ageText,
      createdAtText: x.createdAt ? this.formatDate(x.createdAt) : '',
      
      // 床位信息
      bedInfo: this.buildBedInfo(x),
      
      // 入住天数
      admissionDays: this.calcAdmissionDays(x.lastCheckInDate),
      
      // 诊断和状态
      mainDiagnosis: x.hospitalDiagnosis || '待确诊',
      treatmentStatus: x.treatmentStatus || '治疗中',
      statusText: this.getStatusText(x),
      statusClass: this.getStatusClass(x),
      
      // 补助信息
      subsidyAmount: x.subsidyAmount || 0,
      
      // 是否新入住（7天内）
      isNewAdmission: this.isNewAdmission(x.lastCheckInDate),
      
      // 最近服务
      recentService: this.getRecentService(x),
      
      // 出院信息（用于历史档案）
      dischargeInfo: this.getDischargeInfo(x),
      
      // 是否已加星标
      isStarred
    }
  },
  calcAge(iso){
    if (!iso) return ''
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ''
      const t = new Date()
      let age = t.getFullYear() - d.getFullYear()
      const m = t.getMonth() - d.getMonth()
      if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--
      return age >= 0 ? `${age}岁` : ''
    } catch { return '' }
  },
  // 数据分组方法
  categorizePatients(patients){
    const starred = patients.filter(p => this.data.starred[p._id])
    const inhouse = patients.filter(p => p.status === 'inhouse' && !this.data.starred[p._id])
    const history = patients.filter(p => p.status === 'discharged')
    
    this.setData({
      starredList: starred,
      inhouseList: inhouse, 
      historyList: history.slice(0, 5), // 只显示最近5个历史档案
      hasMoreHistory: history.length > 5
    })
  },
  
  // 快速筛选方法
  applyQuickFilter(filterKey){
    switch(filterKey) {
      case 'starred':
        this.setData({ 
          starredExpanded: true,
          historyExpanded: false 
        })
        break
      case 'inhouse':
        this.setData({ 
          starredExpanded: false,
          historyExpanded: false 
        })
        break
      case 'history':
        this.setData({ 
          starredExpanded: false,
          historyExpanded: true 
        })
        break
      default:
        this.setData({ 
          starredExpanded: true,
          historyExpanded: false 
        })
    }
  },
  
  // 更新快速筛选计数
  updateQuickFilterCounts(){
    const starredCount = Object.keys(this.data.starred || {}).length
    const inhouseArr = this.data.inhouseList || []
    const inhouseCount = inhouseArr.length
    const newAdmissionCount = inhouseArr.filter(p => p && p.isNewAdmission).length
    const dischargeCount = inhouseArr.filter(p => p && p.statusClass === 'discharge').length

    const quickTabs = (this.data.quickTabs || []).map(tab => {
      switch(tab.key) {
        case 'all': return {...tab, count: (this.data.allList || []).length}
        case 'starred': return {...tab, count: starredCount}
        case 'inhouse': return {...tab, count: inhouseCount}
        case 'newAdmission': return {...tab, count: newAdmissionCount}
        case 'discharge': return {...tab, count: dischargeCount}
        default: return tab
      }
    })
    
    this.setData({ quickTabs })
  },
  // 搜索相关方法
  async performSearch(keyword){
    if (!keyword.trim()) return
    
    this.setData({ loading: true })
    
    try {
      const filter = {}
      if (/^[0-9Xx]{4}$/.test(keyword)) {
        filter.id_card_tail = keyword
      } else {
        filter.name = keyword
      }
      
      const resp = await api.patients.list({ 
        page: 1, 
        pageSize: 50, 
        filter, 
        sort: { createdAt: -1 } 
      })
      
      const items = Array.isArray(resp) ? resp : (resp && resp.items) || []
      const searchResults = items.map(x => {
        const processed = this.processPatientItem(x)
        return {
          ...processed,
          highlightedName: this.highlightSearchTerm(processed.maskedName, keyword),
          matchType: this.getMatchType(x, keyword),
          matchContext: this.getMatchContext(x, keyword)
        }
      })
      
      this.setData({
        showSearchResults: true,
        searchResults,
        searchResultCount: searchResults.length
      })
      
    } catch (e) {
      wx.showToast({ icon: 'none', title: '搜索失败: ' + mapError(e.code || 'E_INTERNAL') })
    } finally {
      this.setData({ loading: false })
    }
  },
  // 界面交互方法
  focusSearch(){
    // 聚焦搜索框
    const query = wx.createSelectorQuery()
    query.select('#searchInput').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        // 模拟点击搜索框
        wx.showToast({
          title: '请在搜索框中输入关键词',
          icon: 'none',
          duration: 1500
        })
      }
    })
  },
  
  clearSearch(){
    this.setData({ 
      keyword: '',
      showSearchResults: false,
      searchResults: [],
      searchResultCount: 0
    })
    this.loadPatientData(false)
  },
  
  performSearchConfirm(){
    if (this.data.keyword.trim()) {
      this.performSearch(this.data.keyword)
    }
  },
  
  getNewAdmissionCount(){
    return (this.data.inhouseList || []).filter(p => p && p.isNewAdmission).length
  },
  
  toggleStarredExpand(){
    this.setData({ starredExpanded: !this.data.starredExpanded })
  },
  
  toggleHistoryExpand(){
    this.setData({ historyExpanded: !this.data.historyExpanded })
  },
  
  loadMoreHistory(){
    // 加载更多历史档案的逻辑
    console.log('加载更多历史档案')
  },
  
  switchBuilding(){
    // 切换楼栋的逻辑
    const buildings = ['1号楼', '2号楼', '3号楼', '4号楼']
    const currentIndex = buildings.indexOf(this.data.currentBuilding)
    const nextIndex = (currentIndex + 1) % buildings.length
    this.setData({ currentBuilding: buildings[nextIndex] })
    this.loadPatientData(true)
  },
  
  // 快速操作
  contactFamily(e){
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '联系家属',
      content: '是否要拨打紧急联系人电话？',
      success: (res) => {
        if (res.confirm) {
          // 这里应该获取患者的紧急联系人电话
          wx.makePhoneCall({ phoneNumber: '138****5678' })
        }
      }
    })
  },
  
  editPatient(e){
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/patients/form?id=${id}` })
  },
  
  showAdvancedSearch(){
    this.setData({ showAdvancedFilter: true })
  },
  
  showStats(){
    wx.navigateTo({ url: '/pages/stats/index' })
  },
  
  refreshData(){
    if (this.data.isRefreshing) return
    
    this.setData({ isRefreshing: true })
    
    // 重新加载数据
    this.loadPatientData(true).finally(() => {
      setTimeout(() => {
        this.setData({ isRefreshing: false })
      }, 1000)
    })
  },
  
  showSettings(){
    wx.navigateTo({ url: '/pages/settings/index' })
  },
  
  stopPropagation(){
    // 阻止事件冒泡
  },
  
  hideQuickActions(){
    this.setData({ showQuickActions: false })
  },
  
  bulkExport(){
    wx.showToast({ title: '批量导出功能开发中', icon: 'none' })
  },
  
  bulkMessage(){
    wx.showToast({ title: '群发消息功能开发中', icon: 'none' })
  },
  
  showStatistics(){
    wx.navigateTo({ url: '/pages/stats/index' })
  },
  
  // 工具方法
  maskPatientName(name){
    if (!name || name.length < 2) return name
    if (name.length === 2) return name[0] + '*'
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
  },
  
  buildBedInfo(patient){
    const building = patient.building || '3号楼'
    const room = patient.room || '未分配'
    const bed = patient.bed || ''
    return `${building}${room}${bed ? bed + '床' : ''}`
  },
  
  calcAdmissionDays(checkInDate){
    if (!checkInDate) return 0
    const checkIn = new Date(checkInDate)
    const now = new Date()
    const diffTime = Math.abs(now - checkIn)
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  },
  
  getStatusText(patient){
    switch(patient.status) {
      case 'inhouse': return '在住'
      case 'discharged': return '已出院'
      case 'temporary_leave': return '请假外出'
      default: return '状态未知'
    }
  },
  
  getStatusClass(patient){
    if (patient.dischargeDate) {
      const discharge = new Date(patient.dischargeDate)
      const now = new Date()
      const daysUntilDischarge = Math.ceil((discharge - now) / (1000 * 60 * 60 * 24))
      if (daysUntilDischarge <= 7) return 'discharge'
    }
    return patient.status || 'unknown'
  },
  
  isNewAdmission(checkInDate){
    if (!checkInDate) return false
    const checkIn = new Date(checkInDate)
    const now = new Date()
    const daysSinceAdmission = Math.ceil((now - checkIn) / (1000 * 60 * 60 * 24))
    return daysSinceAdmission <= 7
  },
  
  getRecentService(patient){
    // 这里应该从患者数据中获取最近的服务记录
    return patient.recentService || '暂无服务记录'
  },
  
  getDischargeInfo(patient){
    if (patient.dischargeDate) {
      return `出院于 ${this.formatDate(patient.dischargeDate)}`
    }
    return '住院中'
  },
  
  highlightSearchTerm(text, term){
    // 简单的高亮实现，实际应用中可以使用更复杂的高亮逻辑
    return text.replace(new RegExp(term, 'gi'), `<em>$&</em>`)
  },
  
  getMatchType(patient, keyword){
    if (patient.name && patient.name.includes(keyword)) return '姓名匹配'
    if (patient.id_card && patient.id_card.includes(keyword)) return '证件匹配'
    if (patient.hospitalDiagnosis && patient.hospitalDiagnosis.includes(keyword)) return '诊断匹配'
    return '相关匹配'
  },
  
  getMatchContext(patient, keyword){
    // 返回匹配的上下文信息
    if (patient.hospitalDiagnosis && patient.hospitalDiagnosis.includes(keyword)) {
      return patient.hospitalDiagnosis
    }
    return patient.nativePlace || ''
  },
  
  formatDate(ts){
    try { 
      const d = new Date(typeof ts==='number'? ts : Number(ts))
      const y=d.getFullYear()
      const m=String(d.getMonth()+1).padStart(2,'0')
      const dd=String(d.getDate()).padStart(2,'0')
      return `${y}-${m}-${dd}` 
    } catch(e){ 
      return '' 
    }
  }
})
