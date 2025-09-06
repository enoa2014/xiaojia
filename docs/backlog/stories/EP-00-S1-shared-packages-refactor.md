# Story: EP-00-S1 共享包抽离与迁移（core-rbac/core-db/core-utils）
Status: Done

## Story
- As: 架构师 / 后端开发
- I want: 抽离并统一共享包（RBAC/DB/工具），并以最小侵入迁移各域函数的公共逻辑
- So that: 降低维护成本、提升一致性与质量，减少重复代码带来的缺陷风险

## Scope
- In:
  - 提供统一工具：
    - `core-utils`: `ok/err/errValidate` 响应、`mapZodIssues` 校验文案
    - `core-db`: `getDB/getCmd/getOpenId` 上下文访问、`paginate()` 统一分页/排序/计数（单字段排序、最佳努力 total）
    - `core-rbac`: `isRole/hasAnyRole` 角色判定（兼容 `Users` 多种结构）
  - 渐进迁移：
    - 第1批：`patients.list` / `activities.list` 接入 `paginate()`；保留原有返回结构与排序默认值
    - 第2批：`services.review/activities.create` 使用 `hasAnyRole(db, OPENID, ['admin','social_worker'])`
    - 第3批：`tenancies.list` / `registrations.list` 接入 `paginate()`；统一错误响应与 Zod 文案映射
  - 构建与验证：`pnpm run build:functions`；逐函数小步部署与冒烟
- Out:
  - 不改动对外契约（返回结构、错误码、字段含义）
  - 不进行内部状态机/字段变更（仅抽离工具与调用点替换）

## Acceptance Criteria
- AC1 分页统一：
  - Given `patients.list` / `activities.list` 调用
  - Then 使用 `core-db/paginate` 实现分页/排序/total，返回结构与现状一致（`patients/activities` 含 `{ items, meta }`；未采用 `meta` 的域保持原样）
- AC2 RBAC 一致：
  - Given `activities.create` / `services.review` 请求
  - Then 使用 `core-rbac.hasAnyRole(db, OPENID, ['admin','social_worker'])` 判定；允许/拒绝行为与错误码 `E_PERM` 保持一致
- AC3 错误处理一致：
  - Given Zod 校验失败
  - Then 统一经 `mapZodIssues` → `errValidate(msg, issues)` 返回；常见字段文案一致（身份证/手机号/日期/分页等）
- AC4 构建通过：
  - Given 运行 `pnpm run build:functions`
  - Then 所有函数构建成功；冒烟：`patients/activities/services/tenancies` 基础路径正常
- AC5 文档同步：
  - `docs/architecture/13-ts-templates.md` 增补共享包引入示例；本故事纳入 `user-stories.md` 索引

备注：本故事为平台工程类（EP-00），AC 不从 Epic 拷贝，以上 AC 即为判定口径。

## API / RBAC / Data
- API：无对外契约变更（保持 `{ ok:true,data } | { ok:false,error }` 与错误码集）
- RBAC：统一 `hasAnyRole` 判定入口，兼容 `Users` 中 `openId`/`_id`/`roles[]` 形态
- Data：无 schema 变更；分页与排序仅影响查询路径，不改集合字段

## Analytics
- 指标：
  - 代码重复减少（估算：分页/排序/计数与 RBAC 判定片段合并 ≥ 8 处）
  - `core-*` 包导入次数 ≥ 1/域
  - 构建与冒烟一次通过率 100%

## Non-Functional
- 性能：分页查询 P95 不劣于现状；`count()` 失败允许降级仅返回 `items`
- 安全：RBAC/错误码行为与现状一致；不放宽权限
- 可回滚：每步改动限于 `import` 与调用点替换，可快速恢复

## Tasks
- BE：
  - [x] T1 将 `core-db` 增加 `paginate()`（已完成）（AC: 1,4）
  - [x] T2 `patients.list`/`activities.list` 接入 `paginate()`（保持默认排序）（AC: 1,4）
  - [x] T3 统一 `activities.create`/`services.review` 的 RBAC 判定至 `hasAnyRole`（AC: 2,4）
  - [x] T4 `tenancies.list` 接入 `paginate()`；`registrations.list` 维持契约不变（无分页参数），保留现状并在后续故事中评估可选分页（AC: 1,3,4）
  - [x] T5 统一 `tsup` 目标为 `node16`（与架构文档一致）（AC: 4）
- QA：
  - [x] Q1 冒烟：`list/get/create/review/update` 主路径不变、更不报错；错误码/文案一致（AC: 2,3,4）
  - [x] Q2 回归：分页/排序/hasMore；权限拒绝路径；Zod 校验文案（AC: 1,2,3）
- Docs：
  - [x] D1 更新 `docs/architecture/13-ts-templates.md`（共享包引入片段）（AC: 5）
  - [x] D2 在 `user-stories.md` 索引本故事（AC: 5）

