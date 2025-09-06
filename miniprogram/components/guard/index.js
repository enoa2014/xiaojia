import { getUserRoles, hasAnyRole } from '../utils/auth'

Component({
  properties: {
    allow: { type: Array, value: [] },
    mode: { type: String, value: 'hide' }, // hide | disable
    blockText: { type: String, value: '无权限操作' }
  },
  data: { allowed: false },
  lifetimes: {
    attached() { this.computeAllowed() }
  },
  observers: {
    'allow': function() { this.computeAllowed() }
  },
  methods: {
    computeAllowed() {
      const roles = getUserRoles()
      const ok = hasAnyRole(this.data.allow || [], roles)
      this.setData({ allowed: !!ok })
    },
    onBlockedTap() {
      wx.showToast({ icon: 'none', title: this.data.blockText || '无权限操作' })
    }
  }
})

