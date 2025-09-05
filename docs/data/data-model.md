# 数据模型蓝图（Data Model）

目标：定义核心实体、关系、约束与索引，指导实现与测试。配套：`data-dictionary.md`（字段级）与 `indexes.schema.json`（索引模板）。

## 1. 实体与关系（ER 概览）
```
Patient 1 ── N Tenancy
Patient 1 ── N Service
Activity 1 ── N Registration
User    1 ── N Service (createdBy)
User    1 ── N PermissionRequest (requesterId)
(系统) 1 ── N ExportTask / AuditLog / Stats
```

## 2. 实体说明
- Patients：患者与家庭档案（`id_card` 唯一；`id_card_tail` 便于检索）。
- Tenancies：入住记录（可多次）；在住：`checkOutDate` 为空。
- Services：服务记录（`type`；`status: review|approved|rejected`；图片可选）。
- Activities：活动；Registrations：报名（`registered|waitlist|cancelled`、`checkedInAt?`）。
- PermissionRequests：字段级权限申请（字段清单、reason、TTL）。
- ExportTasks：导出任务（异步）；Stats：聚合指标；AuditLogs：审计流水。
- Users：用户资料与角色（最小集，按平台接入）。

## 3. 关系与约束
- Patients.id_card 唯一；编辑变更需审批与审计。
- Tenancies：`patientId` 关联 Patients；`checkOutDate >= checkInDate`（若存在）；（后续）`room+bed+checkInDate` 冲突检测。
- Services：`patientId` 关联 Patients；状态机仅 `review→approved|rejected`；驳回需 reason。
- Registrations：(`activityId`,`userId`) 唯一报名；满员候补；签到幂等。
- PermissionRequests：`requesterId`+`status` 索引；到期自动回收；明文读取写审计。

## 4. 索引建议（摘要）
- Patients：`id_card`(unique)，`name+id_card_tail`，`createdAt(desc)`。
- Tenancies：`patientId+checkInDate(desc)`；（可选）`id_card+checkInDate(desc)`。
- Services：`createdBy+date(desc)`、`patientId+date(desc)`、`status`。
- Activities：`status+date`；Registrations：`activityId+status`、`userId+date(desc)`。

## 5. 生命周期与不变量
- 患者：创建→（可编辑）→归档；身份证不可随意变更。
- 入住：创建→（退住可空）→退住；在住仅 1 条（业务上约束）。
- 服务：创建（`review`）→审核通过或驳回。
- 报名：报名→取消或候补→签到（一次）。
- 权限：申请→审批通过（TTL）或拒绝→到期回收。

## 6. 示例（简化文档）
- Patient
```json
{ "_id":"p1","name":"张三","id_card":"1101...1234","id_card_tail":"1234","createdAt":1693900000000 }
```
- Tenancy
```json
{ "_id":"t1","patientId":"p1","checkInDate":"2025-09-01","checkOutDate":null,"room":null,"bed":null,"createdAt":1693900000000 }
```
- Service
```json
{ "_id":"s1","patientId":"p1","type":"visit","date":"2025-09-05","desc":"入院陪护","images":[],"status":"review","createdBy":"openid","createdAt":1693901000000 }
```
- Registration
```json
{ "_id":"r1","activityId":"a1","userId":"u1","status":"registered","checkedInAt":null }
```
- PermissionRequest
```json
{ "_id":"pr1","requesterId":"u1","patientId":"p1","fields":["id_card","phone"],"reason":"随访需要","status":"approved","expiresAt":1696500000000 }
```

---
配套：`docs/data/data-dictionary.md`、`indexes.schema.json`、`docs/api/contracts.md`。
