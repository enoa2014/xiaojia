# Story: EP-01-S3 档案搜索/筛选
Status: Done

## Story
- As: 社工
- I want: 按姓名前缀、证件尾 4 位与创建时间范围筛选患者档案，并分页查看
- So that: 快速定位目标档案，提升工作效率

## Scope
- In:
  - 列表接口：`patients.list({ page,pageSize, filter:{ name?, id_card_tail?, createdFrom?, createdTo? }, sort? })`
  - 时间范围：`createdFrom/createdTo`（含端点），按 `createdAt` 字段过滤
  - 分页与排序：`createdAt desc` 默认；返回 `meta.total/hasMore`
  - 前端：顶部搜索（姓名前缀/尾 4 位）与时间范围选择，分页/上拉加载
- Out:
  - 高级筛选（角色/诊断级别/在住等，另故事）

## Acceptance Criteria
- AC1 姓名前缀
  - Given 输入“张”
  - When 搜索
  - Then 返回姓名以“张”开头的档案，分页稳定
- AC2 尾 4 位
  - Given 输入“1234”
  - When 搜索
  - Then 按 `id_card_tail=1234` 精确匹配
- AC3 时间范围
  - Given 选择 `createdFrom=2025-09-01` 与 `createdTo=2025-09-06`
  - When 搜索
  - Then 仅返回 `createdAt` 落在区间内的档案
- AC4 分页与排序
  - Given 多页结果
  - When 上拉加载
  - Then 追加下一页；默认 `createdAt desc`
- AC5 返回元信息
  - When 请求
  - Then `data.meta.total/hasMore` 合理；前端据此控制加载
- AC6 错误处理
  - 非法参数 → `E_VALIDATE`；其它 → `E_INTERNAL`，前端提示友好

## UI/UX
- 页面：`pages/patients/index`
- 搜索栏：输入框（姓名或尾 4 位智能识别）、时间范围（起/止日期）
- 交互：搜索/清空；分页与上拉加载；空态/错误态
- A11y：控件≥88rpx；对比度≥4.5:1

## API
- `patients.list({ page,pageSize, filter, sort })`
  - out: `{ ok:true, data:{ items: Patient[], meta:{ total, hasMore } } }`
  - 兼容：前端处理纯数组或上述对象（向后兼容）

## Data
- Patients：`createdAt` 为过滤与排序主键

## Tasks
- FE：
  - 搜索栏与时间范围选择；构建 `filter`；处理 `{ items, meta }` 或数组
  - 分页/上拉加载；空态/错误态；A11y
- BE：
  - `createdFrom/createdTo` 过滤；`meta.total/hasMore` 返回；`E_VALIDATE` 一致化
- QA：
  - 姓名前缀/尾 4 位/时间范围/分页/排序/错误码

## DoR
- [x] 契约与错误码对齐
- [x] 过滤字段确认
- [x] 用例评审

## DoD
- [x] AC 全通过；测试通过；文档更新；A11y 通过

---

## Dev Agent Record
- Agent Model Used: dev (James)
- What Changed:
  - BE：`patients.list` 实现 `createdFrom/createdTo` 过滤与 `meta.total/hasMore` 返回；保留排序与分页
  - FE：`pages/patients/index` 新增起/止日期选择；处理 `{ items, meta }`；分页与空/错态完善
- File List:
  - Modified: `functions/patients/index.ts`
  - Modified: `miniprogram/pages/patients/index.{js,wxml,wxss}`

## Change Log
- v0.1 起草故事（SM）
- v0.2 实现后端时间过滤与 meta；前端时间筛选与兼容响应（Dev）
- v0.3 QA 回归 PASS；标记 Done（2025-09-06）

---

## QA Results
- Reviewer: Quinn（QA）
- Gate Decision: PASS
- Summary: 核心筛选/分页/元信息与错误处理均符合；`patients.list` 已改用 `safeParse` 并在非法参数时返回 `E_VALIDATE`。

Findings by Acceptance Criteria
- AC1 姓名前缀：PASS（`name` 前缀不区分大小写）
- AC2 尾 4 位：PASS（`id_card_tail` 精确匹配）
- AC3 时间范围：PASS（`createdFrom/createdTo` → `createdAt` gte/lte）
- AC4 分页与排序：PASS（`createdAt desc` 默认，分页稳定）
- AC5 返回元信息：PASS（`meta.total/hasMore` 返回并被前端消费）
- AC6 错误处理：PASS（非法参数 → `E_VALIDATE`；其它异常 → `E_INTERNAL`，前端提示友好）
