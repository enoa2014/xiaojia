# Story: EP-00-S2 观测与告警（Observability & Alerts）
Status: In Progress

## Story
- As: 架构/运维
- I want: 为关键云函数与任务建立指标与告警
- So that: 及时发现故障与退化

## Scope
- In：
  - 指标：函数错误率、P95 延迟、导出失败率、权限审批 SLA；
  - 告警：阈值触发通知到运维群（含 requestId 抽样）；
  - 日志：入口打印 `requestId/uid/action`；错误堆栈抽样入库；
  - 文档：`architecture/09-observability.md` 更新；操作 Runbook。
- Out：外部 APM 深度集成（后续）。

### 平台与指标来源（Metrics Source）
- 平台：基于 TCB 控制台内置指标 + 自定义日志聚合面板（如云函数监控页与自建数据看板）。
- 指标口径：
  - 函数错误率（5 分钟窗口）：`errors / invocations`；
  - P95 延迟（10 分钟窗口）：入口到返回的端到端时间；
  - 导出失败率（10 分钟窗口）：`ExportTasks.status=failed / total`；
  - 审批 SLA：`permissions.request.submit → approve/reject` 的中位/95 分位耗时。

### 告警阈值与静默（Thresholds & Silence）
- 建议阈值：
  - 错误率 > 2% 持续 5 分钟；
  - P95 延迟 > 800ms 持续 10 分钟；
  - 导出失败率 > 3% 持续 10 分钟；
  - 审批 SLA P95 > 2 天。
- 静默与合并：相同维度的告警在 30 分钟内合并，不重复通知；恢复后发送恢复通知。

### 通道与模板（Alert Channels）
- 通道：企业微信/飞书机器人 Webhook。
- 模板（示例）：
```
[ALERT] 指标异常：<指标名>@<环境>
窗口：过去 <N> 分钟，阈值：<条件>
当前值：<数值>，趋势：<up/down>
示例 requestId：<id1>, <id2>, <id3>
相关函数：<patients|services|...>
时间：<ISO>
```

### 演练与 Runbook（Drills & Runbook）
- 演练：通过压测/注入错误脚本制造短时异常，验证触发与恢复流程；记录截图。
- Runbook：定位/缓解/回滚步骤，放置于 `docs/architecture/09-observability.md#alerts`。

## Acceptance Criteria
- AC1 指标面板
  - Given 配置完成
  - Then 可在控制台查看错误率/P95/导出失败率/审批 SLA
- AC2 告警
  - Given 指标超阈值（如错误率>2% 连续5分钟）
  - Then 触发通知到运维群，包含近5条的 requestId 与函数信息
- AC3 追踪
  - Given 线上报错
  - Then 能通过 requestId 串联前后端日志/审计记录

## Tasks
- Ops/BE：
  - [x] T1 指标源与采集：在关键函数写入 `Metrics`（ns/action/ok/duration/requestId/actorId/ts）
  - [ ] T2 面板与阈值配置；通知通道接入（Webhook）
- Docs：
  - [x] T3 更新 `architecture/09-observability.md` 与 Runbook 概要
- QA：
  - [ ] T4 演练触发：制造错误/延迟/失败样例，验证告警

## 测试用例（建议）
- 错误率告警：制造 5 分钟内 5% 错误；产生与恢复通知。
- P95 告警：注入延迟使 P95 > 800ms 10 分钟；产生与恢复通知。
- 导出失败率：模拟导出失败触发 >3% 告警；修复后恢复。
- 审批 SLA：构造长时审批样本并验证阈值告警（仅在预演环境）。

## References
- 观测：`docs/architecture/09-observability.md#alerts`

## Dependencies
- EP-06-S2 审计、前端 requestId 贯穿

## Risks
- 告警噪声 → 阈值与静默策略；异常聚合

## DoR
- [x] 指标与阈值清单明确

## DoD
- [ ] 面板与告警可用；文档与演练完成

---

## Dev Agent Record

### Agent Model Used
dev (James)

### Tasks / Subtasks Checkboxes
- [x] 在 `functions/stats` 与 `functions/exports` 关键 action 写入 `Metrics`
- [x] 文档更新 `docs/architecture/09-observability.md`（MVP 实施与 Runbook 概要）
- [ ] 配置 TCB 控制台自定义面板与告警阈值；对接通知通道（待运维）
- [ ] QA 演练：错误率/P95/导出失败率

### Debug Log References
- Updated `functions/stats/index.ts`：在 `monthly|yearly|counts|homeSummary` 记录 `Metrics`
- Updated `functions/exports/index.ts`：在 `status|cronCleanup` 记录 `Metrics`，并已有 `AuditLogs`

### Completion Notes List
- 最小可用：可在 `Metrics` 集合与 TCB 控制台中搭建面板，后续接入告警通道

### File List
- Modified: `functions/stats/index.ts`
- Modified: `functions/exports/index.ts`
- Modified: `docs/architecture/09-observability.md`

### Status
Ready for Review
