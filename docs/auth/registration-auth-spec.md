# 微信小程序 注册/登录/鉴权/权限管理/游客模式 方案（v1）

状态：草案（可执行）  
适用范围：前端（小程序）、后端（云函数/TCB）、数据库（TCB 云数据库）

## 1. 目标与边界

- 目标：实现注册（后台开发者/管理员/社工审批通过）、登录（轻登录）、鉴权（AuthN）、授权（AuthZ/RBAC）、游客模式访问活动页。  
- 非目标：第三方 SSO、复杂组织架构、多租户、短信/邀请码（暂不启用）。

## 2. 角色与访问

- 角色：`admin`（管理员）、`social_worker`（社工）、`volunteer`（志愿者）、`parent`（亲属/家属）、`guest`（游客）。
- 游客仅可访问：活动页的「当前活动 / 最近两周内的开放活动或已完成活动」。游客申请报名时需补充姓名+电话。

## 3. 核心用户流

3.1 注册（带审批）
- 用户在注册页提交资料：
  - 通用：姓名、电话、身份证号、申请身份（亲属/志愿者等）。
  - 亲属专属：关联患者姓名、关系（父/母/监护人/其他）、患者身份证号（用于辅助关联）。
- 后端在 `Users` 集合中以 `openId` 为键写入/更新注册信息，`status='pending'`。
- 审批人（管理员/社工）在后台列表中审核：
  - 通过：写 `status='active'`，并落地 `role` 与 `roles=[role]`。
  - 拒绝：写 `status='rejected'` 与 `rejectReason`。
- 前端注册完成后进入等待态；审批通过后刷新权限与主题。

3.2 登录与鉴权（AuthN）
- 微信小程序云函数调用自动携带 `OPENID`；无需额外凭证存储。  
- 后端统一读取 `OPENID` 与 `Users.status/role` 判定登录与可用性。  
- 未注册/未激活用户视为 `guest` 或 `pending`，按页面策略限制。

3.3 授权（AuthZ/RBAC）
- 云函数使用 `hasAnyRole(db, OPENID, [...])` 做动作级权限控制。
- 输出数据按角色做字段级脱敏（参考 field-masking 设计）。

3.4 游客模式
- 首次可选择以游客模式进入；设置 `roleKey='guest'`（不写入 Users）。
- 仅可访问活动页指定窗口数据；申请报名时强制补充姓名+电话，写入报名记录的 `guestContact` 字段（并可引导后续正式注册）。

## 4. 数据模型（建议）

4.1 Users（用户表）
- 主键：`_id=openId`，或 `{ openId }` 字段 + 系统生成 `_id`。
- 字段：
  - `openId: string`（必填）
  - `status: 'pending'|'active'|'rejected'`（注册状态）
  - `role: 'admin'|'social_worker'|'volunteer'|'parent'`（主角色）
  - `roles: string[]`（角色集合）
  - `name: string`、`phone: string`、`id_card: string`（注册信息）
  - `applyRole: 'volunteer'|'parent'|...`（申请身份）
  - 亲属扩展：`relative = { patientName: string, relation: string, patientIdCard: string, patientId?: string }`
  - `starredPatients: string[]`（现有）
  - `rejectReason?: string`
  - `createdAt: number`、`updatedAt: number`

4.2 Activities（活动表，已有）
- 建议增加：`isPublic: boolean`（可选，默认 true）用于游客可见性控制。

4.3 Registrations（报名表，已有）
- 扩展字段：
  - `guestContact?: { name: string, phone: string }`（游客报名时必填）
  - `userId?: string`（openId，登录用户填）
  - 其他字段保持不变。

## 5. API 契约（云函数）

命名空间：`users`（补充）

- `users.register(payload)` → 注册/更新用户资料为 `pending`
  - 入参（zod 校验）：
    - `name: string`、`phone: string`（大陆 11 位校验）、`id_card: string`
    - `applyRole: 'volunteer'|'parent'`
    - 若 `applyRole='parent'`：`relative: { patientName: string, relation: 'father'|'mother'|'guardian'|'other', patientIdCard: string }`
  - 返回：`{ ok:true, data: { status: 'pending' } }`

