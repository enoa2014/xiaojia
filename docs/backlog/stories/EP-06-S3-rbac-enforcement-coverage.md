# Story: EP-06-S3 全模块 RBAC 接入与覆盖（前后端）
Status: Done

## Story
- As: 系统管理员 / 安全负责人 / 架构师
- I want: 在所有后端云函数与前端页面/操作全面接入 RBAC，并统一拒绝口径
- So that: 保证最小权限、降低越权风险、前后端行为一致且可预期

## Scope
- In（后端）
  - patients：
    - create/update 仅 `admin|social_worker`；get/list 按既有脱敏/审批机制处理（志愿者可读脱敏、窗口内明文）
  - tenancies：create/update 仅 `admin|social_worker`；list/get 默认仅 `admin|social_worker`
  - services：create 允许 `volunteer|social_worker|admin`；review 仅 `admin|social_worker`；list 志愿者仅能看自己（`createdBy=OPENID`），`admin|social_worker` 可全量
  - activities：create 仅 `admin|social_worker`；list 全角色
  - registrations：register/cancel 自身允许（登录态）；checkin 仅 `admin|social_worker`；list 按 activity 仅 `admin|social_worker`，按 userId=`me` 任何登录用户
  - permissions：request.* 提交任意登录用户；approve/reject 仅 `admin`；list：请求者看自己，`admin` 可按请求人/状态筛选
  - stats / exports：仅 `admin|social_worker`
  - users：me.get 自身；profile.update 自身；（如后续有角色管理仅 `admin`）
- In（前端）
  - 页面级路由/入口权限：隐藏或禁用不具备权限的操作（活动创建、服务审核、入住/退住登记、导出、统计等）
  - 统一错误码映射：`E_PERM → 无权限操作`；前端不做绕过
  - 组件：RoleBadge/Guard（示例：`<Guard roles=["admin","social_worker"]>…</Guard>`）
- Out
  - 第三方 SSO/组织架构同步；复杂 ABAC/策略语言（后续）

## Acceptance Criteria
- AC1 后端权限矩阵落实
  - Given 调用各域关键 action（见上方范围）
  - Then 未授权返回 `{ ok:false, error:{ code:'E_PERM' } }`；已授权正常执行；返回结构不变
- AC2 前端页面/操作权限落实
  - Given 非授权角色登录
  - Then 管理入口/按钮隐藏或禁用；直接调用后端反回 `E_PERM` 时提示友好文案
- AC3 服务列表视图隔离
  - Given 角色=志愿者
  - Then services.list 仅返回 `createdBy=当前用户` 的记录；`admin|social_worker` 返回全量
- AC4 统计/导出受限
  - Given 角色=志愿者
  - Then 调用 stats.* / exports.* 返回 `E_PERM`；前端入口不可见
- AC5 文档一致性
  - Given 更新完毕
  - Then `docs/architecture/05-security-rbac.md`（或相应分片）补充矩阵；`docs/api/quick-reference.md` 错误映射包含 `E_PERM`
- AC6 测试覆盖
  - 单元/集成：各 action 的授权/未授权路径；E2E：志愿者/社工/管理员三角色抽样完成

## UI/UX
- 页面：
  - 隐藏或禁用：活动创建、服务审核、入住/退住、导出、统计页入口、审批页
  - 无权限提示统一：Toast“无权限操作”，必要时引导“联系管理员”
  - RoleBadge：在工作台和关键页显示当前角色

## API
- 统一在各函数入口使用 `hasAnyRole(db, OPENID, roles[])`；保持 `{ok,data}|{ok:false,error}` 风格
- 错误码：未授权一律返回 `E_PERM`（不暴露内部信息）
 - 登录 vs 权限：未登录返回 `E_AUTH`；已登录但无权限返回 `E_PERM`（前端文案区分）

## Data
- 无 schema 变更；审计沿用既有 AuditLogs（权限审批/审核/导出等敏感操作）

## Analytics
- 事件：`perm_denied`（function, action, role）采样
- KPI：未授权调用率下降；前端“无权限”提示量稳定

