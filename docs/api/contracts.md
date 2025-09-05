# API 契约（云函数调用约定）

面向微信云开发（TCB）云函数，统一入参/出参、分页/过滤/排序、错误码与幂等策略。本文件列出各模块行动（action）及其入参/出参，并注明当前实现与MVP目标的一致性。

## 通用约定
- 调用：`wx.cloud.callFunction({ name, data })`
- 入参包：`{ action?: string, payload?: any, clientToken?: string }`（不同 action 的 payload 见各模块）
- 出参包（当前实现统一）：
  - 成功：`{ ok: true, data: any }`
  - 失败：`{ ok: false, error: { code: string, msg: string, details?: any } }`
- 分页（规范建议）：`page.num >= 1`，`page.size ∈ [10, 100]`，建议返回 `meta.total/meta.hasMore`
- 过滤/排序（规范建议）：字段名与数据字典一致；排序 `{ createdAt: -1 }`
- 幂等：可重复提交接口必须传 `clientToken` 去重（如记录创建/导出任务）
- 审计：敏感读写与审批类操作记录至 `AuditLogs`

## 错误处理
- 错误码集合：`E_AUTH, E_PERM, E_VALIDATE, E_NOT_FOUND, E_CONFLICT, E_RATE_LIMIT, E_DEPENDENCY, E_INTERNAL, E_ACTION, E_ARG`
- 前端处理建议见《error-codes.md》

## 云函数清单总览（域与职责）
- patients：患者与家庭档案（列表/详情/创建/编辑、去重）。
- tenancies：入住与退住（创建/更新/查询、床位冲突检测入口）。
- services：服务记录（创建/列表/审核流转、图片）。
- activities：活动（创建/更新/列表）。
- registrations：报名（报名/取消/签到、幂等）。
- permissions：字段级权限申请/审批；数据可见性由各域统一过滤。
- users：基础资料/角色信息。
- stats：月度/年度统计（预聚合/聚合接口）。
- exports：导出任务创建与状态轮询（临时下载链接）。
- init-db：一次性创建集合；import-xlsx：从 COS 导入 b.xlsx。

## 模块与函数（当前实现与MVP目标）

### patients（已实现：list）
- list：分页查询（当前）
  - in（payload）：`{ page?: number>=1, pageSize?: 1..100 }`（默认 1/10）
  - out：`{ ok: true, data: Patient[] }`
  - 备注：暂不支持 filter/sort 与 meta.total；MVP 将补充
  - 校验摘要：`page` 整数 ≥1；`pageSize` 整数 1..100；忽略未知字段。
- get（MVP）：按 `_id` 查询详情
  - in：`{ id: string }`
  - out：`{ ok: true, data: Patient }`
  - 校验摘要：`id` 必填，字符串长度 1..64；按角色/审批过滤敏感字段（见字段脱敏矩阵）。
- create（MVP，幂等）
  - in：`{ patient: { name, id_card, ... } , clientToken }`
  - out：`{ ok: true, data: { _id } }`
  - 规则：`id_card` 唯一；冲突 → `E_CONFLICT`
  - 校验摘要：必填 `name,id_card`；`id_card` 18 位且校验位正确并全局唯一；`phone` 符合大陆手机号；`birthDate<=today`；可选文本字段长度限制（备注≤500）。`clientToken` 用于幂等去重。
- update（MVP）
  - in：`{ id: string, patch: Partial<Patient> }`
  - out：`{ ok: true, data: { updated: number } }`
  - 校验摘要：`id` 必填；`patch` 字段同 create 的字段级规则；`id_card` 默认不可变更（需管理员审批）；记录审计。

示例（当前 patients.list）
```
// 请求
wx.cloud.callFunction({ name: 'patients', data: { action: 'list', payload: { page: 1, pageSize: 20 } } })
// 响应
{ ok: true, data: [ /* Patient */ ] }
```

### tenancies（回传占位，计划按下列契约实现）
- list：`in { page?, pageSize?, filter:{ patientId?, id_card? }, sort? }` → `out { ok:true, data: Tenancy[] }`
  - 校验摘要：分页参数同上；filter 中 `patientId|id_card` 字符串校验。
- get：`in { id }` → `out { ok:true, data: Tenancy }`
- create：`in { tenancy: { patientId|id_card, checkInDate, room?, bed?, subsidy?, extra? }, clientToken }` → `out { ok:true, data:{ _id } }`
- update：`in { id, patch }` → `out { ok:true, data:{ updated } }`
- 规则：同日同床位冲突 → `E_CONFLICT`
  - 校验摘要：`checkInDate` 必填 ISO 日期；须提供 `patientId` 或 `id_card` 其一；`checkOutDate` 若填需 ≥ `checkInDate`；`subsidy≥0` 两位小数；`room|bed` 可空；冲突检测提示但可配置是否阻断。

### services（回传占位，计划按下列契约实现）
- list：`in { page?, pageSize?, filter:{ patientId?, createdBy?, type?, status? }, sort? }` → `out { ok:true, data: Service[] }`
  - 校验摘要：`type ∈ visit|psych|goods|referral|followup`；`status ∈ review|approved|rejected`；其他分页同上。
