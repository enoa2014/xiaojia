# 档案列表/搜索页（Patients List & Search）前端实现细则

目标：提供高效的档案检索体验（姓名前缀/证件尾4位/标签筛选），默认按在住/历史分组展示，点击进入详情。

## 1. 页面结构（WXML 轮廓）
```
<view class="page">
  <nav-bar title="档案" />
  <search-bar placeholder="姓名/证件后四位" bindinput="onSearch" />
  <filter-panel bindchange="onFilter" />
  <skeleton wx:if="loading" type="list" />
  <error-state wx:elif="error" code="{{error.code}}" onRetry="reload" />
  <empty-state wx:elif="empty" action="去新建" bindtap="create" />
  <scroll-view wx:else scroll-y bindscrolltolower="loadMore">
    <section title="优先关注" wx:if="starred.length"><patient-item wx:for="{{starred}}"/></section>
    <section title="当前在住" wx:if="inhouse.length"><patient-item wx:for="{{inhouse}}"/></section>
    <section title="历史档案" wx:if="history.length"><patient-item wx:for="{{history}}"/></section>
  </scroll-view>
  <fab wx:if="canCreate" icon="plus" bindtap="create" />
</view>
```

## 2. 状态图（ASCII）
```
[Idle] → (query change) → [Loading] → (ok) → [List|Empty]
                                └→ (error) → [Error]
[List] -- pull-to-refresh --> [Loading]
```

## 3. 字段与来源
- 列表项字段：`name`、`id_card_tail`、在住标识、最近入住/服务日期
- 搜索条件：`name` 前缀、`id_card_tail` 精确；高级筛选（可扩展：在住/年龄段/病情）
- 可见性：无权限时仅显示脱敏后的关键信息（见 field-masking-matrix.md）

## 4. API 与数据流
- 查询：`patients.list({ page,pageSize, filter:{ name?, id_card_tail? }, sort:{ createdAt:-1 } })`
- 分页：每页 20；触底加载更多；下拉刷新置空数据重拉
- 重试：`callWithRetry` 应用于列表请求

## 5. 交互流程（顺序图）
```
User → UI: input keyword (debounced 300ms)
UI → API: patients.list(filter)
API → UI: items
UI → User: tap item → to patients/detail?id=...
```

## 6. 错误与提示
- 空态：关键词无结果 → 提示“未找到相关档案”（提供去新建入口，限社工/管理员）
- `E_INTERNAL/E_DEPENDENCY/E_RATE_LIMIT`：退避重试按钮

## 7. 性能
- 输入防抖：300ms；列表一次性渲染 20 条；使用懒加载头像
- 缓存：最近一次查询的第一页缓存 5 分钟

## 8. 埋点
- 搜索：keyword 长度、是否命中、结果数
- 点击列表项：patientId、section

## 9. 验收清单
- 搜索/筛选可用，分页/刷新流畅
- 权限下字段脱敏一致；空态/错误态完整
- 退避重试与缓存策略生效
