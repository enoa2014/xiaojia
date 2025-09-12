# Story: EP-07-S2 审批注册（管理员/社工）
Status: Done

## Story
- As: 管理员/社工
- I want: 查看并审批用户注册（通过/拒绝）
- So that: 规范地授予或拒绝系统访问权限

## Scope
- In: 审批列表（pending）、详情查看、通过分配角色、拒绝填写原因
- Out: 批量审批、导出

## Acceptance Criteria
- AC1 列表与过滤
  - Given 注册存在 `status='pending'`
  - When 打开“用户审批”tab
  - Then 展示待审批列表，支持分页
- AC2 通过
  - When 选择“通过”并指定角色（volunteer|parent）
  - Then `Users.status='active'`，`role`/`roles` 落地，返回 `{ ok:true }`
- AC3 拒绝
  - When 选择“拒绝”并填写原因
  - Then `Users.status='rejected'`，记录 `rejectReason`
- AC4 权限限制
  - 非 `admin|social_worker` 调用审批接口 → `E_PERM`
- AC5 审计
  - 每次审批行为写入 `AuditLogs`（actorId/targetOpenId/action/createdAt）

## UI/UX
- 页面：`pages/approvals/index` 新增「用户审批」tab
- 卡片：显示 `name/phone/id_card.masked/applyRole/relative*`、提交时间
- 操作：通过（选择角色）/拒绝（填写原因）

## API
- `users.listRegistrations({ page, pageSize, status:'pending' })`
- `users.reviewRegistration({ openId, decision:'approve'|'reject', role?, reason? })`
- 错误码：`E_PERM|E_VALIDATE|E_INTERNAL`

## Data
- Users：更新 `status/role/roles/rejectReason/updatedAt`
- AuditLogs：`{ action:'user_review', actorId, targetOpenId, createdAt }`

## Analytics
- 事件：`register_review_action`（approve|reject, role, duration, requestId）

## Non-Functional
- 审批操作 ≤ 800ms；列表分页 P95 ≤ 1s

## Tasks
- FE：审批 tab UI、操作弹窗、错误映射
- BE：列表与审批实现；审计写入
- QA：权限限制/通过/拒绝/分页/错误映射

## Dependencies
- EP-07-S1；EP-06（审计）

## Risks
- 审批人边界不清：已明确管理员/社工可审批

## DoR
- [ ] 审批文案与角色选单确认
- [ ] 审计字段规范对齐

## DoD
- [ ] AC 覆盖；审计落库；用例通过

## Dev Agent Record
- Agent Model Used: OpenAI Codex CLI (o4-mini)
- Debug Log References: N/A
- Completion Notes List:
  - 前端在 `pages/approvals` 增加“用户注册”Tab 的初始化与下拉刷新分支、分页与两段列表（待审批/已处理）。
  - 审批动作：通过时选择角色（志愿者/亲属）；拒绝时支持填写原因（`wx.showModal` 可编辑），均调用 `users.reviewRegistration`。
  - 埋点：新增 `register_review_action`（包含 requestId、action、role、duration、code）。
  - 后端：`users.listRegistrations` 输出补充 `updatedAt` 以用于“已处理”列表显示时间。
  - 构建校验：`functions/users` 成功构建。
  - WXML 规范修正：移除模板内 `.charAt(0)` 等方法调用，改为 JS 预计算字段（`initial`、`requesterInitial`）。
  - 权限与体验：未授权时展示空态；支持下拉刷新与分页追加，错误态使用 `error-view`。
- File List:
  - miniprogram/pages/approvals/index.{js,wxml,wxss,json}（用户审批逻辑与 UI；模板表达式与数据映射修正）
  - functions/users/index.ts（listRegistrations 增加 updatedAt）

## Change Log
| Date       | Version | Description                            | Author |
|------------|---------|----------------------------------------|--------|
| 2025-09-11 | 1.0     | 审批Tab与动作完成，埋点与后端对齐，评审 | Dev    |
| 2025-09-12 | 1.1     | 审批页模板表达式修正与数据预处理优化     | Dev    |

## QA Results
- Gate: PASS
- Reviewer: Quinn（QA/Test Architect）
- Summary: 用户审批 Tab 功能完整；通过/拒绝逻辑与审计、RBAC 达标；模板表达式合规（移除函数调用）；建议对 NFR 性能目标进行采样验证并纳入监控。

Findings by Acceptance Criteria
- AC1 列表与过滤：PASS
  - 待审批列表展示与分页可用；已处理列表分流展示。
- AC2 通过：PASS
  - 指定角色后 `status='active'` 且 `role/roles` 落地；返回形状符合预期。
- AC3 拒绝：PASS
  - 支持填写原因，`status='rejected'` 与 `rejectReason` 写入。
- AC4 权限限制：PASS
  - 非 `admin|social_worker` 返回 `E_PERM`；前端不展示敏感操作。
- AC5 审计：PASS
  - 审批行为写入 `AuditLogs`（actorId/targetOpenId/action/createdAt 等）。

Non-Functional / Risks
- 性能：MONITOR（审批操作 ≤800ms、列表分页 P95 ≤1s 未实测，建议采样并记录 P95）。
- 观测：PASS（`register_review_action` 已接入；建议在测试计划中覆盖错误分支上报）。

Recommendations
- R1 NFR 验证：补充审批操作与分页 API 的采样测试与 P95 记录。
- R2 测试用例：完善“角色选择/拒绝原因输入/错误映射”的集成与 E2E 清单。

## 自检清单（Story Draft Checklist）
- [x] Story: As / I want / So that 清晰（审批）
- [x] Scope: 列表/通过/拒绝，排除批量/导出
- [x] Acceptance Criteria: 列表/通过/拒绝/RBAC/审计
- [x] UI/UX: 审批 tab、卡片、操作弹窗
- [x] API 映射: users.listRegistrations/reviewRegistration
- [x] Data 对齐: Users 状态流、AuditLogs 字段
- [x] 校验与安全: 审批 RBAC、输出脱敏
- [x] Analytics: 审批操作埋点
- [x] NFR: 性能目标（分页/操作）
- [x] Tasks: FE/BE/QA 列明
- [x] Dependencies & Risks: 与 EP-06 审计对齐
- [x] DoR/DoD: 条目可检
