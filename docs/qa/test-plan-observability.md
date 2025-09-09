# 测试计划：观测与告警（Observability）

## 目标
验证 Metrics/Alerts 指标与告警最小实现（MVP）按阈值生效，定时任务可用，审计链条完整（含 requestId）。

## 范围
- functions/stats：monthly/yearly/counts/homeSummary 指标落库
- functions/exports：status/cronCleanup 指标落库
- functions/observability：cronCheck/ initCollections 行为

## 前置条件
- 已部署：stats / exports / observability
- ENV：`cloud1-3grb87gwaba26b64`
- 集合：`Metrics`、`Alerts` 存在（若无通过 `observability.initCollections` 初始化）

## 用例
1. Metrics 写入（stats.monthly）
   - 调用 `stats.monthly`（前端/控制台均可）
   - 期望：`Metrics` 新增 `ns='stats', action='monthly', ok=true, duration, ts` 记录
2. Metrics 写入（exports.status）
   - 创建导出任务→查询 status
   - 期望：`Metrics` 新增 `ns='exports', action='status', ok=true`
3. Alerts 触发（错误率）
   - 构造错误样本（可临时修改入参触发 `E_VALIDATE`）反复调用 50+ 次
   - 触发 `observability.cronCheck`
   - 期望：`Alerts` 新增 `type='error_rate'` 记录
4. Alerts 触发（P95）
   - 构造延迟样本（可在本地注入 `sleep`）
   - 触发 `cronCheck`
   - 期望：`Alerts` 新增 `type='latency_p95'`
5. 导出失败率
   - 在 `ExportTasks` 人工插入若干 `failed` 记录
   - 触发 `cronCheck`
   - 期望：`Alerts` 新增 `type='export_fail_rate'`
6. 审批 SLA
   - 插入超过 SLA 的 `PermissionRequests(status='pending')`
   - 触发 `cronCheck`
   - 期望：`Alerts` 新增 `type='approval_sla_breach'`

## 自动化（可选）
- 新建脚本统计近窗错误率并调用 `observability.cronCheck`，断言 Alerts 计数 > 0。

## 通过标准
- 所有关键路径写入 `Metrics`
- `cronCheck` 可执行并按阈值写入 `Alerts`
- 面板（或数据导出）可汇总错误率/P95/失败率

