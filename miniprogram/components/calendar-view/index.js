Component({
  properties: {
    // 当前视图模式
    viewMode: {
      type: String,
      value: 'month' // month | week
    },
    // 当前日期
    currentDate: {
      type: String,
      value: ''
    },
    // 活动数据
    activities: {
      type: Array,
      value: []
    },
    // 状态筛选
    statusFilter: {
      type: String,
      value: 'all' // all | registering | upcoming | ongoing | finished
    },
    // 是否显示今天按钮
    showToday: {
      type: Boolean,
      value: true
    }
  },

  data: {
    // 日历显示数据
    calendarData: {
      year: 2025,
      month: 9,
      weeks: [],
      today: ''
    },
    // 活动状态配置
    statusConfig: {
      registering: { name: '报名中', color: '#34C759' },
      upcoming: { name: '即将开始', color: '#FF9500' },
      ongoing: { name: '进行中', color: '#007AFF' },
      finished: { name: '已结束', color: '#8E8E93' }
    },
    // 选中日期
    selectedDate: '',
    // 当前月份的活动统计
    monthlyStats: {}
  },

  lifetimes: {
    attached() {
      this.initCalendar()
    }
  },

  observers: {
    'currentDate': function(currentDate) {
      if (currentDate) {
        this.initCalendar(currentDate)
      }
    },
    'activities': function(activities) {
      this.calculateMonthlyStats()
    },
    'viewMode': function(viewMode) {
      this.generateCalendarData()
    }
  },

  methods: {
    // 初始化日历
    initCalendar(dateStr) {
      const date = dateStr ? new Date(dateStr) : new Date()
      const today = new Date()
      
      this.setData({
        'calendarData.year': date.getFullYear(),
        'calendarData.month': date.getMonth() + 1,
        'calendarData.today': this.formatDate(today),
        selectedDate: this.formatDate(date)
      })
      
      this.generateCalendarData()
      this.calculateMonthlyStats()
    },

    // 生成日历数据
    generateCalendarData() {
      const { year, month } = this.data.calendarData
      const { viewMode } = this.data
      
      if (viewMode === 'month') {
        this.generateMonthData(year, month)
      } else {
        this.generateWeekData(year, month)
      }
    },

    // 生成月视图数据
    generateMonthData(year, month) {
      const firstDay = new Date(year, month - 1, 1)
      const lastDay = new Date(year, month, 0)
      const firstDayOfWeek = firstDay.getDay()
      const daysInMonth = lastDay.getDate()
      
      const weeks = []
      let currentWeek = []
      
      // 填充月初空白日期
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate()
      
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        currentWeek.push({
          day: prevMonthLastDay - i,
          date: this.formatDate(new Date(prevYear, prevMonth - 1, prevMonthLastDay - i)),
          isCurrentMonth: false,
          activities: []
        })
      }
      
      // 填充当月日期
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day)
        const dateStr = this.formatDate(date)
        
        currentWeek.push({
          day: day,
          date: dateStr,
          isCurrentMonth: true,
          isToday: dateStr === this.data.calendarData.today,
          isSelected: dateStr === this.data.selectedDate,
          activities: this.getActivitiesForDate(dateStr)
        })
        
        if (currentWeek.length === 7) {
          weeks.push([...currentWeek])
          currentWeek = []
        }
      }
      
      // 填充月末空白日期
      if (currentWeek.length > 0) {
        const nextMonth = month === 12 ? 1 : month + 1
        const nextYear = month === 12 ? year + 1 : year
        let nextDay = 1
        
        while (currentWeek.length < 7) {
          currentWeek.push({
            day: nextDay,
            date: this.formatDate(new Date(nextYear, nextMonth - 1, nextDay)),
            isCurrentMonth: false,
            activities: []
          })
          nextDay++
        }
        weeks.push(currentWeek)
      }
      
      this.setData({
        'calendarData.weeks': weeks
      })
    },

    // 生成周视图数据
    generateWeekData(year, month) {
      const selectedDate = new Date(this.data.selectedDate || new Date())
      const startOfWeek = new Date(selectedDate)
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
      
      const week = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + i)
        const dateStr = this.formatDate(date)
        
        week.push({
          day: date.getDate(),
          date: dateStr,
          isCurrentMonth: date.getMonth() + 1 === month,
          isToday: dateStr === this.data.calendarData.today,
          isSelected: dateStr === this.data.selectedDate,
          activities: this.getActivitiesForDate(dateStr)
        })
      }
      
      this.setData({
        'calendarData.weeks': [week]
      })
    },

    // 获取指定日期的活动
    getActivitiesForDate(dateStr) {
      return this.data.activities.filter(activity => {
        const activityDate = this.formatDate(new Date(activity.startTime))
        const matchesDate = activityDate === dateStr
        const matchesStatus = this.data.statusFilter === 'all' || 
                             activity.status === this.data.statusFilter
        return matchesDate && matchesStatus
      })
    },

    // 计算月度活动统计
    calculateMonthlyStats() {
      const stats = {}
      this.data.activities.forEach(activity => {
        const date = this.formatDate(new Date(activity.startTime))
        if (!stats[date]) {
          stats[date] = 0
        }
        stats[date]++
      })
      
      this.setData({ monthlyStats: stats })
    },

    // 格式化日期为 YYYY-MM-DD
    formatDate(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },

    // 切换视图模式
    toggleViewMode() {
      const newMode = this.data.viewMode === 'month' ? 'week' : 'month'
      this.setData({ viewMode: newMode })
      this.triggerEvent('viewModeChange', { mode: newMode })
    },

    // 上一月/周
    onPrevious() {
      const { year, month } = this.data.calendarData
      let newYear = year
      let newMonth = month - 1
      
      if (newMonth < 1) {
        newYear = year - 1
        newMonth = 12
      }
      
      this.setData({
        'calendarData.year': newYear,
        'calendarData.month': newMonth
      })
      
      this.generateCalendarData()
      this.triggerEvent('dateChange', { 
        year: newYear, 
        month: newMonth,
        date: `${newYear}-${String(newMonth).padStart(2, '0')}-01`
      })
    },

    // 下一月/周
    onNext() {
      const { year, month } = this.data.calendarData
      let newYear = year
      let newMonth = month + 1
      
      if (newMonth > 12) {
        newYear = year + 1
        newMonth = 1
      }
      
      this.setData({
        'calendarData.year': newYear,
        'calendarData.month': newMonth
      })
      
      this.generateCalendarData()
      this.triggerEvent('dateChange', { 
        year: newYear, 
        month: newMonth,
        date: `${newYear}-${String(newMonth).padStart(2, '0')}-01`
      })
    },

    // 回到今天
    goToToday() {
      const today = new Date()
      this.setData({
        'calendarData.year': today.getFullYear(),
        'calendarData.month': today.getMonth() + 1,
        selectedDate: this.formatDate(today)
      })
      
      this.generateCalendarData()
      this.triggerEvent('dateChange', { 
        year: today.getFullYear(), 
        month: today.getMonth() + 1,
        date: this.formatDate(today)
      })
    },

    // 选择日期
    onDateSelect(e) {
      const { date } = e.currentTarget.dataset
      this.setData({ selectedDate: date })
      
      this.generateCalendarData()
      this.triggerEvent('dateSelect', { 
        date: date,
        activities: this.getActivitiesForDate(date)
      })
    },

    // 点击活动
    onActivityTap(e) {
      const { activity } = e.currentTarget.dataset
      this.triggerEvent('activityTap', { activity })
    },

    // 报名活动
    onRegisterTap(e) {
      const { activity } = e.currentTarget.dataset
      this.triggerEvent('registerTap', { activity })
    },

    // 签到活动
    onCheckInTap(e) {
      const { activity } = e.currentTarget.dataset
      this.triggerEvent('checkInTap', { activity })
    }
  }
})