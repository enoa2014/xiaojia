/**
 * 可访问性 (A11y) 工具服务
 * 提供焦点管理、键盘导航、错误处理等可访问性功能
 */

class A11yService {
  constructor() {
    this.focusStack = [] // 焦点栈，用于记录焦点历史
    this.lastFocusedElement = null
  }

  /**
   * 设置焦点到指定元素
   * @param {string} selector - CSS选择器
   * @param {Object} context - 页面或组件上下文
   */
  setFocus(selector, context = null) {
    try {
      if (context) {
        const query = context.createSelectorQuery()
        query.select(selector).fields({
          node: true,
          size: true
        }).exec((res) => {
          if (res[0] && res[0].node) {
            res[0].node.focus()
          }
        })
      }
    } catch (error) {
      console.warn('A11y: 无法设置焦点', selector, error)
    }
  }

  /**
   * 保存当前焦点位置到栈中
   * @param {string} elementId - 元素标识符
   */
  pushFocus(elementId) {
    this.focusStack.push({
      elementId,
      timestamp: Date.now()
    })
  }

  /**
   * 恢复到栈顶的焦点位置
   * @param {Object} context - 页面或组件上下文
   */
  popFocus(context = null) {
    if (this.focusStack.length > 0) {
      const lastFocus = this.focusStack.pop()
      this.setFocus(`#${lastFocus.elementId}`, context)
    }
  }

  /**
   * Dialog 打开时的焦点管理
   * @param {Object} options - 配置选项
   * @param {string} options.dialogSelector - Dialog容器选择器
   * @param {string} options.firstFocusSelector - 第一个聚焦元素选择器
   * @param {string} options.lastFocusSelector - 最后一个聚焦元素选择器
   * @param {Object} options.context - 页面上下文
   */
  handleDialogOpen(options) {
    const { dialogSelector, firstFocusSelector, context } = options
    
    // 保存当前焦点
    if (this.lastFocusedElement) {
      this.pushFocus(this.lastFocusedElement)
    }

    // 设置焦点到Dialog内的第一个可聚焦元素
    setTimeout(() => {
      this.setFocus(firstFocusSelector || `${dialogSelector} .focus-first`, context)
    }, 100)
  }

  /**
   * Dialog 关闭时的焦点管理
   * @param {Object} context - 页面上下文
   */
  handleDialogClose(context) {
    // 恢复到触发Dialog的元素
    this.popFocus(context)
  }

  /**
   * 表单错误处理 - 聚焦到第一个错误字段
   * @param {Array} errors - 错误数组，包含字段名
   * @param {Object} context - 页面上下文
   */
  focusFirstError(errors, context) {
    if (errors && errors.length > 0) {
      const firstErrorField = errors[0].field || errors[0]
      this.setFocus(`[name="${firstErrorField}"], #${firstErrorField}`, context)
    }
  }

  /**
   * 显示错误消息并聚焦
   * @param {string} fieldName - 字段名
   * @param {string} message - 错误消息
   * @param {Object} context - 页面上下文
   */
  showFieldError(fieldName, message, context) {
    // 添加错误样式类
    if (context && context.setData) {
      const errorKey = `errors.${fieldName}`
      context.setData({
        [errorKey]: message
      })
    }

    // 聚焦到错误字段
    this.setFocus(`[name="${fieldName}"]`, context)
  }

  /**
   * 清除字段错误
   * @param {string} fieldName - 字段名
   * @param {Object} context - 页面上下文
   */
  clearFieldError(fieldName, context) {
    if (context && context.setData) {
      const errorKey = `errors.${fieldName}`
      context.setData({
        [errorKey]: null
      })
    }
  }