- `users.listRegistrations({ page, pageSize, status })`（审批人可见）
  - 仅 `admin|social_worker`
  - 返回：`{ ok:true, data: { items, meta } }`（pending 列表）

- `users.reviewRegistration({ openId, decision: 'approve'|'reject', role, reason? })`
  - 仅 `admin|social_worker`
  - approve：`status='active'`，写 `role/roles`
  - reject：`status='rejected'`，写 `rejectReason`
  - 返回：`{ ok:true, data:{ openId, status, role? } }`

- `users.getProfile()`（已实现，建议扩展返回 `name/phone/id_card/status`）

命名空间：`activities`（补充公共查询）

- `activities.publicList({ window: 'current'|'last14d', status?: 'open'|'ongoing'|'completed' })`
  - 逻辑：
    - `current`: `status in ['open','ongoing']`
    - `last14d`: `status='completed'` 且 `endDate >= now-14d`
  - 返回：`{ ok:true, data: { items } }`

命名空间：`registrations`（游客报名支持）

- `registrations.register({ activityId, guestContact? })`
  - 若调用者为游客（无 `OPENID` 或无 `active` 状态），必须传 `guestContact={ name, phone }`。
  - 返回：`{ ok:true, data:{ id, status:'pending'|'registered' } }`

## 6. 前端页面与交互

6.1 注册页（`pages/auth/register`）
- 表单：姓名、电话、身份证号、申请身份；若选择“亲属”，展示关联患者信息区。
- 提交：`api.users.register(form)` → 成功后进入等待态，指引“返回首页/查看状态”。

6.2 审批页（扩展现有 `pages/approvals`）
- 新增「用户审批」tab：显示 `pending` 用户，卡片包含基本信息与亲属信息。
- 操作：通过（选择角色）、拒绝（填写原因）。调用 `users.reviewRegistration`。

6.3 游客模式
- 首次进入：首页弹窗或入口按钮：以游客模式浏览 → 仅开放活动页（公共查询）。
- 活动页：切换视图「正在进行/开放报名」「最近两周已完成」。
- 报名时（游客）：弹出补充资料（姓名、电话），调用 `registrations.register`，并提示“注册以获得更多功能”。

## 7. 校验与格式

- 姓名：2–30 字，中文/中英混合可。
- 电话：大陆 11 位手机号正则。
- 身份证号：18 位校验（可采用宽松校验 + 后端严格校验）。
- 关联患者：优先记录文字信息；后台可尝试模糊匹配 `Patients`（姓名+身份证尾号）并写入 `relative.patientId`。

## 8. 权限与安全

- 鉴权：所有云函数统一读取 `OPENID`，`E_AUTH` 拦截未登录。对公共接口（`activities.publicList`）放行。
- 授权：审批动作仅 `admin|social_worker`；其余角色按最小权限原则。
- 脱敏：对 `Users`/`Patients` 输出做字段级过滤；日志仅记录 `requestId`，避免 PII。
- 限流：注册接口对同一 `OPENID` 幂等；可加频率限制防刷。

## 9. 验收标准（DoD）

- 新用户能在 2 分钟内完成注册提交；
- 审批人能在 30 秒内完成通过/拒绝；
- 游客可稳定浏览活动清单，并在报名时补齐姓名电话；
- `users.getProfile()` 能正确返回 `status/role/name`；
- 非授权操作返回统一错误 `{ ok:false, error:{ code:'E_PERM' } }`，前端提示清晰。

## 10. 测试用例（摘选）

- 注册：提交完整表单 → `status=pending`；缺少必填 → `E_VALIDATE`；亲属缺少关联信息 → `E_VALIDATE`。
- 审批：管理员通过 → `status=active` 且 `role` 生效；拒绝 → `status=rejected` 且带原因。
- 游客：访问活动页 → 能看到当前与近 14 天内已完成活动；报名时未补充信息 → 阻止并提示。
- 鉴权：`OPENID` 缺失 → `E_AUTH`；权限不足 → `E_PERM`。

