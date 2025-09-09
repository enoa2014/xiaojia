## 9. 观测与稳定性

- 日志：函数入口打印 `requestId`/`uid`/`action`；错误堆栈入库抽样。
- 指标：函数错误率、P95 延迟、导出任务失败率、权限申请 SLA。
- 告警：连续错误阈值/导出失败阈值触发通知到运维群。

### 最小可用实现（MVP）
- 指标采集：后端在关键函数写入 `Metrics` 集合（namespace: `stats`/`exports`）
  - 字段：`ns, action, ok, duration, requestId, actorId, ts, scope?`
  - 覆盖：`stats.monthly|yearly|counts|homeSummary`、`exports.status|cronCleanup`
- 审计对齐：导出与权限等动作继续写入 `AuditLogs`（便于追溯 requestId）
- 面板建议：
  - 错误率：`ok=false` / 总；窗口 5 分钟
  - P95 延迟：按 `ns+action` 聚合 duration P95；窗口 10 分钟
  - 导出失败率：`ExportTasks.status=failed` / 总；窗口 10 分钟
- 告警阈值建议：
  - 错误率 > 2%（5 分钟）；P95 > 800ms（10 分钟）；导出失败率 > 3%（10 分钟）
- 通知：对接企业微信/飞书机器人 Webhook（后续接入）；消息模板见 Story 文档

### Runbook（概要）
1. 从面板确认异常维度与时间窗口
2. 通过 `Metrics`/`AuditLogs` 抽样 requestId 与函数 action
3. 到云函数日志检索对应 requestId；定位模块与代码路径
4. 短期缓解：降级/限流/重试；中期优化：索引/聚合方式
5. 恢复后关闭告警并记录 Postmortem
