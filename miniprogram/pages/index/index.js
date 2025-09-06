import { callWithRetry, mapError } from '../../services/api'

Page({
  data: {
    user: {
      name: '李社工',
      roleName: '社工',
      roleKey: null,
      avatar: '🧑‍💼',
      permText: '正常 ✅',
      todayDone: 5,
      todayTotal: 12,
      now: ''
    },
    actions: [],
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
    // 恢复调试身份
    try {
      const role = wx.getStorageSync('debug_role')
      if (role && role.name) {
        this.setData({ 'user.roleName': role.name, 'user.avatar': role.avatar, 'user.roleKey': role.key })
        this.setData({ actions: this.computeActions(role.key) })
      }
    } catch(_) {}
    // 以云端为准同步身份
    this.syncRoleFromServer()
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
  computeActions(roleKey){
    // 对齐 docs/uiux/xiaojia_homepage.tsx 的角色快速入口
    const map = {
      admin: [
        { key: 'global-search', icon: '🔎', title: '全局搜索', subtitle: '跨域查询' },
        { key: 'perm-approval', icon: '🛡️', title: '权限审批', subtitle: '待处理' },
        { key: 'system-stats', icon: '📊', title: '系统统计', subtitle: '实时监控' },
        { key: 'settings', icon: '⚙️', title: '系统设置', subtitle: '配置管理' }
      ],
      social_worker: [
        { key: 'patient-files', icon: '📁', title: '档案管理', subtitle: '新建/编辑' },
        { key: 'service-review', icon: '✅', title: '服务审核', subtitle: '待审核' },
        { key: 'activity-manage', icon: '📅', title: '活动组织', subtitle: '创建/管理' },
        { key: 'family-contact', icon: '📞', title: '家属联系', subtitle: '紧急联系人' }
      ],
      volunteer: [
        { key: 'service-record', icon: '❤️', title: '服务记录', subtitle: '快速填写' },
        { key: 'patient-view', icon: '🧑‍🤝‍🧑', title: '档案查看', subtitle: '脱敏显示' },
        { key: 'my-activities', icon: '📅', title: '我的活动', subtitle: '已报名' },
        { key: 'service-guide', icon: '📘', title: '服务指南', subtitle: '操作手册' }
      ],
      parent: [
        { key: 'my-child', icon: '🧒', title: '我的孩子', subtitle: '' },
        { key: 'service-progress', icon: '📄', title: '服务记录', subtitle: '查看进展' },
        { key: 'family-activities', icon: '🧩', title: '亲子活动', subtitle: '可参与' },
        { key: 'community', icon: '💬', title: '互助社区', subtitle: '经验分享' }
      ]
    }
    return map[roleKey] || []
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
      // 管理员入口
      case 'global-search':
        wx.navigateTo({ url: '/pages/patients/index' })
        break
      case 'perm-approval':
        wx.navigateTo({ url: '/pages/permissions/apply' }) // 审批页后续补齐，暂指向申请页
        break
      case 'system-stats':
        wx.navigateTo({ url: '/pages/stats/index' })
        break
      case 'settings':
        this.wip(); break
      // 社工入口
      case 'patient-files':
        wx.navigateTo({ url: '/pages/patients/index' })
        break
      case 'service-review':
        wx.navigateTo({ url: '/pages/services/index' })
        break
      case 'activity-manage':
        wx.navigateTo({ url: '/pages/activities/index' })
        break
      case 'family-contact':
        this.wip(); break
      // 志愿者入口
      case 'service-record':
        wx.navigateTo({ url: '/pages/services/form' })
        break
      case 'patient-view':
        wx.navigateTo({ url: '/pages/patients/index' })
        break
      case 'my-activities':
        wx.navigateTo({ url: '/pages/activities/index' })
        break
      case 'service-guide':
        this.wip(); break
      // 家长入口
      case 'my-child':
        this.wip(); break
      case 'service-progress':
        wx.navigateTo({ url: '/pages/services/index' })
        break
      case 'family-activities':
        wx.navigateTo({ url: '/pages/activities/index' })
        break
      case 'community':
        this.wip(); break
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
  ,
  // 调试用：切换身份（管理员/社工/志愿者/家长）
  openRoleSwitcher(){
    const roles = [
      { key:'admin', name:'管理员', avatar:'👩‍💼' },
      { key:'social_worker', name:'社工', avatar:'🧑‍💼' },
      { key:'volunteer', name:'志愿者', avatar:'🙋' },
      { key:'parent', name:'家长', avatar:'👨‍👩‍👧' }
    ]
    const itemList = roles.map(r => r.name)
    wx.showActionSheet({ itemList }).then(res => {
      const idx = res.tapIndex
      const r = roles[idx]
      if (!r) return
      this.setData({ 'user.roleName': r.name, 'user.avatar': r.avatar, 'user.roleKey': r.key })
      try { require('../../components/utils/auth').setUserRoles([r.key]) } catch(_) {}
      this.setData({ actions: this.computeActions(r.key) })
      try { wx.setStorageSync('debug_role', r) } catch(_) {}
      // 同步到云端 Users 集合（用于后端 RBAC）
      wx.cloud.callFunction({ name: 'users', data: { action: 'setRole', payload: { role: r.key } } })
        .then(() => wx.showToast({ icon:'none', title: `已切换为${r.name}` }))
        .catch(err => wx.showToast({ icon:'none', title: (err && err.code) ? err.code : '网络异常' }))
    }).catch(()=>{})
  },
  async syncRoleFromServer(){
    try {
      const prof = await require('../../services/api').api.users.getProfile()
      const map = {
        admin: { name:'管理员', avatar:'👩‍💼' },
        social_worker: { name:'社工', avatar:'🧑‍💼' },
        volunteer: { name:'志愿者', avatar:'🙋' },
        parent: { name:'家长', avatar:'👨‍👩‍👧' }
      }
      const m = map[prof.role]
      if (m) {
        this.setData({ 'user.roleName': m.name, 'user.avatar': m.avatar, 'user.roleKey': prof.role })
        this.setData({ actions: this.computeActions(prof.role) })
        try { require('../../components/utils/auth').setUserRoles(prof.roles && Array.isArray(prof.roles) ? prof.roles : (prof.role ? [prof.role] : [])) } catch(_) {}
        try { wx.setStorageSync('debug_role', { key: prof.role, ...m }) } catch(_) {}
      }
    } catch(_) {}
  }
})
