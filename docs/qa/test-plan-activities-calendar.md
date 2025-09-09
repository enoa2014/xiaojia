# Test Plan: 活动日历视图（月/周）（Story 7.12）

目标：验证活动日历视图满足验收标准与设计规范，覆盖视图切换、导航、筛选、流程、A11y 与占位状态。

## 范围
- 页面：`pages/activities/index`（日历视图）
- 组件：`components/calendar-view`、`components/{loading-skeleton, empty-state, error-view}`
- 参考：`docs/stories/7.12.activities-calendar-view.md`

## 验收回归（AC 对应用例）
1) 视图与筛选（AC1）
- [ ] 列表/日历切换；月/周切换
- [ ] 状态筛选：报名中/即将开始/进行中/已结束

2) 跳转与流程（AC2）
- [ ] 日期/活动卡点击 → 活动详情
- [ ] 报名、签到入口可用（如账号权限允许）

3) 占位与加载（AC3）
- [ ] 空/错：统一 `empty-state`/`error-view`
- [ ] 加载：`loading-skeleton`（≤300ms 规则 & 淡出）

## A11y
- [ ] 容器 `role=region` + `aria-label`（视图与年月）
- [ ] 控制按钮 `aria-label`（上一/下一/切换视图/回到今天）
- [ ] 日期单元 `aria-label`（YYYY-MM-DD + 活动数）

## QA 执行步骤
1. 打开活动页，切换到日历视图；验证月/周切换、上一/下一、回到今天
2. 切换状态筛选；随机点选日期与活动，验证详情跳转
3. 使用报名/签到入口（如有权限），验证状态刷新
4. 弱网模拟：≤300ms 规则与淡出，无闪烁；空/错态与 7.7 一致

## 出口标准
- AC 全通过；A11y 与占位一致；流程无阻断

