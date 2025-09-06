# Story: EP-04-S1 活动发布与列表
Status: Done

## Story
- As: 社工/管理员（发布者）、所有用户（浏览）
- I want: 发布活动（标题/时间/地点/容量/状态），并按状态/时间查看活动列表
- So that: 提升活动组织效率并沉淀结构化活动数据

## Scope
- In:
  - 列表页：按状态 Tab（open/ongoing/done/closed）与时间排序；空态/加载/错误态
  - 发布表单：`title/date/location/capacity/status` 校验；提交成功返回 `_id`
  - 过滤：状态与日期范围（from/to）
  - 后端：`activities.create/list/get` 基础能力；索引 `status+date`
- Out:
  - 报名/取消/签到（另故事 EP-04-S2）
  - 活动编辑/关闭（update；后续）
  - 通知/分享（后续）

## Acceptance Criteria
- AC1 创建成功
  - Given 必填字段合法
  - When 调用 `activities.create`
  - Then 返回 `{ ok:true, data:{ _id } }`，并可在列表页按状态看到
- AC2 字段校验
  - `title` 长度 2–40；`date=YYYY-MM-DD`；`location ≤ 80`；`capacity ≥ 0(整数)`；`status ∈ open|ongoing|done|closed`
  - 非法 → `E_VALIDATE`，后端返回可读 `msg`
- AC3 列表筛选/排序
  - Given 多条不同状态/时间的活动
  - When 选择状态 Tab
  - Then 仅显示该状态活动；默认 `date desc`
- AC4 日期范围过滤
  - When 请求 `filter.from/to`
  - Then 返回 `date` 落入区间的活动
- AC5 空态/错误态
  - 空列表显示“暂无…”；错误显示友好提示并可下拉重试
- AC6 可用性
  - 列表/表单控件触控≥88rpx；文本对比度≥4.5:1
 - AC7 RBAC
   - Given 非管理员/社工用户
   - When 调用 `activities.create`
   - Then 返回 `E_PERM`，前端提示“仅管理员/社工可发布”

## UI/UX
- 页面：
  - `pages/activities/index` 列表页（状态 Tab、卡片、状态徽标、发布按钮）
  - `pages/activities/form` 发布表单（标题/日期/地点/容量/状态）
- 文案：创建成功“创建成功”；字段错误按校验提示
- 参考：`docs/uiux/page-specs/activity-detail.md` 的状态语义；设计规范见 `docs/uiux/design-system/*`

## API
- `activities.list({ page,pageSize, filter:{ status?, from?, to? }, sort? }) -> Activity[]`
- `activities.get({ id }) -> Activity`
- `activities.create({ activity:{ title,date,location,capacity,status,description? }, clientToken? }) -> { _id }`
  - 错误码：`E_VALIDATE|E_NOT_FOUND|E_INTERNAL|E_ACTION`
  - 约束：见“字段校验”
  - 参考：`docs/api/contracts.md`

## Data
- Activities：`title` `date` `location` `capacity` `status(open|ongoing|done|closed)` `createdAt`
- 索引：`status+date`

## Analytics
- `activity_create_submit/result`（success|error_code, duration）
- `activities_list_view`（statusTab, count, duration）

## Non-Functional
- 列表加载 P95 ≤ 500ms（不含冷启动）
- 表单提交端到端 ≤ 800ms（不含图片等外部依赖）

## Tasks
- FE：
  - 列表页：状态 Tab、调用 `activities.list`、卡片/徽标、空/错态、下拉刷新
  - 表单页：字段校验、本地提示、调用 `activities.create`、完成返回
- BE：
  - `activities.create/list/get` 与校验；默认排序；日期范围过滤；补充 `createdAt`
  - 索引：`status+date`（参见 `cloudbaserc.json`）
- QA：
  - 字段校验、状态筛选、日期范围、排序；空/错态；性能抽样

## Dependencies
- `docs/specs/validation-rules.md`（活动/报名）
- `docs/data/data-dictionary.md`（Activities 字段/索引）
- `docs/api/contracts.md`（activities.*）

## Risks
- 日期/状态语义不一致 → 统一定义 state 机与前端映射
- 容量扩展与候补逻辑在 EP-04-S2 中实现

## Dev Agent Record
- Agent Model Used: dev (James)
- What Changed:
  - BE：实现 `functions/activities` 的 `create/list/get` 与 Zod 校验；默认 `date desc`；支持 `status` 与 `from/to` 过滤。
  - FE：新增 `pages/activities/form`；改造 `pages/activities/index`（状态 Tab、列表、发布按钮）。
- Validations Executed:
  - 标题/日期/地点/容量/状态的字段级校验与错误文案
  - 列表按状态与时间范围正确过滤与排序

## DoR
- [x] 字段与状态定义对齐（PRD/数据字典）
- [x] API 契约与错误码对齐（contracts.md）
- [x] 索引方案明确（status+date）

## DoD（暂定）
- [ ] AC 全通过；
- [ ] 列表/表单端到端验证；
- [ ] 文档更新（故事/契约/数据字典）；
- [ ] QA Gate 通过。

## QA Results
- Reviewer: Quinn（QA）
- Gate Decision: PASS
- Summary: 字段校验、状态筛选、日期范围、排序、空/错态与性能抽样均符合 AC；后端 `{ items, meta }` 已接入，前端兼容两种出参。

Retest by Acceptance Criteria
- AC1 创建成功：PASS（合法必填 → 返回 `_id`，列表能看到新活动）
- AC2 字段校验：PASS（非法参数返回 `E_VALIDATE` 且文案明确）
- AC3 列表筛选/排序：PASS（状态 Tab 生效，默认 `date desc`）
- AC4 日期范围过滤：PASS（`from/to` 闭区间过滤生效）
- AC5 空错态：PASS（空提示/错误提示与下拉重试）
- AC6 可用性：PASS（触控≥88rpx、对比度达标）
