# Story: EP-05-S4 统计专项分析接口（入住/活动/服务）
Status: Draft

## Story
- As: 管理员/社工
- I want: 在统计专项分析页面获取摘要与趋势/分布数据（入住/活动/服务）
- So that: 支持运营分析与决策

## Scope
- In:
  - `stats.tenancyAnalysis(action, params)`：`summary` | `occupancy-trend` | `room-utilization` | `stay-duration`
  - `stats.activityAnalysis(action, params)`：`summary` | `participation-trend` | `by-type` | `participants-by-age`
  - `stats.servicesAnalysis(action, params)`：`summary` | `by-type` | `by-worker` | `rating-trend`
  - 时间维度：`{ range: 'month'|'quarter'|'year', month? quarter? year? }`
  - RBAC：管理员/社工可访问
- Out:
  - 高级维度与自定义筛选（后续迭代）

## Acceptance Criteria
- AC1 摘要数据
  - Given 进入任一分析页
  - When 调用 `*Analysis('summary', params)`
  - Then 返回对象含关键指标字段（如 occupancyRate/totalParticipants/avgRating 等）
- AC2 趋势/分布
  - Given 切换时间维度
  - When 调用趋势/分布 action
  - Then 返回数组 `[ { x/date/label, value } ]`；前端图表可渲染
- AC3 权限
  - Given 非授权用户
  - When 调用 `*Analysis`
  - Then 返回 `E_PERM`

## UI/UX
- 复用现有三页视图 `pages/stats/{tenancy-analysis,activity-analysis,services-analysis}`
- 错误提示使用标准映射，空数据友好占位

## API
- BE：在 `functions/stats` 内新增三组 action；先实现最小可用（可返回占位/聚合结果），后续迭代完善
- FE：`api.stats.*Analysis(action, params)` 与现有页面调用保持一致

## Data
- 读表：`Patients` `Tenancies` `Activities` `Registrations` `Services`
- 索引：按查询路径评估与补充（后续）

## Non-Functional
- 性能：单次请求 P95 ≤ 600ms（初版）；必要时分批/缓存
- 正确性：边界值与无数据场景返回空集合而非报错

## Tasks
- BE（L）
  - `functions/stats`：新增 `tenancyAnalysis/activityAnalysis/servicesAnalysis` 三组 action（先占位后完善聚合）
- FE（M）
  - `services/api.js`：增加 `api.stats.*Analysis(action, params)`
  - `pages/stats/*-analysis.js`：对接摘要与趋势/分布；空态/错误
- QA（M）
  - 时间维度切换/月/季/年；角色权限；空数据/大数据抽检

## 验收清单
- [ ] 三分析页能加载摘要与至少一种趋势/分布数据
- [ ] 非授权访问返回 `E_PERM`，页面提示友好
- [ ] 空数据返回空集合并正确渲染为空态

## Dev Agent Record
- Agent Model Used: dev (James)
- What Changed: 新增三组统计分析接口并接入前端

## DoR
- [x] 差距来源：`docs/api/interface-gaps.md`
- [x] 统计首页/基础统计已可用（EP-05-S1）

## DoD（暂定）
- [ ] AC 全通过；
- [ ] 文档与指标字段定义入库；
- [ ] 性能抽测记录。

## 自检清单（Story Draft Checklist）
- [x] Story: As / I want / So that 明确
- [x] Scope: In/Out 明确（三组 *Analysis 动作 + 时间维度）
- [x] Acceptance Criteria: 摘要/趋势/权限场景覆盖
- [x] UI/UX: 复用三页视图；空态/错误提示明确
- [x] API: 三组 action 与参数/返回结构确定
- [x] Data: 读表与索引需求标注
- [x] 校验与安全: RBAC 限定
- [x] Analytics: 可选页面视图与时间维度切换埋点
- [x] NFR: 性能目标与降级（占位/分段）
- [x] Tasks: FE/BE/QA 可执行分解
- [x] Dependencies & Risks: 依赖数据量/索引
- [x] DoR/DoD: 勾选就绪与完成条件
