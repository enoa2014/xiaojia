# EP-00 平台与工程（Platform & Developer Experience）

## 目标
- 抽离与统一共享包（`core-rbac/core-db/core-utils`），减少重复实现，提升一致性与维护效率。
- 统一构建/运行时基线（Node 16）、构建脚本与模板片段，改善开发体验与发布稳定性。

## 业务价值（KPI）
- 代码重复片段（分页/排序/计数、RBAC 判定、错误映射）减少 ≥ 8 处。
- 函数构建一次通过率 ≥ 99%；冒烟成功率 100%。
- 文档一致性（契约/校验/模板）检查通过率 100%。

## 范围
- In：
  - 共享包能力对齐与落地：
    - `core-utils`：`ok/err/errValidate`、`mapZodIssues`
    - `core-db`：`getDB/getCmd/getOpenId`、`paginate()`
    - `core-rbac`：`isRole/hasAnyRole`
  - 渐进迁移：`patients/activities/services/tenancies/registrations` 采用共享能力（不改外部契约/错误码）。
  - 构建基线：`tsup` 目标统一 `node16`；必要时 `noExternal: ['wx-server-sdk']`。
  - 文档更新：`architecture/13-ts-templates.md` 补共享包示例；`user-stories`、Epic 索引更新。
- Out：
  - 引入新运行环境/云产品；重构领域逻辑（本 Epic 仅工程化）。

## 关键用户故事（示例）
- EP-00-S1 共享包抽离与迁移（core-rbac/core-db/core-utils）。

## 验收标准（Epic 级）
- 分页/排序/计数统一使用 `paginate()`，对外返回结构不变（按各域当前约定）。
- RBAC 判定统一使用 `hasAnyRole`；错误码与行为（`E_PERM`）一致。
- Zod 校验失败统一走 `mapZodIssues` + `errValidate` 文案。
- 构建：`pnpm run build:functions` 全部成功；目标运行时统一 Node 16。
- 文档：共享包示例与迁移说明更新到架构文档；故事/索引完整。

## API 契约影响
- 无新增/变更 API；保持 `{ ok:true,data } | { ok:false,error }` 与错误码集合。

## 数据模型与索引
- 无 schema 变更；仅查询路径与工具调用一致化。

## 权限与安全
- 不放宽权限；RBAC 判定入口统一，审计行为保持不变。

## 依赖与顺序
- 依赖：`docs/architecture/*`、`docs/api/contracts.md`、现有函数实现。
- 顺序：先列表路径（低风险）→ 审核/创建入口的 RBAC → 其余域补齐。

## 风险与假设
- 构建差异（外部依赖打包）→ 需要在个别函数设置 `noExternal`；小步验证。
- 排序/计数回退差异 → `paginate()` 采用单字段排序与 best-effort `count()`，失败降级。
- RBAC 记录形态差异 → `hasAnyRole` 兼容多种 `Users` 结构。

## 里程碑
- M1：`patients/activities/services` 接入共享工具并通过冒烟。
- M2：`tenancies/registrations` 接入并统一构建目标；文档更新完成。
- Close：全量回归通过、指标达标。

## 指标
- 重复片段减少计数；导入共享包的次数（≥ 每域 1 处）。
- 构建一次通过率；冒烟通过率；回归缺陷数。

## 变更记录
- v0.1 初始化（创建 EP-00 与范围/指标/风险）。
