import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'
import { uploadImage } from '../../services/upload'

Page({
  data: {
    loading: true,
    submitting: false,
    uploading: false,
    uploadProgress: 0,
    uploadTotal: 0,
    uploadDone: 0,
    
    // Theme
    theme: {
      headerBg: 'header-gradient'
    },
    
    // Mode control
    quickMode: true,
    isQuickMode: false,
    showAdvancedContent: false,
    
    // Form data
    serviceType: '',
    selectedPatient: null,
    serviceDate: '',
    serviceTime: '',
    serviceContent: '',
    quickTemplate: '',
    serviceLocation: '',
    attachments: [],
    
    // UI state
    errors: {},
    autoSaveStatus: '',
    showPatientModal: false,
    patientSearchText: '',
    
    // Options and data
    serviceTypes: [
      { key: 'visit', name: '家访', icon: '🏠', color: '#4A90E2' },
      { key: 'psych', name: '心理', icon: '💚', color: '#7ED321' },
      { key: 'goods', name: '物资', icon: '📦', color: '#F5A623' },
      { key: 'referral', name: '转介', icon: '🔄', color: '#BD10E0' },
      { key: 'followup', name: '随访', icon: '📞', color: '#50E3C2' }
    ],
    
    patients: [],
    filteredPatients: [],
    
    // Quick templates by service type
    contentTemplates: [],
    quickTemplates: [
      '常规访问，情况良好',
      '心理支持，情绪稳定',
      '物资发放，按需提供',
      '转介服务，已联系相关机构',
      '电话随访，了解近况'
    ],
    
    locationSuggestions: [
      '患者家中',
      '社区服务中心',
      '医院',
      '康复中心',
      '社工站'
    ],
    
    // Configuration
    maxImages: 5,
    maxImageSize: 5,
    
    // Computed properties
    serviceDateText: '选择日期',
    serviceTimeText: '选择时间',
    contentPlaceholder: '请描述服务内容和过程...'
  },

  async onLoad(options) {
    try { require('../../services/theme').applyThemeByRole(this) } catch(_) {}
    this.setData({ loading: true })
    
    try {
      // Check if it's quick mode from navigation
      if (options.mode === 'quick') {
        this.setData({ 
          isQuickMode: true,
          quickMode: true 
        })
      }
      
      // Set service type if specified
      if (options.type) {
        this.setData({ serviceType: options.type })
        this.updateContentTemplates(options.type)
      }
      
      // Set patient ID if specified
      if (options.patientId) {
        await this.loadPatientById(options.patientId)
      }
      
      // Initialize data
      await Promise.all([
        this.loadPatients(),
        this.loadDraft()
      ])
      
      // Set initial date/time to now
      const now = new Date()
      this.setData({
        serviceDate: this.formatDate(now),
        serviceTime: this.formatTime(now),
        serviceDateText: this.formatDateDisplay(now),
        serviceTimeText: this.formatTimeDisplay(now)
      })
      
    } catch (error) {
      console.error('Failed to initialize form:', error)
      wx.showToast({
        icon: 'none',
        title: '加载失败，请重试'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadPatients() {
    try {
      const result = await api.patients.list({ page: 1, pageSize: 100 })
      if (result.ok) {
        const patients = result.data.items.map(patient => ({
          id: patient.id,
          displayName: patient.name || `患者${patient.id}`,
          initial: (patient.name || '患').charAt(0),
          ageText: patient.age ? `${patient.age}岁` : '年龄不详',
          condition: patient.diagnosis || '无诊断信息'
        }))
        
        this.setData({ 
          patients,
          filteredPatients: patients
        })
      }
    } catch (error) {
      console.error('Failed to load patients:', error)
    }
  },

  async loadPatientById(patientId) {
    try {
      const result = await api.patients.get({ id: patientId })
      if (result.ok) {
        const patient = result.data
        const selectedPatient = {
          id: patient.id,
          displayName: patient.name || `患者${patient.id}`,
          initial: (patient.name || '患').charAt(0),
          ageText: patient.age ? `${patient.age}岁` : '年龄不详',
          condition: patient.diagnosis || '无诊断信息'
        }
        this.setData({ selectedPatient })
      }
    } catch (error) {
      console.error('Failed to load patient:', error)
    }
  },

  loadDraft() {
    try {
      const draft = wx.getStorageSync('service_form_draft')
      if (draft && typeof draft === 'object') {
        this.setData({
          serviceType: draft.serviceType || '',
          serviceContent: draft.serviceContent || '',
          quickTemplate: draft.quickTemplate || '',
          serviceLocation: draft.serviceLocation || '',
          quickMode: draft.quickMode !== undefined ? draft.quickMode : true,
          showAdvancedContent: draft.showAdvancedContent || false
        })
        
        if (draft.selectedPatient) {
          this.setData({ selectedPatient: draft.selectedPatient })
        }
        
        if (draft.serviceType) {
          this.updateContentTemplates(draft.serviceType)
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error)
    }
  },

  saveDraft() {
    try {
      const draft = {
        serviceType: this.data.serviceType,
        selectedPatient: this.data.selectedPatient,
        serviceContent: this.data.serviceContent,
        quickTemplate: this.data.quickTemplate,
        serviceLocation: this.data.serviceLocation,
        quickMode: this.data.quickMode,
        showAdvancedContent: this.data.showAdvancedContent
      }
      
      wx.setStorageSync('service_form_draft', draft)
      
      this.setData({ autoSaveStatus: '草稿已保存' })
      setTimeout(() => {
        this.setData({ autoSaveStatus: '' })
      }, 2000)
      
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  },

  clearDraft() {
    wx.showModal({
      title: '清除草稿',
      content: '确定要清除当前草稿吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('service_form_draft')
            this.setData({
              serviceType: '',
              selectedPatient: null,
              serviceContent: '',
              quickTemplate: '',
              serviceLocation: '',
              showAdvancedContent: false,
              autoSaveStatus: '草稿已清除'
            })
            
            setTimeout(() => {
              this.setData({ autoSaveStatus: '' })
            }, 2000)
            
          } catch (error) {
            console.error('Failed to clear draft:', error)
          }
        }
      }
    })
  },

  // Navigation
  navigateBack() {
    const hasChanges = this.data.serviceType || this.data.serviceContent || this.data.selectedPatient
    
    if (hasChanges) {
      wx.showModal({
        title: '确认离开',
        content: '您有未保存的更改，确定要离开吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  },

  showMyStats() {
    wx.navigateTo({
      url: '/pages/stats/index?filter=my'
    })
  },

  showHelp() {
    wx.showModal({
      title: '使用帮助',
      content: '快速记录模式：1-3分钟完成基本信息录入\n详细记录模式：完整服务信息记录\n\n支持语音输入、图片上传和自动保存草稿功能',
      showCancel: false
    })
  },

  // Mode switching
  switchToQuickMode() {
    this.setData({ 
      quickMode: true,
      showAdvancedContent: false
    })
    this.updateContentPlaceholder()
  },

  switchToDetailMode() {
    this.setData({ 
      quickMode: false,
      showAdvancedContent: true
    })
    this.updateContentPlaceholder()
  },

  toggleAdvancedContent() {
    this.setData({ 
      showAdvancedContent: !this.data.showAdvancedContent 
    })
  },

  // Service type selection
  onServiceTypeSelect(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ 
      serviceType: type,
      errors: { ...this.data.errors, serviceType: '' }
    })
    
    this.updateContentTemplates(type)
    this.updateContentPlaceholder()
    this.saveDraft()
  },

  updateContentTemplates(serviceType) {
    const templates = {
      'visit': ['家庭环境良好', '与家属沟通顺畅', '了解生活状况', '提供必要建议'],
      'psych': ['情绪状态稳定', '心理支持有效', '倾听并疏导', '建立信任关系'],
      'goods': ['按需发放物资', '物品清单确认', '使用方法说明', '后续需求评估'],
      'referral': ['评估转介需求', '联系相关机构', '协助办理手续', '跟进转介结果'],
      'followup': ['电话沟通良好', '了解近期状况', '提醒注意事项', '预约下次服务']
    }
    
    this.setData({ 
      contentTemplates: templates[serviceType] || []
    })
  },

  updateContentPlaceholder() {
    const placeholders = {
      'visit': '请描述家访过程、观察到的情况和提供的帮助...',
      'psych': '请描述心理支持的内容、对方的反应和效果...',
      'goods': '请描述物资发放的种类、数量和使用说明...',
      'referral': '请描述转介的原因、联系的机构和后续安排...',
      'followup': '请描述随访的内容、了解到的情况和建议...'
    }
    
    const placeholder = this.data.quickMode 
      ? '简要描述服务内容（1-2句话即可）'
      : (placeholders[this.data.serviceType] || '请详细描述服务内容和过程...')
    
    this.setData({ contentPlaceholder: placeholder })
  },

  // Patient selection
  selectPatient() {
    this.setData({ 
      showPatientModal: true,
      patientSearchText: ''
    })
  },

  hidePatientModal() {
    this.setData({ showPatientModal: false })
  },

  stopPropagation() {
    // Prevent modal from closing when clicking inside
  },

  onPatientSearch(e) {
    const searchText = e.detail.value.toLowerCase()
    this.setData({ patientSearchText: searchText })
    
    if (!searchText) {
      this.setData({ filteredPatients: this.data.patients })
      return
    }
    
    const filtered = this.data.patients.filter(patient => 
      patient.displayName.toLowerCase().includes(searchText) ||
      patient.id.toString().includes(searchText)
    )
    
    this.setData({ filteredPatients: filtered })
  },

  selectPatientOption(e) {
    const patient = e.currentTarget.dataset.patient
    this.setData({ 
      selectedPatient: patient,
      showPatientModal: false,
      errors: { ...this.data.errors, patientId: '' }
    })
    this.saveDraft()
  },

  // Date and time
  onDateChange(e) {
    const date = e.detail.value
    this.setData({ 
      serviceDate: date,
      serviceDateText: this.formatDateDisplay(new Date(date)),
      errors: { ...this.data.errors, serviceDateTime: '' }
    })
  },

  onTimeChange(e) {
    const time = e.detail.value
    this.setData({ 
      serviceTime: time,
      serviceTimeText: this.formatTimeDisplay(time),
      errors: { ...this.data.errors, serviceDateTime: '' }
    })
  },

  // Content input
  onContentInput(e) {
    const content = e.detail.value
    this.setData({ 
      serviceContent: content,
      errors: { ...this.data.errors, serviceContent: '' }
    })
    
    // Auto-save after a delay
    clearTimeout(this.autoSaveTimer)
    this.autoSaveTimer = setTimeout(() => {
      this.saveDraft()
    }, 1000)
  },

  useTemplate(e) {
    const template = e.currentTarget.dataset.template
    const currentContent = this.data.serviceContent
    const newContent = currentContent ? `${currentContent}\n${template}` : template
    
    this.setData({ serviceContent: newContent })
    this.saveDraft()
  },

  selectQuickTemplate(e) {
    const template = e.currentTarget.dataset.template
    this.setData({ 
      quickTemplate: template,
      serviceContent: template
    })
    this.saveDraft()
  },

  // Location input
  onLocationInput(e) {
    const location = e.detail.value
    this.setData({ serviceLocation: location })
  },

  selectLocation(e) {
    const location = e.currentTarget.dataset.location
    this.setData({ serviceLocation: location })
  },

  // Voice input
  startVoiceInput() {
    wx.showToast({
      icon: 'none',
      title: '长按说话，松手结束'
    })
    
    // This would integrate with WeChat's voice recognition
    // For now, show a placeholder
    setTimeout(() => {
      wx.showToast({
        icon: 'none',
        title: '语音功能开发中'
      })
    }, 1000)
  },

  // Attachment handling
  addAttachment() {
    if (this.data.attachments.length >= this.data.maxImages) {
      wx.showToast({
        icon: 'none',
        title: `最多${this.data.maxImages}张图片`
      })
      return
    }
    
    const remain = this.data.maxImages - this.data.attachments.length
    wx.chooseImage({ 
      count: Math.min(remain, 3),
      sizeType: ['compressed']
    }).then(res => {
      const files = (res.tempFiles || []).map(f => ({
        local: f.path,
        size: f.size
      }))
      
      const oversized = files.filter(f => f.size > this.data.maxImageSize * 1024 * 1024)
      if (oversized.length) {
        wx.showToast({
          icon: 'none',
          title: `图片大小不能超过${this.data.maxImageSize}MB`
        })
      }
      
      const validFiles = files.filter(f => f.size <= this.data.maxImageSize * 1024 * 1024)
      if (validFiles.length) {
        const merged = this.data.attachments.concat(validFiles).slice(0, this.data.maxImages)
        this.setData({ attachments: merged })
      }
    })
  },

  removeAttachment(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const attachments = this.data.attachments.slice()
    attachments.splice(index, 1)
    this.setData({ attachments })
  },

  previewAttachment(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const urls = this.data.attachments.map(item => item.local || item.fileID)
    wx.previewImage({
      current: urls[index],
      urls
    })
  },

  // Upload handling
  async uploadAttachments() {
    const attachments = []
    const toUpload = this.data.attachments.filter(item => !item.fileID)
    
    if (toUpload.length === 0) {
      return this.data.attachments.map(item => item.fileID).filter(Boolean)
    }
    
    this.setData({
      uploading: true,
      uploadProgress: 0,
      uploadTotal: toUpload.length,
      uploadDone: 0
    })
    
    let uploadDone = 0
    
    for (const item of this.data.attachments) {
      if (item.fileID) {
        attachments.push(item)
        continue
      }
      
      try {
        const fileID = await uploadImage(item.local, 'services')
        attachments.push({ fileID })
        uploadDone++
        
        this.setData({
          uploadDone,
          uploadProgress: Math.round((uploadDone / toUpload.length) * 100)
        })
      } catch (error) {
        console.error('Failed to upload image:', error)
        throw new Error('图片上传失败')
      }
    }
    
    this.setData({ 
      attachments,
      uploading: false 
    })
    
    return attachments.map(item => item.fileID)
  },

  // Validation
  validateForm() {
    const errors = {}
    
    if (!this.data.serviceType) {
      errors.serviceType = '请选择服务类型'
    }
    
    if (!this.data.selectedPatient) {
      errors.patientId = '请选择服务对象'
    }
    
    if (!this.data.serviceDate || !this.data.serviceTime) {
      errors.serviceDateTime = '请选择服务时间'
    }
    
    if (!this.data.quickMode && !this.data.serviceContent.trim()) {
      errors.serviceContent = '请填写服务内容'
    }
    
    if (this.data.attachments.length > this.data.maxImages) {
      errors.attachments = `最多${this.data.maxImages}张图片`
    }
    
    this.setData({ errors })
    return Object.keys(errors).length === 0
  },

  // Form submission
  async onSubmit() {
    if (!this.validateForm()) {
      wx.showToast({
        icon: 'none',
        title: '请完善必填信息'
      })
      return
    }
    
    const requestId = genRequestId('service_form')
    const startTime = Date.now()
    
    this.setData({ submitting: true })
    
    try {
      // Track submission start
      track('service_form_submit', {
        requestId,
        serviceType: this.data.serviceType,
        quickMode: this.data.quickMode,
        hasAttachments: this.data.attachments.length > 0,
        attachmentCount: this.data.attachments.length
      })
      
      // Upload attachments if any
      const imageFileIds = await this.uploadAttachments()
      
      // Prepare service data
      const serviceData = {
        patientId: this.data.selectedPatient.id,
        type: this.data.serviceType,
        date: `${this.data.serviceDate}T${this.data.serviceTime}:00.000Z`,
        description: this.data.quickMode && this.data.quickTemplate 
          ? this.data.quickTemplate 
          : this.data.serviceContent,
        location: this.data.serviceLocation || undefined,
        images: imageFileIds
      }
      
      // Submit to API
      const clientToken = `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const result = await api.services.create(serviceData, clientToken)
      
      if (result.ok) {
        // Track success
        track('service_form_submit_success', {
          requestId,
          duration: Date.now() - startTime,
          serviceId: result.data.id
        })
        
        // Clear draft
        wx.removeStorageSync('service_form_draft')
        
        // Show success message
        wx.showToast({
          title: this.data.quickMode ? '快速提交成功' : '提交成功，待审核',
          icon: 'success'
        })
        
        // Navigate back after delay
        setTimeout(() => {
          wx.navigateBack({
            delta: 1
          })
        }, 1500)
        
      } else {
        throw new Error(result.error?.msg || '提交失败')
      }
      
    } catch (error) {
      console.error('Service submission failed:', error)
      
      // Track failure
      track('service_form_submit_error', {
        requestId,
        duration: Date.now() - startTime,
        error: error.message || error.code || 'UNKNOWN'
      })
      
      const errorMessage = error.code === 'E_VALIDATE' && error.message 
        ? error.message 
        : mapError(error.code || 'E_INTERNAL')
        
      wx.showToast({
        icon: 'none',
        title: errorMessage
      })
      
    } finally {
      this.setData({ submitting: false })
    }
  },

  // Utility functions
  formatDate(date) {
    if (typeof date === 'string') date = new Date(date)
    return date.toISOString().split('T')[0]
  },

  formatTime(date) {
    if (typeof date === 'string') return date
    if (typeof date === 'object' && date.getHours) {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
    return date
  },

  formatDateDisplay(date) {
    if (typeof date === 'string') date = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return '今天'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天'
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  },

  formatTimeDisplay(time) {
    if (typeof time === 'string') {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours)
      const period = hour < 12 ? '上午' : '下午'
      const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour)
      return `${period} ${displayHour}:${minutes}`
    }
    return time
  },

  onUnload() {
    // Save draft on page unload
    if (this.data.serviceType || this.data.serviceContent || this.data.selectedPatient) {
      this.saveDraft()
    }
    
    // Clear any pending timers
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
    }
  }
})
