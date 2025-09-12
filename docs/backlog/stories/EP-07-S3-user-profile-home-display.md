# Story: EP-07-S3 用户 Profile 拉取与首页展示
Status: Done

## Story
- As: 已注册用户
- I want: 打开应用后首页显示我的姓名、头像与角色，并据此加载主题/入口
- So that: 获得对应权限与功能入口

## Scope
- In: `users.getProfile()` 拉取并渲染；首页角色主题与入口联动；无档案时引导注册或游客模式
- Out: 第三方账号绑定/切换

## Acceptance Criteria
- AC1 拉取成功
  - When 首页加载
  - Then 调用 `users.getProfile()`，若返回 `{ role, status, name, avatar }`，页面展示相应文案与徽章
- AC2 无档案/未激活
  - 若 `role` 为空 → 显示“注册/游客模式”入口
  - 若 `status='pending'` → 显示“等待审批”状态
- AC3 主题与权限
  - 不同 `role` 切换主题与入口按钮；未授权入口灰化或隐藏

## UI/UX
- 页面：`pages/index/index`（首页）
- 交互：首屏加载状态；失败时最小化降级（保持占位 UI）

## API
- `users.getProfile()`（扩展返回 `name/avatar/status`）

## Data
- Users：读取 `role/roles/status/name/avatar`

## Analytics
- 事件：`home_profile_load`（result, role, status）

## Non-Functional
- 首屏 P75 ≤ 1s（已缓存主题时）；网络失败时不阻塞 UI

## Tasks
- FE：首页集成 `getProfile`；主题与入口联动；状态文案
- BE：`getProfile` 扩展返回字段（已完成）
- QA：role/status 分支、降级、性能

## Dependencies
- EP-07-S1/S2

## Risks
- 头像来源：先用 emoji 占位，后续支持上传

## DoR
- [ ] 文案与角色-主题映射确认

## DoD
- [ ] 多角色切换验证通过；异常降级稳定

## 自检清单（Story Draft Checklist）
- [x] Story: 首页 profile 展示与联动
- [x] Scope: 拉取与展示，不含第三方绑定
- [x] Acceptance Criteria: 拉取成功/无档案/等待态/主题联动
- [x] UI/UX: 首页文案与入口、降级
- [x] API 映射: users.getProfile 扩展
- [x] Data 对齐: 返回字段定义
- [x] 校验与安全: 失败降级、最小暴露
- [x] Analytics: home_profile_load 事件
- [x] NFR: 首屏性能与稳定性
- [x] Tasks: FE/BE/QA 明确
- [x] Dependencies & Risks: 头像占位策略
- [x] DoR/DoD: 条目可检

## QA Results
- Gate: PASS
- Reviewer: Quinn（QA/Test Architect）
- Summary: 首页已集成 `users.getProfile` 并按角色渲染主题与入口；无角色显示注册/游客入口，`pending` 显示等待审批；失败不阻塞 UI，埋点接入完备。建议对首屏性能目标进行采样验证并纳入监控。

Findings by Acceptance Criteria
- AC1 拉取成功：PASS（展示 `name/avatar/role/status`；角色徽章与文案正确）
- AC2 无档案/未激活：PASS（无角色→注册/游客入口；`pending`→等待审批）
- AC3 主题与权限：PASS（按 `role` 切换主题与入口；未授权入口不展示）

Non-Functional / Risks
- 性能：MONITOR（首屏 P75 ≤1s 未采样实测，建议记录 P75/P95）
- 观测：PASS（`home_profile_load` 已接入，建议覆盖失败分支上报）
- 数据最小化：INFO（无姓名时默认写入访客昵称可能带来数据噪音，可评估是否仅本地占位）

Recommendations
- R1 NFR 采样：补充首屏 `getProfile` 的采样验证与 P75/P95 记录。
- R2 观测完善：在测试计划中补充成功/失败分支上报校验。

## Dev Agent Record

### Agent Model Used
dev (James)

### Completion Notes List
- 首页拉取 `users.getProfile()` 并渲染姓名、头像、角色徽章与状态；失败不阻塞 UI，保留占位与本地主题。
- 根据 `role` 应用主题与快捷入口（admin/social_worker/volunteer/parent）；`role` 为空显示“注册/游客模式”入口，`status='pending'` 显示等待审批文案。
- 新增埋点：`home_profile_load`（result, role, status）。

### File List
- Modified: `miniprogram/pages/index/index.js`

### Change Log
- 2025-09-12 feat(home): integrate users.getProfile on home, role-based theme/actions, add home_profile_load analytics
