Title: feat(activities-be): EP-07-S4 activities.publicList + registrations.guestContact
Labels: backend, activities, registrations, P1

Summary:
实现 `activities.publicList({ window:'current'|'last14d' })` 与 `registrations.register({ activityId, guestContact? })`（游客必须），返回公共字段。

Acceptance:
- 口径准确；游客缺少 guestContact→E_VALIDATE；分页/排序稳定。

Tasks:
- [x] publicList 窗口查询实现
- [x] registrations.register 游客参数支持
- [x] 校验/错误映射/单测

Links:
- Story: docs/backlog/stories/EP-07-S4-guest-activities-and-registration.md
