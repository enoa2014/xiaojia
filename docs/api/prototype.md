# API Prototype（示例原型与样例）

目标：为主要 action 提供请求/响应样例与调用片段，便于前端联调与 Mock。配套：`docs/api/contracts.md`（正式契约）、`docs/api/error-codes.md`、`docs/api/quick-reference.md`。

## 1. 统一事件/响应包
- 事件：`{ action: string, payload?: any, clientToken?: string }`
- 成功：`{ ok: true, data: any }`
- 失败：`{ ok: false, error: { code: string, msg: string, details?: any } }`

## 2. Patients
- list
```json
{
  "action": "list",
  "payload": { "page": 1, "pageSize": 20 }
}
```
响应：`{ "ok": true, "data": [ {"_id":"p1","name":"张三","id_card_tail":"1234"} ] }`

- create
```json
{
  "action": "create",
  "payload": {
    "patient": { "name": "张三", "id_card": "1101...1234", "phone": "13800000000" },
    "clientToken": "pt-16939-001"
  }
}
```
冲突：`{ "ok": false, "error": { "code": "E_CONFLICT", "msg": "身份证已存在，请搜索后编辑" } }`

## 3. Tenancies
- create
```json
{
  "action": "create",
  "payload": {
    "tenancy": { "patientId": "p1", "checkInDate": "2025-09-05" },
    "clientToken": "tn-16939-001"
  }
}
```
成功：`{ "ok": true, "data": { "_id": "t1" } }`

## 4. Services
- create
```json
{
  "action": "create",
  "payload": {
    "service": { "patientId": "p1", "type": "visit", "date": "2025-09-05", "desc": "随访" },
    "clientToken": "sv-16939-001"
  }
}
```
- review
```json
{ "action": "review", "payload": { "id": "s1", "decision": "approved" } }
```

## 5. Activities / Registrations
- activities.create
```json
{ "action": "create", "payload": { "activity": { "title": "亲子手工", "date": "2025-09-09", "capacity": 20, "status": "open" } } }
```
- registrations.register
```json
{ "action": "register", "payload": { "activityId": "a1" } }
```
满员候补：`{ "ok": true, "data": { "status": "waitlist" } }` 或 `E_CONFLICT` + 说明。

## 6. Permissions
- request.submit
```json
{ "action": "request.submit", "payload": { "fields": ["id_card","phone"], "patientId": "p1", "reason": "跟进需要" } }
```

## 7. Stats / ExportTasks
- stats.monthly
```json
{ "action": "monthly", "payload": { "month": "2025-09", "scope": "services" } }
```
- export.create（统计报表）
```json
{ "action": "create", "payload": { "type": "statsMonthly", "params": { "month": "2025-09" }, "clientToken": "ex-16939-001" } }
```
- export.status
```json
{ "action": "status", "payload": { "taskId": "task-001" } }
```

## 8. 前端调用片段
```js
import { callWithRetry } from "miniprogram/services/api"
// Patients list
const items = await callWithRetry('patients','list',{ page:1, pageSize:20 })
// Create service
await callWithRetry('services','create',{ service:{ patientId:id, type:'visit', date:'2025-09-05' }, clientToken:`sv-${Date.now()}` })
```

## 9. Mock 与集合
- 推荐：将本页样例收录为 Postman/Thunder Client 集合，便于前端离线开发与演示。
- 列表建议：patients.list/get/create/update、tenancies.create/list、services.create/review/list、activities.create、registrations.register/cancel/checkin、permissions.request.submit/list、stats.monthly/yearly、export.create/status。
