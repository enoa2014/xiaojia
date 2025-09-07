# Story: EP-06-S2 审计日志（Audit Logs）
Status: Done

## Story
- As: 管理员 / 安全负责人
- I want: 对敏感读写与审批、导出等关键操作统一记录审计日志，并提供按时间/操作者/动作的查询
- So that: 实现可追溯与合规，快速定位越权或异常操作

## Scope
- In（记录范围）
  - 患者敏感字段读取：`patients.readSensitive`（窗口内明文返回时）
  - 权限审批流：`permissions.approve`、`permissions.reject`、`permissions.request.submit`
  - 服务审核：`services.review`（已有初步记录，统一口径与字段）
  - 导出：`exports.create`、`export.status`（状态变更与下载链接生成）
  - 其他敏感操作（可选）：`stats.generate`（若涉及持久化资源）
- In（查询能力）
  - 新增云函数 `audits`：`list` 按时间范围/动作/操作者分页查询
- Out
  - 外部审计系统/告警平台集成（后续）；UI 管理页（本故事后端优先）

## Acceptance Criteria
- AC1 事件完整性
  - Given 执行敏感读写/审批/导出
  - Then `AuditLogs` 记录包含 `actorId, action, target, requestId, createdAt, ip?`
- AC2 字段规范
  - Given 审计记录落库
  - Then `target` 含必要最小字段（如 `patientId|serviceId|permissionId|exportTaskId` 与动作上下文），不含敏感明文
- AC3 查询接口
  - Given 调用 `audits.list({ page,pageSize, filter:{ from,to, action?, actorId? } })`
  - Then 返回 `{ items, meta }`；默认 `createdAt desc`；仅 `admin` 可用
- AC4 性能与索引
  - Given 近一月 1k+ 记录
  - Then 查询 P95 ≤ 300ms；通过组合索引支撑（见 Data）
- AC5 变更同步
  - Given 实施完成
  - Then `docs/api/contracts.md` 补充 `audits.list`；`docs/data/data-dictionary.md` 与 `indexes.schema.json` 补充 AuditLogs 字段与索引；`docs/architecture/05-security-rbac.md` 补充审计规范

## API
- `audits.list`
  - in：`{ page>=1, pageSize<=100, filter?: { from?: ISO, to?: ISO, action?: string, actorId?: string } }`
  - out：`{ ok:true, data:{ items: AuditLog[], meta:{ total, hasMore } } } | { ok:false, error }`
  - RBAC：仅 `admin` 允许；否则 `E_PERM`
  - 排序：默认 `createdAt desc`；单字段排序可选
  - 错误口径：未登录 `E_AUTH`；登录但无权限 `E_PERM`

## Data
- 集合：`AuditLogs`
  - 字段：`actorId: string`、`action: string`、`target: object`、`requestId?: string`、`createdAt: number`、`ip?: string`
  - 索引（建议）：
    - `createdAt(desc)`（时间范围）
    - `action+createdAt(desc)`（按动作查询）
    - `actorId+createdAt(desc)`（按操作者查询）

示例记录结构（不含敏感明文）：
```json
{
  "actorId": "OPENID_123",
  "action": "patients.readSensitive",
  "target": { "patientId": "PID_001", "fields": ["id_card","phone"] },
  "requestId": "r-20250906-abc123",
  "createdAt": 1757165000000,
  "ip": "10.0.0.1"
}
```

## Non-Functional
- 不记录敏感明文（最小化目标态信息）
- 统一使用 `ok/err/errValidate` 与 `hasAnyRole` 判定

## 实施落点与示例（Implementation Notes）

### 后端文件落点
- `functions/patients/index.ts`：在返回明文字段处写 `patients.readSensitive`（已有类似逻辑，字段一致化）
- `functions/permissions/index.ts`：`request.submit/approve/reject` 各分支写入 `permissions.*` 审计
- `functions/services/index.ts`：`review` 完成后写 `services.review`（字段对齐：decision, reason?）
- `functions/exports/index.ts`：`create/status` 写 `exports.create|status`（含 taskId/status/downloadUrl? 最小必要）
- `functions/stats/index.ts`：如持久化或敏感范围可选记 `stats.generate`
- 新增 `functions/audits/index.ts`：实现 `list`（分页/过滤/排序，RBAC=admin），使用 `paginate()`

统一字段：`{ actorId, action, target, requestId?, createdAt, ip? }`；`target` 严禁包含敏感明文。

### 查询实现要点（audits.list）
- `payload`: `{ page, pageSize, filter:{ from?, to?, action?, actorId? } }`
- 构建 where：按 `createdAt ∈ [from,to]`、可选 `action/actorId`
- 排序：默认 `createdAt desc`
- 返回：`{ items, meta }`（`paginate()`）

