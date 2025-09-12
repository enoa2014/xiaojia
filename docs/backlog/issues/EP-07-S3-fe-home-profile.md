Title: feat(home-fe): EP-07-S3 首页 getProfile 与主题联动
Labels: frontend, home, P1

Summary:
首页加载 `api.users.getProfile()` 渲染姓名/头像/角色/状态；无档案→引导注册/游客；pending→提示等待；角色联动主题与入口。

Acceptance:
- 多角色切换验证；降级稳定；埋点 `home_profile_load`。

Tasks:
- [x] 集成 getProfile
- [x] 角色-主题-入口映射
- [x] 无档案/等待态引导
- [x] 埋点与错误处理

Links:
- Story: docs/backlog/stories/EP-07-S3-user-profile-home-display.md
