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

## 模块与函数（当前实现与MVP目标）

### patients（已实现：list）
- list：分页查询（当前）
  - in（payload）：`{ page?: number>=1, pageSize?: 1..100 }`（默认 1/10）
  - out：`{ ok: true, data: Patient[] }`
  - 备注：暂不支持 filter/sort 与 meta.total；MVP 将补充
- get（MVP）：按 `_id` 查询详情
  - in：`{ id: string }`
  - out：`{ ok: true, data: Patient }`
- create（MVP，幂等）
  - in：`{ patient: { name, id_card, ... } , clientToken }`
  - out：`{ ok: true, data: { _id } }`
  - 规则：`id_card` 唯一；冲突 → `E_CONFLICT`
- update（MVP）
  - in：`{ id: string, patch: Partial<Patient> }`
  - out：`{ ok: true, data: { updated: number } }`

示例（当前 patients.list）
```
// 请求
wx.cloud.callFunction({ name: 'patients', data: { action: 'list', payload: { page: 1, pageSize: 20 } } })
// 响应
{ ok: true, data: [ /* Patient */ ] }
```

### tenancies（回传占位，计划按下列契约实现）
- list：`in { page?, pageSize?, filter:{ patientId?, id_card? }, sort? }` → `out { ok:true, data: Tenancy[] }`
- get：`in { id }` → `out { ok:true, data: Tenancy }`
- create：`in { tenancy: { patientId|id_card, checkInDate, room?, bed?, subsidy?, extra? }, clientToken }` → `out { ok:true, data:{ _id } }`
- update：`in { id, patch }` → `out { ok:true, data:{ updated } }`
- 规则：同日同床位冲突 → `E_CONFLICT`

### services（回传占位，计划按下列契约实现）
- list：`in { page?, pageSize?, filter:{ patientId?, createdBy?, type?, status? }, sort? }` → `out { ok:true, data: Service[] }`
- get：`in { id }` → `out { ok:true, data: Service }`
- create：`in { service:{ patientId, type, date, desc?, images? }, clientToken }` → `out { ok:true, data:{ _id } }`
- review：`in { id, decision:'approved'|'rejected', reason? }` → `out { ok:true, data:{ updated } }`

### activities（当前回显占位），registrations（当前回显占位）
- activities.list/get/create/update（同上规范）
- registrations.list：`in { activityId?, userId?, status? }` → `out { ok:true, data: Registration[] }`
- registrations.register/cancel/checkin（幂等）

### permissions（当前回显占位）
- request.submit：`in { fields:string[], patientId?, reason }` → `out { ok:true, data:{ _id, expiresAt } }`
- request.approve/reject：`in { id, expiresAt? | reason }` → `out { ok:true, data:{ updated } }`
- request.list：按申请人/状态筛选

### stats / exports（当前回显占位）
- stats.monthly / stats.yearly：`in { scope:'patients'|'services'|..., month|year }` → `out { ok:true, data:{ items, meta } }`
- export.create：`in { type, params, clientToken }` → `out { ok:true, data:{ taskId } }`
- export.status：`in { taskId }` → `out { ok:true, data:{ status, downloadUrl?, expiresAt? } }`

### users（当前回显占位）
- me.get：返回当前用户资料与角色
- profile.update：更新基础资料（受权限控制）

### init-db（已实现）
- main：创建缺失集合
  - in：无
  - out：`{ ok:true, data:{ created: string[] } }`

### import-xlsx（已实现）
- fromCos：按 COS 文件导入 b.xlsx
  - in：`{ action:'fromCos', payload:{ fileID: string } }`
  - out：`{ ok:true, data:{ importedPatients: number, importedTenancies: number, rows: number, sheet: string } }`
  - 错误：缺少 fileID → `E_ARG`；不支持的 action → `E_ACTION`

