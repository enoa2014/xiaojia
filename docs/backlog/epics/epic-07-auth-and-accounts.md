#+ EP-07 账号与认证（注册 / 登录 / 鉴权 / 权限 / 游客）

参考规范：docs/auth/registration-auth-spec.md（v1）

## 目标
- 提供标准化的用户注册（含审批）、登录/鉴权（AuthN）、授权（AuthZ/RBAC），以及游客访问活动页的能力，确保合规、安全、可扩展。

## 业务价值（KPI）
- 注册提交→审批通过时长：P50 ≤ 1 天，P95 ≤ 3 天。
- 游客到注册转化率 ≥ 20%。
- 未授权访问拦截率 100%，敏感字段零泄露。

## 范围
- In：
  - 注册：姓名/电话/身份证号；亲属需要关联患者姓名/关系/患者证件号。
  - 审批：管理员/社工可审批；通过落地角色与状态，拒绝关联原因。
  - 登录与鉴权：小程序 OPENID 轻登录；用户 Profile 拉取；状态（active/pending/rejected）。
  - 授权（RBAC）：动作级检查与字段级脱敏（与 EP-06 兼容）。
  - 游客模式：仅活动页公共视图，游客报名需补充姓名/电话。
- Out：短信验证码/邀请码、SSO、多租户。

## 关键用户故事（草拟）
- EP-07-S1 用户注册提交与等待 — docs/backlog/stories/EP-07-S1-user-registration-submit.md
- EP-07-S2 审批（管理员/社工）通过/拒绝注册 — docs/backlog/stories/EP-07-S2-user-registration-review.md
- EP-07-S3 用户 Profile 拉取与首页展示 — docs/backlog/stories/EP-07-S3-user-profile-home-display.md
- EP-07-S4 游客模式浏览活动与报名补充信息 — docs/backlog/stories/EP-07-S4-guest-activities-and-registration.md
- EP-07-S5 动作级 RBAC 接入点覆盖 — docs/backlog/stories/EP-07-S5-rbac-enforcement-touchpoints.md

（注：落地时在 docs/backlog/stories/ 下补充对应 Story 文件与 AC）

## 验收标准（Epic 级）
- 注册：提交完整信息后 `Users.status=pending`；审批通过后 `status=active` 且 `role` 生效；拒绝有 `rejectReason`。
- 登录/鉴权：`users.getProfile()` 返回 `{ role,status,name,avatar }`；未登录/游客访问公共接口正常。
- RBAC：审批/导出/敏感写操作仅 `admin|social_worker`；游客只读无写。
- 游客：活动页可浏览当前/最近两周已完成活动；报名时未补充信息会被阻断并提示。

## API 契约影响
- users：`register` / `listRegistrations` / `reviewRegistration` / `getProfile`（扩展）。
- activities：`publicList({ window:'current'|'last14d' })`。
- registrations：`register({ activityId, guestContact? })`（游客必填）。

## 数据模型与索引
- Users：`openId`、`status`、`role/roles`、`name/phone/id_card`、`relative{ patientName, relation, patientIdCard, patientId? }`、`createdAt/updatedAt`。索引：`openId`（或 `_id`）、`status`、`role`、`createdAt`。
- Activities：`status` 与时间字段；（可选）`isPublic`。索引：`status+date`、（若有）`status+endDate`。
- Registrations：`guestContact?`、`userId?`。索引：`userId+activityId` 唯一、`activityId+status`。

## 依赖与顺序
- 依赖 EP-06（权限与安全）的字段脱敏与 RBAC 规范；
- 作为横切能力，为 EP-04（活动）提供公共视图，为各域提供统一鉴权入口。

## 风险与对策
- PII 合规：后端最小化输出；日志脱敏；`requestId` 串联审计。
- 身份证/患者匹配：前端宽松校验、后端严格；亲属信息可先按文本落库，后台定期回填关联。
- 网络不稳定：前端“乐观+回退+重试”（已用于星标），注册与审批界面增加重试提示。

## 里程碑
- MVP（本迭代）：
  - users 三接口 + activities.publicList + registrations.guestContact 支持；
  - 前端注册页、审批页新 tab、活动公共视图与游客报名。
- Next：
  - 短信校验/邀请码、注册流防刷；
  - 更细粒度的字段许可与导出权限整合；
  - 游客引导转化漏斗埋点与报表（对接 EP-05）。

## 指标（度量）
- 注册提交量、审批通过率/时长、拒绝率与原因分布；
- 游客浏览量、报名量、注册转化率；
- RBAC 拦截次数、敏感读取次数（需审计）。

## 里程碑完成概览（MVP）
- 交付 API：
  - users：register / listRegistrations / reviewRegistration / getProfile（扩展）
  - activities：publicList（当前窗口/近14天窗口）
  - registrations：register（支持 guestContact）
- 前端落地：
  - 注册页 pages/auth/register（表单 + 等待态）
  - 审批页 pages/approvals 新 Tab（用户审批：通过/拒绝）
  - 首页集成 getProfile 与角色主题/入口联动
  - 活动页公共视图与游客报名表单（分组展示：当前/近14天）
- QA Gates：
  - EP-07-S1/S2/S3/S4/S5 全部 Gate: PASS（详见 docs/qa/gates/*）
- 观测与安全：
  - 事件：register_*、approval_*、home_profile_load、guest_*、rbac_block_count
  - 脱敏：审批列表返回 phoneMasked；不返回身份证号；日志不落 PII
- 待监控（MONITOR）：
  - 首屏 getProfile P75/P95、注册与游客报名端到端、公共列表 P95
  - 配置 rbac_block_count 的聚合看板与告警

## 任务拆解（建议）
- 后端
  - [x] users.register（zod 校验 + upsert Users）
  - [x] users.listRegistrations（RBAC + 分页）
  - [x] users.reviewRegistration（RBAC + 审计 + 状态流转）
  - [x] activities.publicList（窗口查询）
  - [x] registrations.register（游客 guestContact 支持）
- 前端
  - [x] 注册页 `pages/auth/register`（表单 + 成功态）
  - [x] `pages/approvals` 新 tab（用户审批）
  - [x] 首页 `getProfile` 与角色主题联动
  - [x] 活动页公共视图 + 游客报名表单
  - [ ] 守卫与主题扩展（guest）
- QA / 文档
  - [ ] 测试用例补充（Unit/Int/E2E）
  - [ ] API 文档与数据字典同步

## 变更记录
- v1.0（2025-09-12）MVP 完成：S1-S5 交付并 Gate PASS；新增观测与脱敏；建议持续监控 NFR 指标。
- v0.1 基于 docs/auth/registration-auth-spec.md 生成。
