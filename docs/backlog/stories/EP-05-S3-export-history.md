# Story: EP-05-S3 导出历史列表（Export Tasks History）
Status: In Progress

## Story
- As: 管理员/社工
- I want: 查看我创建的导出任务历史记录（状态/进度/下载链接）
- So that: 便于追踪导出执行情况与复用下载链接

## Scope
- In:
  - 新增 `exports.history({ page,pageSize }) -> { items, hasMore }`
  - 仅管理员/社工可访问；按 `createdBy` 限定
  - 前端导出中心页接入历史列表并支持刷新
- Out:
  - 历史记录删除/清理策略（后续）

## Acceptance Criteria
- AC1 历史加载
  - Given 管理员/社工进入导出中心
  - When 调用 `exports.history({ page,pageSize })`
  - Then 返回 `{ items, hasMore }` 且按时间倒序
- AC2 访问控制
  - Given 非授权用户
  - When 请求 `exports.history`
  - Then 返回 `E_PERM`
- AC3 复制下载链接
  - Given 历史项含 `downloadUrl`
  - When 点击“复制”
  - Then 成功复制并提示

## UI/UX
- 复用现有导出中心历史面板；当无记录时显示 EmptyState

## API
- BE：`exports.history({ page,pageSize }): { items, hasMore }`（过滤条件：`createdBy=OPENID` 或管理员权限）
- FE：`api.exports.history({ page,pageSize })`

## Data
- ExportTasks：`type` `params` `status` `downloadUrl?` `expiresAt?` `createdBy` `createdAt` `retries` `maxRetries`
- 索引：`createdBy+createdAt desc`

## Non-Functional
- 性能：分页查询 P95 ≤ 500ms
- 安全：仅返回当前用户创建的任务或管理员可见

## Tasks
- BE（S-M）
  - [x] `functions/exports`：新增 `history({ page,pageSize })`（RBAC+分页+按 createdBy 过滤）
- FE（S）
  - [x] `services/api.js`：增加 `exports.history(params)`
  - [x] `pages/exports/index.js`：接入历史加载/刷新/空态；复制链接
- QA（S）
  - [ ] 授权/未授权访问；分页与 hasMore；复制链接

## 验收清单
- [ ] 授权用户能看到自己的导出历史（倒序），未授权返回 `E_PERM`
- [ ] 历史列表分页加载与刷新正常；空态提示友好
- [ ] 复制下载链接成功并提示

## Dev Agent Record
- Agent Model Used: dev (James)
- What Changed: 新增导出历史接口并接入前端

## DoR
- [x] 差距来源：`docs/api/interface-gaps.md`
- [x] 现有导出创建/状态轮询已可用（EP-05-S2）

## DoD（暂定）
- [ ] AC 全通过；
- [ ] 文档与 QA 用例更新；
- [ ] 审计策略（可选）。

---

## Dev Agent Record

### Agent Model Used
dev (James)

### Tasks / Subtasks Checkboxes
- [x] 后端 `exports.history`：分页/排序/过滤 createdBy；返回 `{ items, hasMore }`
- [x] 前端导出页：`loadExportHistory()` 兼容对象形状并规范显示
- [x] API 层：新增 `api.exports.history`
- [ ] QA：授权/未授权/分页/复制用例

### Debug Log References
- Updated `functions/exports/index.ts`: add `history` action using paginate
- Updated `miniprogram/services/api.js`: add `exports.history`
- Updated `miniprogram/pages/exports/index.js`: load and render history list

### Completion Notes List
- 历史列表可展示；hasMore 预留（后续可加分页加载）

### File List
- Modified: `functions/exports/index.ts`
- Modified: `miniprogram/services/api.js`
- Modified: `miniprogram/pages/exports/index.js`

### Status
Ready for Review

## 自检清单（Story Draft Checklist）
- [x] Story: As / I want / So that 明确
- [x] Scope: In/Out 明确（仅历史列表，不含清理策略）
- [x] Acceptance Criteria: 历史加载/访问控制/复制链接
- [x] UI/UX: 历史面板/EmptyState/错误提示
- [x] API: exports.history 入参出参/分页/hasMore
- [x] Data: ExportTasks 字段与索引
- [x] 校验与安全: RBAC、仅本人可见
- [x] Analytics: 可选导出历史查看埋点（后续）
- [x] NFR: 性能与可用性
- [x] Tasks: FE/BE/QA 可执行分解
- [x] Dependencies & Risks: 依赖 EP-05 既有导出流
- [x] DoR/DoD: 勾选就绪与完成条件
