# 接口差距与补充建议（Backlog 已完成故事 vs 前端实现）

- 日期：2025-09-09
- 目标：对齐 docs/backlog/stories（状态 Done）与前端 pages 调用，梳理需补充/修正的云函数接口与前端封装。
- 范围：`miniprogram/`、`functions/*`、`services/api.js`

## 背景与依据
- 已完成故事（节选）：
  - EP-01-S1/S2/S3（患者创建 / 脱敏授权 / 搜索）
  - EP-02-S1/S2（入住创建 / 退住）
  - EP-03-S1/S2（服务记录创建 / 审核）
  - EP-04-S1/S2（活动创建列表 / 报名取消签到）
  - EP-06-S1/S3（字段权限审批 / RBAC 覆盖）
- 参考文档与代码：
  - `docs/backlog/stories/*`
  - `miniprogram/pages/*` 与 `miniprogram/services/api.js`
  - `functions/{patients,permissions,tenancies,services,activities,registrations,audits,exports,stats,users}`

## 现状覆盖（摘要）
- 后端函数：已具备 patients/permissions/tenancies/services/activities/registrations/audits/stats/users 的核心动作；RBAC/分页/审计在关键路径可用。
- 前端组件与页面：主要流程可跑通，但部分调用契约与接口命名与后端不完全一致；统计分析与部分编辑能力存在调用但后端未提供实现。

## 差距清单与建议

### 1) 权限审批列表返回形状不一致（P0）
- 现状：`functions/permissions` 中 `request.list` 返回 `ok(items)`（未返回 `meta/hasMore`）。
- 前端：`pages/approvals/index.js` 期望 `result.items` 与 `result.hasMore`。
- 建议：二选一（推荐 A）：
  - A. 后端改为 `ok({ items, hasMore })`（可从 `paginate` 计算）；
  - B. 保持后端 `ok({ items, meta })`，在 `services/api.js` 的 `api.permissions.list` 适配为 `{ items, hasMore }`。
- 验收：审批页上下拉分页可用；UI `hasMore` 正确更新。

### 2) 审计列表返回形状适配（P0）
- 现状：`functions/audits` 的 `list` 返回 `ok({ items, meta })`。
- 前端：`pages/audits/index.js` 期望 `result.items` 与 `result.hasMore`。
- 建议：在 `services/api.js` 的 `api.audits.list` 添加形状适配（`hasMore = Boolean(meta?.hasMore)`）。
- 验收：审计页分页加载正常；过滤条件生效。

### 3) 权限 API 前端封装缺失（P0）
- 现状：`services/api.js` 缺少：
  - `permissions.process({ requestId, action, reason })`（前端已调用）；
  - `permissions.createRequest(payload)`（前端已调用）；
  - `permissions.getPatientPermissions(patientId)`（前端已调用）。
- 建议：在 `services/api.js` 增加：
  - `process`：分发到 `request.approve`/`request.reject`；
  - `createRequest`：调用 `request.submit`；
  - `getPatientPermissions`：基于 `request.list({ patientId })` 汇总 `status/expiresAt/pendingCount`。
- 验收：`patients/detail` 与 `approvals` 调用路径不再报错；UI 能正确展示审批状态。

### 4) 报名签到别名不一致（P0）
- 现状：`api.registrations` 暴露 `checkin`；部分页面调用 `checkIn`。
- 建议：在 `services/api.js` 增加 `checkIn` 别名指向 `checkin`，或统一页面调用为 `checkin`。
- 验收：活动相关页面（含日历）签到调用不再报错。

### 5) 活动编辑接口缺失（P1）
- 现状：`pages/activities/form.js` 编辑模式调用 `action: 'update'`；`functions/activities` 未实现 `update`。
- 建议：新增 `activities.update(id, patch)`：
  - RBAC：`admin|social_worker`；
  - 校验：复用 `ActivityCreateSchema` 的子集；
  - 幂等：可选 `clientToken`；
  - 审计：`AuditLogs` 记录 `activities.update`。
- 验收：编辑保存与“发布”路径可用；审计可见。

### 6) 活动 get 入参与调用统一（P0）
- 现状：`activities.get` 期望 `{ id }`；`pages/activities/form.js` 直调 cloud 且传 `{ activityId }`。
- 建议：统一通过 `services/api.js` 的 `api.activities.get(id)`；后端可临时兼容 `activityId`。
- 验收：活动编辑页能正确加载；避免页面直调云函数。

