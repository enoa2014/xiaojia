import { api, callWithRetry, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'

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
  onLoad(opts){
    if (opts && opts.pid) this.setData({ patientId: opts.pid })
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
    const requestId = genRequestId('req')
    const startAt = Date.now()
    this.setData({ submitting: true })
    try {
      // 冲突软提示：提交前按 room+bed+checkInDate 预检
      const { room, bed, checkInDate } = this.data
      // 提交前埋点
      track('tenancy_create_submit', {
        requestId,
        hasPatientId: !!this.data.patientId,
        hasIdCard: !!this.data.id_card,
        hasRoom: !!room,
        hasBed: !!bed
      })
      if (room && bed && checkInDate) {
        const conflicts = await api.tenancies.list({ page: 1, pageSize: 1, filter: { room, bed, checkInDate } })
        if (Array.isArray(conflicts) && conflicts.length > 0) {
          const confirm = await new Promise(resolve => {
            wx.showModal({
              title: '可能床位冲突',
              content: '该床位在当日可能已被占用，请确认后提交',
              confirmText: '继续提交',
              cancelText: '返回修改',
              success: (res) => resolve(!!res.confirm),
              fail: () => resolve(false)
            })
          })
          if (!confirm) { this.setData({ submitting:false }); return }
        }
      }
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
      // 成功埋点
      track('tenancy_create_result', {
        requestId,
        duration: Date.now() - startAt,
        code: 'OK'
      })
      wx.showToast({ title: '新增成功' })
      setTimeout(()=> wx.navigateBack({ delta: 1 }), 500)
    } catch(e){
      const code = e.code || 'E_INTERNAL'
      if (code === 'E_VALIDATE') {
        wx.showToast({ icon:'none', title:'填写有误' })
      } else {
        wx.showToast({ icon:'none', title: mapError(code) })
      }
      // 失败埋点
      track('tenancy_create_result', {
        requestId,
        duration: Date.now() - startAt,
        code
      })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
