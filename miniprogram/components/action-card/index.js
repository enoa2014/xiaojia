/**
 * ActionCard 组件 - 操作卡片
 * 用于统一展示各种快速操作入口的可交互卡片组件
 */

Component({
  properties: {
    // 卡片标题
    title: {
      type: String,
      value: ''
    },
    
    // 可选的描述文本
    desc: {
      type: String,
      value: ''
    },
    
    // 可选的图标emoji
    icon: {
      type: String,
      value: ''
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
    
    // 无障碍标签
    ariaLabel: {
      type: String,
      value: ''
    },
    
    // 自定义数据，点击时一起传递给父组件
    customData: {
      type: Object,
      value: null
    }
  },

  data: {
    
  },

  lifetimes: {
    attached() {
      this._updateAriaLabel();
    }
  },

  observers: {
    'title, desc': function(title, desc) {
      this._updateAriaLabel();
    }
  },

  methods: {
    /**
     * 点击处理
     */
    _onTap(e) {
      if (this.data.disabled || this.data.loading) {
        return;
      }

      // 向父组件发送点击事件
      this.triggerEvent('tap', {
        title: this.data.title,
        desc: this.data.desc,
        icon: this.data.icon,
        customData: this.data.customData
      }, {
        bubbles: true,
        composed: true
      });
    },

    /**
     * 更新无障碍标签
     */
    _updateAriaLabel() {
      if (!this.data.ariaLabel) {
        const { title, desc, disabled, loading } = this.data;
        let label = title || '操作卡片';
        
        if (desc) {
          label += `，${desc}`;
        }
        
        if (disabled) {
          label += '，已禁用';
        } else if (loading) {
          label += '，加载中';
        }
        
        this.setData({
          ariaLabel: label
        });
      }
    }
  }
});