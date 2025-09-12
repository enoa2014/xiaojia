Title: feat(approvals-fe): EP-07-S2 审批页“用户审批”tab
Labels: frontend, approvals, P0

Summary:
`pages/approvals/index` 新增“用户审批”tab：列表/分页、通过（选角色）/拒绝（填原因）弹层与调用。

Acceptance:
- 分页/通过/拒绝/无权限分支覆盖；审计结果提示。

Tasks:
- [x] Tab 与列表卡片
- [x] 通过/拒绝弹层
- [x] 调用 `api.users.listRegistrations/reviewRegistration`
- [x] 错误映射（E_PERM/E_VALIDATE/E_INTERNAL）

Links:
- Story: docs/backlog/stories/EP-07-S2-user-registration-review.md
- Spec: docs/auth/registration-auth-spec.md
