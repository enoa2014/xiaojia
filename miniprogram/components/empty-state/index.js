/**
 * EmptyState 组件 - 空状态展示
 * 用于统一展示列表为空、搜索无结果等空状态场景
 */

Component({
  properties: {
    // 是否显示组件
    show: {
      type: Boolean,
      value: true
    },
    
    // 插画图标
    icon: {
      type: String,
      value: '📭'
    },
    
    // 主标题
    title: {
      type: String,
      value: '暂无内容'
    },
    
    // 描述文本
    description: {
      type: String,
      value: ''
    },
    
    // 主要操作按钮文本
    actionText: {
      type: String,
      value: ''
    },
    
    // 主要操作按钮图标
    actionIcon: {
      type: String,
      value: ''
    },
    
    // 主要操作按钮是否禁用
    actionDisabled: {
      type: Boolean,
      value: false
    },
    
    // 次要操作按钮文本
    secondaryActionText: {
      type: String,
      value: ''
    },
    
    // 次要操作按钮是否禁用
    secondaryActionDisabled: {
      type: Boolean,
      value: false
    },
    
    // 变体样式
    variant: {
      type: String,
      value: 'default' // default | compact | search | error | loading
    }
  },

  data: {
    
  },

  methods: {
    /**
     * 主要操作点击处理
     */
    _onAction(e) {
      if (this.data.actionDisabled) {
        return;
      }

      this.triggerEvent('action', {
        type: 'primary',
        text: this.data.actionText
      }, {
        bubbles: true,
        composed: true
      });
    },

    /**
     * 次要操作点击处理
     */
    _onSecondaryAction(e) {
      if (this.data.secondaryActionDisabled) {
        return;
      }

      this.triggerEvent('action', {
        type: 'secondary',
        text: this.data.secondaryActionText
      }, {
        bubbles: true,
        composed: true
      });
    }
  }
});