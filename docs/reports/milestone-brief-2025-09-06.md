# 里程碑进展简报（2025-09-06）

- Owner: PO/PM（产品） · Reviewer: 架构/QA
- 范围：MVP 核心域（患者/入住/服务/活动/权限）与支持能力（导入/初始化）
- 最后更新：2025-09-06

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

## QA & 测试
- Gate 结果：PASS（EP-01-S1/S2/S3、EP-03-S1/S2、EP-04-S1/S2、EP-06-S1、EP-02-S1）。
- EP-02-S2：故事实现标记 Ready for Review；Gate 仍为草案，需更新并补回归记录。
- 测试计划：`docs/testing/test-plan.md` 覆盖单元/集成/E2E/安全/性能与门槛。

## 数据与安全
- 数据模型与字典就绪；字段脱敏矩阵明确（角色/审批）。
- 审计：审批与明文读取写入 `AuditLogs`；错误码统一。
- 索引：按 `indexes.schema.json` 补齐组合索引并核验执行计划。

## 差距与风险
- EP-02-S2 Gate 未同步最新实现与回归结果。
- 埋点缺口：`tenancy_create_submit/result` 等未接；需纳入测试校验。
- 床位冲突并发保护：当前仅前端软提示，缺后端强约束（视冲突率决策）。
- 统计/导出：`stats/exports` MVP 与定时任务未联调；告警/观测待补。
- 共享包：`core-rbac/core-db/core-utils` 尚未抽包，存在重复实现。

## 下两周建议计划
- Gate 同步：完成 EP-02-S2 回归并将 Gate 标记为 PASS/CONCERNS（附证据）。
- 埋点接入：补齐缺失事件并在测试计划中加入埋点校验。
- 并发评估：采样监控床位/报名并发冲突，必要时启用后端强校验/唯一键。
- 统计/导出：交付 `stats.monthly/yearly`、`exports.*` 与 CRON 配置；接入告警与观测。
- 索引核验：关键查询采样查看执行计划，确保组合索引生效。
- 复用抽包：提炼 RBAC/DB/校验为 `functions/packages/*`，降低重复实现与维护成本。

## 待决策/协作请求
- 床位冲突策略：是否升级为强校验（`E_CONFLICT`）或加唯一索引占位？
- 埋点优先级：确认 MVP 必须项清单与验收口径。
- 统计/导出范围：确认首批统计维度与导出格式，便于接口落地与联调。

