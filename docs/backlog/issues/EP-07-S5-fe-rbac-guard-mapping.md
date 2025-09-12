Title: chore(auth-fe): EP-07-S5 路由守卫与错误映射统一
Labels: frontend, auth, P1

Summary:
为审批/导出等关键入口接入守卫（admin|social_worker）；游客白名单（活动公共视图/游客报名）；统一错误映射（E_AUTH/E_PERM/E_VALIDATE/E_INTERNAL）。

Acceptance:
- 黑/白名单覆盖；错误提示一致；守卫可配置。

Tasks:
- [x] 守卫中间件与配置（guardByRoute 接入审批/统计/服务）
- [x] 错误码到文案映射表（mapError；E_AUTH/E_PERM/E_VALIDATE/E_INTERNAL）
- [x] 回归关键入口（审批/活动报名/导出等）

Links:
- Story: docs/backlog/stories/EP-07-S5-rbac-enforcement-touchpoints.md