## 11. 上线计划（P0）

- 后端：`users.register/listRegistrations/reviewRegistration` 三接口 + `activities.publicList` + `registrations.register`（guestContact 支持）。
- 前端：注册页脚手架、审批页新 tab、活动页公共视图与游客报名表单、路由守卫与游客模式开关。
- 指标：注册转化、审批时长、游客报名占比与转化率。

## 12. 变更记录

- v1：根据需求初稿，定义注册审批与游客模式的最小实现方案与接口契约。

---

## 13. 可行性分析（Feasibility）

- 技术可行性：
  - 前端：基于现有小程序框架与 `services/api.js` 扩展即可，已存在主题/守卫/审批页骨架可复用；新增注册页较低风险。
  - 后端：沿用云函数（TCB）与现有工具包（`packages/core-rbac`/`core-db`/`core-utils`）；按文档新增 3 个 `users` 动作与 1 个 `activities` 公共查询、`registrations` 游客参数扩展即可。
  - 数据库：新增/扩展 `Users`、`Activities`、`Registrations` 字段与索引；与现有集合兼容，迁移成本低。
- 组织可行性：审批人包含“管理员/社工”，与现行角色体系一致；无需引入短信/邀请码，降低落地门槛。
- 风险与对策：
  - PII 合规（姓名/电话/身份证）：后端严格日志脱敏、最小化字段输出，集合/索引不做跨集合联结暴露；仅用于注册/审批与本地匹配。
  - 网络/部署不稳定：客户端“乐观写 + 回退本地/重试”（星标逻辑已有先例），注册/审批页保留兜底提示与重试。
  - 身份证校验：前端宽松、后端严格；支持身份证尾号匹配患者以降低失败率；不与 `Users` 强制唯一绑定，可后续收敛。
- 时间评估（P0）：
  - 后端接口（5 个动作/查询+zod）：~0.5–1 天
  - 前端注册页+调用+状态流：~0.5–1 天
  - 审批页“用户审批”tab：~0.5 天
  - 游客模式活动视图与报名补充：~0.5–1 天
  - 合计：2–3 天（含联调与基本测试）

## 14. 系统设计（Detailed Design）

14.1 组件与边界
- MiniProgram（前端）：
  - 新增 `pages/auth/register`（注册表单）。
  - 扩展 `pages/approvals/index`（新增“用户审批”tab）。
  - 扩展活动页：增加“当前/最近两周已完成”视图与游客报名表单。
- 云函数（后端）：
  - `users`: `register` / `listRegistrations` / `reviewRegistration` /（已存在）`getProfile`。
  - `activities`: `publicList`（公共查询）。
  - `registrations`: `register`（支持 `guestContact`）。
  - 工具：`packages/core-rbac`, `packages/core-db`, `packages/core-utils`。
- 数据库：`Users` / `Activities` / `Registrations`（扩展字段与索引）。

14.2 关键数据流（文字时序）
- 注册：
  1) 前端提交表单 → `users.register(payload)`
  2) 后端 `upsert Users{ status:'pending', form... }` → 返回 `pending`
  3) 审批人在审批页 `users.listRegistrations()` 查看 → `reviewRegistration(approve|reject, role)`
  4) 通过 → `Users{ status:'active', role, roles:[role] }`；前端 `getProfile()` 生效
- 游客活动浏览：
  1) 前端选择游客模式 → 调 `activities.publicList({ window:'current'|'last14d' })`
  2) 游客报名 → `registrations.register({ activityId, guestContact })`
  3) 引导后续注册（非强制）

14.3 API 设计（示例请求/响应）
- `users.register(payload)`
  - Req: `{ name, phone, id_card, applyRole, relative? }`
  - Res: `{ ok:true, data:{ status:'pending' } }`
- `users.listRegistrations({ page=1, pageSize=20, status='pending' })`
  - Res: `{ ok:true, data:{ items:[{ openId,name,applyRole,phone,id_card,relative?,createdAt }], meta:{ total, hasMore } } }`
