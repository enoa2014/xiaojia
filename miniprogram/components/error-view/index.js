/**
 * ErrorView 组件 - 错误状态展示
 * 用于统一展示接口错误、网络错误等错误状态场景，提供重试和反馈功能
 */

// 错误码映射配置
const ERROR_MAPPING = {
  E_AUTH: {
    icon: '🔐',
    title: '需要登录',
    message: '请重新登录后继续操作',
    retryText: '重新登录',
    variant: 'auth'
  },
  E_PERM: {
    icon: '🚫',
    title: '权限不足',
    message: '您暂无权限访问此内容',
    retryText: '申请权限',
    feedbackText: '联系管理员',
    variant: 'permission'
  },
  E_VALIDATE: {
    icon: '⚠️',
    title: '参数错误',
    message: '请检查输入信息后重试',
    retryText: '重新操作'
  },
  E_NOT_FOUND: {
    icon: '🔍',
    title: '内容不存在',
    message: '请求的内容不存在或已被删除',
    retryText: '刷新页面'
  },
  E_CONFLICT: {
    icon: '⚡',
    title: '操作冲突',
    message: '数据已被其他用户修改，请重新操作',
    retryText: '重新加载'
  },
  E_RATE_LIMIT: {
    icon: '⏱️',
    title: '请求过于频繁',
    message: '请稍后再试',
    retryText: '稍后重试'
  },
  E_DEPENDENCY: {
    icon: '🌐',
    title: '网络异常',
    message: '网络连接不稳定，请检查网络后重试',
    retryText: '重试',
    variant: 'network'
  },
  E_INTERNAL: {
    icon: '😔',
    title: '服务异常',
    message: '服务暂时不可用，请稍后重试',
    retryText: '重试',
    feedbackText: '反馈问题'
  }
};

Component({
  properties: {
    // 是否显示组件
    show: {
      type: Boolean,
      value: true
    },
    
    // 错误对象或错误码
    error: {
      type: null, // 支持 Object 或 String
      value: null,
      observer: '_onErrorChange'
    },
    
    // 手动指定错误图标
    icon: {
      type: String,
      value: ''
    },
    
    // 手动指定标题
    title: {
      type: String,
      value: ''
    },
    
    // 手动指定消息
    message: {
      type: String,
      value: ''
    },
    
    // 错误详情（如 requestId）
    detail: {
      type: String,
      value: ''
    },
    
    // 重试按钮文本
    retryText: {
      type: String,
      value: ''
    },
    
    // 重试按钮图标
    retryIcon: {
      type: String,
      value: ''
    },
    
    // 反馈按钮文本
    feedbackText: {
      type: String,
      value: ''
    },
    
    // 是否正在重试
    retrying: {
      type: Boolean,
      value: false
    },
    
    // 变体样式
    variant: {
      type: String,
      value: 'default' // default | compact | network | auth | permission
    }
  },

  data: {
    showDetail: false
  },

  methods: {
    /**
     * 错误变化处理
     */
    _onErrorChange(newError) {
      if (!newError) return;
      
      let errorConfig = {};
      let errorCode = '';
      let errorMessage = '';
      let errorDetail = '';
      
      if (typeof newError === 'string') {
        // 简单错误码字符串
        errorCode = newError;
        errorMessage = newError;
      } else if (typeof newError === 'object') {
        // 错误对象
        errorCode = newError.code || newError.errorCode || '';
        errorMessage = newError.message || newError.msg || '';
        errorDetail = newError.requestId || newError.details || '';
      }
      
      // 从映射配置获取错误信息
      if (errorCode && ERROR_MAPPING[errorCode]) {
        errorConfig = ERROR_MAPPING[errorCode];
      }
      
      // 合并配置，优先使用外部传入的值
      const finalConfig = {
        icon: this.data.icon || errorConfig.icon || '😔',
        title: this.data.title || errorConfig.title || '加载失败',
        message: this.data.message || errorConfig.message || errorMessage || '请稍后重试',
        retryText: this.data.retryText || errorConfig.retryText || '重试',
        feedbackText: this.data.feedbackText || errorConfig.feedbackText || '',
        variant: this.data.variant !== 'default' ? this.data.variant : errorConfig.variant || 'default',
        detail: this.data.detail || errorDetail
      };
      
      // 更新组件数据
      this.setData({
        ...finalConfig,
        showDetail: !!finalConfig.detail
      });
    },

    /**
     * 重试操作点击处理
     */
    _onRetry(e) {
      if (this.data.retrying) {
        return;
      }

      this.triggerEvent('retry', {
        error: this.properties.error
      }, {
        bubbles: true,
        composed: true
      });
    },

    /**
     * 反馈操作点击处理
     */
    _onFeedback(e) {
      this.triggerEvent('feedback', {
        error: this.properties.error,
        detail: this.data.detail
      }, {
        bubbles: true,
        composed: true
      });
    },

    /**
     * 切换详情显示
     */
    _toggleDetail(e) {
      this.setData({
        showDetail: !this.data.showDetail
      });
    }
  }
});