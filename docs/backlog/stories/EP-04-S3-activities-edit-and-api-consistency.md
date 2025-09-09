# Story: EP-04-S3 活动编辑与调用规范统一（update/get/签到别名）
Status: Draft

## Story
- As: 社工/管理员（活动维护者）、前端开发
- I want: 支持活动编辑更新；统一活动域调用规范（避免直调 cloud，参数命名一致）；报名签到别名一致
- So that: 活动表单编辑可用，代码一致性提升，减少调用错误

## Scope
- In:
  - 新增 `activities.update(id, patch)`（RBAC：admin|social_worker）
  - 统一 `activities.get({ id })` 的 FE 调用（移除 `activityId` 入参写法与直调）
  - `api.registrations.checkIn` 别名 → `checkin`（或统一页面调用为 `checkin`）
- Out:
  - 活动报名/取消/签到业务规则（已在 EP-04-S2 覆盖）

## Acceptance Criteria
- AC1 活动编辑
  - Given 管理员/社工在编辑模式
  - When 调用 `activities.update(id, patch)` 保存
  - Then 返回 `{ updated: 1 }` 或新版本 id；页面提示“更新成功/发布成功”；有审计记录
- AC2 get 调用统一
  - Given 活动表单编辑与详情页加载
  - When 通过 `api.activities.get(id)` 获取
  - Then 数据正确加载；无 `wx.cloud.callFunction` 直调与 `{ activityId }` 传参
- AC3 签到别名一致
  - Given 活动列表/日历视图签到
  - When 调用 `api.registrations.checkIn(id)`
  - Then 与 `checkin(id)` 等价且不报错

## UI/UX
- 沿用现有活动表单/列表/日历交互；编辑成功/发布成功提示文案明确

## API
- BE：`activities.update({ id, patch }): { updated }`（允许字段：title/category/description/date/time/location/capacity/tags/status...）
- FE：
  - `api.activities.get(id)`（统一参数）
  - `api.registrations.checkIn(activityId)` → 同 `checkin`

## Data
- Activities：可选新增 `updatedAt` 字段
- AuditLogs：记录 `activities.update`

## Non-Functional
- 权限：仅管理员/社工；未授权 → `E_PERM`
- 幂等：可选 `clientToken`；失败重试不产生重复记录

## Tasks
- FE（S）
  - `services/api.js`：`activities.get(id)` 统一封装；移除页面直调 cloud
  - `services/api.js`：为 `registrations.checkIn` 增加别名（指向 `checkin`）
  - `pages/activities/form.js`：替换 get/update 的调用为 api 封装
- BE（M）
  - `functions/activities`：新增 `update`（字段校验+RBAC+审计）
- QA（S）
  - 编辑保存/发布成功路径；未授权编辑 → `E_PERM`
  - 详情加载数据一致；签到别名调用不报错

## 验收清单
- [ ] 活动编辑保存/发布成功提示，审计可见
- [ ] 所有活动页不再直调 cloud，均通过 `api.activities.get`
- [ ] 签到别名 `checkIn` 与 `checkin` 等价

## Dev Agent Record
- Agent Model Used: dev (James)
- What Changed: 新增活动更新，前端调用统一；签到别名兼容

## DoR
- [x] 差距来源：`docs/api/interface-gaps.md`
- [x] 现有活动创建/列表已可用（EP-04-S1）

## DoD（暂定）
- [ ] AC 通过；
- [ ] 审计可查；
- [ ] FE 不再直调 cloud；
- [ ] 文档与用例更新。

## 自检清单（Story Draft Checklist）
- [x] Story: As / I want / So that 明确
- [x] Scope: In/Out 明确（仅涵盖 update/get/签到别名）
- [x] Acceptance Criteria: 编辑/加载/签到别名覆盖
- [x] UI/UX: 沿用现有表单/列表/日历，提示明确
- [x] API: activities.update/get 与 registrations.checkIn 契约清晰
- [x] Data: Activities 可选 updatedAt；审计记录 actions 明确
- [x] 校验与安全: RBAC（admin|social_worker）
- [x] Analytics: 可选提交/发布事件（保持现状）
- [x] NFR: 幂等/错误处理/无直调 cloud
- [x] Tasks: FE/BE/QA 可执行分解
- [x] Dependencies & Risks: 与 EP-04 既有故事衔接
- [x] DoR/DoD: 勾选就绪与完成条件