- get：`in { id }` → `out { ok:true, data: Service }`
- create：`in { service:{ patientId, type, date, desc?, images? }, clientToken }` → `out { ok:true, data:{ _id } }`
- review：`in { id, decision:'approved'|'rejected', reason? }` → `out { ok:true, data:{ updated } }`
  - 校验摘要：create 必填 `patientId,type,date`；`date` ISO；`desc≤500`；`images[]` 每张 ≤5MB、数量≤9；幂等 `clientToken`；review 仅允许 `review→approved|rejected`，被拒需 `reason`（20–200 字）；敏感操作写审计。

### activities（当前回显占位），registrations（当前回显占位）
- activities.list/get/create/update（同上规范）
- registrations.list：`in { activityId?, userId?, status? }` → `out { ok:true, data: Registration[] }`
- registrations.register/cancel/checkin（幂等）
  - 校验摘要：activities.create 必填 `title(2–40),date,location(≤80),capacity≥0,status∈open|ongoing|done|closed`；
    registrations.register 需保证 `userId+activityId` 唯一，满员进入候补（waitlist）；cancel 释放名额；checkin 幂等（同一用户仅记录一次）。

### permissions（当前回显占位）
- request.submit：`in { fields:string[], patientId?, reason }` → `out { ok:true, data:{ _id, expiresAt } }`
- request.approve/reject：`in { id, expiresAt? | reason }` → `out { ok:true, data:{ updated } }`
- request.list：按申请人/状态筛选
  - 校验摘要：`fields[]` 必须来自白名单（如 `id_card|phone|diagnosis`）；`reason≥20` 字；`expiresAt` 默认 30 天、最大 90 天；审批通过生成 TTL；任一明文读取与审批写审计。

### stats / exports（当前回显占位）
- stats.monthly / stats.yearly：`in { scope:'patients'|'services'|..., month|year }` → `out { ok:true, data:{ items, meta } }`
- export.create：`in { type, params, clientToken }` → `out { ok:true, data:{ taskId } }`
- export.status：`in { taskId }` → `out { ok:true, data:{ status, downloadUrl?, expiresAt? } }`
  - 校验摘要：stats.monthly 需 `month=YYYY-MM`；stats.yearly 需 `year=YYYY`；
    export.create 的 `type ∈ statsMonthly|statsAnnual` 且 `clientToken` 幂等；status 需 `taskId`（存在性校验）。下载链接有效期默认 30 分钟。

### users（当前回显占位）
- me.get：返回当前用户资料与角色
- profile.update：更新基础资料（受权限控制）
  - 校验摘要：受 RBAC 控制，仅允许更新非敏感字段（如昵称、头像）；如涉及电话等敏感数据需按字段规则校验并走审批逻辑。

### init-db（已实现）
- main：创建缺失集合
  - in：无
  - out：`{ ok:true, data:{ created: string[] } }`

### import-xlsx（已实现）
- fromCos：按 COS 文件导入 b.xlsx
  - in：`{ action:'fromCos', payload:{ fileID: string } }`
  - out：`{ ok:true, data:{ importedPatients: number, importedTenancies: number, rows: number, sheet: string } }`
  - 错误：缺少 fileID → `E_ARG`；不支持的 action → `E_ACTION`
  - 校验摘要：`fileID` 必填且为合法 COS 路径；对行数据执行日期标准化、手机号/身份证提取、空值处理；
    患者按 `id_card` 去重入库；入住记录允许缺失 `patientId`（后续回填）。

## 约定细则：事件与响应 Schema
- 事件（Event）：`{ action: string, payload?: any, clientToken?: string }`
- 响应（Response）：
  - 成功：`{ ok: true, data: any }`
  - 失败：`{ ok: false, error: { code: string, msg: string, details?: any } }`
- 元信息（建议）：列表类接口可在 `data` 内包含 `items` 与 `meta: { total?, hasMore? }`。

## 分页 / 过滤 / 排序 规范细化
- 分页：`page >= 1`，`pageSize in [10,100]`；超界时钳制到边界。
- 过滤（按域约定）：
  - patients：`name` 前缀匹配、`id_card_tail` 精确匹配、`createdAt` 范围。
  - tenancies/services：`patientId` 精确、`date/checkInDate` 范围、`status/type` 枚举。
  - activities：`status` 枚举、`date` 范围；registrations：`activityId|userId` 精确。
- 排序：Object 形式，如 `{ createdAt: -1 }`；方向 `1|-1`；未指定时按推荐索引字段降序。
- 示例：
```json
{
  "filter": { "name": "张", "createdAt": { "from": "2025-01-01", "to": "2025-12-31" } },
  "page": 1,
  "pageSize": 20,
  "sort": { "createdAt": -1 }
}
```

## 幂等 / 重试 / 回退 策略
- 幂等：所有“创建/导出”类接口支持 `clientToken` 幂等去重；同一 token 重复提交返回相同结果。
- 客户端重试建议：
  - 不重试：`E_VALIDATE`、`E_CONFLICT`、`E_PERM`、`E_AUTH`（应引导修正/登录/申请权限）。
  - 可重试：`E_RATE_LIMIT`、`E_DEPENDENCY`、`E_INTERNAL` 使用指数退避（初始 500ms，×2，最大 10s，含 20–30% 抖动，重试 ≤ 3 次）。
  - 轮询：导出任务 `export.status` 每 2–4s；超时则提示稍后再试。
- 回退：
  - 列表失败展示空态与重试按钮；
  - 创建失败保留本地草稿（服务记录/表单）；
  - 关键路径提供“联系我们/反馈”入口并附上 `requestId`。
