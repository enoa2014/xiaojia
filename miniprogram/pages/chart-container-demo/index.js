Page({
  data: {
    // 基础配置
    chartTitle: '数据统计图表',
    chartHeight: 400,
    
    // 交互配置
    enableTimeRange: true,
    enableFilters: true,
    enableMock: true,
    
    // 时间范围选项（使用默认）
    timeRangeOptions: [],
    currentTimeRange: '7d',
    
    // 筛选选项
    filterOptions: [
      {
        key: 'type',
        label: '类型',
        placeholder: '全部',
        options: [
          { label: '全部', value: '' },
          { label: '服务A', value: 'service_a' },
          { label: '服务B', value: 'service_b' },
          { label: '服务C', value: 'service_c' }
        ]
      },
      {
        key: 'status',
        label: '状态',
        placeholder: '全部',
        options: [
          { label: '全部', value: '' },
          { label: '进行中', value: 'active' },
          { label: '已完成', value: 'completed' },
          { label: '已暂停', value: 'paused' }
        ]
      }
    ],
    currentFilters: {},
    
    // 状态控制
    loading: false,
    error: '',
    empty: false
  },

  onLoad() {
    console.log('Chart Container Demo 页面加载')
  },

  // 时间范围变化
  onTimeRangeChange(e) {
    const { timeRange } = e.detail
    console.log('时间范围切换:', timeRange)
    
    this.setData({
      currentTimeRange: timeRange
    })
    
    // 模拟重新加载数据
    this.loadChartData()
  },

  // 筛选条件变化
  onFilterChange(e) {
    const { filters } = e.detail
    console.log('筛选条件变化:', filters)
    
    this.setData({
      currentFilters: filters
    })
    
    // 模拟重新加载数据
    this.loadChartData()
  },

  // Mock 数据生成
  onMockDataGenerated(e) {
    const { mockData } = e.detail
    console.log('Mock 数据生成:', mockData)
  },

  // 重试操作
  onRetry(e) {
    console.log('重试加载数据')
    this.loadChartData()
  },

  // 模拟加载数据
  loadChartData() {
    this.setData({
      loading: true,
      error: '',
      empty: false
    })

    // 模拟网络请求
    setTimeout(() => {
      this.setData({
        loading: false
      })
    }, 1000)
  },

  // 测试按钮事件
  testLoading() {
    this.setData({
      loading: true,
      error: '',
      empty: false,
      enableMock: false
    })
    
    setTimeout(() => {
      this.setData({ loading: false })
    }, 2000)
  },

  testError() {
    this.setData({
      loading: false,
      error: 'E_DEPENDENCY',
      empty: false,
      enableMock: false
    })
  },

  testEmpty() {
    this.setData({
      loading: false,
      error: '',
      empty: true,
      enableMock: false
    })
  },

  testNormal() {
    this.setData({
      loading: false,
      error: '',
      empty: false,
      enableMock: false
    })
  },

  testMock() {
    this.setData({
      loading: false,
      error: '',
      empty: false,
      enableMock: true
    })
  },

  // 切换交互功能
  toggleTimeRange() {
    this.setData({
      enableTimeRange: !this.data.enableTimeRange
    })
  },

  toggleFilters() {
    this.setData({
      enableFilters: !this.data.enableFilters
    })
  }
})