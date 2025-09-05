# Story: EP-01-S1 患者建档（身份证唯一去重与冲突提示）

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
- FE：表单与校验；提交与列表刷新；mapError 文案；埋点
- BE：zod 校验；唯一冲突返回；返回 `_id`
- QA：成功/格式/冲突/退避/草稿用例

## Dependencies
- `Patients.id_card` 唯一索引；`validation-rules.md`；`design-system/accessibility.md`

## Risks
- 历史重复档案（先提示，合并工具后续）

## DoR
- [ ] 红线标注
- [ ] 契约/错误码/数据字典对齐
- [ ] 索引建立
- [ ] 用例评审

## DoD
- [ ] AC 全部通过
- [ ] 测试通过；文档更新；A11y 检查通过

---

## 自检清单（Story Draft Checklist）
- [ ] Story: As / I want / So that 明确
- [ ] Scope: In/Out 明确
- [ ] Acceptance Criteria: 覆盖成功/错误/边界
- [ ] UI/UX: 页面/字段/交互/文案/A11y/红线链接
- [ ] API: 动作/入参出参/错误码/重试幂等/契约链接
- [ ] Data: 字段/索引/状态机/可见性
- [ ] 校验与安全: 字段/业务/权限/审计
- [ ] Analytics: 事件/属性/KPI/校验
- [ ] NFR: 性能/退避/草稿/降级
- [ ] Tasks: FE/BE/QA 可执行
- [ ] Dependencies & Risks: 完整
- [ ] DoR/DoD: 勾选就绪与完成条件
