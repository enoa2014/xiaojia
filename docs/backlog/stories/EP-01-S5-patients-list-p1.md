# Story: EP-01-S5 患者列表页改造（P1：分组/统计/操作/权限）
Status: Draft

## Story
- As: 社工/管理员
- I want: 在列表页按“优先关注/当前在住（按楼栋）/历史档案”分组浏览，并看到统计概览、角色化的快捷操作入口
- So that: 更高效地组织管理在住患者并进行后续服务/沟通

## Design & Specs
- 设计：docs/uiux/xiaojia_patient_design_doc.html（档案列表页章节）
- 实施方案：docs/specs/patients-list-implementation-plan.md（P1 范围）

## Scope
- In:
  - 分组渲染：
    1) ⭐ 优先关注 2) 🏠 当前在住（按楼栋分段头，计数）3) 📚 历史档案
  - 统计概览卡扩展：在住数/本月新增/待完善/总数（至少 3 项）
  - 快速操作：申请详情/联系家属/编辑信息/入住管理（按角色可见性）
  - 楼栋筛选（可选）：在“当前在住”组内按楼栋快速过滤
- Out:
  - P0 已实现的真实筛选与项字段（S4）

## Acceptance Criteria
- AC1 分组顺序
  - Given 任一数据集
  - When 渲染
  - Then 分组按“优先关注→当前在住（楼栋段）→历史”顺序显示
- AC2 楼栋段头
  - Given 当前在住患者存在多个楼栋
  - When 渲染分组
  - Then 每段显示“{楼栋}号楼 ({count})”，count 与接口聚合一致
- AC3 统计概览
  - Given 进入列表页
  - When 加载概览
  - Then 展示在住数/本月新增/总数等指标；空数据有占位
- AC4 快速操作与权限
  - Given 角色=admin/social_worker
  - When 查看列表项
  - Then 显示“编辑信息/入住管理/申请详情/联系家属”；志愿者仅显示“申请详情”；家长隐藏管理项
- AC5 性能
  - When 分组与统计同时存在
  - Then 列表滚动与加载平滑；P95 ≤ 1.5s
- AC6 埋点
  - When 查看概览/点击操作按钮
  - Then 产生 `patients_stats_view`/`patient_action_click` 事件，参数包括 role/action/id

## UI/UX
- 页面：`miniprogram/pages/patients/index`
- 分组结构：组头 Banner + 组内列表（分页策略：各组各自分页或汇总分页，推荐汇总分页 + 组头信息来自聚合接口）
- 统计：顶部卡片区域，简洁不喧宾夺主

## API & Contract
- `patients.groupCounts({ scope:'inhouse' })`
  - out: `{ items: [{ building: string; count: number }] }`
- （可选）扩展 `stats.homeSummary` 返回 patients 概览：在住数/本月新增/总数
- `patients.list`（沿用 S4），用于加载各组项；inhouse/history 通过多次请求或统一请求+前端归类（以分页一致性为准）

## Data
- Tenancies：当前未退住记录驱动在住分组与楼栋；
- Patients：创建时间驱动“本月新增”；

## Tasks
- FE：
  - [ ] 渲染分组顺序与楼栋段头；
  - [ ] 扩展统计概览卡；
  - [ ] 快速操作入口 + 角色可见性；
  - [ ] 埋点：stats_view / action_click
- BE：
  - [ ] `patients.groupCounts(scope)`；
  - [ ]（可选）扩展 `stats.homeSummary` 的 patients 概览字段
- QA：
  - [ ] 分组计数与项数量一致性；
  - [ ] 角色可见性用例；
  - [ ] 性能回归；
  - [ ] 埋点事件与参数

## DoR
- [x] 楼栋映射/计数口径明确（约定基于 room 前缀或 building 字段）
- [x] 统计指标口径明确（在住数/本月新增/总数）

## DoD
- [ ] AC 全通过；
- [ ] 文档/契约/测试计划同步；
- [ ] 性能达标；

---

## Dev Notes
- 分页与分组一致性优先：段头使用聚合计数，但项分页仍以统一列表为准，避免多源分页复杂度。

