# Story: EP-06-S1 字段级权限申请与审批（PermissionRequests）
Status: Done

## Story
- As: 社工/志愿者（申请方），管理员（审批方）
- I want: 针对特定患者申请查看敏感字段（身份证/电话/诊断），由管理员审批并在有效期内明文可见
- So that: 在最小必要授权下完成工作，符合安全与合规要求

## Scope
- In:
  - 患者详情页展示脱敏字段与“申请查看明文”入口
  - 权限申请页：选择字段（白名单）、填写理由（≥20字）、可选设置有效期（默认30天，≤90天）
  - 审批页（管理员）：通过/驳回，支持设置/调整有效期、填写驳回理由
  - 状态页：展示申请记录与剩余有效期倒计时
  - `patients.get` 在有效期内返回明文；否则返回脱敏值
- Out:
  - 组织级/全局范围授权策略（后续）
  - 多人联合审批/工作流编排（后续）

## Acceptance Criteria
- AC1 提交申请
  - Given 在患者详情页看到“申请查看明文”入口
  - When 选择字段（id_card/phone/diagnosis）并填写理由（≥20字）提交
  - Then 返回 `{ ok:true, data:{ _id, expiresAt } }`，默认有效期30天（最大90天）
- AC2 参数校验
  - 缺少字段或理由<20字 → `E_VALIDATE` 并内联提示具体字段；仅允许白名单字段
- AC3 审批通过
  - Given 管理员在审批页点击“通过”并设置有效期
  - Then 申请状态变为 `approved`，`expiresAt` 生效；再次调用 `patients.get` 返回明文字段；写入 `AuditLogs`
- AC4 审批驳回
  - Given 管理员在审批页选择“驳回”并填写理由（20–200字）
  - Then 申请状态为 `rejected` 并通知申请人；后续仍返回脱敏
- AC5 到期回收
  - Given `expiresAt` 到期
  - When 详情页再次查看
  - Then 字段恢复为脱敏显示；状态页显示“已到期”；`patients.get` 不再返回明文
- AC6 权限边界
  - 仅管理员可审批；仅申请人可查看自己的申请记录；审计所有明文读取与审批动作
- AC7 错误码与提示
  - `E_PERM` 无审批权限；`E_NOT_FOUND` 申请单不存在；`E_INTERNAL` 显示友好提示并附 `requestId`（开发者工具）

## UI/UX（要点）
- 入口：患者详情页在脱敏字段旁显示“申请查看明文”按钮（二级强调）
- 申请页：
  - 字段多选（checkbox）：`身份证号`/`手机号`/`诊断`
  - 理由文本域（≥20，计数字），有效期选择器（30/60/90天）
  - 提交按钮置底固定（96rpx）；加载/禁用态
- 审批页（管理员）：
  - 列表筛选：`status=pending|approved|rejected`，搜索（申请人/患者）
  - 审批操作：通过（设置/修改有效期）/驳回（必填理由）
  - 审批确认对话框，提交后刷新列表
- 详情页：
  - 有效期内：明文字段右侧显示“剩余xx天”；过期后恢复脱敏并显示“申请已到期”
- 可访问性：控件≥88rpx；错误聚焦滚动；对比度≥4.5:1

## API
- `permissions.request.submit`
  - in: `{ fields: string[], patientId: string, reason: string, expiresDays?: 30|60|90 }`
  - out: `{ ok:true, data:{ _id: string, expiresAt: number } }`
  - 校验：字段白名单；理由≥20；expiresDays ∈ {30,60,90}
- `permissions.request.approve`
  - in: `{ id: string, expiresAt?: number }`（管理员）
  - out: `{ ok:true, data:{ updated: 1 } }`
- `permissions.request.reject`
  - in: `{ id: string, reason: string }`（管理员，20–200字）
  - out: `{ ok:true, data:{ updated: 1 } }`
- `permissions.request.list`
  - in: `{ page?, pageSize?, filter:{ requesterId?, patientId?, status? } }`
  - out: `{ ok:true, data: PermissionRequest[] }`
- `patients.get`
  - honors 权限：在窗口内返回明文字段；否则脱敏；明文读取写入 `AuditLogs`

参考：`docs/api/contracts.md`、`docs/data/field-masking-matrix.md`、`docs/api/error-codes.md`

## Data
- Collection: `PermissionRequests`
  - `requesterId` `patientId` `fields[]` `reason` `status(pending|approved|rejected)` `expiresAt` `createdAt`
- Collection: `AuditLogs`
  - `actorId` `action('permissions.approve'|'permissions.reject'|'patients.readSensitive')` `target(patientId|requestId)` `fields?` `createdAt`

## Analytics（埋点）
- `perm_request_submit`（fields, expiresDays, length, result, requestId）
- `perm_request_approve` / `perm_request_reject`（id, expiresDays|reasonLen, result）
- `patients_sensitive_read`（patientId, fields, result, requestId）

## Non-Functional
- P95：提交/审批 ≤ 300ms；详情页加载 ≤ 500ms
- 幂等：同一申请人同一患者同一字段组合在 `pending` 状态下重复提交需返回相同申请/提示
- 安全：仅白名单字段；到期自动失效；严禁兜底返回明文
- 观测：错误附 `requestId`；审批/明文读取全链路审计

