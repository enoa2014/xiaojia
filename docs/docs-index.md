# 文档索引与所有权（Docs Index & Ownership）

## 目标
- 确保文档可发现、可维护、可追责，降低知识散失风险。

## 角色约定（按职责，不写个人姓名）
- Owner（DRI）：直接负责、批准变更、对时效负责（如 PO/架构/后端/前端/QA/UX）。
- Reviewer：评审与把关，关注接口、验收、合规与一致性。
- Contributor：可以提交变更，需经 Owner/Reviewer 审核。

## 更新节奏（默认）
- 版本变更：发生需求/接口/数据结构变化时立即更新。
- 例行回顾：每个迭代开始与结束各一次；大版本前专项审阅。
- 过期阈值：关键文档（PRD、架构、API、数据字典）> 2 个迭代未更新需复核。

## 目录索引（路径 · 简述 · Owner/Reviewer · 更新频率）

- Product
  - docs/prd.md：产品需求文档（范围/验收/优先级）
    - Owner: PO/PM；Reviewer: 架构/QA；频率: 迭代变更/大版本
  - docs/product_outline.md：产品纲要（愿景/场景/矩阵）
    - Owner: PO/PM；Reviewer: 架构/UX；频率: 重大变更

- Architecture
  - docs/architecture.md：系统架构蓝图（前后端/数据/流程）
    - Owner: 架构；Reviewer: 后端/前端；频率: 架构变更/大版本

