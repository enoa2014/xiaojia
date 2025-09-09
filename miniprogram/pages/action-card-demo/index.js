// pages/action-card-demo/index.js
Page({
  data: {
    demoLoading: false,
    actionLogs: [],
    
    // 快速操作演示数据
    quickActions: [
      {
        key: 'patient',
        title: '患者管理',
        desc: '查看患者信息',
        icon: '🏥',
        disabled: false,
        loading: false
      },
      {
        key: 'service',
        title: '服务记录',
        desc: '添加服务记录',
        icon: '📋',
        disabled: false,
        loading: false
      },
      {
        key: 'activity',
        title: '活动管理',
        desc: '查看活动安排',
        icon: '📅',
        disabled: false,
        loading: false
      },
      {
        key: 'reports',
        title: '数据报告',
        desc: '暂未开放',
        icon: '📊',
        disabled: true,
        loading: false
      }
    ],
    
    // 服务类型演示数据
    serviceTypes: [
      {
        key: 'visit',
        name: '上门探访',
        desc: '家庭访问服务',
        icon: '🏠'
      },
      {
        key: 'counseling',
        name: '心理辅导',
        desc: '专业心理咨询',
        icon: '💭'
      },
      {
        key: 'medical',
        name: '医疗协助',
        desc: '就医陪同服务',
        icon: '🏥'
      },
      {
        key: 'daily',
        name: '生活协助',
        desc: '日常生活帮助',
        icon: '🤝'
      }
    ]
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

  // 基础点击
  onBasicTap(e) {
    this.addLog('点击了基础卡片');
    console.log('基础卡片被点击', e);
  },

  // 带图标点击
  onIconTap(e) {
    this.addLog('点击了带图标卡片');
    console.log('图标卡片被点击', e);
  },

  // 正常状态点击
  onNormalTap(e) {
    this.addLog('点击了正常状态卡片');
    console.log('正常卡片被点击', e);
  },

  // 禁用状态点击（不应该被触发）
  onDisabledTap(e) {
    this.addLog('禁用卡片被点击（不应该发生）');
    console.warn('禁用卡片不应该被点击', e);
  },

  // 加载状态点击
  onLoadingTap(e) {
    if (this.data.demoLoading) {
      this.addLog('加载中，点击被忽略');
      return;
    }

    this.addLog('开始模拟加载...');
    this.setData({
      demoLoading: true
    });

    setTimeout(() => {
      this.setData({
        demoLoading: false
      });
      this.addLog('加载完成');
    }, 2000);
  },

  // 长文本测试点击
  onLongTextTap(e) {
    this.addLog('点击了长文本测试卡片 - 文本溢出处理正常');
    wx.showToast({
      title: '长文本卡片点击成功',
      icon: 'success'
    });
  },

  // 快速操作点击
  onQuickAction(e) {
    const { detail } = e;
    const { customData } = detail;
    
    if (customData) {
      this.addLog(`点击了快速操作: ${customData.title}`);
      
      if (customData.key === 'service') {
        // 模拟跳转到服务页面
        wx.showToast({
          title: '跳转到服务记录',
          icon: 'success'
        });
      } else if (customData.disabled) {
        wx.showToast({
          title: '功能暂未开放',
          icon: 'none'
        });
      }
    }
    
    console.log('快速操作被点击', e);
  },

  // 服务类型点击
  onServiceType(e) {
    const { detail } = e;
    const { customData } = detail;
    
    if (customData) {
      this.addLog(`选择了服务类型: ${customData.name}`);
      
      wx.showModal({
        title: '服务类型选择',
        content: `您选择了${customData.name}服务\n${customData.desc}`,
        confirmText: '确定',
        showCancel: false
      });
    }
    
    console.log('服务类型被点击', e);
  }
});