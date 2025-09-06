# Story: EP-02-S2 退住登记与排序（Tenancy Checkout）
Status: Done

## Story
- As: 社工
- I want: 为未退住的入住记录补录退住日期（checkout）
- So that: 完成入住台账闭环，并在详情页正确显示“在住/已退住”状态

## Scope
- In: 
  - 从“档案详情/入住记录”进入退住页面，选择退住日期并提交
  - 仅允许对“未退住”的最近入住记录进行退住登记
  - 详情页“在住”状态随退住变更
  - 列表排序维持 `checkInDate desc`
- Out:
  - 历史记录更正（更改 checkInDate）
  - 床位冲突与占用统计（另迭代）
  - 批量退住/导入校正

## Acceptance Criteria
- AC1 成功退住
  - Given 存在某患者最近一次“未退住”的入住记录（`checkOutDate` 为空），且选择的 `checkOutDate >= checkInDate`
  - When 点击“提交退住”
  - Then 返回 `{ ok:true, data:{ updated: 1 } }`，Toast“退住已登记”，返回上一页；该记录持久化 `checkOutDate`

- AC2 日期校验
  - Given 选择了 `checkOutDate < checkInDate`
  - When 提交
  - Then 返回 `E_VALIDATE`，前端内联错误“退住日期不能早于入住日期”

- AC3 已退住保护
  - Given 目标记录已存在 `checkOutDate`
  - When 重复提交退住
  - Then 返回 `E_CONFLICT`，文案“当前记录已退住”

- AC4 详情“在住”状态更新
  - Given 某患者存在“在住”状态
  - When 成功退住该最近记录
  - Then 返回患者详情页，显示状态“—”（非在住）

- AC5 列表与排序
  - Given 退住登记完成
  - When 返回入住列表
  - Then 列表仍按 `checkInDate desc` 排序；已退住记录状态为“已退住”，在住记录标识正确

- AC6 体验与 A11y
  - 提交按钮 Loading；错误内联 + Toast 简明
  - 触控≥88×88rpx；对比度≥4.5:1

## UI/UX
- 页面：`pages/tenancies/checkout`（从“档案详情/入住记录”或“操作”进入）
- 字段：
  - `tenancyId`（必填，目标入住记录 ID）
  - `checkOutDate`（必填，ISO）
- 交互：日期选择器；成功回退并刷新；错误定位
- 红线：与 `tenancies/form` 一致风格，按钮文案为“提交退住”

## API
- `tenancies.update({ id, patch:{ checkOutDate } })`
  - 返回：`{ ok:true, data:{ updated } }` | `{ ok:false, error }`
  - 错误码：`E_VALIDATE`（日期关系）、`E_CONFLICT`（已退住记录重复退住）、`E_NOT_FOUND`
- 查询：`tenancies.list({ page, pageSize, filter:{ patientId }, sort:{ checkInDate:-1 } })`

### 后端保护逻辑（必须）
1) 读取目标记录：`doc = Tenancies.findById(id)`；不存在 → `E_NOT_FOUND`
2) 日期关系校验：`patch.checkOutDate >= doc.checkInDate`；否则 → `E_VALIDATE`
3) 最近记录保护：只允许“最近一次未退住”的记录退住
   - 定义：同一 `patientId`（若缺则用 `id_card`）下，`checkOutDate` 为空的记录中按 `checkInDate desc` 的第一条
   - 若 `id != latestOpen._id` → `E_CONFLICT`（文案：仅允许最近未退住记录退住）
4) 并发保护：使用条件更新/事务确保幂等
   - 更新条件：`where _id=id && checkOutDate == null`
   - 若条件不满足（已被并发退住）→ 返回 `E_CONFLICT`
5) 成功更新：`{ ok:true, data:{ updated: 1 } }`

## Data
- Tenancies：`checkOutDate` 不为空视为已退住；按 `patientId+checkInDate(desc)` 查询
- 索引：沿用 `patientId+checkInDate(desc)`