  /**
   * Toast消息可访问性处理
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 success|error|info|warning
   */
  announceToast(message, type = 'info') {
    // 创建临时的屏幕阅读器内容
    const announcement = `${type === 'error' ? '错误：' : type === 'success' ? '成功：' : ''}${message}`
    
    // 小程序环境下通过设置页面标题来实现无障碍播报
    try {
      wx.setNavigationBarTitle({
        title: announcement.substring(0, 20) + (announcement.length > 20 ? '...' : '')
      })
      
      // 2秒后恢复原标题
      setTimeout(() => {
        const pages = getCurrentPages()
        if (pages.length > 0) {
          const currentPage = pages[pages.length - 1]
          const route = currentPage.route
          // 这里可以根据路由设置对应的标题
          wx.setNavigationBarTitle({
            title: this.getPageTitle(route)
          })
        }
      }, 2000)
    } catch (error) {
      console.warn('A11y: Toast播报失败', error)
    }
  }

  /**
   * 根据路由获取页面标题
   * @param {string} route - 页面路由
   */
  getPageTitle(route) {
    const titleMap = {
      'pages/index/index': '小家服务管理',
      'pages/patients/index': '家庭档案',
      'pages/patients/detail': '档案详情',
      'pages/patients/form': '编辑档案',
      'pages/services/index': '服务记录',
      'pages/services/form': '记录服务',
      'pages/activities/index': '活动管理',
      'pages/activities/form': '编辑活动',
      'pages/stats/index': '数据统计',
      'pages/tenancies/form': '入住登记'
    }
    return titleMap[route] || '小家服务管理'
  }

  /**
   * 检查元素对比度是否符合无障碍标准
   * @param {string} textColor - 文本颜色（hex格式）
   * @param {string} bgColor - 背景颜色（hex格式）
   * @returns {Object} 对比度检查结果
   */
  checkContrast(textColor, bgColor) {
    // 简化的对比度计算（实际实现会更复杂）
    const getLuminance = (color) => {
      // 移除 # 符号
      const hex = color.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16)
      const g = parseInt(hex.substr(2, 2), 16)
      const b = parseInt(hex.substr(4, 2), 16)
      
      // 简化的亮度计算
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255
    }

    const textLum = getLuminance(textColor)
    const bgLum = getLuminance(bgColor)
    
    const lighter = Math.max(textLum, bgLum)
    const darker = Math.min(textLum, bgLum)
    const contrast = (lighter + 0.05) / (darker + 0.05)

    return {
      ratio: Math.round(contrast * 100) / 100,
      passAA: contrast >= 4.5, // WCAG AA 标准
      passAAA: contrast >= 7, // WCAG AAA 标准
      level: contrast >= 7 ? 'AAA' : contrast >= 4.5 ? 'AA' : 'Fail'
    }
  }

  /**
   * 键盘导航处理
   * @param {Object} event - 键盘事件
   * @param {Array} focusableElements - 可聚焦元素列表
   */
  handleKeyboardNavigation(event, focusableElements) {
    const { key, currentTarget } = event
    
    if (key === 'Tab') {
      const currentIndex = focusableElements.findIndex(el => el === currentTarget)
      
      if (event.shiftKey) {
        // Shift + Tab，向前导航
        const prevIndex = currentIndex - 1 < 0 ? focusableElements.length - 1 : currentIndex - 1
        focusableElements[prevIndex]?.focus()
      } else {
        // Tab，向后导航
        const nextIndex = (currentIndex + 1) % focusableElements.length
        focusableElements[nextIndex]?.focus()
      }
      
      event.preventDefault()
    }
  }

  /**
   * 设置页面的无障碍属性
   * @param {Object} context - 页面上下文
   * @param {Object} options - 配置选项
   */
  setupPageAccessibility(context, options = {}) {
    const { title, description } = options
    
    if (title) {
      wx.setNavigationBarTitle({ title })
    }
    
    // 设置页面描述用于屏幕阅读器
    if (context.setData && description) {
      context.setData({
        pageDescription: description
      })
    }
  }

  /**
   * 验证触摸目标尺寸
   * @param {Object} element - DOM元素信息
   * @returns {boolean} 是否符合最小触摸尺寸要求
   */
  validateTouchTarget(element) {
    const minSize = 88 // rpx
    return element.width >= minSize && element.height >= minSize
  }
}

// 创建全局实例
const a11yService = new A11yService()

export default a11yService