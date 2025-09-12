# Story: EP-07-S4 游客活动浏览与报名补充
Status: Done

## Story
- As: 游客
- I want: 浏览当前与最近两周内可见的活动，并在报名时补充基本信息
- So that: 可先参与公共活动，后续再决定是否正式注册

## Scope
- In: 活动公共视图（当前/最近两周已完成），游客报名补充姓名/电话
- Out: 游客编辑/取消报名（可后续）

## Acceptance Criteria
- AC1 公共列表
  - Given 游客模式
  - When 进入活动页
  - Then 展示“当前活动（open/ongoing）”与“近14天已完成”
- AC2 游客报名
  - When 点击报名
  - Then 弹出补充表单（姓名、电话），合法后方可提交；成功 Toast
- AC3 权限限制
  - 游客仅能访问公共接口；敏感信息/写操作受限

## UI/UX
- 页面：`pages/activities/index`
- 交互：视图切换；报名弹层；输入校验

## API
- `activities.publicList({ window:'current'|'last14d' })`
- `registrations.register({ activityId, guestContact:{ name, phone } })`
- 错误码：`E_VALIDATE|E_INTERNAL`

## Data
- Activities：公共查询
- Registrations：`{ activityId, guestContact, createdAt }`

## Analytics
- 事件：`guest_activity_view`、`guest_registration_submit/result`

## Non-Functional
- 列表 P95 ≤ 1s；报名端到端 ≤ 1.5s

## Tasks
- FE：公共视图与报名弹层；输入校验与错误映射
- BE：公共列表窗口查询；报名支持 `guestContact`
- QA：视图切换、游客报名、非法输入、错误映射

## Dependencies
- EP-04（活动）；EP-07-S1/S3

## Risks
- 活动口径：以 `status+date/endDate` 为准，边界值需测试

## DoR
- [ ] 列表口径确认；报名表单文案

## DoD
- [ ] 游客流程端到端通过；公共接口覆盖监控

## 自检清单（Story Draft Checklist）
- [x] Story: 游客活动浏览与报名补充
- [x] Scope: 公共视图与游客报名，不含取消/编辑
- [x] Acceptance Criteria: 列表窗口、报名补充、权限限制
- [x] UI/UX: 视图切换与弹层
- [x] API 映射: activities.publicList / registrations.register(guestContact)
- [x] Data 对齐: Registrations 新字段
- [x] 校验与安全: 游客仅公共接口、校验必填
- [x] Analytics: guest_view / guest_registration 事件
- [x] NFR: 列表/报名性能
- [x] Tasks: FE/BE/QA 明确
- [x] Dependencies & Risks: EP-04 口径依赖
- [x] DoR/DoD: 条目可检

## QA Results
- Gate: PASS
- Reviewer: Quinn（QA/Test Architect）
- Summary: 游客公共视图与报名流程完整；分段窗口（当前/近14天）与补充表单校验达标；权限隔离良好。建议对列表与报名的性能目标进行采样验证并纳入监控。

Findings by Acceptance Criteria
- AC1 公共列表：PASS（guest 模式仅调用 publicList；按“当前/近14天”分组展示）
- AC2 游客报名：PASS（弹层收集姓名/电话，正则/长度校验后提交，成功提示）
- AC3 权限限制：PASS（guest 不走内部列表与写操作；仅调用公共接口与 guestContact 报名）

Non-Functional / Risks
- 性能：MONITOR（列表 P95 ≤1s、报名端到端 ≤1.5s 未实测；建议采样记录 P75/P95）
- 观测：PASS（已接入 guest_activity_view、guest_registration_submit/result，建议在测试计划覆盖失败分支上报）

Recommendations
- R1 NFR 采样：补充列表与报名性能采样，记录 P75/P95 并观察波动。
- R2 用例完善：E2E 覆盖非法输入、网络失败、活动满员/截止边界。

## Dev Agent Record

### Agent Model Used
dev (James)

### Completion Notes List
- 活动公共视图：在游客模式下调用 `activities.publicList`，分两段窗口加载“当前活动（open/ongoing）”与“近14天已完成”，并在列表中分组展示。
- 游客报名：报名时弹出补充表单（姓名、电话）并校验，调用 `registrations.register(activityId, { name, phone })`，成功后更新 UI 状态。
- 埋点：新增 `guest_activity_view`（window, count, duration）、`guest_registration_submit`、`guest_registration_result`（code, duration）。
- 兼容性：非游客按原逻辑走内部列表与报名；公共视图不分页（最多50条）。

### File List
- Modified: `miniprogram/pages/activities/index.{js,wxml}`

### Change Log
- feat(activities): add guest public windows + registration with contact; add guest analytics events
