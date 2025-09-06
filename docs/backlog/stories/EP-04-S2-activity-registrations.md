# Story: EP-04-S2 报名/取消/签到（Registrations）
Status: Done

## Story
- As: 志愿者（报名/取消/自助签到）、社工/管理员（管理签到）
- I want: 在活动详情页进行报名/取消，并在活动现场完成签到（幂等），容量满进入候补，取消释放名额自动补位
- So that: 保证活动报名秩序与到场统计的准确性

## Scope
- In:
  - 报名/取消：每个用户对同一活动仅一条报名记录（状态流转 registered|waitlist|cancelled）
  - 候补转正：取消释放名额后，最早候补自动转为 registered
  - 签到：幂等，仅记录一次时间戳；管理员/社工可为他人签到，普通用户仅可自助签到
  - 前端：活动详情页提供 报名/取消/签到 按钮，根据状态切换
  - 后端：`registrations.list/register/cancel/checkin`
- Out:
  - 报名表单（额外字段）、批量导出签到（后续）

## Acceptance Criteria
- AC1 报名成功/候补
  - Given 活动未满/已满
  - When 调用 `registrations.register({ activityId })`
  - Then 返回 status=`registered` / `waitlist`
- AC2 重复报名
  - Given 已报名或候补
  - When 再次报名
  - Then 返回 `E_CONFLICT`，提示“已报名/候补中”
- AC3 取消报名与自动补位
  - Given A、B 用户（B 在候补）且容量有限
  - When A 取消
  - Then B 自动转为 `registered`
- AC4 签到幂等与权限
  - Given 已报名用户
  - When 调用 `checkin` 多次
  - Then 仅第一次写入 `checkedInAt`；非管理角色为他人签到 → `E_PERM`
- AC5 限制与一致性
  - 保证 `userId+activityId` 唯一；状态流转：`registered|waitlist|cancelled`；查询支持 `activityId/userId/status`
- AC6 UI 行为
  - 详情页根据 `myReg.status` 显示“报名/取消/签到”按钮；报名成功提示；取消成功提示；签到成功提示

## UI/UX
- 页面：`pages/activities/detail`（本故事新增）；按钮状态随 `myReg` 切换
- 文案：重复报名提示“已报名/候补中”；未报名签到提示“请先报名”；无权限为他人签到提示“仅管理员/社工可操作”
- 参考：`docs/uiux/page-specs/activity-detail.md`

## API
- `registrations.list({ activityId?, userId?, status? }) -> Registration[]`（`userId='me'` 表示当前用户）
- `registrations.register({ activityId }) -> { status } | E_CONFLICT`
- `registrations.cancel({ activityId }) -> { updated }`
- `registrations.checkin({ activityId, userId? }) -> { updated } | E_PERM`
  - 约束：同一活动单人仅一条记录；容量满进入 `waitlist`；取消→自动补位（最早候补）；签到幂等

## Data
- Registrations：`activityId` `userId` `status(registered|waitlist|cancelled)` `createdAt` `registeredAt?` `cancelledAt?` `checkedInAt?`
- 索引：`uniq_user_activity(userId+activityId)`、`activityId+status`

## Analytics
- `activity_register_click/result`、`activity_cancel_click/result`、`activity_checkin_click/result`

## Non-Functional
- 并发：注册/取消涉及容量与补位，使用事务确保一致性（按当前实现）
- 性能：注册/取消/签到 P95 ≤ 300ms；列表 ≤ 500ms

## Tasks
- FE：`pages/activities/detail` 行为按钮/状态渲染/结果提示/错误映射
- BE：`registrations.*` 事务实现、唯一约束与状态机、权限校验
- QA：并发报名/取消补位/重复报名/自助与管理员签到/错误码一致性

## Dev Agent Record
- Agent Model Used: dev (James)
- What Changed:
  - BE：`functions/registrations` 实现 list/register/cancel/checkin（事务保证容量与候补补位）
  - FE：新增详情页与操作入口；API 接口接入

## DoR
- [x] 契约/数据字典/索引对齐
- [x] 状态机与权限规则明确

## DoD（暂定）
- [ ] AC 全通过；
- [ ] QA Gate 通过；
- [ ] 文档与用例更新到位。

## QA Results
- Reviewer: Quinn（QA）
- Gate Decision: PASS
- Summary: 报名/候补、重复报名冲突、取消后最早候补自动转正、签到幂等与权限、列表过滤均符合；并发极端场景列为监控项。

Retest by Acceptance Criteria
- AC1 报名成功/候补：PASS（容量内 registered，容量满 waitlist）
- AC2 重复报名：PASS（已报名/候补再次报名 → E_CONFLICT）
- AC3 取消与自动补位：PASS（取消后最早候补 → registered）
- AC4 签到幂等与权限：PASS（重复签到 updated=0；他人签到需管理员/社工）
- AC5 限制与一致性：PASS（唯一性与状态流转正确；list 过滤有效）
- AC6 UI 行为：PASS（按钮状态切换与提示正确）
