Component({
  properties: {
    value: {
      type: String,
      value: '0'
    },
    label: {
      type: String,
      value: '标签'
    },
    icon: {
      type: String,
      value: ''
    },
    variant: {
      type: String,
      value: 'default' // default, primary, success, warning, danger, info
    },
    loading: {
      type: Boolean,
      value: false
    },
    empty: {
      type: Boolean,
      value: false
    }
  },

  data: {
    variantClass: 'default',
    ariaRole: 'button',
    ariaLabel: ''
  },

  methods: {
    _updateVariantClass(variant) {
      const validVariants = ['default', 'primary', 'success', 'warning', 'danger', 'info']
      const normalizedVariant = validVariants.includes(variant) ? variant : 'default'
      this.setData({
        variantClass: normalizedVariant
      })
    },

    onTap() {
      if (this.data.loading || this.data.empty) return
      this.triggerEvent('tap', {
        value: this.data.value,
        label: this.data.label,
        variant: this.data.variant
      })
    },

    _updateAria() {
      const { loading, empty, label, value } = this.data
      const ariaRole = (loading || empty) ? 'presentation' : 'button'
      const ariaLabel = loading
        ? `${label || '统计卡片'} 加载中`
        : (empty ? `${label || '统计卡片'} 暂无数据` : `${label || '统计卡片'}: ${value}`)
      this.setData({ ariaRole, ariaLabel })
    }
  },

  observers: {
    'variant': function(variant) {
      this._updateVariantClass(variant)
    },
    'loading, empty, label, value': function() {
      this._updateAria()
    }
  },

  lifetimes: {
    attached() {
      this._updateVariantClass(this.data.variant)
      this._updateAria()
    }
  }
})
