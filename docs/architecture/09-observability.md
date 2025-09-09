## 9. 观测与稳定性

- 日志：函数入口打印 `requestId`/`uid`/`action`；错误堆栈入库抽样。
- 指标：函数错误率、P95 延迟、导出任务失败率、权限申请 SLA。
- 告警：连续错误阈值/导出失败阈值触发通知到运维群（先落库，后续接入 webhook）。

### 最小可用实现（MVP）
- 指标采集：后端在关键函数写入 `Metrics` 集合（namespace: `stats`/`exports`）
  - 字段：`ns, action, ok, duration, requestId, actorId, ts, scope?`
  - 覆盖：`stats.monthly|yearly|counts|homeSummary`、`exports.status|cronCleanup`
- 审计对齐：导出与权限等动作继续写入 `AuditLogs`（便于追溯 requestId）
- 面板建议：
  - 错误率：`ok=false` / 总；窗口 5–10 分钟
  - P95 延迟：按 `ns+action` 聚合 duration P95；窗口 10 分钟
  - 导出失败率：`ExportTasks.status=failed` / 总；窗口 10 分钟
- 告警阈值建议：
  - 错误率 > 2%（10 分钟）；P95 > 800ms（10 分钟）；导出失败率 > 3%（10 分钟）
- 通知：对接企业微信/飞书机器人 Webhook（后续接入）；消息模板见 Story 文档

### Observability 云函数（新）
- 名称：`observability`
- 动作：
  - `cronCheck`：
    - 输入：`{ windowMs?: number=600000, errorRate?: number=0.02, p95?: number=800, exportFail?: number=0.03, approvalSlaHours?: number=24 }`
    - 行为：
      - 统计近窗 `Metrics` 的错误率（按 ns）与各 action 的 P95；
      - 统计近窗 `ExportTasks` 的失败率；
      - 计算 `PermissionRequests` 超时未审批数量（> SLA 小时）；
      - 触发条件达标时写入 `Alerts` 集合；
    - 输出：`{ ok:true, data:{ alerts:number, saved:string[] } }`
  - `initCollections`：一次性初始化/补齐集合（用于新环境）。
- 触发：定时器（Timer）推荐每 5–10 分钟执行一次，参数 `{"action":"cronCheck"}`。

### Collections 结构
- Metrics（指标样本）
  - 示例：`{ ns:'stats', action:'monthly', ok:true, duration:123, requestId:'...', actorId:'...', ts: 1690000000000, scope:'services' }`
- Alerts（告警记录）
  - 示例：`{ type:'error_rate'|'latency_p95'|'export_fail_rate'|'approval_sla_breach', level:'info'|'warning'|'critical', ...metrics, createdAt, actorId }`

### Runbook（概要）
1. 从面板确认异常维度与时间窗口
2. 通过 `Metrics`/`AuditLogs` 抽样 requestId 与函数 action
3. 到云函数日志检索对应 requestId；定位模块与代码路径
4. 短期缓解：降级/限流/重试；中期优化：索引/聚合方式
5. 恢复后关闭告警并记录 Postmortem