- UI/UX（目录）
  - docs/uiux/*：页面设计/规范/分析
    - Owner: UX；Reviewer: PO/前端；频率: 迭代内设计变更
  - 设计系统：docs/uiux/design-system/*（tokens、components、accessibility）
    - Owner: UX/前端；Reviewer: 架构/QA；频率: 组件或视觉规范变更
  - docs/uiux/page-specs/*.md：页面级实现细则（档案详情/服务表单/活动详情）
    - Owner: 前端/UX；Reviewer: 架构/QA；频率: 页面实现或交互变更
  - 红线标注交付：docs/uiux/handoff/redlines/*（按页面/组件拆分）
    - Owner: UX；Reviewer: 前端/PO/QA；频率: 开发前必备与变更同步

- Backlog
  - docs/backlog/user-stories.md：用户故事库（含验收标准）
    - Owner: PO；Reviewer: QA/前端/后端；频率: 每迭代
  - docs/backlog/definition-of-ready-done.md：DoR/DoD 就绪/完成定义
    - Owner: PO；Reviewer: QA；频率: 变更较少（按需）
  - docs/backlog/epics/README.md：Epic 索引与分片（EP-01..06）
    - Owner: PO；Reviewer: 架构/后端/前端/QA；频率: 迭代规划时
  - docs/backlog/stories/*：详细故事（示例：EP-01-S1、EP-03-S1）
    - Owner: PO；Reviewer: QA/前端/后端；频率: 每故事创建/变更
- API
  - docs/api/contracts.md：云函数/API 契约（I/O/分页/错误码）
    - Owner: 架构/后端；Reviewer: 前端/QA/PO；频率: 任一接口变更即更新
  - docs/api/error-codes.md：错误码与前端处理
    - Owner: 后端；Reviewer: 前端/QA；频率: 新增/调整时
  - docs/api/quick-reference.md：API 快速参考（调用封装、分页/过滤/排序、退避重试）
    - Owner: 前端/后端；Reviewer: QA/PO；频率: 接入层更新
  - docs/api/mocks/postman_collection.json：API Mock 集合（原型与样例）
    - Owner: 前端/后端；Reviewer: QA/PO；频率: Mock/原型更新
  - docs/api/mocks/thunder-collection.json：Thunder Client 集合（VS Code）
    - Owner: 前端/后端；Reviewer: QA/PO；频率: Mock/原型更新
  - docs/api/mocks/README.md：Mock 导入与使用说明
    - Owner: 前端；Reviewer: QA；频率: 工具或网关变更

- Data
  - docs/data/data-dictionary.md：数据字典（集合/字段/索引）
    - Owner: 架构/后端；Reviewer: QA/PO；频率: 任何 schema 变更
  - docs/data/field-masking-matrix.md：字段级脱敏矩阵（角色/审批）
    - Owner: 架构/PO；Reviewer: 后端/前端；频率: 权限/安全策略变更
  - docs/data/init-from-b-reg.md：入住登记表导入方案
    - Owner: 后端；Reviewer: 架构/PO/QA；频率: 导入流程调整
  - docs/data/import-runbook.md：原始数据导入运行手册（流程/规则/产物/索引/关联）
    - Owner: 后端；Reviewer: 架构/PO/QA；频率: 每次导入/规则调整
  - docs/data/migration-quality-plan.md：数据迁移与质量保障（流程/门禁/回滚/AQL）
    - Owner: 后端；Reviewer: QA/架构/PO；频率: 每次迁移前复核

- Specs
  - docs/specs/validation-rules.md：表单与业务校验规则
    - Owner: 后端/前端；Reviewer: QA/PO；频率: 规则变更

- Testing
  - docs/testing/test-plan.md：测试计划（范围/策略/用例）
    - Owner: QA；Reviewer: PO/后端/前端；频率: 每迭代
  - docs/qa/gates/*：质量门（Gate）结论与问题清单
    - Owner: QA；Reviewer: PO/架构；频率: 每故事/模块复核
  - docs/qa/reports/*：QA 评审与复检报告（按故事/主题归档）
    - Owner: QA；Reviewer: PO/团队；频率: 每次评审/复检

- Process
  - docs/process/engineering-guidelines.md：工程规范与协作流程
    - Owner: 后端负责人；Reviewer: 架构/前端/QA；频率: 流程变更/季度回顾

- Reports
  - docs/reports/milestone-brief-2025-09-06.md：里程碑进展简报（阶段性进度/风险/建议）
    - Owner: PO/PM；Reviewer: 架构/QA；频率: 每迭代/重要节点

## 变更流程
- 提交流程：以 PR 形式提交，标注 `type:docs` 与对应域标签（如 `docs:api`）。
- 同步要求：涉及多文档的变更需在同一 PR 中统一更新（PRD/契约/数据字典/校验）。
- 记录要求：在对应文档末尾追加“变更记录”小节（含日期/要点/PR 链接）。

## 健康检查（每迭代例行）
- 覆盖度：是否存在无 Owner 的文档？
- 时效性：关键文档是否超过 2 个迭代未更新？
- 一致性：PRD ⇄ API 契约 ⇄ 数据字典 ⇄ 校验是否一致？
- 可发现：新增文档是否已被加入本索引？

## 维护日志
- 2025-09-05 建立索引与所有权框架（初版）。

- 2025-09-05 新增导入运行手册；记录合并/剔除规则、JSONL 产物、索引与关联流程。


- Additions
  - docs/process/coding-standards.md：编码规范（前端/云函数）
  - docs/data/data-model.md：数据模型蓝图（实体/关系/约束/索引）
  - docs/api/prototype.md：API 原型样例（请求/响应/调用片段/Mock 建议）

- 2025-09-06 更新
  - 实现 Tenancies 后端 API：list/get/create/update；支持 `filter.patientId|id_card|room|bed|checkInDate`、单字段排序、`clientToken` 幂等、补助金额两位小数校验；默认 `checkInDate desc`。
  - 冲突策略：采用方案A（前端软提示），提交前以 `list` 预检并弹窗确认；后端不阻断（后续可配置为强校验）。
  - 同步更新文档：
    - contracts.md：Tenancies 标记为“已实现”，细化行为与规则。
    - validation-rules.md：床位冲突为默认软提示（不阻断），支持后续升级为强校验。
    - data-dictionary.md：Tenancies 增加 `createdAt`、可选 `id_card` 字段与索引建议。
  - 新增：docs/reports/milestone-brief-2025-09-06.md（本次里程碑简报）。
  - QA 同步：EP-02-S2 退住登记 Gate 由 CONCERNS → PASS；更新故事 `EP-02-S2-tenancy-checkout.md`（状态 Done + QA 结果）。
  - QA 同步：EP-06-S2 审计日志 Gate 标记为 PASS；统一审计字段与 `requestId` 顶层记录；更新 `EP-06-S2-audit-logs.md` 与 Gate 文档。
  - QA 同步：EP-06-S3 全模块 RBAC 覆盖 Gate 标记为 PASS；补充 RBAC 矩阵到 `architecture/05-security-rbac.md`。
  - Sprint 3：新增计划 `docs/backlog/sprint-3-plan.md`；拆分并创建故事：
    - EP-05-S1 月度统计展示（Planned）
    - EP-05-S2 导出 Excel（临时链接）（Planned）
    - EP-00-S2 观测与告警（Planned）
    - EP-00-S3 前端埋点接入与校验（Planned）