- `users.reviewRegistration({ openId, decision:'approve'|'reject', role?, reason? })`
  - Res: `{ ok:true, data:{ openId, status:'active'|'rejected', role? } }`
- `activities.publicList({ window, status? })`
  - `window='current'` → `status in ['open','ongoing']`
  - `window='last14d'` → `status='completed' AND endDate>=now-14d`
  - Res: `{ ok:true, data:{ items:[...] } }`
- `registrations.register({ activityId, guestContact? })`
  - 游客必须传 `guestContact={ name, phone }`
  - Res: `{ ok:true, data:{ id, status } }`

14.4 错误码约定
- `E_AUTH` 未登录/上下文无 OPENID；`E_PERM` 权限不足；`E_VALIDATE` 参数/状态不合法；`E_CONFLICT` 冲突；`E_INTERNAL` 服务器错误。

## 15. 数据库与索引（Indexes）

15.1 Users
- 字段：见 4.1
- 建议索引：
  - `openId`（唯一，或以 `_id` 作为 openId）
  - `status`（审批列表筛选）
  - `role`（后台查询/分组）
  - `createdAt`（倒序）

15.2 Activities
- 新增/确认：
  - `status`（open/ongoing/completed）+ `date`/`startDate`/`endDate`
  - `isPublic: boolean`（缺省 true）
- 索引：
  - `idx_status_date: { status:1, date:1 }`（已存在）
  - 如有 `endDate`：`idx_completed_endDate: { status:1, endDate:-1 }`

15.3 Registrations
- 扩展字段：`guestContact?: { name, phone }`, `userId?: openId`
- 索引：
  - `uniq_user_activity: { userId:1, activityId:1 }`（已存在）
  - `idx_activity_status: { activityId:1, status:1 }`（已存在）

## 16. 访问控制矩阵（摘要）

| 动作 | 角色 | 备注 |
|---|---|---|
| users.register | all（含 guest） | 创建/更新至 pending |
| users.listRegistrations | admin, social_worker | 审批列表 |
| users.reviewRegistration | admin, social_worker | 审批通过/拒绝 |
| users.getProfile | all | 返回 { role, status, name, … } |
| activities.publicList | all（含 guest） | 公共活动数据 |
| registrations.register | all | 游客需 guestContact |

## 17. 前端集成与守卫

- 新增页面：`pages/auth/register`。
- 审批页：在 `pages/approvals` 增加“用户审批”tab，复用现有卡片/交互样式。
- 守卫：
  - 需要 `admin|social_worker` 的页面：审批、统计导出等。
  - 游客白名单：活动页公共视图；其他页面引导注册或登录。
- 主题：`services/theme.applyThemeByRole` 增加 `guest` 配色与最小入口。

## 18. 观测与审计

- Metrics（写入 `Metrics` 或 `Observability` 方案）：注册提交量、审批通过率/时长、游客报名转化。
- 审计（`AuditLogs`）：注册/审批动作写入 `{ action:'user_register'|'user_review', actorId, targetOpenId, createdAt }`。

## 19. 实施计划与任务拆解（P0）

1) 后端
- `users.register`（zod 校验 + upsert Users）
- `users.listRegistrations`（RBAC + 分页）
- `users.reviewRegistration`（RBAC + 审计 + 状态流转）
- `activities.publicList`（窗口查询）
- `registrations.register`（游客 `guestContact` 支持）

2) 前端
- `services/api.js` 绑定上述接口
- `pages/auth/register` 表单 + 成功态
- `pages/approvals` 新 tab 与操作按钮
- 活动页公共视图与游客报名表单
- 守卫与主题扩展

3) 上线步骤
- 新索引变更应用（如有）
- 构建与部署：`pnpm run build:functions && pnpm run deploy:users && pnpm run deploy:activities && pnpm run deploy:registrations`
- DevTools 预览验证 + 小规模试运行

## 20. 兼容性与迁移

- `users.getProfile` 已扩展 `name/avatar` 字段，保持兼容旧前端（忽略未知字段）。
- 未启用短信/邀请码，后续可在 `register` 入参增加 `smsCode|inviteCode` 并在 zod 中设为可选。

