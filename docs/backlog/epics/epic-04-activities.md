# EP-04 活动与报名

## 目标
- 支持活动发布、报名、签到与候补队列，提升活动组织效率与数据沉淀。

## 业务价值（KPI）
- 报名转化率 ≥ 60%；签到准确率 ≥ 98%。

## 范围
- In: 活动创建/编辑（title/date/location/capacity/status）；报名/取消/候补；签到（幂等）；列表/筛选。
- Out: 活动通知推送；日历视图（后续）。

## 关键用户故事（示例）
- 社工创建活动，设置容量与状态（open/ongoing/done/closed）。
- 志愿者报名活动，容量满进入候补；取消后名额释放。
- 签到仅记录一次（幂等），可导出签到名单。

## 验收标准（Epic 级）
- 报名：满员自动候补；重复报名需返回已存在提示；取消后允许再次报名（按规则）。
- 签到：同一用户多次签到只计一次，记录时间。
- 列表：按状态/日期筛选；分页稳定。

## API 契约影响
- activities.list / get / create / update；registrations.list / register / cancel / checkin。

## 数据模型与索引
- Activities：status/date；Registrations：activityId+status、userId+date(desc)。

## 权限与安全
- 创建/编辑活动仅社工/管理员；报名/签到全员可用（登录后）。

## 依赖与顺序
- 依赖：EP-06 users/roles；EP-05 导出（签到导出）。

## 风险与假设
- 高并发报名可能导致“最后一个名额”竞争（需原子更新）。

## 里程碑
- MVP：创建/报名/签到；
- Next：候补自动转正通知、日历视图。

## 指标
- 报名人数/容量；候补数；签到率。

## 变更记录
- v0.1 初始化。
