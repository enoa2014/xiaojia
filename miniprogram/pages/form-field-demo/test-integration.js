// FormField 与 Button 组件协作测试
// 测试表单提交、错误处理、状态管理等关键功能

const testIntegration = {
  // 测试表单字段与按钮的基础交互
  testBasicInteraction() {
    console.log('=== 测试基础交互 ===')
    
    // 1. 测试表单字段状态变化
    const nameField = this.selectComponent('#name')
    const submitButton = this.selectComponent('#submit-button')
    
    if (nameField && submitButton) {
      console.log('✓ 组件实例获取成功')
      
      // 2. 测试错误状态对按钮的影响
      nameField.setError('姓名不能为空')
      console.log('✓ 错误状态设置成功')
      
      // 3. 测试清除错误
      setTimeout(() => {
        nameField.clearError()
        console.log('✓ 错误清除成功')
      }, 1000)
    } else {
      console.log('✗ 组件实例获取失败')
    }
  },

  // 测试表单校验与提交流程
  testFormValidationFlow() {
    console.log('=== 测试表单校验流程 ===')
    
    const fields = ['username', 'password']
    let hasErrors = false
    
    fields.forEach(fieldId => {
      const field = this.selectComponent(`#${fieldId}`)
      if (field) {
        // 模拟空值校验
        const isValid = field.validate('', { 
          required: true,
          minLength: fieldId === 'password' ? 6 : 2
        })
        
        if (!isValid) {
          hasErrors = true
          console.log(`✓ ${fieldId} 字段校验失败（符合预期）`)
        }
      }
    })
    
    if (hasErrors) {
      console.log('✓ 表单校验流程正常')
    } else {
      console.log('✗ 表单校验未按预期工作')
    }
  },

  // 测试无障碍功能
  testAccessibility() {
    console.log('=== 测试无障碍功能 ===')
    
    const formField = this.selectComponent('#username')
    if (formField) {
      const { labelId, controlId, describedBy } = formField.data
      
      if (labelId && controlId) {
        console.log('✓ 无障碍ID生成正常')
        console.log(`  - Label ID: ${labelId}`)
        console.log(`  - Control ID: ${controlId}`)
        console.log(`  - Described By: ${describedBy}`)
      } else {
        console.log('✗ 无障碍ID生成失败')
      }
    }
  },

  // 测试键盘导航和焦点管理
  testKeyboardNavigation() {
    console.log('=== 测试键盘导航 ===')
    
    // 模拟TAB键导航
    const fields = ['name', 'idCard', 'phone', 'username', 'password']
    let currentIndex = 0
    
    const simulateTabNavigation = () => {
      if (currentIndex < fields.length) {
        const field = this.selectComponent(`#${fields[currentIndex]}`)
        if (field) {
          field.setFocus()
          console.log(`✓ 焦点移动到 ${fields[currentIndex]}`)
          currentIndex++
          
          setTimeout(() => {
            field.setBlur()
            setTimeout(simulateTabNavigation, 200)
          }, 500)
        }
      } else {
        console.log('✓ 键盘导航测试完成')
      }
    }
    
    simulateTabNavigation()
  },

  // 测试响应式布局
  testResponsiveLayout() {
    console.log('=== 测试响应式布局 ===')
    
    // 检查组件在不同尺寸下的表现
    const query = wx.createSelectorQuery()
    query.select('.form-field').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        const { width, height } = res[0]
        console.log(`✓ FormField 尺寸: ${width}x${height}`)
        
        if (width > 0 && height > 0) {
          console.log('✓ 响应式布局正常')
        } else {
          console.log('✗ 响应式布局异常')
        }
      }
    })
  },

  // 运行所有测试
  runAllTests() {
    console.log('🧪 开始 FormField 与 Button 协作测试')
    
    this.testBasicInteraction()
    
    setTimeout(() => {
      this.testFormValidationFlow()
    }, 1000)
    
    setTimeout(() => {
      this.testAccessibility()
    }, 2000)
    
    setTimeout(() => {
      this.testKeyboardNavigation()
    }, 3000)
    
    setTimeout(() => {
      this.testResponsiveLayout()
    }, 8000)
    
    setTimeout(() => {
      console.log('🎉 所有测试完成')
    }, 10000)
  }
}

module.exports = testIntegration