import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'

function todayISO(){
  const d = new Date()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${d.getFullYear()}-${m}-${day}`
}

Page({
  data: {
    id: '',
    checkOutDate: todayISO(),
    submitting: false,
    error: ''
  },
  onLoad(opts){
    if (opts && opts.tid) this.setData({ id: opts.tid })
    try { require('../../services/theme').applyThemeByRole(this) } catch(_) {}
  },
  onShow(){ try { require('../../services/theme').applyThemeByRole(this) } catch(_) {} },
  onDate(e){ this.setData({ checkOutDate: e.detail.value, error: '' }) },
  async onSubmit(){
    if (!this.data.id) { wx.showToast({ icon:'none', title:'缺少记录ID' }); return }
    if (!this.data.checkOutDate) { this.setData({ error: '请选择退住日期' }); return }
    const requestId = genRequestId('tnco')
    const startAt = Date.now()
    this.setData({ submitting: true, error: '' })
    try {
      track('tenancy_checkout_submit', { requestId, tenancyId: this.data.id })
      const { id, checkOutDate } = this.data
      const res = await api.tenancies.update(id, { checkOutDate })
      if (!res || (res.updated !== undefined && res.updated === 0)) {
        throw { code:'E_CONFLICT', msg:'当前记录已退住' }
      }
      track('tenancy_checkout_result', { requestId, duration: Date.now() - startAt, code: 'OK' })
      wx.showToast({ title:'退住已登记' })
      // 尝试刷新上一页（如患者详情）
      try {
        const pages = getCurrentPages()
        const prev = pages[pages.length - 2]
        if (prev && typeof prev.load === 'function') prev.load()
      } catch(_){}
      setTimeout(()=> wx.navigateBack({ delta: 1 }), 500)
    } catch(e){
      const code = e.code || 'E_INTERNAL'
      const msg = code === 'E_VALIDATE' && e.msg ? e.msg : mapError(code)
      this.setData({ error: msg })
      try { track('tenancy_checkout_result', { requestId, duration: Date.now() - startAt, code }) } catch(_){ }
    } finally {
      this.setData({ submitting: false })
    }
  }
})
