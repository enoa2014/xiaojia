Title: feat(auth-be): EP-07-S1 users.register（zod + upsert Users）
Labels: backend, auth, P0

Summary:
实现 `users.register`：zod 校验（姓名/电话/身份证/申请身份；亲属需关联信息），幂等 upsert `Users{status:'pending'}`，最小化输出，日志脱敏。

Acceptance:
- 合法入参返回 `{status:'pending'}`；非法返回 `E_VALIDATE`；PII 不写日志。

Tasks:
- [ ] zod schema 定义与单测
- [ ] upsert Users（openId 为键）
- [ ] 输出/错误码统一
- [ ] 审计（可选）

Links:
- Story: docs/backlog/stories/EP-07-S1-user-registration-submit.md
- Spec: docs/auth/registration-auth-spec.md
