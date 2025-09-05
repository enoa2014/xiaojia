## 3. 数据模型（云数据库 · 关键集合与索引）

字段名可按现有数据清洗脚本对齐；以下为最小必需集。

**Patients**
- `name` `id_card[unique]` `phone(masked)` `diagnosis(level)` `family.economicLevel`
- 索引：`id_card` 唯一；`name+id_card_tail` 组合查询；`createdAt` 倒序。

**Tenancies**
- `patientId` `checkInDate` `checkOutDate?` `room` `bed` `subsidy`
- 索引：`patientId+checkInDate(desc)`；`room+bed+checkInDate` 冲突检测（后续开启）。

**Services**
- `patientId` `type`(`visit|psych|goods|referral|followup`) `date` `desc` `images[]` `status(review|rejected|approved)` `createdBy`
- 索引：`createdBy+date(desc)`；`patientId+date(desc)`；`status` 过滤。

**Activities / Registrations**
- 活动：`title` `date` `location` `capacity` `status(open|closed|ongoing|done)`
- 报名：`activityId` `userId` `status(registered|waitlist|cancelled)` `checkedInAt?`
- 索引：`activityId+status`；`userId+date(desc)`。

**PermissionRequests**
- `requesterId` `fields[]` `patientId?` `reason` `status(pending|approved|rejected)` `expiresAt`

**Stats / ExportTasks / AuditLogs**
- 聚合月/年指标；导出任务状态与 `downloadUrl(expiresAt)`；操作审计流水。

