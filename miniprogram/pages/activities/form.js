import { api, mapError } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: {
    // 用户权限相关
    userRole: '',
    currentUserId: '',
    canCreateActivity: false,
    canPublishImmediately: false,
    
    // 页面状态
    mode: 'create', // create | edit
    activityId: '',
    loading: false,
    submitting: false,
    autoSaving: false,
    
    // 表单进度
    formProgress: 0,
    completedSections: [],
    
    // 基础信息
    formData: {
      title: '',
      category: '',
      description: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      location: '',
      coverImage: '',
      
      // 报名设置
      registrationStartDate: '',
      registrationStartTime: '',
      registrationEndDate: '',
      registrationEndTime: '',
      capacity: 0,
      enableWaitingList: false,
      registrationMode: 'open', // open | approval
      registrationConditions: '',
      
      // 高级设置
      tags: [],
      visibility: 'public', // public | internal
      enableNotification: true,
      notificationTime: '1', // hours before
      allowCancellation: true,
      cancellationDeadline: '24', // hours before
      
      // 联系信息
      contactPerson: '',
      contactPhone: '',
      contactWechat: '',
      
      // 状态控制
      status: 'draft', // draft | published | ongoing | completed | cancelled
      publishTime: 'now' // now | scheduled
    },
    
    // 表单验证错误
    errors: {},
    
    // UI 状态
    showPreview: false,
    showAdvancedSettings: false,
    showHelpModal: false,
    
    // 选项数据
    categoryOptions: [
      { label: '康复训练', value: 'rehabilitation' },
      { label: '心理支持', value: 'psychological' },
      { label: '亲子活动', value: 'family' },
      { label: '教育培训', value: 'education' },
      { label: '社交娱乐', value: 'social' },
      { label: '志愿服务', value: 'volunteer' },
      { label: '其他', value: 'other' }
    ],
    
    tagOptions: [
      '室内活动', '户外活动', '亲子互动', '康复训练', 
      '心理疏导', '技能培训', '娱乐休闲', '志愿服务',
      '免费活动', '收费活动', '长期活动', '一次性活动'
    ],
    
    // 草稿保存
    draftTimer: null,
    lastSaveTime: null,
    
    // 计算属性
    selectedCategoryLabel: ''
  },

  onLoad(options) {
    this.initializeUserInfo()
    
    // 判断是编辑还是创建
    if (options.id) {
      this.setData({ 
        mode: 'edit',
        activityId: options.id
      })
      this.loadActivityData(options.id)
    } else {
      this.setData({ mode: 'create' })
      this.initializeFormData()
    }
    
    // 启动自动保存
    this.startAutoSave()
    
    track('activity_form_open', { 
      mode: this.data.mode,
      activityId: options.id || null
    })
  },

  onUnload() {
    // 清理定时器
    if (this.data.draftTimer) {
      clearInterval(this.data.draftTimer)
    }
  },

  // 初始化用户信息
  async initializeUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        const canCreateActivity = ['admin', 'social_worker'].includes(userInfo.role)
        const canPublishImmediately = userInfo.role === 'admin'
        
        this.setData({
          userRole: userInfo.role,
          currentUserId: userInfo.openid,
          canCreateActivity,
          canPublishImmediately
        })
        
        // 如果没有创建权限，显示提示并返回
        if (!canCreateActivity) {
          wx.showModal({
            title: '权限不足',
            content: '您没有创建活动的权限，请联系管理员。',
            showCancel: false,
            success: () => {
              wx.navigateBack()
            }
          })
        }
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  },

  // 初始化表单数据
  initializeFormData() {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    const defaultData = {
      ...this.data.formData,
      startDate: tomorrow.toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '12:00',
      registrationStartDate: now.toISOString().split('T')[0],
      registrationStartTime: '09:00',
      registrationEndDate: tomorrow.toISOString().split('T')[0],
      registrationEndTime: '09:00'
    }
    
    this.setData({ formData: defaultData })
    this.updateFormProgress()
  },

  // 加载活动数据（编辑模式）
  async loadActivityData(activityId) {
    this.setData({ loading: true })
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'activities',
        data: {
          action: 'get',
          payload: { activityId }
        }
      })

      if (result.result.ok) {
        const activity = result.result.data
        
        // 转换数据格式适配表单
        const formData = {
          title: activity.title || '',
          category: activity.category || '',
          description: activity.description || '',
          startDate: activity.startTime ? new Date(activity.startTime).toISOString().split('T')[0] : '',
          startTime: activity.startTime ? new Date(activity.startTime).toTimeString().substr(0, 5) : '',
          endDate: activity.endTime ? new Date(activity.endTime).toISOString().split('T')[0] : '',
          endTime: activity.endTime ? new Date(activity.endTime).toTimeString().substr(0, 5) : '',
          location: activity.location || '',
          coverImage: activity.coverImage || '',
          capacity: activity.capacity || 0,
          registrationMode: activity.registrationMode || 'open',
          tags: activity.tags || [],
          visibility: activity.visibility || 'public',
          contactPerson: activity.contactPerson || '',
          contactPhone: activity.contactPhone || '',
          status: activity.status || 'draft'
        }
        
        this.setData({ formData })
        this.updateCategoryLabel()
        this.updateFormProgress()
        
      } else {
        throw new Error(result.result.error?.msg || '加载活动数据失败')
      }
    } catch (error) {
      console.error('加载活动数据失败:', error)
      wx.showToast({
        title: mapError(error).message,
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 表单字段更新
  onFormFieldChange(e) {
    const { field, value } = e.currentTarget.dataset
    
    // 如果是从input事件来的，使用detail.value
    const fieldValue = value !== undefined ? value : e.detail.value
    
    this.setData({
      [`formData.${field}`]: fieldValue,
      [`errors.${field}`]: '' // 清除字段错误
    })
    
    // 联动逻辑
    this.handleFieldDependencies(field, fieldValue)
    
    // 更新进度
    this.updateFormProgress()
    
    // 标记需要保存
    this.markForAutoSave()
  },

  // 字段联动逻辑
  handleFieldDependencies(field, value) {
    const updates = {}
    
    // 开始日期变更时，更新结束日期默认值
    if (field === 'startDate' && value) {
      if (!this.data.formData.endDate) {
        updates['formData.endDate'] = value
      }
    }
    
    // 开始时间变更时，自动设置结束时间（+2小时）
    if (field === 'startTime' && value) {
      const [hours, minutes] = value.split(':')
      const endHours = (parseInt(hours) + 2) % 24
      updates['formData.endTime'] = `${endHours.toString().padStart(2, '0')}:${minutes}`
    }
    
    // 报名模式变更时，显示/隐藏相关字段
    if (field === 'registrationMode') {
      // 审核模式下显示审核条件
      if (value === 'approval') {
        updates.showAdvancedSettings = true
      }
    }
    
    if (Object.keys(updates).length > 0) {
      this.setData(updates)
    }
  },

  // 更新分类标签
  updateCategoryLabel() {
    const category = this.data.categoryOptions.find(item => item.value === this.data.formData.category)
    this.setData({
      selectedCategoryLabel: category ? category.label : ''
    })
  },

  // 分类选择
  onCategoryChange(e) {
    const index = parseInt(e.detail.value)
    const category = this.data.categoryOptions[index]
    
    this.setData({
      'formData.category': category.value,
      'selectedCategoryLabel': category.label,
      'errors.category': ''
    })
    
    this.updateFormProgress()
    this.markForAutoSave()
  },

  // 开关组件变更
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    
    this.setData({
      [`formData.${field}`]: value
    })
    
    this.markForAutoSave()
  },

  // 标签选择
  onTagToggle(e) {
    const { tag } = e.currentTarget.dataset
    const tags = [...this.data.formData.tags]
    
    const index = tags.indexOf(tag)
    if (index > -1) {
      tags.splice(index, 1)
    } else {
      if (tags.length < 5) { // 最多选择5个标签
        tags.push(tag)
      } else {
        wx.showToast({
          title: '最多选择5个标签',
          icon: 'none'
        })
        return
      }
    }
    
    this.setData({
      'formData.tags': tags
    })
    
    this.markForAutoSave()
  },

  // 图片上传
  async uploadCoverImage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      if (res.tempFilePaths.length > 0) {
        wx.showLoading({ title: '上传中...' })
        
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `activities/covers/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`,
          filePath: res.tempFilePaths[0]
        })
        
        this.setData({
          'formData.coverImage': uploadRes.fileID
        })
        
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        })
        
        this.markForAutoSave()
      }
    } catch (error) {
      console.error('上传图片失败:', error)
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 删除封面图片
  removeCoverImage() {
    this.setData({
      'formData.coverImage': ''
    })
    this.markForAutoSave()
  },

  // 表单验证
  validateForm() {
    const { formData } = this.data
    const errors = {}
    
    // 必填字段验证
    if (!formData.title || formData.title.trim().length === 0) {
      errors.title = '请输入活动标题'
    } else if (formData.title.length < 2 || formData.title.length > 50) {
      errors.title = '标题长度为2-50个字符'
    }
    
    if (!formData.category) {
      errors.category = '请选择活动分类'
    }
    
    if (!formData.description || formData.description.trim().length === 0) {
      errors.description = '请输入活动描述'
    } else if (formData.description.length > 1000) {
      errors.description = '描述不能超过1000个字符'
    }
    
    if (!formData.startDate) {
      errors.startDate = '请选择开始日期'
    }
    
    if (!formData.startTime) {
      errors.startTime = '请选择开始时间'
    }
    
    if (!formData.location || formData.location.trim().length === 0) {
      errors.location = '请输入活动地点'
    } else if (formData.location.length > 100) {
      errors.location = '地点不能超过100个字符'
    }
    
    if (!formData.capacity || formData.capacity < 1) {
      errors.capacity = '请设置参与人数限制'
    } else if (formData.capacity > 500) {
      errors.capacity = '参与人数不能超过500人'
    }
    
    // 时间逻辑验证
    if (formData.startDate && formData.startTime) {
      const startDateTime = new Date(`${formData.startDate} ${formData.startTime}`)
      const now = new Date()
      
      if (startDateTime <= now) {
        errors.startDate = '活动开始时间不能早于当前时间'
      }
      
      if (formData.endDate && formData.endTime) {
        const endDateTime = new Date(`${formData.endDate} ${formData.endTime}`)
        if (endDateTime <= startDateTime) {
          errors.endDate = '结束时间不能早于开始时间'
        }
      }
    }
    
    // 报名时间验证
    if (formData.registrationStartDate && formData.registrationStartTime) {
      const regStartDateTime = new Date(`${formData.registrationStartDate} ${formData.registrationStartTime}`)
      
      if (formData.registrationEndDate && formData.registrationEndTime) {
        const regEndDateTime = new Date(`${formData.registrationEndDate} ${formData.registrationEndTime}`)
        
        if (regEndDateTime <= regStartDateTime) {
          errors.registrationEndDate = '报名截止时间不能早于报名开始时间'
        }
        
        if (formData.startDate && formData.startTime) {
          const startDateTime = new Date(`${formData.startDate} ${formData.startTime}`)
          if (regEndDateTime > startDateTime) {
            errors.registrationEndDate = '报名截止时间不能晚于活动开始时间'
          }
        }
      }
    }
    
    this.setData({ errors })
    return Object.keys(errors).length === 0
  },

  // 更新表单进度
  updateFormProgress() {
    const { formData } = this.data
    const requiredFields = [
      'title', 'category', 'description', 'startDate', 
      'startTime', 'location', 'capacity'
    ]
    
    const completed = requiredFields.filter(field => {
      const value = formData[field]
      return value && value.toString().trim().length > 0
    })
    
    const progress = Math.round((completed.length / requiredFields.length) * 100)
    
    this.setData({
      formProgress: progress,
      completedSections: completed
    })
  },

  // 自动保存相关
  startAutoSave() {
    this.data.draftTimer = setInterval(() => {
      if (this.data.needAutoSave) {
        this.saveDraft()
      }
    }, 30000) // 30秒自动保存一次
  },

  markForAutoSave() {
    this.setData({ needAutoSave: true })
  },

  async saveDraft() {
    if (this.data.autoSaving) return
    
    this.setData({ autoSaving: true })
    
    try {
      const draftKey = this.data.mode === 'edit' 
        ? `activity_draft_${this.data.activityId}`
        : `activity_draft_new_${this.data.currentUserId}`
      
      wx.setStorageSync(draftKey, {
        formData: this.data.formData,
        timestamp: Date.now()
      })
      
      this.setData({ 
        needAutoSave: false,
        lastSaveTime: new Date()
      })
      
    } catch (error) {
      console.error('保存草稿失败:', error)
    } finally {
      this.setData({ autoSaving: false })
    }
  },

  // 手动保存草稿
  async saveAsDraft() {
    await this.saveDraft()
    wx.showToast({
      title: '草稿已保存',
      icon: 'success'
    })
    track('activity_form_save_draft')
  },

  // 预览
  showPreview() {
    if (!this.validateForm()) {
      wx.showToast({
        title: '请完善表单信息',
        icon: 'none'
      })
      return
    }
    
    this.setData({ showPreview: true })
    track('activity_form_preview')
  },

  hidePreview() {
    this.setData({ showPreview: false })
  },

  // 切换高级设置
  toggleAdvancedSettings() {
    this.setData({
      showAdvancedSettings: !this.data.showAdvancedSettings
    })
  },

  // 显示帮助
  showHelp() {
    this.setData({ showHelpModal: true })
  },

  hideHelp() {
    this.setData({ showHelpModal: false })
  },

  // 提交表单
  async submitForm(e) {
    const publishNow = e.currentTarget.dataset.publish === 'true' || e.currentTarget.dataset.publish === true
    if (!this.validateForm()) {
      wx.showToast({
        title: '请检查表单信息',
        icon: 'none'
      })
      return
    }
    
    // 权限检查
    if (publishNow && !this.data.canPublishImmediately) {
      wx.showModal({
        title: '权限提示',
        content: '您的角色需要管理员审核后才能发布活动，是否提交审核？',
        success: (res) => {
          if (res.confirm) {
            this.performSubmit(false) // 提交审核
          }
        }
      })
      return
    }
    
    this.performSubmit(publishNow)
  },

  async performSubmit(publishNow) {
    this.setData({ submitting: true })
    
    try {
      const { formData } = this.data
      
      // 构建提交数据
      const submitData = {
        ...formData,
        startTime: new Date(`${formData.startDate} ${formData.startTime}`),
        endTime: formData.endDate && formData.endTime 
          ? new Date(`${formData.endDate} ${formData.endTime}`)
          : null,
        registrationStartTime: formData.registrationStartDate && formData.registrationStartTime
          ? new Date(`${formData.registrationStartDate} ${formData.registrationStartTime}`)
          : null,
        registrationEndTime: formData.registrationEndDate && formData.registrationEndTime
          ? new Date(`${formData.registrationEndDate} ${formData.registrationEndTime}`)
          : null,
        status: publishNow ? 'published' : 'draft'
      }
      
      // 删除表单临时字段
      delete submitData.startDate
      delete submitData.startTime
      delete submitData.endDate
      delete submitData.endTime
      delete submitData.registrationStartDate
      delete submitData.registrationStartTime
      delete submitData.registrationEndDate
      delete submitData.registrationEndTime
      
      const action = this.data.mode === 'edit' ? 'update' : 'create'
      const payload = this.data.mode === 'edit'
        ? { activityId: this.data.activityId, data: submitData }
        : submitData
      
      const result = await wx.cloud.callFunction({
        name: 'activities',
        data: {
          action,
          payload
        }
      })

      if (result.result.ok) {
        const message = publishNow 
          ? (this.data.mode === 'edit' ? '更新并发布成功' : '创建并发布成功')
          : (this.data.mode === 'edit' ? '更新成功' : '保存成功')
        
        wx.showToast({
          title: message,
          icon: 'success'
        })
        
        // 清除草稿
        const draftKey = this.data.mode === 'edit' 
          ? `activity_draft_${this.data.activityId}`
          : `activity_draft_new_${this.data.currentUserId}`
        wx.removeStorageSync(draftKey)
        
        // 埋点
        track('activity_form_submit', {
          mode: this.data.mode,
          published: publishNow,
          activityId: result.result.data.id || this.data.activityId
        })
        
        // 延迟返回，让用户看到成功提示
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        
      } else {
        throw new Error(result.result.error?.msg || '提交失败')
      }
      
    } catch (error) {
      console.error('提交表单失败:', error)
      wx.showToast({
        title: mapError(error).message,
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 保存草稿并返回
  async saveAndExit() {
    await this.saveDraft()
    wx.navigateBack()
  }
})