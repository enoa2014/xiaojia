# Story: EP-03-S1 服务记录提交（创建）
Status: Done

## Story
- As: 志愿者
- I want: 填写并提交探访/心理/物资/转介/随访等服务记录，附文字与照片
- So that: 团队可审核并形成可追溯的服务数据

## Scope
- In: 服务记录表单页与快速入口；字段校验；图片选择/压缩/上传；提交幂等；弱网草稿；提交后“我的记录”刷新
- Out: 审核流（通过/驳回）、团队记录筛选、复杂统计

## Acceptance Criteria
- AC1 成功提交：必填合法（patientId、type、date）→ {ok:true,_id}，Toast“提交成功，待审核”，回退刷新
- AC2 校验失败：type/date/patientId 非法 → E_VALIDATE 内联错误并定位
- AC3 图片限制：>9 张或 >5MB/张 → 阻止提交并提示
- AC4 幂等提交：同一 clientToken 重复提交 → 仅创建 1 条并返回相同结果
- AC5 弱网草稿：E_DEPENDENCY/E_INTERNAL 退避后失败 → 保留本地草稿（含 fileID）
- AC6 A11y：上传进度/Loading；触控≥88×88rpx；对比度≥4.5:1

## UI/UX
- 页面：`pages/services/form`
- 字段：patientId、type(visit|psych|goods|referral|followup)、date(ISO)、desc≤500、images≤9（≤5MB/张）
- 交互：图片预览/删除；提交 Loading；错误内联 + Toast
- 文案：成功“提交成功，待审核”；超限“最多 9 张，每张≤5MB”
- 红线标注：`docs/uiux/handoff/redlines/services-form.md`

## API
- `services.create({ service:{ patientId,type,date,desc?,images? }, clientToken })`
  - 返回：`{ ok:true, data:{ _id } }` | `{ ok:false, error }`
  - 错误码：E_VALIDATE/E_INTERNAL/E_DEPENDENCY/E_RATE_LIMIT
- 前端：`callWithRetry('services','create', ...)`
- 参考：`docs/api/contracts.md`、`docs/api/prototype.md`

## Data
- Services：patientId, type, date, desc?, images[]?, status:'review', createdBy, createdAt
- 索引：`patientId+date(desc)`、`createdBy+date(desc)`；状态 `status`

## Analytics
- `service_submit_click`、`service_submit_result`（success|error_code, duration）

## Non-Functional
- P95 创建 ≤500ms（后端）、端到端 ≤800ms（不含上传）
- 退避：500ms 起×2，≤3 次，抖动 20–30%
- 草稿：本地存储，提交成功清理

## Tasks
- [x] FE：表单/图片/校验/提交与草稿/埋点（新增 5MB 校验与上传进度；错误定位滚动；幂等 clientToken）
- [x] BE：校验与入库、默认 `status='review'`、记录 createdBy/createdAt（幂等：clientToken 去重）
- [x] QA：成功/校验失败/超限/退避/草稿/幂等

---

## Dev Agent Record
- Agent Model Used: dev (James)
- What Changed:
  - FE：`pages/services/form` 增加图片大小≤5MB 校验；上传进度条（顺序上传累计进度）；校验失败滚动到首错；草稿保留。
  - BE：`functions/services/index.ts` 在 `create` 动作上实现幂等（`clientToken` 存储与查重），返回已存在记录 `_id`；保持 `status='review'`、`createdBy/createdAt`。
- Validations Executed:
  - AC1 成功提交 → 返回 `_id` 并 Toast 提示；
  - AC2 缺必填/非法 → 前端内联错误并滚动定位；
  - AC3 图片>9 或 单张>5MB → 阻止提交并 Toast“最多 9 张，每张≤5MB”；
  - AC4 幂等：相同 `clientToken` 重复提交仅创建 1 条并返回相同 `_id`；
  - AC5 弱网草稿：失败不清空草稿；再次进入仍保留；
  - AC6 A11y：进度/Loading、控件≥88rpx、颜色对比达标。

## File List
- Modified: `miniprogram/pages/services/form.{js,wxml,wxss}`
- Modified: `functions/services/index.ts`

## Dependencies
- 上传封装；`validation-rules.md`；`design-system/accessibility.md`

## Risks
- 大图多图时延：压缩与缩略图；提交前先上传

## DoR
- [x] 表单设计红线
- [x] 契约与错误码对齐
- [x] 上传限制确认
- [x] 用例评审

## DoD
- [x] AC 全通过；测试通过；文档更新；A11y 通过

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
- Summary: 回归通过。`services.create` 已改用 `safeParse` 并在校验失败时返回 `E_VALIDATE`（含友好 `msg`）；AC1–AC6 全部满足。

Retest by Acceptance Criteria
- AC1 成功提交：PASS（合法必填 → 返回 `_id`，`status='review'`）
- AC2 校验失败（type/date/patientId）→ E_VALIDATE：PASS（返回 `E_VALIDATE`，`msg` 分别为“请选择服务类型/日期/请先选择患者”）
- AC3 图片限制：PASS（>9 或 单张>5MB 在前端阻止并提示）
- AC4 幂等：PASS（相同 `clientToken` 二次提交返回同一 `_id`）
- AC5 弱网草稿：PASS（失败不清空草稿；可手动保存/清理；重试封装生效）
- AC6 A11y：PASS（进度条/Loading；控件≥88rpx；对比度合规）

Notes
- 后端：`functions/services/index.ts` create 分支 `safeParse` + E_VALIDATE，保留 `clientToken` 幂等、`createdBy/createdAt/status` 默认。
- 前端：`pages/services/form` 图片大小校验、上传进度、错误滚动定位与草稿保存符合规范。
