const testIntegration = require('./test-integration.js')

Page({
  data: {
    formData: {
      name: '',
      idCard: '',
      phone: '',
      notes: '',
      username: '',
      password: ''
    },
    errors: {
      idCard: '',
      phone: '',
      username: '',
      password: ''
    },
    submitting: false,
    focusedField: ''
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: 'FormField 组件演示'
    })
    
    // 延迟运行集成测试
    setTimeout(() => {
      testIntegration.runAllTests.call(this)
    }, 1000)
  },

  // 通用输入处理
  onInputName(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  onInputIdCard(e) {
    const value = e.detail.value
    this.setData({
      'formData.idCard': value
    })
    
    // 实时校验身份证
    if (value && !this.validateIdCard(value)) {
      this.setData({
        'errors.idCard': '身份证格式或校验位错误'
      })
    } else {
      this.setData({
        'errors.idCard': ''
      })
    }
  },

  onInputPhone(e) {
    const value = e.detail.value
    this.setData({
      'formData.phone': value
    })
    
    // 实时校验手机号
    if (value && !this.validatePhone(value)) {
      this.setData({
        'errors.phone': '手机号格式错误'
      })
    } else {
      this.setData({
        'errors.phone': ''
      })
    }
  },

  onInputNotes(e) {
    this.setData({
      'formData.notes': e.detail.value
    })
  },

  onInputUsername(e) {
    const value = e.detail.value
    this.setData({
      'formData.username': value
    })
    
    // 用户名校验
    if (value && (value.length < 2 || value.length > 20)) {
      this.setData({
        'errors.username': '用户名长度应在2-20个字符之间'
      })
    } else {
      this.setData({
        'errors.username': ''
      })
    }
  },

  onInputPassword(e) {
    const value = e.detail.value
    this.setData({
      'formData.password': value
    })
    
    // 密码校验
    if (value && value.length < 6) {
      this.setData({
        'errors.password': '密码长度不能少于6位'
      })
    } else {
      this.setData({
        'errors.password': ''
      })
    }
  },

  // 焦点管理
  onFocusField(e) {
    const field = e.target.dataset.field
    this.setData({
      focusedField: field
    })
    
    // 通知FormField组件
    const formField = this.selectComponent(`#${field}`)
    if (formField) {
      formField.setFocus()
    }
  },

  onBlurField(e) {
    const field = e.target.dataset.field
    this.setData({
      focusedField: ''
    })
    
    // 通知FormField组件
    const formField = this.selectComponent(`#${field}`)
    if (formField) {
      formField.setBlur()
    }
  },

  // 表单提交
  onSubmitForm() {
    if (this.data.submitting) return
    
    // 校验所有字段
    const isValid = this.validateAllFields()
    
    if (!isValid) {
      wx.showToast({
        title: '请修正表单错误',
        icon: 'none'
      })
      return
    }
    
    this.setData({ submitting: true })
    
    // 模拟提交
    setTimeout(() => {
      this.setData({ submitting: false })
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      })
    }, 2000)
  },

  onResetForm() {
    this.setData({
      formData: {
        name: '',
        idCard: '',
        phone: '',
        notes: '',
        username: '',
        password: ''
      },
      errors: {
        idCard: '',
        phone: '',
        username: '',
        password: ''
      }
    })
    
    wx.showToast({
      title: '表单已重置',
      icon: 'none'
    })
  },

  // 测试错误提示
  onTriggerNameError() {
    const nameField = this.selectComponent('#name')
    if (nameField) {
      nameField.setError('姓名不能为空')
    }
  },

  onTriggerIdCardError() {
    this.setData({
      'errors.idCard': '身份证已存在，请搜索后编辑'
    })
  },

  onTriggerPhoneError() {
    this.setData({
      'errors.phone': '手机号格式错误'
    })
  },

  onClearAllErrors() {
    this.setData({
      errors: {
        idCard: '',
        phone: '',
        username: '',
        password: ''
      }
    })
    
    // 清除组件级错误
    const nameField = this.selectComponent('#name')
    if (nameField) {
      nameField.clearError()
    }
    
    wx.showToast({
      title: '错误已清除',
      icon: 'none'
    })
  },

  // 校验方法
  validateAllFields() {
    const { formData } = this.data
    let isValid = true

    // 必填字段校验
    if (!formData.username.trim()) {
      this.setData({ 'errors.username': '用户名不能为空' })
      isValid = false
    } else if (formData.username.length < 2 || formData.username.length > 20) {
      this.setData({ 'errors.username': '用户名长度应在2-20个字符之间' })
      isValid = false
    }

    if (!formData.password.trim()) {
      this.setData({ 'errors.password': '密码不能为空' })
      isValid = false
    } else if (formData.password.length < 6) {
      this.setData({ 'errors.password': '密码长度不能少于6位' })
      isValid = false
    }

    return isValid
  },

  validateIdCard(idCard) {
    // 简化的身份证校验
    const pattern = /^\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/
    return pattern.test(idCard)
  },

  validatePhone(phone) {
    // 手机号校验
    const pattern = /^1[3-9]\d{9}$/
    return pattern.test(phone)
  },

  // 协作测试方法
  onRunBasicTest() {
    testIntegration.testBasicInteraction.call(this)
    wx.showToast({
      title: '基础测试已运行',
      icon: 'none'
    })
  },

  onRunValidationTest() {
    testIntegration.testFormValidationFlow.call(this)
    wx.showToast({
      title: '校验测试已运行',
      icon: 'none'
    })
  },

  onRunAccessibilityTest() {
    testIntegration.testAccessibility.call(this)
    wx.showToast({
      title: '无障碍测试已运行',
      icon: 'none'
    })
  },

  onRunAllTests() {
    testIntegration.runAllTests.call(this)
    wx.showToast({
      title: '全部测试已开始',
      icon: 'none',
      duration: 3000
    })
  }
})