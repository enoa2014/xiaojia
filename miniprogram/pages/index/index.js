import { callWithRetry, mapError } from '../../services/api'

Page({
  data: {
    user: {
      name: '李社工',
      roleName: '社工',
      permText: '正常 ✅',
      todayDone: 5,
      todayTotal: 12,
      now: ''
    },
    actions: [
      { key: 'patient-search', icon: '🔍', title: '档案速查', subtitle: '快速定位' },
      { key: 'service-quick', icon: '❤️', title: '快速记录', subtitle: '服务登记' },
      { key: 'activity-today', icon: '📅', title: '今日活动', subtitle: '进行中' },
      { key: 'contact-emergency', icon: '🚨', title: '紧急联系', subtitle: '医院/家属' }
    ],
    stats: [
      { key: 'services', label: '本月服务', value: '127', trend: '+15%' },
      { key: 'patients', label: '管理档案', value: '69', trend: '+4' },
      { key: 'activities', label: '活动参与', value: '23', trend: '+8' }
    ],
    tasks: [
      { id: 't1', title: '李小明档案权限待审批', desc: '申请时间: 09:15  剩余: 6小时', color: '#F59E0B' },
      { id: 't2', title: '王大伟入住申请待处理', desc: '提交时间: 昨天  优先级: 高', color: '#EF4444' },
      { id: 't3', title: '周末亲子活动报名即将截止', desc: '截止: 明天18:00  已报12人', color: '#22C55E' }
    ],
    updates: [
      { id: 'u1', time: '15:30', text: '陈志愿者 提交了探访记录' },
      { id: 'u2', time: '14:45', text: '活动“康复训练”状态变更' },
      { id: 'u3', time: '13:20', text: '新患者“赵小朋友”建档完成' }
    ]
  },
  onLoad(){
    this.setData({ loading: true })
    this.refreshData()
  },
  onShow() {
    const now = this.formatNow()
    this.setData({ 'user.now': now })
  },
  onPullDownRefresh(){
    this.refreshData(true)
  },
  async refreshData(stopPullDown){
    try {
      // 模拟数据聚合加载延迟
      await new Promise(r => setTimeout(r, 200))
      // TODO: 可接入真实聚合接口，填充 actions/stats/tasks/updates
    } finally {
      this.setData({ loading: false })
      if (stopPullDown) wx.stopPullDownRefresh()
    }
  },
  formatNow() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,'0')
    const mm = String(d.getMinutes()).padStart(2,'0')
    return `${hh}:${mm}`
  },
  wip() {
    wx.showToast({ icon: 'none', title: '施工中，敬请期待' })
  },
  async onAction(e) {
    const key = e.currentTarget.dataset.key
    switch (key) {
      case 'patient-search':
        wx.navigateTo({ url: '/pages/patients/index' })
        break
      case 'service-quick':
        wx.navigateTo({ url: '/pages/services/form' })
        break
      case 'activity-today':
        this.wip()
        break
      case 'contact-emergency':
        this.wip()
        break
      default:
        this.wip()
    }
  },
  async loadPatientsDemo() {
    try {
      const list = await callWithRetry('patients','list',{ page: 1, pageSize: 5 })
      wx.showToast({ icon: 'none', title: `示例载入${list.length}条` })
    } catch (e) {
      wx.showToast({ icon: 'none', title: mapError(e.code) })
      console.error(e)
    }
  }
})