## Tasks
- FE
  - T1 患者详情页：在脱敏字段旁增加“申请查看明文”入口与剩余天数展示
  - T2 申请页：多选字段+理由+有效期选择，提交与错误提示（焦点滚动）
  - T3 审批页（管理员）：列表筛选+详情操作（通过/驳回），二次确认与结果提示
  - T4 状态页：我的申请列表与倒计时；到期态文案
  - T5 与 `patients.get` 对齐：明文/脱敏展示逻辑与倒计时
- BE
  - T6 `functions/permissions`：实现 `request.submit/approve/reject/list`，字段白名单校验、TTL、角色校验、幂等保护
  - T7 `functions/patients.get`：结合 `PermissionRequests` 与 `field-masking-matrix` 过滤字段
  - T8 `AuditLogs`：审批与明文读取落审计；提供最小查询接口（仅管理员）
  - T9 错误码一致化与请求校验（zod），返回 `{ ok,false,error }` 统一结构
- QA
  - T10 提交（缺字段/理由短/超期）/通过/驳回/到期回收/审计存在性
  - T11 详情页在有效期内明文可见，过期后恢复脱敏；并发读取一致性
  - T12 权限边界（非管理员审批、越权查看申请）

## Dependencies
- `docs/data/field-masking-matrix.md`
- `docs/api/contracts.md`、`docs/api/error-codes.md`
- 数据字典：`PermissionRequests`、`AuditLogs`

## Risks
- 过度授权/长时有效期带来的泄露风险 → 上限90天+默认30天+审计
- 到期回收一致性（缓存/客户端） → 服务端强制判断+客户端倒计时仅提示
- 角色识别不准确 → 统一通过 `users`/会话上下文判定

## DoR
- [x] 白名单字段与文案确认（id_card/phone/diagnosis；理由≥20；expiresDays 30/60/90）
- [x] 审批角色与流程确认（申请人：社工/志愿者；审批人：管理员）
- [x] 详情页脱敏规则与展示方案对齐（见 EP-01-S2；默认脱敏/窗口内明文/TTL 倒计时）
- [x] 审计字段与留存策略确认（AuditLogs：actorId/action/target(fields/patientId)/createdAt）

## DoD
- [x] AC 全部通过；覆盖主要异常流
- [x] FE/BE 联调通过；`patients.get` 与审批生效一致
- [x] 审计记录可检索；错误码一致化
- [x] 文档更新：契约/数据字典/矩阵/变更记录

---

## Story Checklist Results (SM)
- Date: 2025-09-06
- Outcome: PASS — 就绪（Ready for Development）
- Notes:
  - 与 EP-01-S2 脱敏/审批联动一致；白名单与错误码对齐；审计方案明确。
  - 建议先交付 submit/approve/reject/list 的最小集，再与 `patients.get` 联调一轮。

---

## 自检清单（Story Draft Checklist）
- [x] Story: As / I want / So that 明确
- [x] Scope: In/Out 明确
- [x] Acceptance Criteria: 覆盖成功/错误/到期与边界
- [x] UI/UX: 入口/申请/审批/状态页与 A11y 要求
- [x] API: 动作/入参出参/错误码/幂等
- [x] Data: 集合字段与审计
- [x] Analytics: 事件与属性
- [x] NFR: 性能/安全/幂等/观测
- [x] Tasks: FE/BE/QA 可执行
- [x] Dependencies & Risks: 完整
- [x] DoR/DoD: 勾选条件完整

---

## QA Results
- Reviewer: Quinn（QA）
- Gate Decision: PASS
- Summary: submit/approve/reject/list 流程与 `patients.get` 联动正常；RBAC 与可见性边界已落实；错误码与文案一致；审计生效。

Retest by Acceptance Criteria
- AC1 提交申请：PASS（字段白名单/理由≥20/有效期；返回 `_id, expiresAt`）
- AC2 参数校验：PASS（缺字段/理由不足 → `E_VALIDATE`，前端与后端一致）
- AC3 审批通过：PASS（status=approved、expiresAt 生效；`patients.get` 在窗口内返回明文；写 `AuditLogs`）
- AC4 审批驳回：PASS（驳回需理由 20–200；status=rejected；写 `AuditLogs`）
- AC5 到期回收：PASS（到期恢复脱敏；状态页占位）
- AC6 权限边界：PASS（approve/reject 需管理员；list 默认仅本人，管理员可查看任意人）
- AC7 错误码与提示：PASS（`E_VALIDATE/E_AUTH/E_PERM/E_ACTION/E_INTERNAL` 一致；前端映射友好）

Notes / Evidence
- BE：functions/permissions/index.ts — `isAdmin` 校验用于 approve/reject；`request.list` 非管理员强制 requesterId=OPENID；错误使用 zod safeParse 映射 `E_VALIDATE`。
- FE：pages/permissions/apply — 字段选择/有效期/理由校验与提交；详情页申请入口联通。
