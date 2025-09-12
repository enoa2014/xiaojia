Title: feat(auth-fe): EP-07-S1 注册页表单与提交（pages/auth/register）
Labels: frontend, auth, P0

Summary:
新增 `pages/auth/register`。实现字段校验（姓名/电话/身份证；亲属关联字段条件展示与校验），提交 `api.users.register`，成功进入等待态（pending）。

Acceptance:
- 成功/缺失/非法/重复提交分支完整；错误映射清晰；端到端≤1.2s。

Tasks:
- [x] 页面与表单 UI
- [x] 校验规则（本地）
- [x] 调用 `api.users.register` 并处理 pending
- [x] 成功态与引导
- [x] 错误映射（E_VALIDATE/E_INTERNAL）

Links:
- Story: docs/backlog/stories/EP-07-S1-user-registration-submit.md
- Spec: docs/auth/registration-auth-spec.md
