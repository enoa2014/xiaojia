Title: feat(auth-be): EP-07-S3 getProfile 扩展返回 name/avatar/status
Labels: backend, auth, P1

Summary:
在 `users.getProfile` 扩展返回 `{ role, roles, status, name, avatar }`，兼容旧前端忽略未知字段。

Acceptance:
- 字段齐全；异常 `E_AUTH`；性能 OK。

Tasks:
- [x] 扩展数据组装
- [x] 容错与错误映射
- [x] 单测

Links:
- Story: docs/backlog/stories/EP-07-S3-user-profile-home-display.md
