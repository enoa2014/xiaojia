# QA Report: 审批/审计页面路由与守卫（Story 7.15）

## 概览
- 目标：验证 approvals/audits 路由接入与 RBAC 守卫、状态一致性与敏感信息脱敏
- 结论：通过（PASS），附若干改进建议（不阻断）

## 执行环境
- WeChat DevTools（本地）
- 代码版本：当前工作副本（2025-09-09）

## 验收对应用例
- AC-1 路由：`pages/approvals/index`、`pages/audits/index` 注册并可达 → 通过
- AC-2 守卫：非 admin → E_PERM 提示；admin → 列表与操作可见 → 通过
- AC-3 状态：空/错/加载统一；审计列表目标字段脱敏显示 → 通过

## 功能与集成
- approvals：待审批/已处理分栏；批准/拒绝二次确认；刷新/分页 → 通过
- audits：操作类型/时间/操作人筛选；500ms 防抖；分页与“加载更多” → 通过
- 错误映射：统一 `mapError(code)`；RBAC 拒绝路径有提示 → 通过

## A11y
- 建议为 approvals/audits 根容器补充 `role=region` 与 `aria-label`
- 对批准/拒绝按钮、筛选器增加 `aria-label`；对日志列表项增加易读标签

## 改进建议（非阻断）
1) 拒绝原因：拒绝操作时支持输入原因并写入审计，便于追溯
2) 追溯性：前端打点含 `requestId`，建议后端审计记录强制关联并索引
3) 性能：大列表分页默认 20 条合适；必要时可增加“跳至日期/筛选更多”

## 结论
- Gate: PASS（满足 AC 与一致性目标；建议项纳入后续迭代）

