import { api, mapError, genRequestId } from '../../../services/api'
import { track } from '../../../services/analytics'

Page({
  data: {
    form: {
      name: '',
      phone: '',
      id_card: '',
      applyRole: 'volunteer',
      relative: { patientName: '', relation: 'father', patientIdCard: '' }
    },
    errors: {},
    roleOptions: ['志愿者', '亲属'],
    roleIndex: 0,
    relationOptions: ['father', 'mother', 'guardian', 'other'],
    relationIndex: 0,
    submitted: false
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = (e.detail && e.detail.value) || ''
    this.setData({ [`form.${field}`]: value })
  },

  onRoleChange(e) {
    const idx = Number(e.detail.value || 0)
    const role = idx === 1 ? 'parent' : 'volunteer'
    this.setData({ roleIndex: idx, 'form.applyRole': role })
  },

  onRelativeInput(e) {
    const field = e.currentTarget.dataset.field
    const value = (e.detail && e.detail.value) || ''
    this.setData({ [`form.relative.${field}`]: value })
  },

  onRelationChange(e) {
    const idx = Number(e.detail.value || 0)
    const relation = this.data.relationOptions[idx]
    this.setData({ relationIndex: idx, 'form.relative.relation': relation })
  },

  validate(form) {
    const errors = {}
    const name = (form.name || '').trim()
    if (name.length < 2 || name.length > 30) errors.name = '姓名需为2-30个字符'
    if (!/^1\d{10}$/.test(form.phone || '')) errors.phone = '请输入11位手机号'
    if (!/^[0-9]{17}[0-9Xx]$/.test(form.id_card || '')) errors.id_card = '请输入18位身份证号'
    if (!form.applyRole) errors.applyRole = '请选择申请身份'
    if (form.applyRole === 'parent') {
      if (!form.relative || !(form.relative.patientName || '').trim()) errors['relative.patientName'] = '请填写患者姓名'
      if (!form.relative || !/^[0-9]{17}[0-9Xx]$/.test(form.relative.patientIdCard || '')) errors['relative.patientIdCard'] = '请输入18位身份证号'
      if (!form.relative || !form.relative.relation) errors['relative.relation'] = '请选择关系'
    }
    return errors
  },

  async onSubmit() {
    const form = JSON.parse(JSON.stringify(this.data.form))
    const errors = this.validate(form)
    this.setData({ errors })
    if (Object.keys(errors).length) {
      wx.showToast({ icon: 'none', title: '请检查填写项' })
      return
    }
    const reqId = genRequestId('register')
    const startAt = Date.now()
    try { track('register_submit', { requestId: reqId, applyRole: form.applyRole, hasRelative: form.applyRole === 'parent' ? 1 : 0, nameLength: (form.name || '').length }) } catch(_) {}
    try {
      wx.showLoading({ title: '提交中...', mask: true })
      const res = await api.users.register(form)
      if (res && res.status === 'pending') {
        // 清理敏感字段，避免本地短期残留
        this.setData({ submitted: true, 'form.id_card': '', 'form.relative.patientIdCard': '' })
        wx.showToast({ icon: 'none', title: '已提交，等待审批' })
      } else {
        wx.showToast({ icon: 'none', title: '提交成功' })
      }
      try { track('register_result', { requestId: reqId, duration: Date.now() - startAt, code: 'OK' }) } catch(_) {}
    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      wx.showToast({ icon: 'none', title: mapError(code) })
      try { track('register_result', { requestId: reqId, duration: Date.now() - startAt, code }) } catch(_) {}
    } finally {
      wx.hideLoading()
    }
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
