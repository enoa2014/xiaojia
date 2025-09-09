Component({
  properties: {
    // 按钮文本
    text: {
      type: String,
      value: ''
    },
    // 按钮变体
    variant: {
      type: String,
      value: 'primary' // primary | secondary | ghost | danger
    },
    // 按钮尺寸
    size: {
      type: String,
      value: 'md' // sm | md | lg
    },
    // 禁用状态
    disabled: {
      type: Boolean,
      value: false
    },
    // 加载状态
    loading: {
      type: Boolean,
      value: false
    },
    // 左侧图标
    icon: {
      type: String,
      value: ''
    },
    // 右侧图标
    iconRight: {
      type: String,
      value: ''
    },
    // 表单类型
    formType: {
      type: String,
      value: ''
    },
    // 开放类型
    openType: {
      type: String,
      value: ''
    },
    // 无障碍标签
    ariaLabel: {
      type: String,
      value: ''
    },
    // 全宽按钮
    fullWidth: {
      type: Boolean,
      value: false
    },
    // 圆形按钮
    round: {
      type: Boolean,
      value: false
    },
    // 触达区域增强（确保≥88rpx）
    touchEnhanced: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    _onTap(e) {
      if (this.data.disabled || this.data.loading) {
        return
      }
      
      this.triggerEvent('tap', {
        variant: this.data.variant,
        size: this.data.size,
        text: this.data.text
      })
    }
  }
})