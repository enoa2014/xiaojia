// pages/empty-error-demo/index.js
Page({
  data: {
    actionLogs: [],
    retrying: {
      network: false,
      permission: false,
      custom: false
    }
  },

  onLoad() {
    this.addLog('页面加载完成');
  },

  // 添加操作日志
  addLog(content) {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const logs = this.data.actionLogs.slice();
    logs.unshift({
      time,
      content
    });
    
    // 只保留最近20条记录
    if (logs.length > 20) {
      logs.splice(20);
    }
    
    this.setData({
      actionLogs: logs
    });
  },

  // 空状态操作
  onEmptyAction(e) {
    const { detail } = e;
    this.addLog(`空状态操作: ${detail.type} - ${detail.text}`);
    
    if (detail.text === '添加内容') {
      wx.showToast({
        title: '跳转到添加页面',
        icon: 'success'
      });
    }
  },

  // 搜索空状态操作
  onSearchEmptyAction(e) {
    const { detail } = e;
    this.addLog(`搜索空状态操作: ${detail.type} - ${detail.text}`);
    
    if (detail.text === '清除搜索条件') {
      wx.showToast({
        title: '已清除搜索条件',
        icon: 'success'
      });
    } else if (detail.text === '返回首页') {
      wx.showToast({
        title: '返回首页',
        icon: 'success'
      });
    }
  },

  // 网络错误重试
  onRetryNetwork(e) {
    this.addLog('网络错误重试开始');
    
    this.setData({
      'retrying.network': true
    });

    setTimeout(() => {
      this.setData({
        'retrying.network': false
      });
      this.addLog('网络错误重试完成');
      
      wx.showToast({
        title: '重试成功',
        icon: 'success'
      });
    }, 2000);
  },

  // 权限错误重试
  onRetryPermission(e) {
    this.addLog('权限错误重试 - 跳转到申请页面');
    
    wx.showModal({
      title: '权限申请',
      content: '是否跳转到权限申请页面？',
      confirmText: '去申请',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.addLog('用户确认跳转到权限申请页面');
          wx.showToast({
            title: '跳转到申请页面',
            icon: 'success'
          });
        } else {
          this.addLog('用户取消权限申请');
        }
      }
    });
  },

  // 自定义错误重试
  onRetryCustom(e) {
    this.addLog('自定义错误重试');
    
    wx.showLoading({
      title: '刷新中...'
    });

    setTimeout(() => {
      wx.hideLoading();
      this.addLog('页面刷新完成');
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    }, 1500);
  },

  // 反馈操作
  onFeedback(e) {
    const { detail } = e;
    this.addLog(`反馈操作: ${JSON.stringify(detail)}`);
    
    wx.showModal({
      title: '问题反馈',
      content: '感谢您的反馈，我们会尽快处理问题',
      confirmText: '确定',
      showCancel: false
    });
  }
});