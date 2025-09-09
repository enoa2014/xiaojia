Component({
  properties: {
    roleKey: {
      type: String,
      value: 'admin',
      observer: function(newVal) {
        this._updateDisplayProperties(newVal, this.data.text)
      }
    },
    size: {
      type: String,
      value: 'md'
    },
    text: {
      type: String,
      value: '',
      observer: function(newVal) {
        this._updateDisplayProperties(this.data.roleKey, newVal)
      }
    }
  },

  data: {
    displayText: '',
    ariaLabel: '',
    ariaRole: 'badge',
    roleClassKey: 'admin'
  },

  methods: {
    _updateDisplayProperties(roleKey, customText) {
      const normalizedKey = this._normalizeRoleKey(roleKey)
      const roleConfig = this._getRoleConfig(normalizedKey)
      const displayText = customText || roleConfig.defaultText
      const ariaLabel = `${roleConfig.defaultText}角色徽章${customText ? ': ' + customText : ''}`
      
      this.setData({
        displayText,
        ariaLabel,
        roleClassKey: normalizedKey
      })
    },

    _normalizeRoleKey(key) {
      if (!key || typeof key !== 'string') return 'admin'
      const k = key.trim().toLowerCase()
      if (k === 'social_worker') return 'social'
      return k
    },

    _getRoleConfig(roleKey) {
      const configs = {
        admin: { defaultText: '管理员', color: '#7C3AED' },
        social: { defaultText: '社工', color: '#2563EB' },
        volunteer: { defaultText: '志愿者', color: '#F59E0B' },
        parent: { defaultText: '家长', color: '#EC4899' }
      }
      // Also accept alias 'social_worker' by normalizing
      return configs[roleKey] || configs.admin
    }
  },

  lifetimes: {
    attached() {
      this._updateDisplayProperties(this.data.roleKey, this.data.text)
    }
  }
})
