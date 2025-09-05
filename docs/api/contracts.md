# API 契约（云函数调用约定）

面向微信云开发（TCB）云函数，统一入参/出参、分页/过滤/排序、错误码与幂等策略。本文件列出契约模板与模块清单，供各函数填充。

## 通用约定
- 调用：`wx.cloud.callFunction({ name, data })`
- 入参包：`{ action?: string, payload?: any, clientToken?: string, page?: { num: number, size: number }, filter?: object, sort?: object }`
- 出参包：`{ code: 0 | string, data?: any, message?: string, requestId?: string, meta?: any }`
- 分页：`page.num >= 1`，`page.size ∈ [10, 100]`，返回 `meta.total/meta.hasMore`
- 过滤/排序：字段名与数据字典一致；排序 `{ createdAt: -1 }`
- 幂等：可重复提交接口必须传 `clientToken` 去重（如记录创建/导出任务）
- 审计：敏感读写与审批类操作记录至 `AuditLogs`

## 错误处理
- 成功：`code = 0`
- 失败：`code ∈ { E_AUTH, E_PERM, E_VALIDATE, E_NOT_FOUND, E_CONFLICT, E_RATE_LIMIT, E_DEPENDENCY, E_INTERNAL }`
- 前端处理建议见《error-codes.md》

## 模块与函数模板

> 填写规范：请为每个函数补全入参/出参字段表与示例。

### patients
- list：分页查询
  - in：`{ page, filter: { name?, id_card_tail? }, sort }`
  - out：`{ items: Patient[], meta }`
- get：按 id 查询
- create：创建（幂等）
- update：编辑

### tenancies
- list/get/create/update（冲突检测留作扩展）

### services
- list/get/create/review（状态：review|rejected|approved）

### activities / registrations
- activities.list/get/create/update
- registrations.list/register/cancel/checkin

### permissions
- request.submit/approve/reject/list

### stats / exports
- stats.monthly / yearly
- export.create/status

### users
- me.get / profile.update

## 示例（patients.list）
请求：
```
{ "filter": { "name": "张", "id_card_tail": "1234" }, "page": { "num": 1, "size": 20 }, "sort": { "createdAt": -1 } }
```
响应：
```
{ "code": 0, "data": { "items": [/* Patient */], "meta": { "total": 245, "hasMore": true } } }
```

