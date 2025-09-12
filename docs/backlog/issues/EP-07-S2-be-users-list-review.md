Title: feat(auth-be): EP-07-S2 users.list/review + 审计
Labels: backend, approvals, P0

Summary:
实现 `users.listRegistrations`（RBAC: admin|social_worker）与 `users.reviewRegistration`（通过写 active+role/roles，拒绝写 rejected+reason），并写入审计。

Acceptance:
- RBAC 正确（无权限→E_PERM）；审计落库；错误码统一。

Tasks:
- [x] 列表分页（status=pending）
- [x] 审批动作（approve/reject）
- [x] AuditLogs 写入
- [x] zod 校验与错误映射

Links:
- Story: docs/backlog/stories/EP-07-S2-user-registration-review.md
- Spec: docs/auth/registration-auth-spec.md