### 7) 导出历史接口缺失（P1）
- 现状：`pages/exports/index.js` 调用 `api.exports.history()`；`functions/exports` 无 `history`。
- 建议：实现 `exports.history({ page,pageSize })`：按 `createdBy` 与时间倒序分页，返回 `{ items, hasMore }`。
- 验收：历史记录区能展示与刷新；RBAC 仅管理员/社工可见。

### 8) 统计专项分析接口缺失（P2）
- 现状：`functions/stats` 仅实现 `homeSummary/monthly/yearly/counts`；页面调用：
  - `api.stats.tenancyAnalysis('summary'|'occupancy-trend'|'room-utilization'|'stay-duration', params)`
  - `api.stats.activityAnalysis('summary'|'participation-trend'|'by-type'|'participants-by-age', params)`
  - `api.stats.servicesAnalysis('summary'|'by-type'|'by-worker'|'rating-trend', params)`
- 建议：分阶段实现上述三组 action，先返回结构化占位数据（便于前端演示），逐步完善查询逻辑。
- 验收：三分析页可加载并渲染基础图表/摘要。

## 优先级与排期
- P0（契约修正与前端封装）
  - permissions.list 形状统一；audits.list 适配；permissions 三个封装；registrations 别名；activities.get 调用统一。
- P1（功能补充）
  - activities.update；exports.history。
- P2（扩展）
  - stats.*Analysis 三组接口与聚合逻辑。

## 风险与注意事项
- 兼容性：调整返回形状建议先在 `services/api.js` 适配，减少页面改动与回归成本。
- RBAC 与审计：新增接口须对齐 `functions/packages/core-rbac` 与 `AuditLogs` 记录策略。
- 回归范围：审批页/审计页/活动编辑/导出中心/统计分析页。

## 影响面
- 前端：`pages/approvals`、`pages/audits`、`pages/activities/{form,index,detail}`、`pages/exports/index`、`pages/stats/*-analysis`、`pages/patients/detail`。
- 服务封装：`miniprogram/services/api.js`。
- 后端：`functions/{permissions,audits,activities,exports,stats}`。

## 执行清单（建议按序）
1. `services/api.js`：新增/修正
   - `permissions.process/createRequest/getPatientPermissions`
   - `audits.list` 结果适配 `{ items, hasMore }`
   - `registrations.checkIn` 别名 → `checkin`
   - 统一 `activities.get(id)` 的页面调用
2. `functions/permissions`：`request.list` 改为 `{ items, hasMore }`（或补充 `meta.hasMore` 并前端适配）
3. `functions/activities`：新增 `update` 动作 + 审计
4. `functions/exports`：新增 `history` 动作（分页 + RBAC）
5. `functions/stats`：新增 `tenancyAnalysis/activityAnalysis/servicesAnalysis` 三组 action（先占位后完善）
6. 回归审批/审计/活动/导出/统计 5 类页面

## 附录 A：Done 故事（来自 docs/backlog/stories）
- EP-00-S1-shared-packages-refactor.md（Done）
- EP-01-S1-patient-create-unique-id.md（Done）
- EP-01-S2-patient-view-masked-approved.md（Done）
- EP-01-S3-patient-search-filter.md（Done）
- EP-02-S1-tenancy-create.md（Done）
- EP-02-S2-tenancy-checkout.md（Done）
- EP-03-S1-service-record-create.md（Done）
- EP-03-S2-service-review.md（Done）
- EP-04-S1-activity-create-list.md（Done）
- EP-04-S2-activity-registrations.md（Done）
- EP-06-S1-permission-field-approval.md（Done）
- EP-06-S3-rbac-enforcement-coverage.md（Done）

## 附录 B：主要前端调用点（节选）
- 审批：`pages/approvals/index.js` → `api.permissions.list/process`
- 审计：`pages/audits/index.js` → `api.audits.list`
- 患者详情：`pages/patients/detail.js` → `api.permissions.getPatientPermissions/createRequest`
- 活动：`pages/activities/form.js` → `activities.get/update`；`pages/activities/index.js` → `registrations.register/checkIn`
- 导出中心：`pages/exports/index.js` → `api.exports.create/status/history`
- 统计分析：`pages/stats/*-analysis.js` → `api.stats.*Analysis`

---
> 说明：为降低风险，建议优先在 `services/api.js` 进行返回形状与命名适配（P0），随后再补后端缺失的动作（P1/P2）。

