# Sprint 2 计划（2 周）

- Sprint Goal: 落地全域 RBAC 与审计闭环（后端 + 前端），统一错误口径与文档，完成安全与可追溯能力。
- Timebox: 10 个工作日（含 1 天缓冲）
- 环境: 单环境部署（ENV_ID=cloud1-3grb87gwaba26b64）

## 范围与故事（2）
1. EP-06-S3 全模块 RBAC 接入与覆盖（P0, M）
2. EP-06-S2 审计日志（Audit Logs）（P0, M）

## 排期（Sequencing）
- Week 1: EP-06-S3（后端鉴权 + 前端 Guard/入口可见性）；基础用例联调
- Week 2: EP-06-S2（审计写入一致化 + audits.list 查询 + 索引/文档）；回归与收尾

依赖：EP-00-S1 共享包（core-rbac/core-db/core-utils）已完成；以 `hasAnyRole / paginate / ok|err` 为统一基线。

## 交付物（Deliverables）
- Backend: 各域 action 接入 RBAC 判定；audits.list 查询接口；审计写入统一字段
- Frontend: 入口/操作权限可见性/禁用；`E_PERM` 错误映射与提示
- Docs: 安全矩阵与审计规范更新；API 契约与数据字典/索引
- Tests: 授权/未授权路径、前端可见性、查询分页/过滤、无明文校验

## 进度跟踪（Burndown）
- 统计：总 2 | 已完成 0 | 进行中 0 | 待办 2（初始化）
- 状态明细：
  - [ ] EP-06-S3 全模块 RBAC 接入与覆盖（P0, M）
  - [ ] EP-06-S2 审计日志（P0, M）

## DoR / DoD
- DoR: 权限矩阵初稿与口径明确；审计动作清单与字段规范明确；共享包基线就绪
- DoD: 后端鉴权覆盖 + 前端可见性落地；审计写入一致化 + 查询接口可用；文档/索引更新；用例通过

## Owner 分工（建议）
- Backend: 鉴权接入（S3）与审计接口实现（S2）
- Frontend: Guard/入口可见性（S3）与 `E_PERM` 映射
- QA: 授权/未授权路径、前端可见性、无明文与性能抽样
- PO/架构: 矩阵/规范对齐、风险把关、文档审阅

## 风险与缓解
- 口径不一致 → 先锁定矩阵与用语；按域灰度接入，减少回滚面
- 入口遗漏 → 通过 Guard 组件与集中配置清单双重校验
- 审计误记敏感明文 → 加规则/审查清单，并在测试用例中断言

## 任务拆解（摘要）
- S3（RBAC）：
  - BE：在 patients/tenancies/services/activities/registrations/permissions/stats/exports/users 统一 `hasAnyRole`；services.list 志愿者视图隔离（本人）
  - FE：实现 hasRole/Guard；隐藏/禁用创建/审核/入住/统计/导出入口；`E_PERM` 文案映射
  - QA：三角色授权/未授权路径 + 前端可见性校验
- S2（审计）：
  - BE：统一写入字段；新增 audits.list（分页/过滤/排序，RBAC=admin）
  - Docs：contracts（audits.list）、architecture（审计规范）、data/indexes（AuditLogs 字段与索引）
  - QA：写入/查询/RBAC/性能与无明文校验

## 变更记录
- v0.1 创建 Sprint 2 计划（纳入 EP-06-S3 / EP-06-S2）
