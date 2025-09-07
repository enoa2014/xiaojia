# Sprint 3 计划（2 周）

- Sprint Goal: 落地统计与导出 MVP（EP-05）+ 观测与告警 + 前端埋点，补齐工程复用一致性，形成可度量与可回溯的闭环。
- Timebox: 10 个工作日（含 1 天缓冲）
- 环境: 单环境部署（ENV_ID=cloud1-3grb87gwaba26b64）

## 范围与故事（3+1）
1. EP-05-S1 统计与导出（MVP）（P0, M）
   - 后端：`stats.monthly|yearly`、`exports.create|status`，审计写入，CRON 清理过期下载，错误阈值告警。
   - 前端：导出入口（按角色可见）、任务创建与状态轮询、下载引导。
2. 观测与告警（Observability）（P1, S）
   - 指标：函数错误率、P95 延迟、导出失败率、权限审批 SLA；
   - 告警：阈值触发到运维群；统一 requestId 贯穿（前端已接入）。
3. 前端埋点接入与校验（P1, S）
   - 事件：`tenancy_create_*`、`tenancy_checkout_*`、`service_submit_*`、`activity_create_*|list_view`、`perm_request_*`、`export_create_*`；
   - 校验：采样检查事件与属性完整性并出具简要报告。
4.（可选）床位冲突强校验策略评审（P2, S）
   - 评估冲突率与后端唯一键/事务方案；如必要，提供开关位与策略说明。

## 排期（Sequencing）
- Week 1: EP-05（接口与导出）→ 前端导出页对接 → 审计与 CRON；
- Week 2: 观测与告警接入 → 埋点联调与采样报告 → 回归与收尾（含可选冲突策略评审）。

依赖：EP-06-S3（RBAC）与 EP-06-S2（审计）已 PASS；共享包基线（core-rbac/core-db/core-utils）已可用。

## 交付物（Deliverables）
- Backend: `stats.monthly|yearly` 聚合接口；`exports.create|status` 及 CRON 清理；审计写入与错误告警。
- Frontend: 导出入口与任务流（仅 `admin|social_worker` 可见）；stats 页与导出页交互完善；埋点事件接入。
- Docs: `architecture/16-exports-queue.md`、`09-observability.md` 更新；`api/contracts.md` 对应章节完善；
- Tests: 统计与导出的单元/集成/E2E；埋点事件存在性与属性采样检查。

## 进度跟踪（Burndown）
- 统计：总 4 (+1 可选) | 已完成 0 | 进行中 0 | 待办 4（初始化）
- 状态明细：
  - [ ] EP-05-S1 月度统计展示（P0, M）
  - [ ] EP-05-S2 导出 Excel（临时链接）（P0, M）
  - [ ] EP-00-S2 观测与告警（P1, S）
  - [ ] EP-00-S3 前端埋点接入与校验（P1, S）
  - [ ]（可选）床位冲突强校验策略评审（P2, S）

## DoR / DoD
- DoR: 契约初稿与权限口径明确；导出与审计口径一致；CRON 与告警通道可用。
- DoD: 接口/页面联调通过；审计/告警生效；埋点采样通过；文档同步；用例通过；可回滚说明。

## Owner 分工（建议）
- Backend: stats 聚合、exports 任务流、审计与 CRON；观测指标与告警
- Frontend: 导出页与入口可见性；埋点接入与校验；stats 页交互完善
- QA: 统计/导出/观测/埋点用例；性能与错误率阈值校验
- PO/架构: 契约/口径对齐、范围控制与风险把关

## 风险与缓解
- 聚合超时 → 分段/预聚合与索引优化；必要时降级策略
- 导出失败率/链接泄露 → 幂等 + 临时链接 + 权限校验 + 审计
- 告警噪声过多 → 阈值与抖动、合并窗口设置

## 任务拆解（摘要）
- EP-05（统计与导出）
  - BE：`stats.monthly|yearly`（分页/分段）；`exports.create|status`（审计 + 幂等）；CRON 清理与失败重试；
  - FE：导出页（任务创建/轮询/下载）；stats 页（趋势与占位）；
  - QA：接口正确性/性能/权限；下载有效期与审计采样；
- Observability（观测与告警）
  - BE：埋点网关/控制台指标；函数错误率/P95；导出失败率；权限审批 SLA；
  - Ops：阈值告警与通知通道；
- Analytics（埋点）
  - FE：按测试计划事件接入；
  - QA：采样校验与报告。

## 变更记录
- v0.1 创建 Sprint 3 计划（纳入 EP-05 + 观测/告警 + 埋点 + 可选冲突策略）。
