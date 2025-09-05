# Story: EP-02-S1 新增入住记录（Tenancy Create）
Status: Draft-Validated (缺少红线标注与床位冲突提示开关策略样例)

## Story
- As: 社工
- I want: 为患者新增一次入住记录（记录入住日期、可选房间/床位/补助、入住人）
- So that: 形成规范的入住台账并支持后续统计

## Scope
- In: 入住表单页与从“档案详情/入住记录”Tab 的快捷入口；必填校验；提交幂等；创建后刷新入住列表与在住状态
- Out: 退住登记（另故事）；床位占用看板；强制床位冲突阻断（本故事仅提示）

## Acceptance Criteria
- AC1 成功创建
  - Given 已选择患者（patientId）或提供身份证（id_card），且填写 `checkInDate`
  - When 点击“提交”
  - Then 返回 `{ ok:true, data:{ _id } }`，Toast“新增成功”，返回上一页并刷新入住列表（按 `checkInDate desc`）
- AC2 日期关系
  - Given 提供了 `checkOutDate` 但早于 `checkInDate`
  - When 提交
  - Then 返回 `E_VALIDATE`，内联错误“退住日期不能早于入住日期”
- AC3 床位冲突提醒（可选提示，不阻断）
  - Given 同一 `room+bed+checkInDate` 可能已存在记录
  - When 提交
  - Then 提示“该床位在当日可能已被占用，请确认后提交”，用户可修改或继续（配置项，默认仅提示）
- AC4 身份关联
  - Given 仅提供 `id_card` 且系统能匹配到患者
  - When 提交
  - Then 自动回填 `patientId`；若未匹配也允许创建，记录 `id_card` 以便后续回填
- AC5 在住状态
  - Given 创建成功且 `checkOutDate` 为空
  - When 返回档案详情
  - Then 该患者显示“在住”状态（以最近 `checkInDate` 未退住记录为准）
- AC6 体验与 A11y
  - 提交按钮 Loading 态；错误内联 + Toast 简明
  - 触控≥88×88rpx；对比度≥4.5:1

## UI/UX
- 页面：`pages/tenancies/form`（从“档案详情/入住记录”Tab 可进入）
- 字段：
  - `patientId | id_card`（二选一，必填其一）
  - `checkInDate`（必填，ISO）
  - `checkOutDate?`（可空）
  - `room?`、`bed?`、`subsidy?`（≥0，最多两位小数）
  - `extra.admitPersons?`（入住人，原样字符串）
- 交互：日期选择器；金额输入限制；冲突仅提示；提交 Loading；错误定位

## API
- `tenancies.create({ tenancy:{ patientId|id_card, checkInDate, checkOutDate?, room?, bed?, subsidy?, extra? }, clientToken })`
  - 返回：`{ ok:true, data:{ _id } }` | `{ ok:false, error }`
  - 错误码：`E_VALIDATE`（日期/金额）、`E_INTERNAL`；冲突提示为业务文案（不强制 `E_CONFLICT`）
- 列表刷新：`tenancies.list({ page:1, pageSize:20, filter:{ patientId }, sort:{ checkInDate:-1 } })`
- 参考：`docs/api/contracts.md`、`docs/api/prototype.md`

## Data
- Tenancies：`patientId?`, `id_card?`, `checkInDate`, `checkOutDate?`, `room?`, `bed?`, `subsidy?`, `extra:{ admitPersons? }`, `createdAt`
- 索引：`patientId+checkInDate(desc)`；（可选）`id_card+checkInDate(desc)`；后续 `room+bed+checkInDate` 冲突检测

## Analytics
- 事件：`tenancy_create_submit`、`tenancy_create_result`（success|error_code, duration, requestId）

## Non-Functional
- P95 创建 ≤500ms（后端）；端到端 ≤800ms
- 退避重试：`E_RATE_LIMIT|E_DEPENDENCY|E_INTERNAL` 500ms 起×2，≤3 次，抖动 20–30%
- 幂等：`clientToken` 去重；重复提交返回相同结果

## Tasks
- FE：
  - T1 表单 UI 与校验（patientId 或 id_card，checkInDate 必填；金额校验）
  - T2 `callWithRetry('tenancies','create', { tenancy, clientToken })`；成功回退刷新入住列表
  - T3 冲突提示弹层（不阻断）；A11y（对比度/触控/错误定位）与文案
  - T4 埋点接入
- BE：
  - T5 zod 校验：`patientId|id_card` 至少其一；`checkOutDate>=checkInDate`（若存在）；`subsidy>=0`
  - T6 链接患者（仅 id_card 时尝试匹配）并回填；返回 `_id`；错误码统一
  - T7 （可选）床位冲突查询与软提示
- QA：成功/日期错误/金额错误/仅 id_card/冲突提示/退避重试/幂等

## Dependencies
- `validation-rules.md`；档案详情页入口；设计红线；`patients` 侧存在性

## Risks
- 无证档案关联：仅 `id_card` 创建易产生孤立记录（后续回填任务配套）
- 床位冲突复杂规则：先提示，后续再收紧为强校验

## DoR
- [ ] 红线标注与字段规格就绪
- [ ] 契约/错误码与数据字典对齐
- [ ] 索引确认（patientId+checkInDate）
- [ ] 用例清单评审

## DoD
- [ ] AC 全通过；测试通过；文档更新；A11y 通过

---

## 自检清单（Story Draft Checklist）
- [x] Story: As / I want / So that 明确
- [x] Scope: In/Out 明确
- [x] Acceptance Criteria: 覆盖成功/错误/边界
- [ ] UI/UX: 页面/字段/交互/文案/A11y/红线链接（待补红线）
- [x] API: 动作/入参出参/错误码/重试幂等/契约链接
- [x] Data: 字段/索引/状态机/可见性
- [x] 校验与安全: 字段/业务/权限/审计
- [x] Analytics: 事件/属性/KPI/校验
- [x] NFR: 性能/退避/草稿/降级
- [x] Tasks: FE/BE/QA 可执行
- [x] Dependencies & Risks: 完整
- [x] DoR/DoD: 勾选就绪与完成条件
