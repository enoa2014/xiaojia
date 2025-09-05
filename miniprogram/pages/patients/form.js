import { api, callWithRetry, mapError } from '../../services/api'

Page({
  data: {
    name: '',
    id_card: '',
    phone: '',
    birthDate: '',
    errors: {},
    submitting: false,
  },
  onName(e){ this.setData({ name: e.detail.value }) },
  onIdCard(e){ this.setData({ id_card: e.detail.value, errors: { ...this.data.errors, id_card: '' } }) },
  onPhone(e){ this.setData({ phone: e.detail.value, errors: { ...this.data.errors, phone: '' } }) },
  onBirthDate(e){ this.setData({ birthDate: e.detail.value }) },
  validate() {
    const errors = {}
    if (!this.data.name) errors.name = '请输入姓名'
    if (!this.data.id_card) errors.id_card = '请输入身份证号码'
    if (this.data.phone && !/^1[3-9]\d{9}$/.test(this.data.phone)) errors.phone = '手机号格式错误'
    this.setData({ errors })
    return Object.keys(errors).length === 0
  },
  async onSubmit(){
    if (!this.validate()) return
    this.setData({ submitting: true })
    try {
      const clientToken = `pt-${Date.now()}`
      const patient = {
        name: this.data.name,
        id_card: this.data.id_card,
        phone: this.data.phone || undefined,
        birthDate: this.data.birthDate || undefined,
      }
      await api.patients.create(patient, clientToken)
      wx.showToast({ title: '创建成功' })
      setTimeout(()=>{ wx.navigateBack({ delta: 1 }) }, 500)
    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      if (code === 'E_VALIDATE') {
        // 后端格式校验，简单提示
        wx.showToast({ icon: 'none', title: '填写有误' })
      } else if (code === 'E_CONFLICT') {
        wx.showToast({ icon: 'none', title: '身份证已存在，请搜索后编辑' })
      } else {
        wx.showToast({ icon: 'none', title: mapError(code) })
      }
    } finally {
      this.setData({ submitting: false })
    }
  }
})