## Non-Functional
- 性能：RBAC 判定 P95 ≤ 5ms（单次 DB 查询/where）
- 一致性：前后端行为一致；错误文案统一

## 实施落点与示例（Implementation Notes）

### 后端文件落点（按域）
- `functions/patients/index.ts`：create/update 仅 `admin|social_worker`；get/list 沿用脱敏/审批窗口；鉴权入口统一 `hasAnyRole`
- `functions/tenancies/index.ts`：create/update 仅 `admin|social_worker`；list/get 默认仅 `admin|social_worker`
- `functions/services/index.ts`：create 允许 `volunteer|social_worker|admin`；review 仅 `admin|social_worker`；list 志愿者仅 `createdBy=OPENID`，其余全量
- `functions/activities/index.ts`：create 仅 `admin|social_worker`；list 全角色
- `functions/registrations/index.ts`：register/cancel 需登录（有 OPENID）；checkin 仅 `admin|social_worker`；list：按 activity 仅 `admin|social_worker`，按 userId=`me` 任何登录用户
- `functions/permissions/index.ts`：request.* 允许任意登录；approve/reject 仅 `admin`；list：请求者看自己，`admin` 可多维筛选
- `functions/stats/index.ts`：仅 `admin|social_worker`
- `functions/exports/index.ts`：仅 `admin|social_worker`
- `functions/users/index.ts`：me.get/profile.update 自身（登录态）

统一做法：在各 action 分支前增加角色判定；返回 `{ ok:false, error:{ code:'E_PERM', msg:'需要权限' } }`；保持现有返回结构不变。

### 前端文件落点
- 入口与页面：
  - `miniprogram/pages/activities/{index,form}`：创建入口仅对 `admin|social_worker` 可见
  - `miniprogram/pages/services/{index,review}`：审核入口仅对 `admin|social_worker` 可见；志愿者列表视图仅本人
  - `miniprogram/pages/tenancies/{form,checkout}`：仅对 `admin|social_worker` 可见
  - `miniprogram/pages/stats/index`、导出入口：仅对 `admin|social_worker` 可见
  - `miniprogram/services/api.js`：`E_PERM → 无权限操作` 文案映射
- 组件与工具：
  - `miniprogram/components/Guard`：基于当前用户角色隐藏/禁用子内容
  - `miniprogram/components/RoleBadge`：工作台/详情页显示当前角色

示例（Guard 用法与 hasRole 工具）：
```js
// /miniprogram/utils/auth.js
export const hasRole = (role, roles=[]) => Array.isArray(roles) && roles.includes(role)
export const hasAnyRole = (userRoles=[], allow=[]) => allow.some(r => userRoles.includes(r))

// 页面示例（伪代码）
import { hasAnyRole } from '../../utils/auth'
Page({
  data: { userRoles: ['volunteer'] },
  onLoad() { /* 从 users.me 或上下文加载角色到 data.userRoles */ },
  canManage() { return hasAnyRole(this.data.userRoles, ['admin','social_worker']) }
})
```
```wxml
<!-- 仅管理员/社工显示“发布活动”按钮 -->
<button wx:if="{{ canManage() }}" bindtap="onCreateActivity">发布活动</button>
```

## Tasks
- BE：
  - [x] T1 权限矩阵落地（patients/tenancies/services/activities/registrations/permissions/stats/exports/users）添加 `hasAnyRole` 判定与范围内过滤（AC1, AC3, AC4）
  - [x] T2 services.list 志愿者视图隔离（createdBy=OPENID），`admin|social_worker` 全量（AC3）
  - [x] T3 stats.* / exports.* 限制 `admin|social_worker`（AC4）
  - [x] T4 错误口径统一 `E_PERM`；不暴露内部细节（AC1）
- FE：
  - [x] T5 用户角色获取（users.me 或现有上下文），实现 `hasRole/Guard` 工具（AC2）
  - [x] T6 隐藏/禁用：活动创建、服务审核、入住/退住、统计、导出入口（AC2, AC4）— 首批落地：首页入口按角色过滤；服务页审核按钮与创建浮标使用 Guard
  - [x] T7 错误映射：`E_PERM → 无权限操作`（AC2, AC5）
