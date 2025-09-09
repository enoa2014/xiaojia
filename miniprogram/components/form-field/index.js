Component({
  properties: {
    // 字段标签
    label: {
      type: String,
      value: ''
    },
    // 是否必填
    required: {
      type: Boolean,
      value: false
    },
    // 帮助文本
    helpText: {
      type: String,
      value: ''
    },
    // 错误文本
    errorText: {
      type: String,
      value: ''
    },
    // 字段状态
    state: {
      type: String,
      value: 'default' // default | focus | error | disabled
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 是否全宽
    fullWidth: {
      type: Boolean,
      value: true
    },
    // 控件角色（无障碍）
    controlRole: {
      type: String,
      value: 'textbox'
    },
    // 唯一ID前缀
    fieldId: {
      type: String,
      value: ''
    }
  },

  data: {
    labelId: '',
    controlId: '',
    helpId: '',
    errorId: '',
    describedBy: ''
  },

  lifetimes: {
    attached() {
      this._generateIds()
      this._updateDescribedBy()
    }
  },

  observers: {
    'helpText, errorText, state': function() {
      this._updateDescribedBy()
    },
    
    'disabled': function(disabled) {
      if (disabled) {
        this.setData({ state: 'disabled' })
      }
    },
    
    'errorText': function(errorText) {
      if (errorText && this.data.state !== 'disabled') {
        this.setData({ state: 'error' })
      } else if (!errorText && this.data.state === 'error') {
        this.setData({ state: 'default' })
      }
    }
  },

  methods: {
    // 生成唯一ID
    _generateIds() {
      const prefix = this.data.fieldId || `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.setData({
        labelId: `${prefix}_label`,
        controlId: `${prefix}_control`,
        helpId: `${prefix}_help`,
        errorId: `${prefix}_error`
      })
    },

    // 更新 describedBy 属性
    _updateDescribedBy() {
      const { helpText, errorText, state, helpId, errorId } = this.data
      let describedBy = ''
      
      if (state === 'error' && errorText) {
        describedBy = errorId
      } else if (helpText) {
        describedBy = helpId
      }
      
      this.setData({ describedBy })
    },

    // 设置焦点状态
    setFocus() {
      if (this.data.disabled) return
      this.setData({ state: 'focus' })
      this.triggerEvent('focus', { fieldId: this.data.fieldId })
    },

    // 移除焦点状态
    setBlur() {
      if (this.data.disabled) return
      if (this.data.errorText) {
        this.setData({ state: 'error' })
      } else {
        this.setData({ state: 'default' })
      }
      this.triggerEvent('blur', { fieldId: this.data.fieldId })
    },

    // 设置错误状态
    setError(errorText) {
      this.setData({ 
        errorText: errorText || '',
        state: errorText ? 'error' : 'default'
      })
      this.triggerEvent('error', { 
        fieldId: this.data.fieldId,
        errorText: errorText 
      })
    },

    // 清除错误
    clearError() {
      this.setData({ 
        errorText: '',
        state: this.data.disabled ? 'disabled' : 'default'
      })
      this.triggerEvent('clearError', { fieldId: this.data.fieldId })
    },

    // 校验字段
    validate(value, rules) {
      if (!rules) return true

      // 必填校验
      if (this.data.required && (!value || value.trim() === '')) {
        this.setError(`${this.data.label}不能为空`)
        return false
      }

      // 自定义校验规则
      if (rules.pattern && !rules.pattern.test(value)) {
        this.setError(rules.message || `${this.data.label}格式错误`)
        return false
      }

      if (rules.minLength && value.length < rules.minLength) {
        this.setError(`${this.data.label}不能少于${rules.minLength}个字符`)
        return false
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        this.setError(`${this.data.label}不能超过${rules.maxLength}个字符`)
        return false
      }

      // 自定义校验函数
      if (rules.validator && typeof rules.validator === 'function') {
        const result = rules.validator(value)
        if (result !== true) {
          this.setError(result || `${this.data.label}校验失败`)
          return false
        }
      }

      this.clearError()
      return true
    },

    // 滚动到当前字段（用于错误定位）
    scrollIntoView() {
      const query = this.createSelectorQuery()
      query.select('.form-field').boundingClientRect((rect) => {
        if (rect) {
          wx.pageScrollTo({
            scrollTop: rect.top - 100, // 留出一些边距
            duration: 300
          })
        }
      }).exec()
    }
  }
})