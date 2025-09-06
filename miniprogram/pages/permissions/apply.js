import { api, mapError } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: {
    patientId: '',
    fields: { id_card: false, phone: false, diagnosis: false },
    reason: '',
    expiresIndex: 0,
    expiresOptions: [30, 60, 90],
    submitting: false,
    errors: {}
  },
  onLoad(opts){ if (opts && opts.pid) this.setData({ patientId: opts.pid }) },
  toggleField(e){
    const key = e.currentTarget.dataset.key
    this.setData({ [`fields.${key}`]: !this.data.fields[key] })
  },
  onReason(e){ this.setData({ reason: e.detail.value, errors:{...this.data.errors, reason:''} }) },
  onExpires(e){ this.setData({ expiresIndex: Number(e.detail.value) }) },
  validate(){
    const er = {}
    const selected = Object.keys(this.data.fields).filter(k => this.data.fields[k])
    if (!this.data.patientId) er.patientId = '缺少 patientId'
    if (selected.length === 0) er.fields = '请至少选择一个字段'
    if (!this.data.reason || this.data.reason.length < 20) er.reason = '请填写申请理由（不少于20字）'
    this.setData({ errors: er })
    return Object.keys(er).length === 0
  },
  async onSubmit(){
    if (!this.validate()) return
    const requestId = `perm-${Date.now()}-${Math.floor(Math.random()*1e6)}`
    const startAt = Date.now()
    this.setData({ submitting: true })
    try {
      const fields = Object.keys(this.data.fields).filter(k => this.data.fields[k])
      const expiresDays = this.data.expiresOptions[this.data.expiresIndex]
      const payload = { fields, patientId: this.data.patientId, reason: this.data.reason, expiresDays: String(expiresDays) }
      // 提交埋点
      track('perm_request_submit', { requestId, fields: fields.join(','), expiresDays, length: (this.data.reason || '').length })
      const r = await wx.cloud.callFunction({ name: 'permissions', data: { action: 'request.submit', payload } })
      const res = r && r.result
      if (!res || res.ok !== true) throw (res && res.error) || { code:'E_INTERNAL', msg:'申请失败' }
      // 成功埋点
      track('perm_request_result', { requestId, duration: Date.now() - startAt, code: 'OK' })
      wx.showToast({ title:'已提交申请' })
      setTimeout(()=> wx.navigateBack({ delta:1 }), 600)
    } catch (e) {
      const code = e.code || 'E_INTERNAL'
      const msg = (code === 'E_VALIDATE' && e.msg) ? e.msg : mapError(code)
      wx.showToast({ icon:'none', title: msg })
      // 失败埋点
      try { track('perm_request_result', { requestId, duration: Date.now() - startAt, code }) } catch(_){ }
    } finally {
      this.setData({ submitting: false })
    }
  }
})
