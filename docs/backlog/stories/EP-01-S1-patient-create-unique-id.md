# Story: EP-01-S1 患者建档（身份证唯一去重与冲突提示）
Status: Done

## Story
- As: 社工
- I want: 在新建患者档案时自动校验身份证合法且唯一，冲突时明确提示解决路径
- So that: 避免重复档案，保证数据质量

## Scope
- In: 新建档案表单（姓名、身份证、可选手机号/出生日期…）；前端实时/提交校验；后端唯一判定与错误码；成功后列表可见
- Out: 编辑身份证（需审批，另故事）；复杂模糊搜索/合并重复档案工具

## Acceptance Criteria
- AC1 成功创建：合法且未占用 → {ok:true,_id}；列表刷新可见
- AC2 身份证格式：非法/校验位错误 → E_VALIDATE（内联高亮 “身份证格式或校验位错误”）
- AC3 唯一冲突：身份证已存在 → E_CONFLICT（提示“身份证已存在，请搜索后编辑”，提供“去搜索”）
- AC4 日期/手机号：出生日期>今日 或 手机号非法 → E_VALIDATE 定位字段
- AC5 性能与可用性：列表刷新 ≤1.5s；弱网 Loading；可重试错误退避后保留草稿

## UI/UX
- 页面：`pages/patients/form`
- 字段：name(必)、id_card(必)、phone(可)、birthDate(可)，更多信息折叠
- 文案：成功“创建成功”；冲突“身份证已存在，请搜索后编辑”；格式“身份证格式或校验位错误”
- A11y：错误定位与焦点；触控≥88×88rpx；对比度≥4.5:1
- 红线标注：`docs/uiux/handoff/redlines/patients-form.md`

## API
- `patients.create({ patient, clientToken }) -> { ok:true, data:{ _id } } | { ok:false,error }`
  - 错误码：E_VALIDATE / E_CONFLICT / E_INTERNAL
- `patients.list({ page,pageSize, filter, sort })`（刷新用）
- 参考：`docs/api/contracts.md`、`docs/api/prototype.md`

## Data
- Patients：name, id_card(unique), id_card_tail, phone?, birthDate?, createdAt
- 索引：`id_card` 唯一；`name+id_card_tail` 组合

## Analytics
- `patient_create_submit/result`（success|error_code, duration, requestId）

## Non-Functional
- P95 提交 ≤500ms（后端）；退避：500ms×2≤3次；草稿保留

## Tasks
- [x] FE：表单与校验；提交与列表刷新；mapError 文案；埋点
- [x] BE：zod 校验；唯一冲突返回；返回 `_id`；身份证校验位与出生日期 ≤ 今日
- [x] QA：成功/格式/冲突/退避/草稿用例

---

## Dev Agent Record
- Agent Model Used: dev (James)
- What Changed:
  - 后端 `patients.create` 增加身份证校验位校验与出生日期不得晚于今日校验；保持唯一冲突返回 `E_CONFLICT`；成功返回 `_id`。
  - 前端表单此前已包含本地校验与冲突指引（去搜索）。
- QA Fixes Applied:
  - 将 Zod `parse` 改为 `safeParse` 并统一将入参校验错误映射为 `E_VALIDATE`，返回可读 `msg`（身份证/手机号/出生日期）。
  - `patients.get` 入参 `id` 采用 `safeParse` 并在失败时返回 `E_VALIDATE` 而非 `E_INTERNAL`。
- Validations Executed:
  - 身份证不合法/校验位错误 → 返回 `E_VALIDATE` 文案“身份证格式或校验位错误”。
  - 出生日期晚于今日 → 返回 `E_VALIDATE` 文案“出生日期需早于或等于今日”。
  - 重复身份证 → 返回 `E_CONFLICT` 文案“身份证已存在，请搜索后编辑”。

## File List
- Modified: `functions/patients/index.ts`

## Change Log
- v0.2 后端补强校验（身份证校验位、出生日期≤今日）；更新故事任务勾选并置为 Ready for Review。
- v0.3 应用 QA 修正：Zod 错误统一映射为 `E_VALIDATE`；`get/create` 使用 `safeParse`，改进错误文案；待 QA 回归与 Gate 更新。

## Completion Notes
- 服务端强校验与前端本地校验一致，避免绕过前端导致脏数据。
- 若生产未建唯一索引，仍可能存在极端并发写入风险，建议按 `indexes.schema.json` 建立 `Patients.id_card` 唯一索引。

## Dependencies
- `Patients.id_card` 唯一索引；`validation-rules.md`；`design-system/accessibility.md`

## Risks
- 历史重复档案（先提示，合并工具后续）

## DoR
- [x] 红线标注
- [x] 契约/错误码/数据字典对齐
- [x] 索引建立
- [x] 用例评审

## DoD
- [x] AC 全部通过
- [x] 测试通过；文档更新；A11y 检查通过

---

## 自检清单（Story Draft Checklist）
- [x] Story: As / I want / So that 明确
- [x] Scope: In/Out 明确
- [x] Acceptance Criteria: 覆盖成功/错误/边界
- [x] UI/UX: 页面/字段/交互/文案/A11y/红线链接
- [x] API: 动作/入参出参/错误码/重试幂等/契约链接
- [x] Data: 字段/索引/状态机/可见性
- [x] 校验与安全: 字段/业务/权限/审计
- [x] Analytics: 事件/属性/KPI/校验
- [x] NFR: 性能/退避/草稿/降级
- [x] Tasks: FE/BE/QA 可执行
- [x] Dependencies & Risks: 完整
- [x] DoR/DoD: 勾选就绪与完成条件

---

## QA Results
- Reviewer: Quinn（QA）
- Gate Decision: PASS
- Summary: 回归通过。AC1–AC5 均满足验收标准；错误码与文案一致，冲突引导与联动正常。

Retest by Acceptance Criteria
- AC1 成功创建：PASS（合法身份证未占用 → 返回 `_id`；前端流转符合）
- AC2 身份证格式/校验位错误 → E_VALIDATE：PASS（`safeParse` + 友好 `msg`；前端 Toast 展示具体文案）
- AC3 唯一冲突 → E_CONFLICT：PASS（存在性检查与文案正确；“去搜索”跳转正确）
- AC4 出生日期>今日/手机号非法 → E_VALIDATE：PASS（后端具体文案；前端 Toast 显示）
- AC5 性能/可用性：PASS（列表刷新 P95≤1.5s；弱网场景 Loading/退避/草稿保留表现符合预期）

Notes
- 后端：`functions/patients/index.ts` 使用 `safeParse` 统一 `E_VALIDATE`；保留身份证校验位与出生日期≤今日。
- 前端：`pages/patients/form.js` 对 `E_VALIDATE/E_CONFLICT` 文案与交互一致。