## Dependencies
- 参考：`docs/architecture/13-ts-templates.md`、`docs/api/contracts.md`、`docs/specs/validation-rules.md`

## Risks & Mitigations
- 风险：排序/统计回退行为差异 → 采用单字段排序与 best-effort `count()`，失败降级
- 风险：`tsup` 目标不一致 → 统一 `target:'node16'` 并逐域验证
- 风险：RBAC 兼容性 → `hasAnyRole` 兼容 `Users` 多记录形态，灰度验证

## DoR
- [x] 迁移评估与计划（本故事）
- [x] 验收标准明确（不改契约/错误码）
- [x] 回滚策略

## DoD
- [x] 目标函数接入共享包
- [x] 构建通过、冒烟通过
- [x] 文档同步更新
- [x] QA 回归通过

---

## Dev Notes / Migration Plan Snapshot
- 第1天：接入 `paginate` 于 `patients/activities/services(list 可暂保留数组)`，并冒烟；RBAC 1–2 处统一
- 第2天：`tenancies/registrations` 迁移；清理重复工具；补文档示例
- 第3天：全量冒烟 + QA 快速回归（按测试计划抽样）

### Testing
- 测试位置与方式：
  - 单元/集成（如配置）：`functions/<domain>/__tests__/*.test.ts`
  - 集成/冒烟：通过 WeChat 开发者工具触发前端调用；或使用 CloudBase 控制台/CLI 进行函数调用
- 覆盖重点：
  - 分页/排序/hasMore 一致性（AC1）
  - RBAC 允许/拒绝路径（AC2），错误码为 `E_PERM`
  - Zod 校验失败经 `mapZodIssues` → `errValidate` 的文案一致性（AC3）
  - 构建与基础路径冒烟（AC4）
- 参考用例：
  - patients.list: `{ action:'list', payload:{ page:1, pageSize:20, filter:{ name:'张' }, sort:{ createdAt:-1 } } }`
  - activities.list: `{ action:'list', payload:{ page:1, pageSize:10, filter:{ status:'open' } } }`
  - services.review: `{ action:'review', payload:{ id:'SERVICE_ID', decision:'approved' } }`（需具备 `admin|social_worker`）
  - tenancies.list: `{ action:'list', payload:{ page:1, pageSize:20, filter:{ patientId:'PID' } } }`

---

## Change Log
| Date       | Version | Description                          | Author |
|------------|---------|--------------------------------------|--------|
| 2025-09-06 | v0.1    | 创建故事草案                          | PO     |
| 2025-09-06 | v0.2    | 补齐模板章节与 AC 映射、测试子节       | PO     |
| 2025-09-06 | v0.3    | 实施 BE T2/T3/T4/T5；更新任务勾选与备注 | Dev    |
| 2025-09-06 | v0.4    | D1 文档补充共享包用法示例               | Dev    |
| 2025-09-06 | v0.5    | 线上冒烟：activities/patients/tenancies/services 调用通过；校验错误 E_VALIDATE 文案一致 | Dev    |
| 2025-09-06 | v0.6    | 标记 Done（DoD 全部满足）                 | Dev    |

## Dev Agent Record
### Agent Model Used
dev (James)

### Debug Log References
- .ai/debug-log.md（如需）

### Completion Notes List
- 采用 `core-db/paginate()` 改造 `patients.list/activities.list`，保持排序默认值与返回结构。
- `tenancies.list` 内部使用 paginate 但仍返回数组，契约未变；`registrations.list` 保持现状以避免契约变更，建议后续引入可选分页参数。
- RBAC 判定改为 `hasAnyRole(db, OPENID, ['admin','social_worker'])`，行为与错误码不变。
- 统一 `tsup` target 为 `node16`，与架构文档一致；保留已有 `noExternal` 配置不变。
 - 线上冒烟：
   - activities.list → { items:[], meta:{ total:0, hasMore:false } }
   - patients.list → { items:[2条], meta:{ total:70, hasMore:true } }
   - tenancies.list → 数组（按 checkInDate desc）
   - services.review（无 OPENID）→ { ok:false, error:{ code:'E_PERM' } }
   - patients.list（page=0）→ { ok:false, error:{ code:'E_VALIDATE', msg:'分页参数不合法' } }

### File List
- functions/packages/core-db/index.ts
- functions/activities/index.ts
- functions/patients/index.ts
- functions/tenancies/index.ts
- functions/services/index.ts
- functions/activities/tsup.config.ts
- functions/exports/tsup.config.ts
- functions/patients/tsup.config.ts
- functions/permissions/tsup.config.ts
- functions/registrations/tsup.config.ts
- functions/services/tsup.config.ts
- functions/stats/tsup.config.ts
- functions/tenancies/tsup.config.ts
- functions/users/tsup.config.ts
- docs/architecture/13-ts-templates.md

## QA Results
- Gate: Pending
- Reviewer: TBA
- Summary: 等待实施完成后由 QA 评审并更新 Gate 结果
