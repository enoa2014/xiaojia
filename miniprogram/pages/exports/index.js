import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'
import { applyThemeByRole } from '../../services/theme'

Page({
  data: {
    theme: { headerBg: 'nav-header--cyan' },
    // 权限和用户信息
    role: null,
    canView: true,
    
    // 当前操作状态
    loading: false,
    error: '',
    
    // 导出模板
    templates: [
      {
        id: 'stats-monthly',
        name: '月度统计报表',
        description: '包含服务量、入住率、活动参与等月度数据',
        icon: '📊',
        type: 'monthly',
        params: ['month']
      },
      {
        id: 'stats-quarterly',
        name: '季度分析报告',
        description: '季度服务效果分析和趋势对比',
        icon: '📈',
        type: 'quarterly',
        params: ['quarter']
      },
      {
        id: 'patients-summary',
        name: '档案汇总表',
        description: '患者基础信息和入住记录汇总',
        icon: '👥',
        type: 'data',
        params: ['dateRange']
      },
      {
        id: 'services-detail',
        name: '服务记录详单',
        description: '按时间范围导出详细服务记录',
        icon: '📋',
        type: 'data',
        params: ['dateRange']
      }
    ],
    
    // 历史导出记录
    exportHistory: [],
    
    // 表单数据
    selectedTemplate: null,
    formData: {
      month: '',
      quarter: '',
      dateRange: { start: '', end: '' }
    },
    
    // 当前创建的任务
    currentTask: {
      id: '',
      status: '',
      progress: 0,
      downloadUrl: ''
    }
  },
  onLoad(options) {
    applyThemeByRole(this)
    this.initFormData()
    
    // 处理从其他页面传入的参数
    try {
      const { month, template } = options || {}
      if (month) {
        this.setData({ 'formData.month': month })
      }
      if (template) {
        this.selectTemplate(template)
      }
    } catch(_) {}
  },

  async onShow() {
    applyThemeByRole(this)
    await this.checkUserPermissions()
    
    if (this.data.canView) {
      this.loadExportHistory()
    }
  },

  // 检查用户权限
  async checkUserPermissions() {
    try {
      const profile = await require('../../services/api').api.users.getProfile()
      const role = profile.role || 'parent'
      const canView = role === 'admin' || role === 'social_worker'
      this.setData({ role, canView })
    } catch (error) {
      console.warn('Failed to check user permissions:', error)
      this.setData({ role: 'parent', canView: false })
    }
  },

  // 初始化表单数据
  initFormData() {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const currentQuarter = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`
    const currentDate = now.toISOString().split('T')[0]
    
    this.setData({
      'formData.month': currentMonth,
      'formData.quarter': currentQuarter,
      'formData.dateRange.start': currentDate,
      'formData.dateRange.end': currentDate
    })
  },

  // 选择导出模板
  onSelectTemplate(e) {
    const templateId = e.currentTarget.dataset.id
    const template = this.data.templates.find(t => t.id === templateId)
    if (!template) return

    this.setData({ selectedTemplate: template })
    
    try {
      track('export_template_select', { templateId, templateType: template.type })
    } catch(_) {}
  },

  // 表单输入处理
  onMonthChange(e) {
    this.setData({ 'formData.month': e.detail.value })
  },

  onQuarterChange(e) {
    this.setData({ 'formData.quarter': e.detail.value })
  },

  onStartDateChange(e) {
    this.setData({ 'formData.dateRange.start': e.detail.value })
  },

  onEndDateChange(e) {
    this.setData({ 'formData.dateRange.end': e.detail.value })
  },

  // 创建导出任务
  async onCreateExport() {
    const { selectedTemplate, formData } = this.data
    if (!selectedTemplate) {
      return wx.showToast({ icon: 'none', title: '请选择导出模板' })
    }

    // 参数验证
    const params = this.buildExportParams(selectedTemplate, formData)
    if (!params) return

    const requestId = genRequestId('export')
    const clientToken = `export_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const startTime = Date.now()

    this.setData({ loading: true, error: '', 'currentTask.status': 'creating' })

    try {
      track('export_create_start', { 
        requestId, 
        templateId: selectedTemplate.id, 
        templateType: selectedTemplate.type 
      })

      const result = await api.exports.create(selectedTemplate.id, params, clientToken, requestId)
      
      this.setData({
        'currentTask.id': result.taskId || result._id || '',
        'currentTask.status': result.status || 'pending',
        'currentTask.progress': 0
      })

      // 开始轮询任务状态
      this.startPollingTask()

      wx.showToast({ title: '导出任务已创建' })
      
      try {
        track('export_create_success', {
          requestId,
          templateId: selectedTemplate.id,
          taskId: this.data.currentTask.id,
          duration: Date.now() - startTime
        })
      } catch(_) {}

    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      this.setData({ error: mapError(code) })
      wx.showToast({ icon: 'none', title: mapError(code) })
      
      try {
        track('export_create_error', {
          requestId,
          templateId: selectedTemplate.id,
          code,
          duration: Date.now() - startTime
        })
      } catch(_) {}
    } finally {
      this.setData({ loading: false })
    }
  },

  // 构建导出参数
  buildExportParams(template, formData) {
    const params = {}
    
    for (const paramType of template.params) {
      switch (paramType) {
        case 'month':
          if (!formData.month) {
            wx.showToast({ icon: 'none', title: '请选择月份' })
            return null
          }
          params.month = formData.month
          break
          
        case 'quarter':
          if (!formData.quarter) {
            wx.showToast({ icon: 'none', title: '请选择季度' })
            return null
          }
          params.quarter = formData.quarter
          break
          
        case 'dateRange':
          if (!formData.dateRange.start || !formData.dateRange.end) {
            wx.showToast({ icon: 'none', title: '请选择日期范围' })
            return null
          }
          if (formData.dateRange.start > formData.dateRange.end) {
            wx.showToast({ icon: 'none', title: '开始日期不能晚于结束日期' })
            return null
          }
          params.dateRange = formData.dateRange
          break
      }
    }
    
    return params
  },

  // 开始轮询任务状态
  startPollingTask() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
    }

    this.pollingTimer = setInterval(() => {
      this.checkTaskStatus()
    }, 2000) // 每2秒检查一次

    // 30秒后停止轮询
    setTimeout(() => {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    }, 30000)
  },

  // 检查任务状态
  async checkTaskStatus() {
    const taskId = this.data.currentTask.id
    if (!taskId) return

    try {
      const result = await api.exports.status(taskId)
      
      this.setData({
        'currentTask.status': result.status || '',
        'currentTask.progress': result.progress || 0,
        'currentTask.downloadUrl': result.downloadUrl || ''
      })

      // 任务完成或失败时停止轮询
      if (result.status === 'done' || result.status === 'failed') {
        if (this.pollingTimer) {
          clearInterval(this.pollingTimer)
          this.pollingTimer = null
        }

        if (result.status === 'done') {
          wx.showToast({ title: '导出完成' })
          this.loadExportHistory() // 刷新历史记录
        } else {
          wx.showToast({ icon: 'none', title: '导出失败' })
        }
      }

    } catch (e) {
      console.warn('Failed to check task status:', e)
    }
  },

  // 加载导出历史
  async loadExportHistory() {
    try {
      const res = await api.exports.history({ page: 1, pageSize: 20 })
      const items = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : [])
      // 规范化展示字段
      const normalized = items.map(it => ({
        id: it._id || it.id || '',
        templateName: it.type || '导出任务',
        templateIcon: '📄',
        createdAt: this.formatTs(it.createdAt),
        createdBy: it.createdBy || '',
        status: it.status || '',
        statusText: (it.status === 'done' ? '已完成' : it.status === 'failed' ? '失败' : it.status === 'running' ? '处理中' : '等待中'),
        downloadUrl: it.downloadUrl || ''
      }))
      this.setData({ exportHistory: normalized })
    } catch (e) {
      console.warn('Failed to load export history:', e)
    }
  },

  formatTs(ts) {
    if (!ts) return ''
    try {
      const d = new Date(typeof ts === 'number' ? ts : Number(ts))
      const y = d.getFullYear()
      const m = String(d.getMonth()+1).padStart(2,'0')
      const day = String(d.getDate()).padStart(2,'0')
      const hh = String(d.getHours()).padStart(2,'0')
      const mm = String(d.getMinutes()).padStart(2,'0')
      return `${y}-${m}-${day} ${hh}:${mm}`
    } catch {
      return ''
    }
  },

  // 下载文件
  onDownload(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return

    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: '下载链接已复制' })
      }
    })
  },

  // 手动检查任务状态
  onCheckTask() {
    if (!this.data.currentTask.id) return
    this.checkTaskStatus()
  },

  // 重置选择
  onResetSelection() {
    this.setData({ 
      selectedTemplate: null,
      'currentTask.id': '',
      'currentTask.status': '',
      'currentTask.progress': 0,
      'currentTask.downloadUrl': '',
      error: ''
    })
  },

  // 页面卸载
  onUnload() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
  }
})
