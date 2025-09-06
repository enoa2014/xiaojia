import { api, mapError } from '../../services/api'
import { track } from '../../services/analytics'
import { uploadImage } from '../../services/upload'

Page({
  data: {
    patientId: '',
    type: '',
    date: '',
    desc: '',
    images: [], // [{local, fileID?}]
    errors: {},
    submitting: false,
    quickMode: true,
    uploading: false,
    uploadProgress: 0,
    uploadTotal: 0,
    uploadDone: 0
  },
  onUnload(){
    try {
      const { patientId, type, date, desc, images, quickMode } = this.data
      if (patientId || type || date || desc || (images && images.length)) {
        wx.setStorageSync('svc_draft', { patientId, type, date, desc, images, quickMode })
      }
    } catch(e) {}
  },
  onLoad(opts){
    if (opts && opts.pid) this.setData({ patientId: opts.pid })
    // 载入草稿
    const d = wx.getStorageSync('svc_draft')
    if (d && typeof d === 'object') {
      this.setData({ ...this.data, ...d })
    }
  },
  onType(e){ this.setData({ type: e.detail.value, errors:{...this.data.errors, type:''} }) },
  onDate(e){ this.setData({ date: e.detail.value, errors:{...this.data.errors, date:''} }) },
  choose(){
    if (this.data.images.length >= 9) return wx.showToast({icon:'none', title:'最多 9 张'})
    const remain = 9 - this.data.images.length
    wx.chooseImage({ count: Math.min(remain, 3) }).then(res=>{
      const files = (res.tempFiles || []).map(f=>({ local: f.path, size: f.size }))
      const oversized = files.filter(f => f.size && f.size > 5 * 1024 * 1024)
      if (oversized.length) {
        wx.showToast({ icon:'none', title:'最多 9 张，每张≤5MB' })
      }
      const ok = files.filter(f => !f.size || f.size <= 5*1024*1024).map(f => ({ local: f.path }))
      if (!ok.length) return
      const merged = this.data.images.concat(ok).slice(0,9)
      this.setData({ images: merged })
    })
  },
  remove(e){
    const i = e.currentTarget.dataset.index
    const arr = this.data.images.slice()
    arr.splice(i,1)
    this.setData({ images: arr })
  },
  preview(e){
    const i = e.currentTarget.dataset.index
    const urls = this.data.images.map(x=>x.local || x.fileID)
    wx.previewImage({ current: urls[i], urls })
  },
  validate(){
    const er = {}
    if (!this.data.patientId) er.patientId = '请填写患者ID'
    if (!this.data.type) er.type = '请选择服务类型'
    if (!this.data.date) er.date = '请选择日期'
    if (this.data.images.length > 9) er.images = '最多 9 张'
    this.setData({ errors: er })
    if (Object.keys(er).length) this.scrollToFirstError(er)
    return Object.keys(er).length === 0
  },
  scrollToFirstError(er){
    const idOrder = ['patientId','type','date','images']
    const first = idOrder.find(k => er[k])
    if (!first) return
    const q = wx.createSelectorQuery()
    q.select(`#field-${first}`).boundingClientRect()
    q.selectViewport().scrollOffset()
    q.exec(res => {
      const rect = res && res[0]
      if (rect) wx.pageScrollTo({ scrollTop: Math.max(0, rect.top + (res[1]?.scrollTop || 0) - 60), duration: 200 })
    })
  },
  onToggleMode(){ this.setData({ quickMode: !this.data.quickMode }) },
  saveDraft(){
    const { patientId, type, date, desc, images, quickMode } = this.data
    const draft = { patientId, type, date, desc, images, quickMode }
    wx.setStorageSync('svc_draft', draft)
    wx.showToast({ icon:'none', title:'草稿已保存' })
  },
  clearDraft(){ wx.removeStorageSync('svc_draft'); wx.showToast({ icon:'none', title:'草稿已清除' }) },
  async ensureUploads(){
    const arr = []
    const imgs = this.data.images
    const total = imgs.filter(x=>!x.fileID).length
    let done = 0
    if (total > 0) this.setData({ uploading: true, uploadProgress: 0, uploadTotal: total, uploadDone: 0 })
    for (const img of imgs){
      if (img.fileID) { arr.push(img); continue }
      const fileID = await uploadImage(img.local, 'services')
      arr.push({ fileID })
      done += 1
      this.setData({ uploadDone: done, uploadProgress: Math.round(done/total*100) })
    }
    this.setData({ images: arr, uploading: false })
  },
  async onSubmit(){
    if (!this.validate()) return
    const requestId = `svc-${Date.now()}-${Math.floor(Math.random()*1e6)}`
    const startAt = Date.now()
    this.setData({ submitting: true })
    try {
      // 提交前埋点
      track('service_submit_click', {
        requestId,
        hasImages: this.data.images && this.data.images.length > 0,
        imagesCount: (this.data.images || []).length,
        type: this.data.type || ''
      })
      await this.ensureUploads()
      const clientToken = `sv-${Date.now()}`
      const service = {
        patientId: this.data.patientId,
        type: this.data.type,
        date: this.data.date,
        desc: this.data.desc || undefined,
        images: this.data.images.map(x=>x.fileID)
      }
      await api.services.create(service, clientToken)
      // 成功埋点
      track('service_submit_result', { requestId, duration: Date.now() - startAt, code: 'OK' })
      wx.showToast({ title: '提交成功' })
      // 清除草稿
      wx.removeStorageSync('svc_draft')
      setTimeout(()=> wx.navigateBack({ delta:1 }), 500)
    } catch(e){
      const code = e.code || 'E_INTERNAL'
      const msg = code === 'E_VALIDATE' && e && e.message ? e.message : mapError(code)
      wx.showToast({ icon:'none', title: msg })
      // 失败埋点
      track('service_submit_result', { requestId, duration: Date.now() - startAt, code })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
