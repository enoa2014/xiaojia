import { api, mapError, genRequestId } from '../../../services/api'
// 本页使用局部配置避免打包路径问题
const flags = { devBackdoorEnabled: false }
import { track } from '../../../services/analytics'

Page({
  data: {
    // Tab 状态 - 默认显示登录页面
    currentTab: 0, // 0: 登录, 1: 注册
    loginMode: 'wx', // 'wx': 微信登录, 'password': 用户名密码登录
    
    // 用户状态
    userInfo: null,
    hasLogin: false,
    loading: true, // 初始加载状态
    
    // 用户名密码登录表单
    loginForm: {
      username: '',
      password: ''
    },
    loginErrors: {},
    
    // 注册表单
    registerForm: {
      nickname: '',
      password: '',
      name: '',
      phone: '',
      id_card: '',
      applyRole: 'volunteer',
      relative: { patientName: '', relation: 'father', patientIdCard: '' }
    },
    registerErrors: {},
    roleOptions: ['志愿者', '亲属'],
    roleIndex: 0,
    relationOptions: ['father', 'mother', 'guardian', 'other'],
    relationIndex: 0,
    submitted: false,
    flags,
    testMode: false
  },

  onLoad(options) {
    try {
      if (options && (options.test === '1' || options.test === 1 || options.test === true)) {
        this.setData({ testMode: true })
      }
    } catch(_) {}
    // 检查用户登录状态
    this.checkLoginStatus()
  },

  async checkLoginStatus() {
    try {
      if (this.data.testMode) {
        // 测试注册模式：不进行自动跳转，直接进入注册页
        const defaultUserInfo = { nickName: '测试用户', avatarUrl: '/assets/default-avatar.png' }
        this.setData({ hasLogin: true, userInfo: defaultUserInfo, currentTab: 1, 'registerForm.name': defaultUserInfo.nickName, loading: false })
        return
      }
      // 检查是否已经有用户信息
      const profile = await api.users.getProfile()
      if (profile && (profile.name || profile.role)) {
        this.setData({ 
          hasLogin: true,
          userInfo: profile,
          currentTab: (['approved','active'].includes(profile.status)) ? -1 : 0 // 已通过审批/激活的用户直接跳转
        })
        
        if (['approved','active'].includes(profile.status)) {
          // 已通过审批，直接跳转首页（保持 loading 避免显示兜底）
          this.setData({ loading: true })
          try { wx.showToast({ icon: 'success', title: '欢迎回来', duration: 800 }) } catch(_) {}
          setTimeout(() => { wx.switchTab({ url: '/pages/index/index' }) }, 300)
          return
        } else if (profile.status === 'pending') {
          this.setData({ submitted: true, loading: false })
          return
        } else {
          // 已拒绝或其他状态，引导到“密码登录”
          this.setData({ hasLogin: false, currentTab: 0, loginMode: 'password', loading: false })
          return
        }
      }
      
      // 未注册或无用户信息，显示默认登录页面
      this.setData({ hasLogin: false, currentTab: 0, loading: false })
      
    } catch (e) {
      console.warn('checkLoginStatus error:', e)
      // API调用失败，显示默认登录页面
      this.setData({ hasLogin: false, currentTab: 0, loading: false })
    }
  },

  // Tab 切换
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ 
      currentTab: parseInt(tab),
      registerErrors: {},
      loginErrors: {},
      loginMode: 'wx' // 切换Tab时重置登录模式
    })
  },

  // 切换登录模式
  switchLoginMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ 
      loginMode: mode,
      loginErrors: {} // 清空错误信息
    })
  },

  // 用户名密码表单输入
  onLoginInput(e) {
    const field = e.currentTarget.dataset.field
    const value = (e.detail && e.detail.value) || ''
    this.setData({ [`loginForm.${field}`]: value })
    // 清除对应字段的错误信息
    if (this.data.loginErrors[field]) {
      this.setData({ [`loginErrors.${field}`]: '' })
    }
  },

  // 用户名密码登录校验
  validateLogin(form) {
    const errors = {}
    if (!(form.username || '').trim()) {
      errors.username = '请输入用户名'
    }
    if (!(form.password || '').trim()) {
      errors.password = '请输入密码'
    } else if (form.password.length < 6) {
      errors.password = '密码至少为6位'
    }
    return errors
  },

  // 用户名密码登录
  async passwordLogin() {
    const form = JSON.parse(JSON.stringify(this.data.loginForm))
    const errors = this.validateLogin(form)
    
    this.setData({ loginErrors: errors })
    if (Object.keys(errors).length > 0) {
      wx.showToast({ icon: 'none', title: '请检查填写项' })
      return
    }

    const reqId = genRequestId('password_login')
    const startAt = Date.now()
    
    try {
      wx.showLoading({ title: '登录中...', mask: true })
      track('password_login_submit', { requestId: reqId, username: form.username })
      
      // 受控后门（默认禁用，需显式开启 flags.devBackdoorEnabled）
      if (flags.devBackdoorEnabled && form.username === 'admin' && form.password === '123456') {
        try { const { setUserRoles } = require('../../../components/utils/auth'); setUserRoles(['admin']) } catch(_) {}
        try { wx.setStorageSync('debug_role', { key: 'admin', name: '管理员', avatar: '👩‍💼' }) } catch(_) {}
        try { await wx.cloud.callFunction({ name: 'users', data: { action: 'setRole', payload: { role: 'admin' } } }) } catch(_) {}
        wx.showToast({ icon: 'success', title: '登录成功(本地)' })
        track('password_login_result', { requestId: reqId, duration: Date.now() - startAt, code: 'OK_DEV', role: 'admin' })
        setTimeout(() => { wx.switchTab({ url: '/pages/index/index' }) }, 1200)
        return
      }

      // 账号登录（调用后端API）
      const res = await api.users.login(form)
      if (res && res.user) {
        // 登录成功，设置用户信息
        this.setData({ 
          hasLogin: true, 
          userInfo: res.user,
          loading: false
        })
        
        if (['approved','active'].includes(res.user.status)) {
          wx.showToast({ icon: 'success', title: '登录成功' })
          track('password_login_result', { requestId: reqId, duration: Date.now() - startAt, code: 'OK', role: res.user.role })
          setTimeout(() => {
            wx.switchTab({ url: '/pages/index/index' })
          }, 1500)
        } else if (res.user.status === 'pending') {
          this.setData({ submitted: true })
          track('password_login_result', { requestId: reqId, duration: Date.now() - startAt, code: 'PENDING' })
        } else {
          wx.showToast({ icon: 'none', title: '账号异常，请联系管理员' })
          track('password_login_result', { requestId: reqId, duration: Date.now() - startAt, code: 'REJECTED' })
        }
      } else {
        wx.showToast({ icon: 'none', title: '用户名或密码错误' })
        track('password_login_result', { requestId: reqId, duration: Date.now() - startAt, code: 'AUTH_FAILED' })
      }
      
    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      let errorMsg = mapError(code)
      if (code === 'E_VALIDATE' || code === 'E_AUTH') {
        errorMsg = '用户名或密码错误'
      }
      wx.showToast({ icon: 'none', title: errorMsg })
      track('password_login_result', { requestId: reqId, duration: Date.now() - startAt, code })
    } finally {
      wx.hideLoading()
    }
  },

  // 微信登录
  async wxLogin() {
    try {
      wx.showLoading({ title: '登录中...', mask: true })
      
      // 棄用getUserProfile，直接检查用户登录状态
      const profile = await api.users.getProfile()
      
      if (profile && (profile.name || profile.role)) {
        // 用户已注册
        this.setData({ 
          hasLogin: true, 
          userInfo: profile,
          loading: false
        })
        
        if (['approved','active'].includes(profile.status)) {
          try { wx.showToast({ icon: 'success', title: '登录成功', duration: 800 }) } catch(_) {}
          this.setData({ loading: true })
          setTimeout(() => { wx.switchTab({ url: '/pages/index/index' }) }, 300)
        } else if (profile.status === 'pending') {
          this.setData({ submitted: true })
        } else {
          // 已拒绝或其他状态，引导到“密码登录”；若是管理员微信，提示不可注册
          this.setData({ hasLogin: false, currentTab: 0, loginMode: 'password' })
          const msg = profile.role === 'admin' ? '当前微信已绑定管理员，无法注册新用户' : '请使用密码登录'
          wx.showToast({ icon: 'none', title: msg })
        }
      } else {
        // 未注册，使用默认用户信息转到注册页面
        const defaultUserInfo = {
          nickName: '微信用户',
          avatarUrl: '/assets/default-avatar.png'
        }
        
        this.setData({ 
          hasLogin: true,
          userInfo: defaultUserInfo,
          currentTab: 1,
          'registerForm.name': defaultUserInfo.nickName,
          loading: false
        })
        
        wx.showToast({ icon: 'none', title: '请完善注册信息' })
      }
      
    } catch (e) {
      // 登录失败或未登录，转到注册模式
      const defaultUserInfo = {
        nickName: '微信用户',
        avatarUrl: '/assets/default-avatar.png'
      }
      
      this.setData({ 
        hasLogin: true,
        userInfo: defaultUserInfo,
        currentTab: 1,
        'registerForm.name': defaultUserInfo.nickName,
        loading: false
      })
      
      wx.showToast({ icon: 'none', title: '请先完善注册信息' })
      console.warn('wx login error:', e)
    } finally {
      wx.hideLoading()
    }
  },

  // 注册表单输入
  onRegisterInput(e) {
    const field = e.currentTarget.dataset.field
    const value = (e.detail && e.detail.value) || ''
    this.setData({ [`registerForm.${field}`]: value })
  },

  onRoleChange(e) {
    const idx = Number(e.detail.value || 0)
    const role = idx === 1 ? 'parent' : 'volunteer'
    this.setData({ roleIndex: idx, 'registerForm.applyRole': role })
  },

  onRelativeInput(e) {
    const field = e.currentTarget.dataset.field
    const value = (e.detail && e.detail.value) || ''
    this.setData({ [`registerForm.relative.${field}`]: value })
  },

  onRelationChange(e) {
    const idx = Number(e.detail.value || 0)
    const relation = this.data.relationOptions[idx]
    this.setData({ relationIndex: idx, 'registerForm.relative.relation': relation })
  },

  // 注册表单校验
  validateRegister(form) {
    const errors = {}
    
    // 验证昵称（可选）
    const nickname = (form.nickname || '').trim()
    if (nickname && (nickname.length < 1 || nickname.length > 30)) {
      errors.nickname = '昵称需为1-30个字符'
    }
    
    // 验证密码
    const password = form.password || ''
    if (!password) {
      errors.password = '请输入密码'
    } else if (password.length < 6 || password.length > 100) {
      errors.password = '密码需为6-100个字符'
    }
    
    // 验证姓名
    const name = (form.name || '').trim()
    if (!name) {
      errors.name = '请输入真实姓名'
    } else if (name.length < 2 || name.length > 30) {
      errors.name = '姓名需为2-30个字符'
    }
    
    // 验证手机号
    if (!/^1\d{10}$/.test(form.phone || '')) errors.phone = '请输入11位手机号'
    
    // 验证身份证号（必填）
    if (!form.id_card) {
      errors.id_card = '请输入身份证号'
    } else if (!/^[0-9]{17}[0-9Xx]$/.test(form.id_card)) {
      errors.id_card = '请输入18位身份证号'
    }
    
    // 验证申请身份
    if (!form.applyRole) errors.applyRole = '请选择申请身份'
    
    // 如果是亲属，验证关联信息
    if (form.applyRole === 'parent') {
      if (!form.relative || !(form.relative.patientName || '').trim()) errors['relative.patientName'] = '请填写患者姓名'
      if (!form.relative || !/^[0-9]{17}[0-9Xx]$/.test(form.relative.patientIdCard || '')) errors['relative.patientIdCard'] = '请输入18位身份证号'
      if (!form.relative || !form.relative.relation) errors['relative.relation'] = '请选择关系'
    }
    
    return errors
  },


  // 注册提交
  async onRegisterSubmit() {
    const form = JSON.parse(JSON.stringify(this.data.registerForm))
    const errors = this.validateRegister(form)
    this.setData({ registerErrors: errors })
    if (Object.keys(errors).length) {
      wx.showToast({ icon: 'none', title: '请检查填写项' })
      return
    }
    const reqId = genRequestId('register')
    const startAt = Date.now()
    try { track('register_submit', { requestId: reqId, applyRole: form.applyRole, hasRelative: form.applyRole === 'parent' ? 1 : 0, nameLength: (form.name || '').length }) } catch(_) {}
    try {
      wx.showLoading({ title: '提交中...', mask: true })
      const payload = this.data.testMode ? { ...form, test: true } : form
      const res = await api.users.register(payload)
      if (res && res.status === 'pending') {
        // 清理敏感字段，避免本地短期残留
        this.setData({ submitted: true, 'registerForm.id_card': '', 'registerForm.relative.patientIdCard': '' })
        wx.showToast({ icon: 'none', title: '已提交，等待审批' })
      } else {
        wx.showToast({ icon: 'none', title: '提交成功' })
      }
      try { track('register_result', { requestId: reqId, duration: Date.now() - startAt, code: 'OK' }) } catch(_) {}
    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      const msg = code === 'E_CONFLICT' && e.message ? e.message : mapError(code)
      wx.showToast({ icon: 'none', title: msg })
      try { track('register_result', { requestId: reqId, duration: Date.now() - startAt, code }) } catch(_) {}
    } finally {
      wx.hideLoading()
    }
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
