# Story: EP-03-S1 服务记录提交（创建）

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
- FE：表单/图片/校验/提交与草稿/埋点
- BE：校验与入库、默认 `status='review'`、记录 createdBy/createdAt
- QA：成功/校验失败/超限/退避/草稿/幂等

## Dependencies
- 上传封装；`validation-rules.md`；`design-system/accessibility.md`

## Risks
- 大图多图时延：压缩与缩略图；提交前先上传

## DoR
- [ ] 表单设计红线
- [ ] 契约与错误码对齐
- [ ] 上传限制确认
- [ ] 用例评审

## DoD
- [ ] AC 全通过；测试通过；文档更新；A11y 通过
