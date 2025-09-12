# Story: EP-07-S1 用户注册提交与等待
Status: Done

## Story
- As: 新用户（志愿者/亲属）
- I want: 在小程序内提交注册资料（姓名/电话/身份证号；亲属需关联患者信息）
- So that: 等待管理员/社工审批后获得相应权限

## Scope
- In: 注册页表单、字段校验、提交成功进入等待态（pending）
- Out: 审批动作（另故事）；短信验证码/邀请码

## Acceptance Criteria
- AC1 成功提交
  - Given 必填字段完整，亲属选择时已填写关联患者信息
  - When 点击“提交”
  - Then 返回 `{ ok:true, data:{ status:'pending' } }` 并进入等待态
- AC2 字段校验
  - 姓名：2–30 字；电话：大陆 11 位；身份证：18 位（前端宽松，后端严格）
  - 缺失或不合法 → 内联错误 + Toast；不发起请求
- AC3 幂等
  - 同一用户重复提交（内容一致）→ 后端返回现状 `status:'pending'`，前端提示“已提交，等待审批”
- AC4 隐私与权限
  - 表单仅在前端展示；提交后不在页面回显完整身份证；本地不持久化敏感字段

## UI/UX
- 页面：`pages/auth/register`（新）
- 字段：
  - 通用：`name*`，`phone*`，`id_card*`，`applyRole*: volunteer|parent`
  - 亲属扩展：`relative.patientName*`，`relative.relation*`（father|mother|guardian|other），`relative.patientIdCard*`
- 交互：字段实时校验；提交 Loading；成功进入“等待审批”态并支持返回首页

## API
- `users.register({ name, phone, id_card, applyRole, relative? })`
  - 返回：`{ ok:true, data:{ status:'pending' } }` | `{ ok:false, error }`
  - 错误码：`E_VALIDATE|E_INTERNAL`
- `users.getProfile()`：用于刷新 `status/role/name`

## Data
- Users：upsert `{ openId, status:'pending', name, phone, id_card, applyRole, relative, createdAt, updatedAt }`
- 索引：`openId` 唯一，`status`，`createdAt`

## Analytics
- 事件：`register_submit`、`register_result`（success|error_code, duration, requestId）

## Non-Functional
- 端到端 ≤ 1.2s；后端 ≤ 600ms
- 退避重试：`E_RATE_LIMIT|E_DEPENDENCY|E_INTERNAL` 500ms×2，≤3 次，抖动 30%

## Tasks
- FE：注册页 UI + 校验 + 调用；等待态；错误映射
- BE：zod 校验 + upsert；现状返回；错误码统一
- QA：完整/缺失/非法/重复提交/网络失败

## Dependencies
- docs/auth/registration-auth-spec.md

## Risks
- 亲属匹配精度不足：先采集文本，后续后台回填 patientId

## DoR
- [ ] 字段规格与文案确认
- [ ] API 契约与错误码对齐

## DoD
- [ ] AC 全部通过；用例通过；文档更新

## 自检清单（Story Draft Checklist）
- [x] Story: As / I want / So that 明确、聚焦注册提交
- [x] Scope: In/Out 明确（不含短信/邀请码）
- [x] Acceptance Criteria: 成功/校验/幂等/隐私覆盖
- [x] UI/UX: 页面/字段/交互/等待态
- [x] API 映射: users.register/getProfile；错误码与重试
- [x] Data 对齐: Users 字段与索引
- [x] 校验与安全: 前后端校验、最小输出、日志脱敏
- [x] Analytics: register_submit/result 事件
- [x] NFR: 性能/退避/幂等目标
- [x] Tasks: FE/BE/QA 可执行
- [x] Dependencies & Risks: 规范链接与风险说明
- [x] DoR/DoD: 就绪与完成条件可检

## Dev Agent Record
- Agent Model Used: OpenAI Codex CLI (o4-mini)
- Debug Log References: N/A
- Completion Notes List:
  - 前端新增/完善注册页 `pages/auth/register`，实现字段校验、提交与等待态；修正 API 导入路径。
  - 接入埋点：`register_submit` / `register_result`（含 requestId、时长、结果码），遵循不记录 PII 原则。
  - 后端已具备 `users.register` 与 `users.getProfile`；校验与幂等逻辑齐全（zod）。
  - 新增 `indexes.schema.json` 的 `Users` 索引：`openId` 唯一，`status+createdAt`，`createdAt`。
  - 构建校验：`functions/users` 通过 `tsup` 构建。
- File List:
  - miniprogram/pages/auth/register/index.js（修正导入与埋点、隐私清理）
  - miniprogram/pages/auth/register/index.json（修正 usingComponents 为相对路径 ../../components/*）
  - miniprogram/pages/auth/register.js（删除，避免与目录式页面冲突）
  - miniprogram/pages/auth/register.wxml（删除，避免与目录式页面冲突）
  - indexes.schema.json（新增 Users 索引）
  - functions/users/index.ts（无需改动，仅构建验证）

## Change Log
| Date       | Version | Description                               | Author |
|------------|---------|-------------------------------------------|--------|
| 2025-09-11 | 1.0     | 实现 FE/BE 与索引，接入埋点，提交评审         | Dev    |

## QA Results
- Gate: PASS
- Reviewer: Quinn（QA/Test Architect）
- Summary: 已清理遗留单文件页面，仅保留目录式页面；功能联通，校验/幂等/隐私符合标准。NFR 性能验证待采样记录（低风险，纳入监控）。

Findings by Acceptance Criteria
- AC1 成功提交：PASS
  - 后端 `users.register` 返回 `{ status:'pending' }`；前端根据返回进入“等待审批”态并清理敏感字段，交互符合预期。
- AC2 字段校验：PASS
  - 前端实现长度/正则校验与内联错误提示；非法不发起请求；亲属模式下条件校验齐备。
- AC3 幂等：PASS
  - 后端对相同内容重复提交直接返回现状 `pending`；前端提示“已提交，等待审批”。
- AC4 隐私与权限：PASS
  - 提交后不回显完整身份证；本地清理 `id_card/relative.patientIdCard`；Profile/列表接口不回传敏感字段，电话脱敏。

Non-Functional / Risks
- 性能验证：MONITOR（端到端≤1.2s、后端≤600ms 待补采样与 P95 记录）。
- 代码一致性：RESOLVED（已删除单文件页面，避免与目录式页面冲突）。
- 埋点一致性：INFO（已上报 `register_submit/register_result`，可选补充 canonical 映射以统一观测）。

Recommendations
- R1 NFR 验证：通过 DevTools/云函数日志采样验证端到端与后端时延，记录 P95；必要时优化加载与调用路径。
- R2 观测改进（可选）：在 `services/analytics.js` 增加 register 事件的 canonical 映射；在测试计划中校验埋点上报。
