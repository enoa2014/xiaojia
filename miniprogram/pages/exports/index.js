import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: {
    month: '',
    submitting: false,
    taskId: '',
    status: '',
    downloadUrl: ''
  },
  onMonth(e){ this.setData({ month: e.detail.value }) },
  async onCreate(){
    const month = this.data.month
    if (!month) return wx.showToast({ icon:'none', title:'请选择月份' })
    const requestId = genRequestId('exp')
    const clientToken = 'exp_' + Date.now()
    const startAt = Date.now()
    this.setData({ submitting: true, status:'', downloadUrl:'', taskId:'' })
    try {
      track('export_create_submit', { requestId, month })
      const r = await api.exports.create('statsMonthly', { month }, clientToken, requestId)
      this.setData({ taskId: r.taskId || r._id || '' })
      track('export_create_result', { requestId, duration: Date.now() - startAt, code: 'OK' })
      wx.showToast({ title:'已创建' })
    } catch(e){
      const code = e.code || 'E_INTERNAL'
      wx.showToast({ icon:'none', title: mapError(code) })
      try { track('export_create_result', { requestId, duration: Date.now() - startAt, code }) } catch(_){ }
    } finally {
      this.setData({ submitting: false })
    }
  },
  async onCheck(){
    if (!this.data.taskId) return
    const requestId = genRequestId('expst')
    try {
      const r = await api.exports.status(this.data.taskId, requestId)
      this.setData({ status: r.status || '', downloadUrl: r.downloadUrl || '' })
      if (r.status === 'done' && r.downloadUrl) {
        wx.showToast({ title:'已完成，可复制链接下载' })
      }
    } catch(e){
      wx.showToast({ icon:'none', title: mapError(e.code || 'E_INTERNAL') })
    }
  }
})

