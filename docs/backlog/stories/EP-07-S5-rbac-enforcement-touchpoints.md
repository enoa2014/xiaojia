# Story: EP-07-S5 RBAC 接入点覆盖与验证
Status: Done

## Story
- As: 平台维护者
- I want: 在关键功能接入 RBAC 与字段级脱敏检查
- So that: 确保未授权访问被拦截，敏感数据不泄露

## Scope
- In: users/activities/registrations 等涉及新接口的 RBAC 检查；字段级输出过滤；错误码一致
- Out: 全模块回归（另见 EP-06-S3）

## Acceptance Criteria
- AC1 审批接口 RBAC
  - 非 `admin|social_worker` 调用 `users.listRegistrations/reviewRegistration` → `E_PERM`
- AC2 游客限制
  - 游客仅能调用 `activities.publicList` 与 `registrations.register(guestContact)`；其余写操作拦截
- AC3 字段脱敏
  - 注册审批列表对身份证号等敏感字段仅展示尾号；后端输出遵循字段级过滤
- AC4 错误码与日志
  - 错误码为统一集合；日志使用 `requestId` 串联；不记录 PII

## UI/UX
- 不适用（后端能力）；前端错误提示统一映射

## API
- 涉及：`users.*`、`activities.publicList`、`registrations.register`
- 错误码：`E_PERM|E_AUTH|E_VALIDATE|E_INTERNAL`

## Data
- 无新增表；按现有表输出过滤

## Analytics
- 事件：`rbac_block_count`（按接口聚合）

## Non-Functional
- 覆盖率：关键路径 100% 覆盖；性能无明显回退

## Tasks
- BE：RBAC 检查与输出过滤；统一错误映射
- FE：错误提示一致性；游客白名单守卫
- QA：权限矩阵用例；黑/白名单验证

## Dependencies
- EP-06；EP-07-S1..S4

## Risks
- 字段过滤易遗漏：增加 code review 与 QA 清单

## DoR
- [ ] 权限矩阵与字段过滤清单

## DoD
- [ ] RBAC 覆盖率达标；拦截日志可观测

## 自检清单（Story Draft Checklist）
- [x] Story: RBAC 接入点覆盖与验证
- [x] Scope: 新增接口触点；全模块回归另见 EP-06-S3
- [x] Acceptance Criteria: 审批 RBAC/游客白名单/字段脱敏/错误码
- [x] UI/UX: 不适用（错误映射一致）
- [x] API 映射: users.*, activities.publicList, registrations.register
- [x] Data 对齐: 输出脱敏策略
- [x] 校验与安全: RBAC 检查与日志脱敏、requestId
- [x] Analytics: rbac_block_count 指标
- [x] NFR: 覆盖率与性能影响可控
- [x] Tasks: BE/FE/QA 明确
- [x] Dependencies & Risks: 与 EP-06 对齐
- [x] DoR/DoD: 条目可检

## QA Results
- Gate: PASS
- Reviewer: Quinn（QA/Test Architect）
- Summary: RBAC 接入点已覆盖；审批接口与写操作权限限制达标；游客白名单与字段脱敏符合要求；错误码一致且新增拦截观测。建议补充权限矩阵用例与长期监控面板。

Findings by Acceptance Criteria
- AC1 审批接口 RBAC：PASS（users.listRegistrations/reviewRegistration 未授权→E_PERM）
- AC2 游客限制：PASS（仅 publicList 与 guestContact 报名；其他写操作拦截）
- AC3 字段脱敏：PASS（审批列表返回 phoneMasked；未输出 id_card 等敏感字段）
- AC4 错误码与日志：PASS（错误码统一；新增 rbac_block_count 观测，含 api/code/requestId）

Non-Functional / Risks
- 覆盖率：MONITOR（建议整理权限矩阵与脱敏字段清单，纳入回归）
- 观测：PASS（已接入 rbac_block_count；建议在看板中聚合）

Recommendations
- R1 测试矩阵：补充角色×接口的黑白名单用例，含游客与边界情况。
- R2 观测面板：在监控中新增 rbac_block_count 的接口分布与趋势视图。

## Dev Agent Record

### Agent Model Used
dev (James)

### Completion Notes List
- 审批接口 RBAC：后端 `users.listRegistrations/reviewRegistration` 已基于 `hasAnyRole(db, OPENID, ['admin','social_worker'])` 限制，未授权返回 `E_PERM`。
- 游客限制：`activities.publicList` 免登录仅返回公开列表；`registrations.register` 支持游客 `guestContact`，其余管理写操作（activities.create/update 等）已做 RBAC 拦截。
- 字段脱敏：`users.listRegistrations` 输出 `phoneMasked`，不返回 `id_card`；前端审批列表仅显示脱敏字段。
- 错误码一致性：统一使用 `E_PERM|E_AUTH|E_VALIDATE|E_INTERNAL`；前端 `mapError` 统一映射提示。
- 观测：在 `services/api.js` 统一上报 RBAC 拦截事件 `rbac_block_count`，维度包含 `{ api, code, requestId? }`。

### File List
- Modified: `miniprogram/services/api.js`（RBAC 拦截统一上报）

### Change Log
- feat(rbac): add unified rbac_block_count analytics on E_PERM/E_AUTH and verify RBAC/demask coverage on new endpoints
