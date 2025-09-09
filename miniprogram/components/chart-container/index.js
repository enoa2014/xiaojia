Component({
  properties: {
    // 标题
    title: {
      type: String,
      value: ''
    },
    // 加载状态
    loading: {
      type: Boolean,
      value: false
    },
    // 空数据状态
    empty: {
      type: Boolean,
      value: false
    },
    // 错误状态
    error: {
      type: String,
      value: ''
    },
    // 容器高度 (rpx)
    height: {
      type: Number,
      value: 300
    },
    // 禁用状态
    disabled: {
      type: Boolean,
      value: false
    },
    // 启用时间范围切换
    enableTimeRange: {
      type: Boolean,
      value: false
    },
    // 时间范围选项
    timeRangeOptions: {
      type: Array,
      value: []
    },
    // 当前时间范围
    currentTimeRange: {
      type: String,
      value: '7d'
    },
    // 启用维度筛选
    enableFilters: {
      type: Boolean,
      value: false
    },
    // 筛选选项
    filterOptions: {
      type: Array,
      value: []
    },
    // 当前筛选值
    currentFilters: {
      type: Object,
      value: {}
    },
    // 启用 mock 数据
    enableMock: {
      type: Boolean,
      value: false
    }
  },

  data: {
    ariaDescription: '',
    // 默认时间范围选项
    defaultTimeRangeOptions: [
      { value: '7d', label: '近7天' },
      { value: '30d', label: '近30天' },
      { value: '90d', label: '近90天' },
      { value: 'custom', label: '自定义' }
    ],
    // Mock 数据
    mockData: {
      isEmpty: false,
      hasError: false,
      data: null
    }
  },

  observers: {
    'title, loading, empty, error': function(title, loading, empty, error) {
      this.updateAriaDescription()
    },
    'enableMock': function(enableMock) {
      if (enableMock) {
        this.generateMockData()
      }
    },
    'timeRangeOptions': function(options) {
      // 如果没有传入选项，使用默认选项
      if (!options || options.length === 0) {
        this.setData({
          'timeRangeOptions': this.data.defaultTimeRangeOptions
        })
      }
    },
    'filterOptions, currentFilters': function(filterOptions, currentFilters) {
      if (filterOptions && filterOptions.length > 0) {
        this.updateFilterLabels()
      }
    }
  },

  lifetimes: {
    attached() {
      this.updateAriaDescription()
      // 初始化时间范围选项
      if (this.data.enableTimeRange && (!this.data.timeRangeOptions || this.data.timeRangeOptions.length === 0)) {
        this.setData({
          'timeRangeOptions': this.data.defaultTimeRangeOptions
        })
      }
      // 初始化筛选器标签
      if (this.data.filterOptions && this.data.filterOptions.length > 0) {
        this.updateFilterLabels()
      }
      // 初始化 mock 数据
      if (this.data.enableMock) {
        this.generateMockData()
      }
    }
  },

  methods: {
    // 重试按钮点击
    onRetry() {
      this.triggerEvent('retry')
    },
    
    // 容器点击事件
    onTap(e) {
      if (this.data.disabled || this.data.loading) return
      this.triggerEvent('tap', e.detail)
    },

    // 时间范围切换
    onTimeRangeChange(e) {
      const value = e.currentTarget.dataset.value || e.detail.value
      this.setData({ currentTimeRange: value })
      this.triggerEvent('timeRangeChange', { timeRange: value })
    },

    // 筛选器变更
    onFilterChange(e) {
      const { key } = e.currentTarget.dataset
      const selectedIndex = e.detail.value
      
      // 获取对应的筛选配置
      const filterConfig = this.data.filterOptions.find(filter => filter.key === key)
      if (!filterConfig || !filterConfig.options || !filterConfig.options[selectedIndex]) {
        return
      }
      
      const selectedOption = filterConfig.options[selectedIndex]
      const currentFilters = { ...this.data.currentFilters }
      
      // 如果选择的是空值或"全部"选项，则删除该筛选条件
      if (!selectedOption.value || selectedOption.value === '') {
        delete currentFilters[key]
      } else {
        currentFilters[key] = selectedOption.value
      }
      
      this.setData({ currentFilters })
      this.updateFilterLabels()
      this.triggerEvent('filterChange', { filters: currentFilters })
    },

    // 重置筛选
    onResetFilters() {
      this.setData({ currentFilters: {} })
      this.updateFilterLabels()
      this.triggerEvent('filterChange', { filters: {} })
    },

    // 更新筛选器标签显示
    updateFilterLabels() {
      const filterOptions = this.data.filterOptions.map(filter => {
        const currentValue = this.data.currentFilters[filter.key]
        let currentLabel = filter.placeholder || '全部'
        
        if (currentValue) {
          const selectedOption = filter.options.find(opt => opt.value === currentValue)
          if (selectedOption) {
            currentLabel = selectedOption.label
          }
        }
        
        return {
          ...filter,
          currentLabel
        }
      })
      
      this.setData({ filterOptions })
    },

    // 生成 Mock 数据
    generateMockData() {
      const scenarios = ['normal', 'empty', 'error']
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]
      
      let mockData = {
        isEmpty: false,
        hasError: false,
        data: null,
        scenario: scenario
      }
      
      switch (scenario) {
        case 'empty':
          mockData.isEmpty = true
          break
        case 'error':
          mockData.hasError = true
          break
        case 'normal':
          mockData.data = this.generateSampleData()
          break
      }
      
      this.setData({ mockData })
      this.triggerEvent('mockDataGenerated', { mockData })
    },

    // 设置特定的 Mock 场景
    setMockScenario(scenario) {
      let mockData = {
        isEmpty: false,
        hasError: false,
        data: null,
        scenario: scenario
      }
      
      switch (scenario) {
        case 'empty':
          mockData.isEmpty = true
          break
        case 'error':
          mockData.hasError = true
          break
        case 'loading':
          // 临时设置加载状态
          this.setData({ loading: true })
          setTimeout(() => {
            this.setData({ loading: false })
            this.generateMockData()
          }, 1500)
          return
        case 'normal':
        default:
          mockData.data = this.generateSampleData()
          break
      }
      
      this.setData({ mockData })
      this.triggerEvent('mockDataGenerated', { mockData })
    },

    // 生成样本数据
    generateSampleData() {
      const dataTypes = ['line', 'bar', 'pie']
      const type = dataTypes[Math.floor(Math.random() * dataTypes.length)]
      
      switch (type) {
        case 'line':
          return this.generateLineData()
        case 'bar':
          return this.generateBarData()
        case 'pie':
          return this.generatePieData()
        default:
          return this.generateLineData()
      }
    },

    // 生成线性图数据
    generateLineData() {
      const labels = []
      const values = []
      const days = 7
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }))
        values.push(Math.floor(Math.random() * 100) + 10)
      }
      
      return {
        type: 'line',
        labels,
        datasets: [{
          label: '数据趋势',
          data: values,
          borderColor: 'var(--color-primary-500)',
          backgroundColor: 'var(--color-primary-100)'
        }]
      }
    },

    // 生成柱状图数据
    generateBarData() {
      const categories = ['服务A', '服务B', '服务C', '服务D', '服务E']
      const values = categories.map(() => Math.floor(Math.random() * 80) + 20)
      
      return {
        type: 'bar',
        labels: categories,
        datasets: [{
          label: '服务数量',
          data: values,
          backgroundColor: [
            'var(--color-primary-500)', 'var(--color-blue-500)', 
            'var(--color-purple-500)', 'var(--color-amber-500)', 
            'var(--color-red-500)'
          ]
        }]
      }
    },

    // 生成饼图数据
    generatePieData() {
      const categories = ['类型A', '类型B', '类型C', '类型D']
      const values = categories.map(() => Math.floor(Math.random() * 30) + 10)
      
      return {
        type: 'pie',
        labels: categories,
        datasets: [{
          data: values,
          backgroundColor: [
            'var(--color-primary-500)', 'var(--color-blue-500)', 
            'var(--color-purple-500)', 'var(--color-amber-500)'
          ]
        }]
      }
    },

    // 更新无障碍描述
    updateAriaDescription() {
      const { title, loading, empty, error } = this.data
      let description = title ? `${title} - 统计图表区域` : '统计图表区域'
      
      if (loading) {
        description += ' - 正在加载数据'
      } else if (error) {
        description += ' - 加载出错，可点击重试'
      } else if (empty) {
        description += ' - 暂无数据'
      } else {
        description += ' - 数据已加载'
      }
      
      this.setData({ ariaDescription: description })
    }
  }
})