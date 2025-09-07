# Story: EP-05-S1 月度统计展示（Stats Monthly）
Status: Planned

## Story
- As: 管理员/社工
- I want: 查看某月关键指标与趋势
- So that: 评估服务成效并支撑汇报

## Scope
- In:
  - 后端：`stats.monthly({ scope, month })` 返回指定 scope 的按日聚合与当月汇总（items+meta）。
  - 前端：统计页展示折线/柱状（按 UI 占位），空态/错误态与刷新。
  - 权限：仅 `admin|social_worker` 可用；拒绝 `E_PERM`。
- Out：复杂维度透视与自定义报表（后续）。

### 实施细节（Implementation Details）
- 时区与日期口径：按本地时区 UTC+8（Asia/Shanghai）聚合；`month` 为 `YYYY-MM`，包含该月的起止闭区间。
- 零补策略（zero-fill）：当月无数据的日期需补 `{ date, value: 0 }` 以便前端绘图连续。
- 聚合字段：
  - services scope 示例：按 `Services.date` 或 `createdAt` 的天粒度计数；按需指定字段，保持契约一致。
  - patients/activities 类似处理（按集合内日期字段或 `createdAt`）。
- 索引：确保相关集合具备 `date/createdAt` 范围索引（见 `docs/architecture/14-db-indexes.md`）。

## Acceptance Criteria
- AC1 基础指标
  - Given 调用 `stats.monthly({ scope:'services', month:'YYYY-MM' })`
  - Then 返回 `{ items:[{ date:'YYYY-MM-DD', value:number }...], meta:{ total:number, hasMore:boolean } }`
- AC2 权限控制
  - Given 角色=志愿者
  - Then 返回 `E_PERM`；前端入口不可见
- AC3 空态与错误
  - Given 当月无数据
  - Then 前端展示空态与“暂无数据”；错误 `E_INTERNAL` 显示友好文案与重试
- AC4 性能
  - 后端 P95 ≤ 500ms；接口有组合索引支撑（按日期范围）

## UI/UX
- 页面：`pages/stats/index`（已有）展示当月趋势；空态/错误态与刷新

## API（契约）
- `stats.monthly({ scope:'patients'|'services'|'activities'|..., month:'YYYY-MM' })`
  - out: `{ ok:true, data:{ items:[{ date, value }], meta:{ total, hasMore } } } | { ok:false, error }`
  - RBAC：`admin|social_worker`

### 示例 I/O（Samples）
请求：
```json
{ "action": "monthly", "payload": { "scope": "services", "month": "2025-09" } }
```
响应：
```json
{
  "ok": true,
  "data": {
    "items": [
      { "date": "2025-09-01", "value": 12 },
      { "date": "2025-09-02", "value": 8 }
      // ... 至 2025-09-30，缺失日期按 0 补齐
    ],
    "meta": { "total": 30, "hasMore": false }
  }
}
```

## Data
- 索引建议：按集合 + `createdAt`/`date` 范围组合索引

## Analytics
- 埋点：`stats_view_monthly`（{ scope, month, duration }）

## Non-Functional
- P95 ≤ 500ms；错误可追踪（requestId）

## Tasks
- BE：
  - T1 实现 `stats.monthly`（分段/分页聚合，返回 items+meta）
  - T2 RBAC：仅 `admin|social_worker`；错误 `E_PERM`
- FE：
  - T3 统计页：调用并绘制折线/柱状；空态/错误态
- QA：
  - T4 正确性/权限/性能用例

## 测试用例（建议）
- 月内边界：`month='2025-09'` 返回 30 条；9/1 与 9/30 均包含。
- 零补：当月无记录时，items 仍返回每日日条目且 value=0。
- 权限：`volunteer` 调用返回 `E_PERM`；前端入口不可见。
- 性能：样本量 ≥10k 条时 P95 ≤ 500ms；必要时分页/分段聚合。
- 错误处理：非法 `month`/未知 `scope` 返回 `E_VALIDATE`。

## References
- 契约：`docs/api/contracts.md#stats`（或 `#stats-monthly`）
- 指标与观测：`docs/architecture/09-observability.md#stats`

## Dependencies
- `docs/architecture/16-exports-queue.md`（统计口径参考）
- `docs/api/contracts.md`（stats 契约）

## Risks
- 聚合超时 → 分段/预聚合；必要时降级为采样

## DoR
- [x] 统计口径初稿与权限口径明确

## DoD
- [x] 接口可用；前端展示；用例通过；文档同步（QA 回归待补）

---

## Dev Agent Record

### Agent Model Used
dev (James)

### Tasks / Subtasks Checkboxes
- [x] T1 实现 `stats.monthly`（返回 items+meta；UTC+8；零补策略）
- [x] T2 RBAC：仅 `admin|social_worker`；未授权 `E_PERM`
- [x] T3 统计页对接：调用并展示列表（占位），空态/错误态
- [ ] T4 QA：正确性/权限/性能用例（待 QA 完成）

### Debug Log References
- Implemented `functions/stats/index.ts` action `monthly`（按日计数：services/activities 用 `date` 字段；patients 用 `createdAt` 区间）
- Added `api.stats.monthly(scope, month)`；`pages/stats/index` 拉取并展示列表占位
- Added trend summary（total/avg/max/min）on stats page；接入埋点 `stats_view_monthly`（含 requestId, scope, month, duration, code?）

### Completion Notes List
- 后端：`stats.monthly` 支持 `scope ∈ services|activities|patients`，month=YYYY-MM；返回 `{ items, meta }`
- 权限：仅 `admin|social_worker`；其余 `E_PERM`
- 前端：统计页加入调用与列表展示、空态与错误提示；新增趋势摘要；接入埋点

### File List
- Modified: `functions/stats/index.ts`
- Modified: `miniprogram/services/api.js`
- Modified: `miniprogram/pages/stats/index.{js,wxml,wxss}`

### Change Log
- feat(stats): add monthly aggregation endpoint with RBAC and zero-fill
- feat(miniprogram): wire stats.monthly on stats page with basic list view

### Status
Ready for Review

## QA Results
- Gate: CONCERNS
- Reviewer: Quinn（QA/Test Architect）
- Summary: 后端 `stats.monthly` 与前端列表占位已联通，RBAC 拒绝口径一致；趋势展示与埋点未接，性能验证未执行，建议补齐后标记 PASS。

Findings by Acceptance Criteria
- AC1 基础指标：PASS
  - 返回 `{ items:[{date,value}], meta }`；缺日零补与范围口径符合实现细节。
- AC2 权限控制：PASS
  - 非 `admin|social_worker` 返回 `E_PERM`；前端映射友好。
- AC3 空态与错误：PASS（条件）
  - 空态与错误态已展示；建议补重试/刷新入口与埋点 `stats_view_monthly`。
- AC4 性能：CONCERNS
  - 目前按日逐次 count（~30 次查询/每月），建议在 10k+ 样本下抽样测 P95；必要时分段/预聚合。

Recommendations
- R1（UI）趋势展示：接入轻量图表组件渲染折线/柱状；或提供趋势摘要（最大/最小/均值）。
- R2（埋点）接入 `stats_view_monthly`（{ scope, month, duration }）。
- R3（性能）样本≥10k 条压测 P95；如需优化，采用聚合或预聚合缓存。

Gate Decision
- Status: CONCERNS
- Rationale: 功能联通且 RBAC/空态达标，但趋势渲染与性能验证未落实；补齐后可 PASS。
