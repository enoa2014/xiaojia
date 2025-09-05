import { api, mapError } from '../../services/api'
import { uploadImage } from '../../services/upload'

Page({
  data: {
    patientId: '',
    type: '',
    date: '',
    desc: '',
    images: [], // [{local, fileID?}]
    errors: {},
    submitting: false
  },
  onType(e){ this.setData({ type: e.detail.value, errors:{...this.data.errors, type:''} }) },
  onDate(e){ this.setData({ date: e.detail.value, errors:{...this.data.errors, date:''} }) },
  choose(){
    if (this.data.images.length >= 9) return wx.showToast({icon:'none', title:'最多 9 张'})
    wx.chooseImage({ count: Math.min(9 - this.data.images.length, 3) }).then(res=>{
      const files = res.tempFilePaths.map(p=>({ local:p }))
      this.setData({ images: this.data.images.concat(files) })
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
    return Object.keys(er).length === 0
  },
  async ensureUploads(){
    const arr = []
    for (const img of this.data.images){
      if (img.fileID) { arr.push(img); continue }
      const fileID = await uploadImage(img.local, 'services')
      arr.push({ fileID })
    }
    this.setData({ images: arr })
  },
  async onSubmit(){
    if (!this.validate()) return
    this.setData({ submitting: true })
    try {
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
      wx.showToast({ title: '提交成功' })
      setTimeout(()=> wx.navigateBack({ delta:1 }), 500)
    } catch(e){
      const code = e.code || 'E_INTERNAL'
      wx.showToast({ icon:'none', title: mapError(code) })
    } finally {
      this.setData({ submitting: false })
    }
  }
})

