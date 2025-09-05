# 活动详情（Activity Detail）前端实现细则

目标：展示活动信息（标题/时间/地点/容量/状态），提供报名/取消/签到操作，并正确处理容量满的候补逻辑与幂等。

## 1. 页面结构（WXML 轮廓）
```
<view class="page">
  <nav-bar title="活动详情" />
  <skeleton wx:if="loading" type="detail" />
  <error-state wx:elif="error" onRetry="reload" />
  <view wx:else>
    <activity-header data="{{activity}}" />
    <action-panel status="{{reg.status}}" capacity="{{activity.capacity}}"
                  bindregister="onRegister" bindcancel="onCancel" bindcheckin="onCheckin" />
    <participants-list items="{{participants}}" />
  </view>
</view>
```

按钮状态
- 报名：`status=registered`→禁用；`status=waitlist`→显示“候补中”；`status=cancelled`→显示“重新报名”
- 签到：仅管理员/社工可见；幂等（多次点击只记录一次）

## 2. 状态机（活动/报名）
```
Activity.status: open → ongoing → done/closed
Registration.status: (none) → registered | waitlist → cancelled
Checkin: once only, idempotent
```

## 3. 字段与来源
- 活动：`title`、`date`、`location`、`capacity`、`status`
- 报名：`userId`、`status(registered|waitlist|cancelled)`、`checkedInAt?`

## 4. API 与数据流
- 加载：`activities.get({ id })`、`registrations.list({ activityId })`
- 报名：`registrations.register({ activityId })`
  - 满员：返回候补（业务提示或 `E_CONFLICT` + 说明）
- 取消：`registrations.cancel({ activityId })`
- 签到：`registrations.checkin({ activityId, userId })`（管理端）
- 重试：对 5xx 类/依赖错误使用 `callWithRetry`

## 5. 交互流程（顺序图）
```
User → Page: onLoad(activityId)
Page → API: activities.get + registrations.list
API → Page: activity + participants
User → UI: tap Register
UI → API: registrations.register
API → UI: { ok, status } (registered|waitlist)
UI → State: update button + list
```

## 6. 异常与提示
- `E_CONFLICT`：名额已满 → 显示“已加入候补”
- `E_NOT_FOUND`：活动不存在 → 展示空态/回退
- `E_PERM`：签到权限不足 → Toast 并隐藏签到按钮

## 7. 埋点
- 报名/取消/签到：activityId、status、role
- 活动详情曝光：activityId、capacity、status

## 8. 验收清单
- 按状态控制按钮可见性/可用性；容量满进入候补
- 签到幂等；列表与计数实时更新
- 错误码与文案一致，支持退避重试
