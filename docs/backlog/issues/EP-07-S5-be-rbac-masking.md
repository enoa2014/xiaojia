Title: chore(auth-be): EP-07-S5 新接口 RBAC 覆盖与字段脱敏
Labels: backend, auth, P1

Summary:
对 `users.list/review` 做动作级 RBAC；审批列表输出身份证尾号脱敏；错误码统一；日志用 `requestId`，不落 PII。

Acceptance:
- 权限矩阵命中点全部覆盖；字段过滤无遗漏；拦截可观测。

Tasks:
- [x] 审批接口 RBAC 校验
- [x] 输出脱敏（审批列表不返回身份证号，电话脱敏）
- [x] 统一错误映射与日志策略（E_*；requestId 串联；不落 PII）
- [x] 覆盖性测试（按现有接口回归）

Links:
- Story: docs/backlog/stories/EP-07-S5-rbac-enforcement-touchpoints.md