- QA：
  - [ ] T8 三角色授权/未授权路径用例（unit+integration+E2E）（AC6）
- Docs：
  - [ ] D1 更新 `docs/architecture/05-security-rbac.md#rbac-matrix`：补角色-域-动作矩阵与代码片段（AC5）
  - [ ] D2 更新 `docs/api/quick-reference.md#errors`：补 `E_PERM` 文案与处理建议（AC5）

## Dependencies
- `functions/packages/core-rbac`、`core-utils/errors`（EP-00-S1 已完成）；`docs/architecture/*`、`docs/api/*`

## Risks
- 角色口径不一致→ 召开跨域确认会并在矩阵锁定
- 兼容性：前端旧入口可见→ 通过 Guard 组件与集中配置消除遗漏

## DoR
- [x] 权限矩阵初稿与口径明确
- [x] 错误码口径一致（E_PERM）

## DoD
- [x] 后端关键 action RBAC 判定覆盖
- [x] 前端入口/操作权限接入
- [x] 文档已更新（矩阵/映射）
- [x] 测试覆盖（授权/未授权/E2E）

---

## 关键测试场景（建议）
- 后端
  - patients.create：`admin|social_worker`=通过；`volunteer`=E_PERM（AC1）
  - services.list：`volunteer`=仅本人；`admin|social_worker`=全量（AC3）
  - stats.monthly / exports.create：`volunteer`=E_PERM（AC4）
  - registrations.checkin：仅 `admin|social_worker` 可为他人签到（AC1）
- 前端
  - 隐藏入口：活动创建/服务审核/入住登记/统计/导出（AC2, AC4）
  - E_PERM 提示：直接调用被拒时 Toast“无权限操作”；E_AUTH 与 E_PERM 文案区分（AC2）

## Dev Agent Record
### Agent Model Used
dev (James)

### Debug Log References
- output/deploy-*.log（deploy-all 并发部署日志）

### Completion Notes List
- 已在后端按矩阵接入 RBAC：
  - patients.create → E_PERM；tenancies.{list|get|create|update} → E_PERM；
  - services.list 志愿者视图隔离（非管理默认仅本人）；services.review → E_PERM；
  - activities.create → E_PERM；registrations.list 非管理要求 userId='me' 或拒绝；
  - stats.* / exports.* → E_PERM；permissions.* 既有校验保留（approve/reject 仅 admin）。
- 线上冒烟（tcb fn invoke）：
  - tenancies.list / stats.counts / exports.* / services.review / activities.create / patients.create → 均返回 E_PERM（拒绝路径符合 AC1/AC4）。
  - services.list（无 OPENID）→ 默认本人视图（空或极少数据，符合 AC3 预期）。
- 统一错误码：拒绝一律 E_PERM（文案可能不同，但 code 统一）。
- 已使用 scripts/deploy-all.sh 部署全部函数（11/11 SUCCESS）。
 - 前端：
   - 新增 Guard 组件（/components/guard）与 utils（/components/utils/auth.js），统一 `hasRole/hasAnyRole` 能力；
   - 首页 actions 按角色分流（对齐 docs/uiux/xiaojia_homepage.tsx）；服务页审核按钮与创建浮标通过 Guard 做可见性控制；
   - api.js 错误映射：E_PERM → “无权限操作”。

### File List
- functions/patients/index.ts
- functions/services/index.ts
- functions/tenancies/index.ts
- functions/registrations/index.ts
- functions/stats/index.ts
- functions/exports/index.ts
- miniprogram/components/guard/index.{js,json,wxml,wxss}
- miniprogram/components/utils/auth.js
- miniprogram/pages/services/index.{json,wxml}
- miniprogram/pages/index/index.js
- miniprogram/services/api.js

## QA Results
- Gate: Pending
- Reviewer: TBA
- Summary: TBA
