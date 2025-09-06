# Story: EP-03-S2 服务记录审核（通过/驳回）
Status: Done

## Story
- As: 社工（审核人）/管理员
- I want: 审核志愿者提交的服务记录，将其设为通过或驳回（驳回需填写理由）
- So that: 保障数据质量并形成可追溯的审核流转

## Scope
- In:
  - 审核接口：`services.review({ id, decision: approved|rejected, reason? })`
  - 状态机：仅允许 `review → approved|rejected`；已终态不可重复审核
  - 审核理由：驳回时必填（20–200字），通过时可空
  - 审计：审核动作写入 `AuditLogs`
  - UI：审核队列列表（`status=review`），详情页通过/驳回操作（含确认弹窗）
- Out:
  - 复杂统计/报表（另故事）
  - 团队记录高级筛选（另故事）

## Acceptance Criteria
- AC1 通过审核
  - Given `status=review`
  - When 调用 `services.review({ id, decision:'approved' })`
  - Then 返回 `{ ok:true, data:{ updated:1 } }`，记录 `reviewedAt`，写入审计
- AC2 驳回审核
  - Given `status=review`
  - When 调用 `services.review({ id, decision:'rejected', reason:'...' })`
  - Then 返回 `{ ok:true, data:{ updated:1 } }`，记录 `reviewReason`（20–200）与 `reviewedAt`，写入审计
- AC3 非法流转
  - Given `status=approved|rejected`
  - When 再次调用审核
  - Then 返回 `{ ok:false, error:{ code:'E_CONFLICT' } }`
- AC4 参数/权限校验
  - decision 非法或缺 reason（在驳回时）→ `E_VALIDATE`
  - 非授权角色调用 → `E_PERM`
- AC5 并发一致性
  - 审核操作按当前状态乐观更新，避免并发覆盖（只允许从 review 流转）
- AC6 审计
  - 审核动作写入 `AuditLogs`：`actorId`、`action='services.review'`、`target={ id, decision }`、`createdAt`

## UI/UX
- 列表：`pages/services/index` 增加 “待审核” Tab（或在现有状态 Tab 中选择 `review`）
- 详情：操作区提供 “通过/驳回+理由” 按钮；确认弹窗；操作结果提示
- A11y：控件≥88rpx，对比度≥4.5:1；错误聚焦滚动

## API
- `services.review({ id, decision:'approved'|'rejected', reason? })`
  - out: `{ ok:true, data:{ updated: number } }` | `{ ok:false, error }`
  - 错误码：`E_VALIDATE|E_PERM|E_CONFLICT|E_NOT_FOUND|E_INTERNAL`
- 参考：`docs/api/contracts.md`、`docs/specs/validation-rules.md`

## Data
- Services：`status(review|approved|rejected)`、`reviewReason?`、`reviewedAt?`
- AuditLogs：`actorId`、`action('services.review')`、`target({ id, decision })`、`createdAt`

## Analytics
- `service_review_action`（decision, hasReason, result, duration）

## Non-Functional
- P95 审核接口 ≤ 300ms；端到端 ≤ 600ms
- 并发：单条仅一次有效审核，后续返回 `E_CONFLICT`

## Tasks
- FE：
  - 审核队列列表（过滤 `status=review`）；详情页操作（通过/驳回+理由）与确认弹窗
  - 错误提示映射与重试；A11y 检查；埋点
- BE：
  - RBAC 校验：仅社工/管理员可审核
  - 状态机与参数校验（zod）：仅 `review→approved|rejected`；驳回需理由（20–200）
  - 并发保护：仅在当前 `status=review` 时更新；写入 `reviewedAt/reviewReason` 与审计
- QA：
  - 通过/驳回/非法流转/权限受限/并发一致性/错误码一致性

## Dependencies
- `validation-rules.md`、`design-system/accessibility.md`
- `docs/api/contracts.md`（services.review）

## Risks
- 并发审核导致覆盖 → 仅允许从 review 流转，返回 E_CONFLICT 并提示刷新

## DoR
- [x] 设计红线与文案确认
- [x] 契约与错误码对齐
- [x] 审计与埋点方案确认
- [x] 用例评审

## DoD
- [x] AC 全通过；测试通过；文档更新；A11y 通过

---

## 自检清单（Story Draft Checklist）
- [x] Story: As / I want / So that 明确
- [x] Scope: In/Out 明确
- [x] Acceptance Criteria: 成功/驳回/非法流转/权限/并发/审计
- [x] UI/UX: 列表/详情/操作/确认/A11y
- [x] API: 动作/入参出参/错误码
- [x] Data: 状态/审计
- [x] 校验与安全: RBAC/状态机/错误码
- [x] Analytics: 行为事件与属性
- [x] NFR: 性能与并发
- [x] Tasks: FE/BE/QA 拆解
- [x] Dependencies & Risks: 完整
- [x] DoR/DoD: 勾选条件

---

## QA Results
- Reviewer: Quinn（QA）
- Gate Decision: PASS
- Summary: 审核通过/驳回流转、参数/权限校验、并发一致性与审计均符合；前端列表提供审核操作入口与提示，错误映射一致。

Retest by Acceptance Criteria
- AC1 通过审核：PASS（`status=review` → `approved`，返回 updated:1，写入 `reviewedAt` 与审计）
- AC2 驳回审核：PASS（`status=review` → `rejected`；理由≥20 校验；返回 updated:1；审计记录）
- AC3 非法流转：PASS（非 `review` 状态调用 → `E_CONFLICT`）
- AC4 参数/权限校验：PASS（驳回缺理由 → `E_VALIDATE`；非社工/管理员 → `E_PERM`）
- AC5 并发一致性：PASS（仅允许从 review 流转；其余 `E_CONFLICT`）
- AC6 审计：PASS（`AuditLogs` 记录 `services.review` 动作与目标）

Notes / Evidence
- BE：functions/services/index.ts — RBAC（admin/social_worker）、状态机校验、审计落盘；错误码与文案一致。
- FE：pages/services/index — `status=review` 展示“通过/驳回”操作；驳回对话框校验；操作后刷新列表；错误映射（E_PERM/E_CONFLICT/E_VALIDATE）。

## Change Log
- v0.1 起草故事（SM）
- v0.2 实现后端 RBAC/状态机/审计 + 前端审核入口（Dev）
- v0.3 QA 回归 PASS；标记 Done（2025-09-06）

---

## Story Checklist Results (SM)
- Date: 2025-09-06
- Outcome: PASS — Ready for Development
- Notes:
  - 契约与错误码对齐（services.review：E_VALIDATE/E_PERM/E_CONFLICT/E_NOT_FOUND/E_INTERNAL）。
  - 审计方案明确：`AuditLogs` 记录审核动作与结果；并发仅允许 `review→终态`，其余返回 `E_CONFLICT`。
  - 建议先后端落地 RBAC + 状态机与审计，再补前端审核队列与详情操作。
