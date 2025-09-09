Component({
  properties: {
    // 骨架屏类型
    type: {
      type: String,
      value: 'list' // list | detail | chart | custom
    },
    // 列表项数量（仅 type='list' 时有效）
    count: {
      type: Number,
      value: 5
    },
    // 是否显示
    show: {
      type: Boolean,
      value: true
    },
    // 动画类型
    animation: {
      type: String,
      value: 'shimmer' // shimmer | pulse | none
    },
    // 自定义高度（可选）
    height: {
      type: String,
      value: ''
    },
    // 圆角大小
    borderRadius: {
      type: String,
      value: '4rpx'
    }
  },

  data: {
    // 列表项数组
    listItems: []
  },

  lifetimes: {
    attached() {
      this.updateListItems()
    }
  },

  observers: {
    'count': function(count) {
      this.updateListItems()
    }
  },

  methods: {
    // 更新列表项数组
    updateListItems() {
      const items = Array.from({ length: this.data.count }, (_, index) => ({
        id: index,
        // 为了视觉变化，随机化一些宽度
        titleWidth: 70 + Math.random() * 20, // 70-90%
        contentWidth: 60 + Math.random() * 30, // 60-90%
        lineWidth: 50 + Math.random() * 40 // 50-90%
      }))
      this.setData({ listItems: items })
    },

    // 设置显示状态
    setVisible(visible) {
      this.setData({ show: visible })
    },

    // 淡出动画
    fadeOut(callback) {
      this.animate('.loading-skeleton', [
        { opacity: 1 },
        { opacity: 0 }
      ], 200, () => {
        this.setData({ show: false })
        callback && callback()
      })
    }
  }
})