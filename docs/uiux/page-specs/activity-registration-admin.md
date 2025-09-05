# 活动报名管理（后台）前端实现细则

目标：为社工/管理员提供活动报名管理能力（查看报名/候补列表、取消、签到、容量调整）。

## 1. 页面结构（WXML 轮廓）
```
<view class="page">
  <nav-bar title="报名管理" />
  <activity-brief data="{{activity}}" />
  <tabs current="{{tab}}" bindchange="onTab">
    <tab title="已报名"><participants-list items="{{registered}}" /></tab>
    <tab title="候补"><participants-list items="{{waitlist}}" /></tab>
    <tab title="签到"><checkin-panel items="{{registered}}" bindcheckin="onCheckin" /></tab>
  </tabs>
  <footer-bar>
    <button bindtap="onAdjustCapacity">调整容量</button>
    <button bindtap="onExport">导出名单</button>
  </footer-bar>
</view>
```

## 2. 状态机（报名项）
```
registered → (cancel) → cancelled
waitlist → (promote) → registered
registered → (checkin) → checkedInAt = now (幂等)
```

## 3. 字段与来源
- 活动：`capacity`、`status`
- 报名：`userId`、`status`、`checkedInAt?`

## 4. API 与数据流
- 加载：`activities.get({ id })`、`registrations.list({ activityId })`
- 取消报名：`registrations.cancel({ activityId, userId })` → 刷新列表
- 签到：`registrations.checkin({ activityId, userId })`（幂等）
- 容量调整：`activities.update({ id, patch:{ capacity } })`
- 导出：`export.create({ type:'activityParticipants', params:{ activityId } })` → 轮询 `export.status`

## 5. 交互流程（顺序图）
```
User → Page: onLoad(activityId)
Page → API: activities.get + registrations.list
User → UI: tap Cancel on a participant
UI → API: registrations.cancel
API → UI: { ok }
UI → State: update lists (may promote first of waitlist)
```

## 6. 错误与提示
- 权限不足：隐藏签到/容量调整按钮；Toast 提示 `E_PERM`
- 取消失败：提示稍后重试，保持当前状态

## 7. 验收清单
- 三个列表切换顺畅；签到幂等；候补转正逻辑正确
- 容量调整后立即生效并刷新
- 导出任务可追踪并下载
