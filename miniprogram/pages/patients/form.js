import { api, mapError } from '../../services/api'
import a11yService from '../../services/a11y'

// 本地校验：姓名/手机号/身份证（含校验位）/出生日期不晚于今天
const REG = {
  phone: /^1[3-9]\d{9}$/,
  id18: /^\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/,
  name: /^[\u4e00-\u9fa5A-Za-z·]{2,30}$/
}
function isValidIdCard(id) {
  if (!REG.id18.test(id)) return false
  const Wi = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2]
  const Val = ['1','0','X','9','8','7','6','5','4','3','2']
  const chars = id.toUpperCase().split('')
  let sum = 0
  for (let i = 0; i < 17; i++) sum += parseInt(chars[i], 10) * Wi[i]
  const code = Val[sum % 11]
  return chars[17] === code
}
function isIsoDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str)
}
function notAfterToday(iso) {
  if (!isIsoDate(iso)) return false
  const today = new Date();
  const d = new Date(iso)
  return d.getTime() <= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
}

Page({
  data: {
    // 基本信息
    name: '',
    id_card: '',
    phone: '',
    birthDate: '',
    // 更多信息（折叠）
    moreOpen: false,
    gender: '',
    nativePlace: '',
    ethnicity: '',
    hospital: '',
    hospitalDiagnosis: '',
    doctorName: '',
    symptoms: '',
    medicalCourse: '',
    followupPlan: '',
    motherName: '',
    motherPhone: '',
    motherIdCard: '',
    otherGuardians: '',
    familyEconomy: '',
    // UI 状态
    errors: {},
    submitting: false,
  },
  onLoad(){ 
    try { require('../../services/theme').applyThemeByRole(this) } catch(_) {}
    // 设置页面无障碍属性
    a11yService.setupPageAccessibility(this, {
      title: '编辑档案',
      description: '填写和编辑家庭档案信息'
    })
  },
  onShow(){ try { require('../../services/theme').applyThemeByRole(this) } catch(_) {} },
  // 绑定
  onInput(e) {
    const key = e.currentTarget.dataset.key || e.target.dataset.key
    const value = e.detail.value
    if (key) {
      // 清除该字段的错误状态
      a11yService.clearFieldError(key, this)
      this.setData({ [key]: value, errors: { ...this.data.errors, [key]: '' } })
    }
  },
  onPickBirth(e) { 
    this.setData({ birthDate: e.detail.value, errors: { ...this.data.errors, birthDate: '' } }) 
  },
  toggleMore() { this.setData({ moreOpen: !this.data.moreOpen }) },
  
  // 可访问性焦点处理
  onFieldFocus(e) {
    const key = e.currentTarget.dataset.key || e.target.dataset.key
    if (key) {
      a11yService.lastFocusedElement = key
    }
  },
  
  onFieldBlur(e) {
    const key = e.currentTarget.dataset.key || e.target.dataset.key
    const value = e.detail.value
    // 可以在这里进行实时验证
    if (key && value) {
      this.validateSingleField(key, value)
    }
  },
  
  // 单字段验证
  validateSingleField(key, value) {
    const errors = {}
    switch (key) {
      case 'name':
        if (!REG.name.test(String(value).trim())) {
          errors[key] = '姓名需为 2–30 个中文/字母'
        }
        break
      case 'phone':
      case 'motherPhone':
        if (value && !REG.phone.test(value)) {
          errors[key] = '手机号格式错误'
        }
        break
      case 'id_card':
      case 'motherIdCard':
        if (value && !isValidIdCard(String(value).trim())) {
          errors[key] = '身份证格式或校验位错误'
        }
        break
    }
    
    if (Object.keys(errors).length > 0) {
      a11yService.showFieldError(key, errors[key], this)
    }
  },

  // 校验并滚动到第一个错误字段
  validate() {
    const er = {}
    const d = this.data
    if (!d.name || !REG.name.test(String(d.name).trim())) er.name = '姓名需为 2–30 个中文/字母'
    if (!d.id_card || !isValidIdCard(String(d.id_card).trim())) er.id_card = '身份证格式或校验位错误'
    if (d.phone && !REG.phone.test(d.phone)) er.phone = '手机号格式错误'
    if (d.birthDate && (!isIsoDate(d.birthDate) || !notAfterToday(d.birthDate))) er.birthDate = '出生日期需早于或等于今日'
    if (d.motherPhone && !REG.phone.test(d.motherPhone)) er.motherPhone = '手机号格式错误'
    if (d.motherIdCard && !isValidIdCard(String(d.motherIdCard).trim())) er.motherIdCard = '身份证格式或校验位错误'
    this.setData({ errors: er })
    if (Object.keys(er).length) this.scrollToFirstError(er)
    return Object.keys(er).length === 0
  },
  scrollToFirstError(er) {
    const idOrder = ['name','id_card','phone','birthDate','motherPhone','motherIdCard']
    const first = idOrder.find(k => er[k])
    if (!first) return
    
    // 使用 A11y 服务聚焦到第一个错误字段
    const firstErrorInfo = { field: first, message: er[first] }
    a11yService.focusFirstError([firstErrorInfo], this)
    
    // 滚动到错误字段
    const q = wx.createSelectorQuery()
    q.select(`#field-${first}`).boundingClientRect()
    q.selectViewport().scrollOffset()
    q.exec(res => {
      const rect = res && res[0]
      if (rect) {
        wx.pageScrollTo({ scrollTop: Math.max(0, rect.top + (res[1]?.scrollTop || 0) - 60), duration: 200 })
        // 播报错误消息
        a11yService.announceToast(`${first}字段错误：${er[first]}`, 'error')
      }
    })
  },

  async onSubmit(){
    if (!this.validate()) return
    this.setData({ submitting: true })
    try {
      const clientToken = `pt-${Date.now()}`
      const patient = {
        name: this.data.name.trim(),
        id_card: this.data.id_card.trim(),
        phone: this.data.phone ? this.data.phone.trim() : undefined,
        birthDate: this.data.birthDate || undefined,
        // 可选扩展字段（后端已支持）
        gender: this.data.gender || undefined,
        nativePlace: this.data.nativePlace || undefined,
        ethnicity: this.data.ethnicity || undefined,
        hospital: this.data.hospital || undefined,
        hospitalDiagnosis: this.data.hospitalDiagnosis || undefined,
        doctorName: this.data.doctorName || undefined,
        symptoms: this.data.symptoms || undefined,
        medicalCourse: this.data.medicalCourse || undefined,
        followupPlan: this.data.followupPlan || undefined,
        motherName: this.data.motherName || undefined,
        motherPhone: this.data.motherPhone || undefined,
        motherIdCard: this.data.motherIdCard || undefined,
        otherGuardians: this.data.otherGuardians || undefined,
        familyEconomy: this.data.familyEconomy || undefined,
      }
      await api.patients.create(patient, clientToken)
      // 使用 A11y 服务播报成功消息
      a11yService.announceToast('档案创建成功', 'success')
      wx.showToast({ title: '创建成功' })
      setTimeout(()=>{ wx.navigateBack({ delta: 1 }) }, 500)
    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      if (code === 'E_CONFLICT') {
        const tail = (this.data.id_card || '').slice(-4)
        // 保存当前焦点位置
        a11yService.pushFocus('submit-btn')
        wx.showModal({
          title: '已存在该身份证',
          content: '身份证已存在，请搜索后编辑',
          confirmText: '去搜索',
          cancelText: '稍后',
          success: (res)=>{
            if (res.confirm) {
              const kw = encodeURIComponent(tail)
              wx.navigateTo({ url: `/pages/patients/search?keyword=${kw}&mode=tail` })
            } else {
              // 用户取消时恢复焦点
              a11yService.popFocus(this)
            }
          },
          fail: () => {
            // Modal显示失败时恢复焦点
            a11yService.popFocus(this)
          }
        })
      } else if (code === 'E_VALIDATE') {
        const msg = (e && e.message) ? e.message : '填写有误'
        wx.showToast({ icon: 'none', title: msg })
      } else {
        wx.showToast({ icon: 'none', title: mapError(code) })
      }
    } finally {
      this.setData({ submitting: false })
    }
  }
})
