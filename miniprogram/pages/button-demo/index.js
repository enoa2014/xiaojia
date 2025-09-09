Page({
  data: {
    submitting: false,
    lastAction: ''
  },

  onButtonTap(e) {
    const { variant, size, text } = e.detail || {}
    
    this.setData({
      lastAction: `点击了按钮: ${text || '未知'} (${variant}/${size})`
    })
    
    console.log('Button tapped:', e.detail)
    
    // 模拟用户反馈
    wx.showToast({
      title: `按钮"${text}"被点击`,
      icon: 'success',
      duration: 1500
    })
  },

  onSubmit() {
    this.setData({ submitting: true })
    
    // 模拟提交过程
    setTimeout(() => {
      this.setData({ 
        submitting: false,
        lastAction: '提交操作已完成'
      })
      
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      })
    }, 2000)
  },

  onLoad() {
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: 'Button 组件演示'
    })
  },

  // 危险操作 - 删除数据
  onDangerousAction() {
    wx.showModal({
      title: '危险操作确认',
      content: '您确定要删除所有数据吗？此操作不可恢复。',
      confirmText: '确认删除',
      confirmColor: '#EF4444',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            lastAction: '危险操作已执行：删除数据'
          })
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        } else {
          this.setData({
            lastAction: '用户取消了删除操作'
          })
        }
      }
    })
  },

  // 危险操作 - 重置设置
  onResetAction() {
    wx.showModal({
      title: '重置确认',
      content: '确定要重置所有设置吗？重置后将恢复到默认配置。',
      confirmText: '确认重置',
      confirmColor: '#EF4444',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            lastAction: '危险操作已执行：重置设置'
          })
          wx.showToast({
            title: '重置完成',
            icon: 'success'
          })
        } else {
          this.setData({
            lastAction: '用户取消了重置操作'
          })
        }
      }
    })
  }
})