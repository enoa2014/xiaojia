# Story: EP-06-S4 审批/审计 API 契约与前端封装统一
Status: Draft

## Story
- As: 管理员/社工（审批与审计使用者）、前端开发
- I want: 审批列表/审计列表的返回形状统一且可分页，权限相关前端封装齐备
- So that: 审批/审计页面稳定可用，避免契约不一致导致的 UI 错误

## Scope
- In:
  - 审批：`permissions.request.list` 返回含分页标识（`{ items, hasMore }` 或 `{ items, meta.hasMore }`），前端适配一致形状
  - 审计：`audits.list` 前端适配 `{ items, hasMore }` 形状用于分页
  - 前端封装：新增 `api.permissions.process/createRequest/getPatientPermissions`，避免页面直连细粒度动作
- Out:
  - 审批流转规则/权限边界（已有 EP-06-S1/S3 覆盖）

## Acceptance Criteria
- AC1 审批列表分页
  - Given 管理员访问审批页
  - When 调用 `permissions.request.list({ page,pageSize })`
  - Then 前端获得 `{ items, hasMore }`，上下拉分页正确
- AC2 审批操作
  - Given 管理员在审批页点击批准/拒绝
  - When 调用 `api.permissions.process({ id, action, reason? })`
  - Then 返回成功提示并刷新列表；错误码映射友好
- AC3 患者详情权限状态
  - Given 进入患者详情页
  - When 调用 `api.permissions.getPatientPermissions(patientId)`
  - Then 返回 `{ status, expiresAt?, pendingRequests? }` 并正确渲染
- AC4 审计列表分页
  - Given 管理员访问审计页
  - When 调用 `api.audits.list({ page,pageSize,filter })`
  - Then 获取 `{ items, hasMore }`，筛选与分页生效

## UI/UX
- 审批页与审计页保持现有界面，仅修正分页与错误提示；无额外视觉变更

## API
- BE（可二选一）：
  - A. `permissions.request.list -> ok({ items, hasMore })`
  - B. `permissions.request.list -> ok({ items, meta })`（FE 适配 `hasMore`）
- FE：
  - `api.permissions.process({ id, action: 'approve'|'reject', reason? }, requestId?)`
  - `api.permissions.createRequest({ patientId, fields[], reason, expiresDays }, requestId?)`
  - `api.permissions.getPatientPermissions(patientId): { status: 'none'|'pending'|'approved'|'rejected', expiresAt?: number, pendingRequests?: number }`
  - `api.audits.list({ page,pageSize,filter }): { items, hasMore }`

## Data
- 不新增数据模型；复用 `PermissionRequests`、`AuditLogs`

## Non-Functional
- 兼容性：首选在 FE 适配返回形状，降低回归成本
- 正确性：错误码映射统一 `E_AUTH/E_PERM/E_VALIDATE/E_CONFLICT/E_INTERNAL`

## Tasks
- FE（S）
  - `services/api.js`：新增 `permissions.process/createRequest/getPatientPermissions`（含错误码映射与 requestId 透传）
  - `services/api.js`：`audits.list` 结果适配 `{ items, hasMore }`
  - `pages/approvals/index.js`：分页/筛选与空态对齐形状
  - `pages/audits/index.js`：分页/筛选与空态对齐形状
- BE（S，可选）
  - `functions/permissions`：`request.list` 返回 `{ items, hasMore }`（保留向后兼容）
- QA（S）
  - 审批分页/批准/驳回 6 条路径；审计分页与过滤 4 条路径
  - 患者详情权限状态展示（none/pending/approved/rejected）

## 验收清单
- [ ] 审批列表：分页加载、筛选切换、空态/错误提示一致
- [ ] 审批操作：批准/驳回成功提示，错误码映射正确
- [ ] 患者详情：权限状态卡片表现一致（含到期文本）
- [ ] 审计列表：分页加载、过滤、空态/错误提示一致

## Dev Agent Record
- Agent Model Used: dev (James)
- What Changed: 统一契约形状、补齐 FE 封装，审批/审计分页工作正常

## DoR
- [x] 接口差距清单：`docs/api/interface-gaps.md`
- [x] 错误码对齐 `docs/api/error-codes.md`

## DoD（暂定）
- [ ] AC 全通过
- [ ] 不影响既有审批/审计权限校验
- [ ] 文档更新与回归完成

## 自检清单（Story Draft Checklist）
- [x] Story: As / I want / So that 明确
- [x] Scope: In/Out 明确（限定为契约与封装统一）
- [x] Acceptance Criteria: 覆盖分页/操作/状态三类场景
- [x] UI/UX: 不改版，仅修正分页/空错态文案
- [x] API: 动作/入参出参/错误码/契约（形状统一）
- [x] Data: 复用 PermissionRequests/AuditLogs（无新增）
- [x] 校验与安全: RBAC admin 限定、错误码一致
- [x] Analytics: 审批/审计操作可选埋点（保持现状）
- [x] NFR: 兼容性优先、回归范围标注
- [x] Tasks: FE/BE/QA 可执行分解
- [x] Dependencies & Risks: 与 EP-06 其它故事口径一致
- [x] DoR/DoD: 勾选就绪与完成条件
