# 数据字典（集合/字段/索引）

以云开发数据库为准，字段命名使用小驼峰，时间为 ISO 字符串（UTC/本地需注明）。

## Patients
- 字段：
  - `_id: string`（主键）
  - `name: string`
  - `id_card: string`（唯一）
  - `phone?: string(masked)`
  - `diagnosis?: string|enum`
  - `family?: { economicLevel?: string }`
  - `createdAt: string` `updatedAt: string`
- 索引：
  - 唯一：`id_card`
  - 组合：`name + id_card_tail`（查询优化，可选）
  - 排序：`createdAt` 倒序

## Tenancies
- 字段：`patientId` `id_card?` `checkInDate` `checkOutDate?` `room?` `bed?` `subsidy?` `extra?` `createdAt`
- 索引：`patientId+checkInDate(desc)`；`id_card+checkInDate(desc)`（可选）；`room+bed+checkInDate`（冲突检测，可按需启用）

## Services
- 字段：`patientId` `type(visit|psych|goods|referral|followup)` `date` `desc?` `images[]?` `status(review|rejected|approved)` `createdBy`
- 索引：`createdBy+date(desc)`；`patientId+date(desc)`；`status`

## Activities
- 字段：`title` `date` `location` `capacity` `status(open|closed|ongoing|done)` `createdAt`
- 索引：`date(desc)`；`status`

## Registrations
- 字段：`activityId` `userId` `status(registered|waitlist|cancelled)` `checkedInAt?`
- 索引：`activityId+status`；`userId+date(desc)`

## PermissionRequests
- 字段：`requesterId` `fields[]` `patientId?` `reason` `status(pending|approved|rejected)` `expiresAt`
- 索引：`requesterId+status`；`patientId+status`

## Stats / ExportTasks / AuditLogs（简要）
- Stats：聚合月/年指标（按域拆分）
- ExportTasks：`type` `params` `status(pending|running|done|failed)` `downloadUrl?` `expiresAt?`
- AuditLogs：
  - 字段：`actorId: string`、`action: string`、`target: object`、`requestId?: string`、`createdAt: number`、`ip?: string`
  - 索引建议：
    - `createdAt(desc)`（时间范围）
    - `action+createdAt(desc)`（动作查询）
    - `actorId+createdAt(desc)`（操作者查询）

## 枚举与口径
- 服务类型：`visit|psych|goods|referral|followup`
- 权限请求状态：`pending|approved|rejected`
- 活动状态：`open|closed|ongoing|done`

## 变更管理
- 任何字段增删改需：
  1) 更新本数据字典
  2) 更新相关索引/迁移脚本
  3) 在测试计划中新增/调整用例
