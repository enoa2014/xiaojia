import { api, mapError } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: {
    tenancyId: '',
    checkOutDate: '',
    submitting: false,
    errors: {}
  },
  onLoad(opts){
    if (opts && opts.tid) this.setData({ tenancyId: opts.tid })
  },
  onCheckOutDate(e){ this.setData({ checkOutDate: e.detail.value, errors: { ...this.data.errors, checkOutDate: '' } }) },
  validate(){
    const er = {}
    if (!this.data.checkOutDate) er.checkOutDate = '请选择退住日期'
    if (!this.data.tenancyId) er.checkOutDate = '参数缺失，请从详情页进入'
    this.setData({ errors: er })
    return Object.keys(er).length === 0
  },
  async onSubmit(){
    if (!this.validate()) return
    const requestId = `req-${Date.now()}-${Math.floor(Math.random()*1e6)}`
    const startAt = Date.now()
    this.setData({ submitting: true })
    try {
      track('tenancy_checkout_submit', { requestId, tenancyId: this.data.tenancyId })
      await api.tenancies.update(this.data.tenancyId, { checkOutDate: this.data.checkOutDate })
      track('tenancy_checkout_result', { requestId, duration: Date.now() - startAt, code: 'OK' })
      wx.showToast({ title: '退住已登记' })
      setTimeout(()=> wx.navigateBack({ delta: 1 }), 500)
    } catch(e){
      const code = e.code || 'E_INTERNAL'
      wx.showToast({ icon:'none', title: mapError(code) })
      track('tenancy_checkout_result', { requestId, duration: Date.now() - startAt, code })
    } finally {
      this.setData({ submitting: false })
    }
  }
})

