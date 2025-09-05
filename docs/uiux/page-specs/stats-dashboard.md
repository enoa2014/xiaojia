# 统计仪表盘（Stats Dashboard）前端实现细则

目标：提供项目关键指标与趋势的可视化展示，并支持导出月报/年报（异步任务）。

## 1. 页面结构（WXML 轮廓）
```
<view class="page">
  <nav-bar title="统计" />
  <filter-strip>
    <segmented items="{{['月度','年度']}}" bindchange="onScope" />
    <date-range v-if="scope==='月度'" bindchange="onMonth" />
    <year-picker v-else bindchange="onYear" />
    <button class="export" bindtap="onExport">导出报表</button>
  </filter-strip>
  <skeleton wx:if="loading" type="cards" />
  <error-state wx:elif="error" onRetry="reload" />
  <empty-state wx:elif="empty" />
  <scroll-view wx:else scroll-y>
    <kpi-cards items="{{kpis}}" />
    <chart type="line" data="{{trend}}" />
    <chart type="bar" data="{{byType}}" />
  </scroll-view>
</view>
```

## 2. 状态图
```
[Idle] → (select scope/date) → [Loading] → (ok) → [Content|Empty]
                                   └→ (error) → [Error]
```

## 3. 数据与来源
- KPI：当月服务总数、在住人数、活动报名/签到率等
- 趋势：近 12 个月服务数量折线
- 维度：服务类型柱状

## 4. API 与数据流
- 加载：
  - 月度：`stats.monthly({ month: 'YYYY-MM', scope:'services|patients|activities' })`
  - 年度：`stats.yearly({ year: 'YYYY' })`
- 导出：`export.create({ type:'statsMonthly'|'statsAnnual', params })` → 轮询 `export.status(taskId)` 直至 `done`，展示临时下载 URL
- 重试：对 stats/export 接口使用 `callWithRetry`

## 5. 交互流程（顺序图）
```
User → UI: pick month/year
UI → API: stats.monthly/yearly
API → UI: { kpis, trend, byType }
User → UI: tap 导出
UI → API: export.create
UI → API: export.status (poll)
API → UI: { done, downloadUrl }
UI → User: openUrl(downloadUrl)
```

## 6. 异常与提示
- 空数据：展示占位与“暂无数据”说明
- 导出失败：提示稍后重试，保留任务记录

## 7. 性能
- 图表懒渲染；数据缓存到 localStorage（按月/年键）

## 8. 埋点
- 维度切换：scope、month/year
- 导出：type、耗时、成功/失败

## 9. 验收清单
- 月度/年度切换顺畅；空态/错误态完整
- 导出轮询与下载链接有效；错误码映射一致
