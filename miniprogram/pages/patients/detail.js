import { api, callWithRetry, mapError } from '../../services/api'

Page({
  data: {
    // 基础数据
    id: '',
    loading: true,
    error: null,
    patient: null,
    
    // 主题配置
    theme: {
      headerBg: 'nav-header--green'
    },
    
    // 权限与状态
    role: null,
    canEdit: false,
    canManage: false,
    canShare: false,
    canViewMedical: true,
    starred: false,
    inResidence: false,
    
    // 权限申请相关
    showPermissionButton: false,
    showPermissionModal: false,
    permissionStatus: {
      show: false,
      type: 'pending', // pending | approved | rejected
      icon: '⏳',
      title: '',
      desc: '',
      action: '',
      actionText: ''
    },
    
    // 权限申请表单
    availableFields: [
      {
        key: 'fullName',
        label: '完整姓名',
        desc: '查看患者的真实姓名',
        selected: false
      },
      {
        key: 'phone',
        label: '联系电话',
        desc: '查看患者或家属的联系方式',
        selected: false
      },
      {
        key: 'address',
        label: '家庭住址',
        desc: '查看患者的详细居住地址',
        selected: false
      },
      {
        key: 'idCard',
        label: '身份证号',
        desc: '查看患者的完整身份证信息',
        selected: false
      },
      {
        key: 'familyInfo',
        label: '家庭信息',
        desc: '查看家庭成员和经济状况',
        selected: false
      }
    ],
    permissionReason: '',
    durationOptions: [
      { value: '1d', text: '1天', active: false },
      { value: '3d', text: '3天', active: false },
      { value: '7d', text: '7天', active: true },
      { value: '15d', text: '15天', active: false }
    ],
    selectedDuration: '7d',
    
    // 展示数据
    basicInfoItems: [],
    patientBasicStats: '',
    tenancyTimeline: [],
    recentServices: [],
    currentMonthServices: 0,
    
    // 统计信息
    stats: {
      totalServices: 0,
      monthlyServices: 0,
      totalStayDays: 0,
      lastServiceDate: null
    }
  },

  async onLoad(opts) {
    const id = opts && opts.id
    if (!id) {
      this.setData({ 
        error: { message: '缺少患者ID参数' },
        loading: false 
      })
      return
    }
    
    this.setData({ id })
    
    // 并行加载数据
    await Promise.all([
      this.loadPatientData(),
      this.loadUserRole(),
      this.checkPermissionStatus()
    ])
  },

  async onShow() {
    // 页面显示时刷新权限状态
    if (this.data.id) {
      await this.checkPermissionStatus()
    }
  },

  // ========== 数据加载 ==========
  async loadPatientData() {
    this.setData({ loading: true, error: null })
    
    try {
      const patient = await api.patients.get(this.data.id)
      
      if (!patient) {
        throw new Error('患者信息不存在')
      }

      // 处理患者基础信息
      const processedPatient = this.processPatientData(patient)
      
      // 并行加载关联数据
      const [tenancies, services] = await Promise.all([
        this.loadTenancyData(this.data.id),
        this.loadServiceData(this.data.id)
      ])

      // 设置显示数据
      this.setData({
        patient: processedPatient,
        basicInfoItems: this.buildBasicInfoItems(patient),
        patientBasicStats: this.buildPatientStats(patient),
        tenancyTimeline: this.buildTenancyTimeline(tenancies),
        recentServices: this.buildRecentServices(services),
        currentMonthServices: this.calculateCurrentMonthServices(services),
        inResidence: this.checkInResidence(tenancies),
        starred: this.checkStarred(this.data.id),
        loading: false
      })

      // 设置权限相关状态
      this.updatePermissionUI(patient.permission)
      
    } catch (error) {
      console.error('加载患者数据失败:', error)
      this.setData({ 
        error: { 
          message: error.message || '加载患者信息失败，请重试' 
        },
        loading: false 
      })
    }
  },

  async loadUserRole() {
    try {
      const profile = await api.users.getProfile()
      const role = profile?.role || 'volunteer'
      
      this.setData({
        role,
        canEdit: ['admin', 'social_worker'].includes(role),
        canManage: ['admin', 'social_worker'].includes(role),
        canShare: ['admin', 'social_worker'].includes(role),
        canViewMedical: ['admin', 'social_worker', 'volunteer'].includes(role)
      })
    } catch (error) {
      console.warn('获取用户角色失败:', error)
      // 默认为志愿者权限
      this.setData({
        role: 'volunteer',
        canEdit: false,
        canManage: false,
        canShare: false,
        canViewMedical: true
      })
    }
  },

  async loadTenancyData(patientId) {
    try {
      const result = await api.tenancies.list({
        page: 1,
        pageSize: 10,
        filter: { patientId },
        sort: { checkInDate: -1 }
      })
      return Array.isArray(result) ? result : (result?.items || [])
    } catch (error) {
      console.warn('加载入住记录失败:', error)
      return []
    }
  },

  async loadServiceData(patientId) {
    try {
      const result = await api.services.list({
        page: 1,
        pageSize: 20,
        filter: { patientId },
        sort: { date: -1 }
      })
      return Array.isArray(result) ? result : (result?.items || [])
    } catch (error) {
      console.warn('加载服务记录失败:', error)
      return []
    }
  },

  async checkPermissionStatus() {
    if (!this.data.id) return

    try {
      // 检查当前用户对该患者的权限状态
      const permissions = await api.permissions.getPatientPermissions(this.data.id)
      this.updatePermissionUI(permissions)
    } catch (error) {
      console.warn('检查权限状态失败:', error)
    }
  },

  // ========== 数据处理 ==========
  processPatientData(patient) {
    const ageText = this.calculateAge(patient.birthDate)
    const initial = (patient.name ? patient.name[0] : '👤').toUpperCase()
    const displayName = this.maskName(patient.name, patient.permission?.hasNamePermission)
    const bedInfo = this.buildBedInfo(patient)
    const stayDuration = this.calculateStayDuration(patient)
    
    return {
      ...patient,
      initial,
      displayName,
      ageText,
      bedInfo,
      stayDuration,
      mainDiagnosis: patient.hospitalDiagnosis || '待确诊',
      treatmentInfo: patient.treatmentStatus || patient.treatmentPlan
    }
  },

  buildBasicInfoItems(patient) {
    const permission = patient.permission || {}
    
    return [
      {
        key: 'name',
        label: '姓名',
        value: this.maskName(patient.name, permission.hasNamePermission),
        masked: !permission.hasNamePermission,
        needPermission: !permission.hasNamePermission
      },
      {
        key: 'gender',
        label: '性别',
        value: patient.gender || '—',
        masked: false,
        needPermission: false
      },
      {
        key: 'birthDate',
        label: '出生日期',
        value: this.formatDate(patient.birthDate) || '—',
        masked: false,
        needPermission: false
      },
      {
        key: 'phone',
        label: '联系电话',
        value: this.maskPhone(patient.phone, permission.hasContactPermission),
        masked: !permission.hasContactPermission,
        needPermission: !permission.hasContactPermission
      },
      {
        key: 'address',
        label: '家庭住址',
        value: this.maskAddress(patient.address, permission.hasAddressPermission),
        masked: !permission.hasAddressPermission,
        needPermission: !permission.hasAddressPermission
      },
      {
        key: 'idCard',
        label: '身份证号',
        value: this.maskIdCard(patient.id_card, permission.hasIdPermission),
        masked: !permission.hasIdPermission,
        needPermission: !permission.hasIdPermission
      }
    ].filter(item => item.value !== '—' || !item.needPermission)
  },

  buildPatientStats(patient) {
    const parts = []
    if (patient.age) parts.push(`${patient.age}岁`)
    if (patient.gender) parts.push(patient.gender)
    if (patient.hospitalDiagnosis) parts.push(patient.hospitalDiagnosis)
    return parts.join(' · ')
  },

  buildTenancyTimeline(tenancies) {
    return tenancies.slice(0, 3).map(tenancy => ({
      id: tenancy._id,
      dateRange: this.buildDateRange(tenancy.checkInDate, tenancy.checkOutDate),
      roomInfo: this.buildRoomInfo(tenancy),
      statusText: tenancy.checkOutDate ? '已出院' : '在住',
      status: tenancy.checkOutDate ? 'completed' : 'active',
      subsidyInfo: tenancy.subsidyAmount ? `${tenancy.subsidyAmount}元/月` : null
    }))
  },

  buildRecentServices(services) {
    return services.slice(0, 5).map(service => ({
      id: service._id,
      typeIcon: this.getServiceTypeIcon(service.type),
      typeName: this.getServiceTypeName(service.type),
      dateText: this.formatDateText(service.date),
      volunteerName: service.volunteerName || '志愿者',
      statusText: this.getServiceStatusText(service.status),
      statusClass: this.getServiceStatusClass(service.status)
    }))
  },

  updatePermissionUI(permission) {
    if (!permission) {
      // 没有权限信息时显示申请按钮
      this.setData({
        showPermissionButton: true,
        permissionStatus: {
          show: false
        }
      })
      return
    }

    const { status, expiresAt, pendingRequests } = permission
    let permissionStatus = { show: false }
    let showPermissionButton = false

    switch (status) {
      case 'none':
        showPermissionButton = true
        break
        
      case 'pending':
        permissionStatus = {
          show: true,
          type: 'pending',
          icon: '⏳',
          title: '权限申请审核中',
          desc: '已提交权限申请，等待管理员审批',
          action: 'viewPermissionDetail',
          actionText: '查看详情'
        }
        break
        
      case 'approved':
        const expiresText = this.getExpiresText(expiresAt)
        permissionStatus = {
          show: true,
          type: 'approved',
          icon: '✅',
          title: '权限已获得',
          desc: `可查看敏感信息，${expiresText}`,
          action: expiresAt ? 'renewPermission' : null,
          actionText: '续期'
        }
        break
        
      case 'rejected':
        permissionStatus = {
          show: true,
          type: 'rejected',
          icon: '❌',
          title: '权限申请被拒绝',
          desc: '申请未通过，可重新提交申请',
          action: 'requestPermissions',
          actionText: '重新申请'
        }
        showPermissionButton = true
        break
    }

    this.setData({
      permissionStatus,
      showPermissionButton
    })
  },

  // ========== 权限申请相关 ==========
  requestPermissions() {
    this.setData({ showPermissionModal: true })
  },

  hidePermissionModal() {
    this.setData({ showPermissionModal: false })
  },

  togglePermissionField(e) {
    const { value } = e.detail
    const fields = this.data.availableFields.map(field => ({
      ...field,
      selected: field.key === value ? !field.selected : field.selected
    }))
    
    this.setData({ availableFields: fields })
  },

  onReasonInput(e) {
    this.setData({ permissionReason: e.detail.value })
  },

  selectDuration(e) {
    const selectedValue = e.currentTarget.dataset.value
    const options = this.data.durationOptions.map(option => ({
      ...option,
      active: option.value === selectedValue
    }))
    
    this.setData({
      durationOptions: options,
      selectedDuration: selectedValue
    })
  },

  async submitPermissionRequest() {
    const selectedFields = this.data.availableFields.filter(field => field.selected)
    
    if (selectedFields.length === 0) {
      wx.showToast({ title: '请选择需要申请的权限', icon: 'none' })
      return
    }

    if (!this.data.permissionReason.trim()) {
      wx.showToast({ title: '请填写申请理由', icon: 'none' })
      return
    }

    if (this.data.permissionReason.trim().length < 10) {
      wx.showToast({ title: '申请理由至少10个字符', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '提交申请中...' })
      
      const requestData = {
        patientId: this.data.id,
        fields: selectedFields.map(field => field.key),
        reason: this.data.permissionReason.trim(),
        duration: this.data.selectedDuration,
        urgency: 'normal'
      }

      await api.permissions.createRequest(requestData)
      
      wx.hideLoading()
      wx.showToast({ title: '申请已提交', icon: 'success' })
      
      this.hidePermissionModal()
      
      // 重新检查权限状态
      setTimeout(() => {
        this.checkPermissionStatus()
      }, 1000)
      
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ 
        title: mapError(error.code) || '提交失败，请重试', 
        icon: 'none' 
      })
    }
  },

  applyFieldPermission(e) {
    const field = e.currentTarget.dataset.field
    
    // 预选择对应字段
    const fields = this.data.availableFields.map(item => ({
      ...item,
      selected: item.key === field
    }))
    
    this.setData({
      availableFields: fields,
      showPermissionModal: true
    })
  },

  // ========== 导航与操作 ==========
  navigateBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/patients/index' })
    }
  },

  toggleStar() {
    const starred = !this.data.starred
    this.setData({ starred })
    
    // 这里可以添加收藏/取消收藏的API调用
    // await api.patients.toggleStar(this.data.id, starred)
    
    wx.showToast({
      title: starred ? '已添加到关注' : '已取消关注',
      icon: 'success'
    })
  },

  shareProfile() {
    if (!this.data.canShare) {
      wx.showToast({ title: '无权限分享', icon: 'none' })
      return
    }

    wx.showActionSheet({
      itemList: ['分享给同事', '导出信息', '生成二维码'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.shareToColleague()
            break
          case 1:
            this.exportPatientInfo()
            break
          case 2:
            this.generateQRCode()
            break
        }
      }
    })
  },

  showMore() {
    const items = ['刷新数据', '查看完整历史']
    if (this.data.canEdit) {
      items.push('编辑权限', '数据导出')
    }

    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.retryLoad()
            break
          case 1:
            this.showFullHistory()
            break
          case 2:
            if (this.data.canEdit) this.editPermissions()
            break
          case 3:
            if (this.data.canEdit) this.exportData()
            break
        }
      }
    })
  },

  toCreateService() {
    wx.navigateTo({ 
      url: `/pages/services/form?patientId=${this.data.id}` 
    })
  },

  toEdit() {
    if (!this.data.canEdit) {
      wx.showToast({ title: '无编辑权限', icon: 'none' })
      return
    }
    wx.navigateTo({ 
      url: `/pages/patients/form?id=${this.data.id}` 
    })
  },

  toCreateTenancy() {
    if (!this.data.canManage) {
      wx.showToast({ title: '无管理权限', icon: 'none' })
      return
    }
    wx.navigateTo({ 
      url: `/pages/tenancies/form?patientId=${this.data.id}` 
    })
  },

  toCheckout() {
    if (!this.data.canManage || !this.data.inResidence) {
      wx.showToast({ title: '当前不可办理出院', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '确认出院',
      content: '确定要为该患者办理出院手续吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ 
            url: `/pages/tenancies/checkout?patientId=${this.data.id}` 
          })
        }
      }
    })
  },

  showMedicalDetail() {
    wx.navigateTo({ 
      url: `/pages/patients/medical?id=${this.data.id}` 
    })
  },

  showTenancyDetail() {
    wx.navigateTo({ 
      url: `/pages/tenancies/history?patientId=${this.data.id}` 
    })
  },

  showServiceDetail() {
    wx.navigateTo({ 
      url: `/pages/services/index?patientId=${this.data.id}` 
    })
  },

  async retryLoad() {
    await this.loadPatientData()
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  // ========== 工具方法 ==========
  maskName(name, hasPermission) {
    if (!name) return '—'
    if (hasPermission) return name
    
    if (name.length <= 1) return name
    if (name.length === 2) return name[0] + '*'
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
  },

  maskPhone(phone, hasPermission) {
    if (!phone) return '—'
    if (hasPermission) return phone
    
    if (phone.length === 11) {
      return phone.substring(0, 3) + '****' + phone.substring(7)
    }
    return phone.substring(0, 3) + '****'
  },

  maskAddress(address, hasPermission) {
    if (!address) return '—'
    if (hasPermission) return address
    
    const parts = address.split(/[省市区县]/)
    if (parts.length >= 2) {
      return parts[0] + '省**市**区'
    }
    return address.substring(0, 2) + '**'
  },

  maskIdCard(idCard, hasPermission) {
    if (!idCard) return '—'
    if (hasPermission) return idCard
    
    if (idCard.length >= 8) {
      return idCard.substring(0, 4) + '**********' + idCard.substring(idCard.length - 4)
    }
    return '****'
  },

  calculateAge(birthDate) {
    if (!birthDate) return ''
    
    const birth = new Date(birthDate)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    
    const monthDiff = now.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--
    }
    
    return age > 0 ? `${age}岁` : '不满1岁'
  },

  buildBedInfo(patient) {
    const parts = []
    if (patient.building) parts.push(patient.building)
    if (patient.room) parts.push(patient.room)
    if (patient.bed) parts.push(patient.bed + '床')
    return parts.join('') || '未分配床位'
  },

  calculateStayDuration(patient) {
    // 这里需要根据入住记录计算住院天数
    // 暂时返回占位文本
    return '入住第15天'
  },

  buildDateRange(checkIn, checkOut) {
    const start = this.formatDate(checkIn)
    const end = checkOut ? this.formatDate(checkOut) : '至今'
    return `${start} - ${end}`
  },

  buildRoomInfo(tenancy) {
    const parts = []
    if (tenancy.building) parts.push(tenancy.building)
    if (tenancy.room) parts.push(tenancy.room)
    if (tenancy.bed) parts.push(tenancy.bed)
    return parts.join(' ') || '—'
  },

  checkInResidence(tenancies) {
    return tenancies.some(t => !t.checkOutDate)
  },

  checkStarred(patientId) {
    // 从本地存储检查是否已收藏
    try {
      const starred = wx.getStorageSync('starred_patients') || []
      return starred.includes(patientId)
    } catch (error) {
      return false
    }
  },

  calculateCurrentMonthServices(services) {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    return services.filter(service => {
      const serviceDate = new Date(service.date)
      return serviceDate.getMonth() === currentMonth && 
             serviceDate.getFullYear() === currentYear
    }).length
  },

  getServiceTypeIcon(type) {
    const icons = {
      visit: '👋',
      psychological: '💚',
      material: '📦',
      medical: '🩺',
      education: '📚',
      recreation: '🎨'
    }
    return icons[type] || '❤️'
  },

  getServiceTypeName(type) {
    const names = {
      visit: '探访服务',
      psychological: '心理支持',
      material: '物资发放',
      medical: '医疗协助',
      education: '教育辅导',
      recreation: '娱乐活动'
    }
    return names[type] || '其他服务'
  },

  getServiceStatusText(status) {
    const texts = {
      pending: '待审核',
      approved: '已完成',
      rejected: '已驳回',
      in_progress: '进行中'
    }
    return texts[status] || '未知'
  },

  getServiceStatusClass(status) {
    const classes = {
      pending: 'pending',
      approved: 'approved',
      rejected: 'rejected',
      in_progress: 'pending'
    }
    return classes[status] || 'pending'
  },

  getExpiresText(expiresAt) {
    if (!expiresAt) return ''
    
    const expires = new Date(expiresAt)
    const now = new Date()
    const diffDays = Math.ceil((expires - now) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 0) return '已过期'
    if (diffDays === 1) return '明天过期'
    return `${diffDays}天后过期`
  },

  formatDate(dateString) {
    if (!dateString) return ''
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  },

  formatDateText(dateString) {
    if (!dateString) return ''
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return '今天'
      if (diffDays === 1) return '昨天'
      if (diffDays < 7) return `${diffDays}天前`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
      
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }
})