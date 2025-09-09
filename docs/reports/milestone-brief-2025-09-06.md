# 里程碑进展简报（2025-09-06）

- Owner: PO/PM（产品） · Reviewer: 架构/QA
- 范围：MVP 核心域（患者/入住/服务/活动/权限）与支持能力（导入/初始化）
- 最后更新：2025-09-09

## 总体进度
- MVP 核心域已贯通（患者、入住/退住、服务、活动/报名、字段级权限），前后端联通。
- 单环境 prod 运行；部署与脚本在 `package.json` 与 `docs/architecture.md` 已约定。
- 文档一致性：PRD/架构/契约/数据字典/校验规则基本对齐。

## 已交付（后端/API）
- patients：`list/get/create` 完成；过滤/分页/meta；校验统一 `E_VALIDATE`。
- tenancies：`list/get/create/update` 完成；`create` 幂等；`update` 最近未退住保护 + 日期校验。
- services：`create/review` 完成；审核 RBAC + 审计。
- activities：`create/list/get` 完成；仅 `admin|social_worker` 可创建。
- registrations：`register/cancel/checkin` 完成；容量/候补/签到幂等。
- permissions：`request.submit/approve/reject/list` 完成；与 `patients.get` 明文/脱敏联动。

## 已交付（前端/小程序）
- 页面：`patients/{index,detail,form,search}`、`services/{index,form}`、`activities/{index,detail,form}`、`tenancies/{form,checkout}`、`permissions/apply`、`stats/index`、首页工作台。
- API 封装：`miniprogram/services/api.js` + `callWithRetry`；空/错态与 A11y 落地。
- 组件库：RoleBadge（7.4）、StatCard（7.5）、ActionCard（7.6）、Empty/Error（7.7）、Button（7.8）、FormField（7.9）落地；新增 Demo 页面 `pages/{role-badge-demo,stat-card-demo,action-card-demo,empty-error-demo,button-demo,form-field-demo}`；对应测试计划与 QA 报告已入库。
- 表单页组件化（7.10）：已完成（activities/tenancies/patients 三页统一 `ui-button` + `ui-form-field`）。
- Skeleton 统一（7.11）：已完成（`loading-skeleton` 组件上线；patients/{index,detail} 接入，时序≤300ms，A11y补强）。
- 活动日历视图（7.12）：已完成（activities/index 集成 calendar-view；月/周切换、状态筛选、详情跳转、报名/签到；占位与骨架统一；A11y补强）。

## QA & 测试
- Gate 结果：PASS（EP-01-S1/S2/S3、EP-03-S1/S2、EP-04-S1/S2、EP-06-S1/S2/S3、EP-02-S1/S2）。
- 测试计划：`docs/testing/test-plan.md` 覆盖单元/集成/E2E/安全/性能与门槛。

## 数据与安全
- 数据模型与字典就绪；字段脱敏矩阵明确（角色/审批）。
- 审计：审批与明文读取写入 `AuditLogs`；错误码统一。
- 索引：按 `indexes.schema.json` 补齐组合索引并核验执行计划。

## 差距与风险
- 埋点缺口：`tenancy_create_submit/result` 等未接；需纳入测试校验。
- 床位冲突并发保护：当前仅前端软提示，缺后端强约束（视冲突率决策）。
- 统计/导出：`stats/exports` MVP 与定时任务未联调；告警/观测待补。
- 共享包：已抽离并接入 `functions/packages`（`core-rbac/core-db/core-utils`）；仍需持续迁移剩余重复片段并统一用法。
 - 表单页组件化（7.10）：`activities/form` 仍为自定义字段容器，未纳入 `ui-form-field` 管理；A11y 与错误呈现待统一。

## 下两周建议计划
- Gate 维护：保持 Gate 与实现同步，新增/变更附回归证据（含 EP-02-S2 已 PASS 的维持）。
- 埋点接入：补齐缺失事件并在测试计划中加入埋点校验。
- 并发评估：采样监控床位/报名并发冲突，必要时启用后端强校验/唯一键。
- 统计/导出：交付 `stats.monthly/yearly`、`exports.*` 与 CRON 配置；接入告警与观测。
- 索引核验：关键查询采样查看执行计划，确保组合索引生效。
- 共享包推进：在已抽离基础上，推进各域迁移与统一使用，降低重复实现与维护成本。
 - 表单页组件化（7.10）：完成 `activities/form` 的 `ui-form-field` 替换与回归；统一错误映射与 ARIA 关联。

## 待决策/协作请求
- 床位冲突策略：是否升级为强校验（`E_CONFLICT`）或加唯一索引占位？
- 埋点优先级：确认 MVP 必须项清单与验收口径。
- 统计/导出范围：确认首批统计维度与导出格式，便于接口落地与联调。