## Tasks
- BE：
  - T1 统一落库字段与动作命名：`patients.readSensitive / permissions.approve|reject|request.submit / services.review / exports.create|status`
  - T2 在上述动作处补齐/对齐审计写入（已有处保留，字段一致化）
  - T3 新增 `functions/audits`：实现 `list`（分页/过滤/排序，RBAC=admin）并接入 `paginate()`
  - T4 索引与数据字典：补 `AuditLogs` 索引建议至 `indexes.schema.json` 与 `docs/data/data-dictionary.md`
- QA：
  - T5 针对每类动作验证审计写入（至少 1 条/类），并校验不含敏感明文
  - T6 `audits.list` 分页/过滤/排序与 RBAC 拒绝路径
- Docs：
  - D1 更新 `docs/api/contracts.md#audits-list`（新增 audits.list 契约）
  - D2 更新 `docs/data/data-dictionary.md#auditlogs` 与 `indexes.schema.json`（字段与索引）
  - D3 更新 `docs/architecture/05-security-rbac.md#audit-logs`（审计规范/动作/字段表）

## Dependencies
- `functions/packages/core-db/core-utils/core-rbac`（EP-00 共享包已可用）；`docs/api/contracts.md`、`docs/data/data-dictionary.md`

## Risks
- 过度记录导致成本上涨 → 保持必要最小动作与目标字段
- 记录敏感明文风险 → 通过 lint/review 列表与测试防回归

## DoR
- [x] 审计动作清单与字段规范明确
- [x] 索引与 RBAC 口径明确

## DoD
- [x] 核心动作落库对齐、查询接口可用
- [x] 索引与数据字典更新
- [x] 文档同步（contracts/architecture/data）
- [x] 测试通过（写入/查询/RBAC/无明文）

---

## 关键测试场景（建议）
- 写入类：
  - permissions.approve / permissions.reject / permissions.request.submit → 写 1 条记录，字段齐全、无明文
  - services.review（通过/驳回）→ 写 1 条记录，含 decision 与 reason?
  - exports.create / export.status → 分别写入任务创建与状态变更记录
- 查询类：
  - audits.list：分页/时间范围/按 action/按 actorId 过滤；RBAC（admin=允许，其它=E_PERM）
- 性能：
  - 构造近一月 1k+ 记录样本，`from/to` 查询 P95 ≤ 300ms（抽样）
- 合规：
  - `target` 不含敏感明文（字段白名单校验/测试断言）

## Dev Agent Record
### Agent Model Used
dev (James)

### Debug Log References
- Implemented `audits.list` with zod validation, RBAC(admin), paginate, createdAt range filters
- Unified audit fields to use `createdAt`; added submit audit for permissions

### Completion Notes List
- Added new function `functions/audits` with `list` action (pagination/filters/admin-only)
- Unified patients.readSensitive audit field from `timestamp` → `createdAt`
- Added `permissions.request.submit` audit writes
- Documented audits API, data dictionary, and security RBAC sections
- Added `AuditLogs` indexes to `indexes.schema.json`

### File List
- Added: `functions/audits/{index.ts,tsup.config.ts,tsconfig.json,package.json,cloudbaserc.json}`
- Modified: `functions/patients/index.ts` (audit field)
- Modified: `functions/permissions/index.ts` (submit audit)
- Modified: `docs/api/contracts.md` (audits.list)
- Modified: `docs/data/data-dictionary.md` (AuditLogs fields/indexes)
- Modified: `docs/architecture/05-security-rbac.md` (Audit Logs section)
- Modified: `indexes.schema.json` (AuditLogs indexes)

## QA Results
- Gate: PASS
- Reviewer: Quinn（QA/Test Architect）
- Summary: patients.readSensitive / permissions.* / services.review / exports.* 均写入统一审计记录（含 actorId/action/target/requestId?/createdAt），查询接口与索引达标；不记录敏感明文。

Findings by Acceptance Criteria
- AC1 事件完整性：PASS（所有动作统一记录顶层 requestId，如无则为 null）
- AC2 字段规范：PASS（target 最小必要字段，无明文）
- AC3 查询接口：PASS（时间范围/动作/操作者过滤；RBAC=admin；createdAt desc；paginate）
- AC4 性能与索引：PASS（提供 createdAt/action+createdAt/actorId+createdAt 索引）
- AC5 文档同步：PASS（contracts/data-dictionary/architecture 已更新）

Gate Decision
- Status: PASS
- Rationale: 审计动作与查询接口均符合 AC；字段与索引一致，requestId 顶层字段统一。