## Analytics（埋点）
- `tenancy_checkout_submit`：{ requestId, tenancyId }
- `tenancy_checkout_result`：{ requestId, duration, code }

## Non-Functional
- 性能：后端 P95 ≤ 300ms；端到端 ≤ 800ms
- 幂等：禁止重复退住（已退住返回 `E_CONFLICT`）
- 退避：`E_RATE_LIMIT|E_DEPENDENCY|E_INTERNAL` 使用 `callWithRetry`

## Tasks
- FE：
  - T1 新增退住页 `pages/tenancies/checkout`（选择日期+提交）
  - T2 患者详情页“操作”或“入住记录”入口接入；提交后刷新详情在住状态
  - T3 埋点接入（submit/result）
- BE：
  - T4 `tenancies.update` 校验：`checkOutDate>=checkInDate`；已退住阻断 `E_CONFLICT`
  - T5 增加针对最近未退住记录的保护（避免更新历史已退住记录）
- QA：成功/日期错误/重复退住/状态更新/排序/埋点

## Dependencies
- 规范与契约：
  - `docs/specs/validation-rules.md`（章节：入住/退住 — 日期关系与约束）
  - `docs/api/contracts.md`（章节：tenancies — update/list 约定）
  - `docs/uiux/frontend-spec.md`（章节：15 埋点与监控 → 15.1/15.3 事件模型与配置；Checkout 事件沿用 submit/result 字段约定）
- 页面依赖：`patients` 详情页（状态刷新与入口）

## Risks
- 错选记录导致错误退住（通过仅允许最近未退住记录降低风险）
- 时区/日期换算导致边界错误（统一 ISO 日期）

## DoR
- [x] 红线与字段规格就绪
- [x] 契约/错误码一致性确认
- [x] 索引确认（patientId+checkInDate）
- [x] 用例清单评审

## DoD
- [x] AC 全通过；测试通过；文档更新；A11y 通过
---

## Dev Agent Record
- Agent Model Used: dev (James)
- File List:
  - functions/tenancies/index.js（update：日期校验、已退住阻断、最近记录保护、条件更新避免并发）
  - miniprogram/pages/tenancies/checkout.{json,js,wxml,wxss}（退住页 + 埋点）
  - miniprogram/pages/patients/detail.{js,wxml}（显示“在住”并提供“退住登记”入口）
  - miniprogram/app.json（注册退住页面）
- Change Log:
  - 实现退住登记：仅允许最近未退住记录；退住日期不得早于入住日期；已退住重复提交返回 `E_CONFLICT`。
  - 前端新增退住页与入口；接入埋点 `tenancy_checkout_submit/result`。
- Completion Notes:
  - 建议在后端使用事务增强并发保护（目前使用条件更新 where `_id` 与 `checkOutDate==null`）。
  - 详情页退住成功后将自动刷新在住状态（返回上一页触发 reload）。

## QA Results
- Reviewer: Quinn（QA）
- Gate Decision: PASS（见 docs/qa/gates/EP-02.S2-tenancy-checkout.yml）
- Summary: AC1–AC6 全部满足；前端退住页与埋点已接入；错误码与文案一致；最近未退住记录保护与并发条件更新生效。

Retest by Acceptance Criteria
- AC1 成功退住：PASS（`checkOutDate>=checkInDate` → `updated:1`，Toast “退住已登记”，返回上一页）
- AC2 日期校验：PASS（`checkOutDate<checkInDate` → `E_VALIDATE` 内联提示）
- AC3 已退住保护：PASS（重复退住 → `E_CONFLICT` 文案“当前记录已退住”）
- AC4 详情“在住”状态更新：PASS（退住最近记录后详情显示非在住，入口隐藏）
- AC5 列表与排序：PASS（`checkInDate desc` 维持；状态标识正确）
- AC6 体验与 A11y：PASS（Loading、错误提示、触控尺寸与对比度达标）
