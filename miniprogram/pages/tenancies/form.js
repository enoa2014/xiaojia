import { api, callWithRetry, mapError } from '../../services/api'

Page({
  data: {
    patientId: '',
    id_card: '',
    checkInDate: '',
    checkOutDate: '',
    room: '',
    bed: '',
    subsidy: '',
    admitPersons: '',
    submitting: false,
    errors: {}
  },
  onPatientId(e){ this.setData({ patientId: e.detail.value, errors: { ...this.data.errors, identity: '' } }) },
  onIdCard(e){ this.setData({ id_card: e.detail.value, errors: { ...this.data.errors, identity: '' } }) },
  onCheckInDate(e){ this.setData({ checkInDate: e.detail.value, errors: { ...this.data.errors, checkInDate: '' } }) },
  onCheckOutDate(e){ this.setData({ checkOutDate: e.detail.value, errors: { ...this.data.errors, checkOutDate: '' } }) },
  onSubsidy(e){ this.setData({ subsidy: e.detail.value, errors: { ...this.data.errors, subsidy: '' } }) },
  validate(){
    const er = {}
    if (!this.data.patientId && !this.data.id_card) er.identity = '请填写 patientId 或 身份证'
    if (!this.data.checkInDate) er.checkInDate = '请选择入住日期'
    if (this.data.checkOutDate && this.data.checkOutDate < this.data.checkInDate) er.checkOutDate = '退住日期不能早于入住日期'
    if (this.data.subsidy && !/^\d+(?:\.\d{1,2})?$/.test(this.data.subsidy)) er.subsidy = '金额格式不正确'
    this.setData({ errors: er })
    return Object.keys(er).length === 0
  },
  async onSubmit(){
    if (!this.validate()) return
    this.setData({ submitting: true })
    try {
      const clientToken = `tn-${Date.now()}`
      const tenancy = {
        patientId: this.data.patientId || undefined,
        id_card: this.data.id_card || undefined,
        checkInDate: this.data.checkInDate,
        checkOutDate: this.data.checkOutDate || undefined,
        room: this.data.room || undefined,
        bed: this.data.bed || undefined,
        subsidy: this.data.subsidy ? Number(this.data.subsidy) : undefined,
        extra: this.data.admitPersons ? { admitPersons: this.data.admitPersons } : undefined
      }
      await api.tenancies.create(tenancy, clientToken)
      wx.showToast({ title: '新增成功' })
      setTimeout(()=> wx.navigateBack({ delta: 1 }), 500)
    } catch(e){
      const code = e.code || 'E_INTERNAL'
      if (code === 'E_VALIDATE') {
        wx.showToast({ icon:'none', title:'填写有误' })
      } else {
        wx.showToast({ icon:'none', title: mapError(code) })
      }
    } finally {
      this.setData({ submitting: false })
    }
  }
})

