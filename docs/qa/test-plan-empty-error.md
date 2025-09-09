# Test Plan: EmptyState / ErrorView 组件（Story 7.7）

目标：验证空/错组件满足验收标准与设计系统规范，覆盖文案、交互、A11y、集成与健壮性。

## 范围
- 组件：`miniprogram/components/{empty-state,error-view}/*`
- 使用页：`pages/{patients,services,activities,stats}/index`
- 演示页：`pages/empty-error-demo`
- 参考：`docs/stories/7.7.empty-and-error-unification.md`、`docs/architecture/15-frontend-api-upload.md`

## 验收回归（AC 对应用例）
1) 组件创建与属性
- [ ] EmptyState 支持 `icon|title|description|actionText|secondaryActionText|variant|show`
- [ ] ErrorView 支持 `error|icon|title|message|detail|retryText|feedbackText|variant|show`

2) 页面接入
- [ ] 患者/服务/活动/统计 列表空/错态均使用统一组件
- [ ] 错误文案通过 `mapError/错误码` 映射（E_AUTH/E_PERM/E_VALIDATE/E_NOT_FOUND/E_CONFLICT/E_RATE_LIMIT/E_DEPENDENCY/E_INTERNAL）

3) 行为与交互
- [ ] EmptyState 主/次按钮触发 `action` 事件并区分 `type`
- [ ] ErrorView `retry`/`feedback` 事件按需触发；`retrying=true` 时禁点

4) A11y
- [ ] EmptyState 容器 `role=region`，`aria-label=title`
- [ ] ErrorView 容器 `role=alert`，`aria-label=title`
- [ ] 禁用态按钮设置 `aria-disabled=true`

## 功能用例
- [ ] 搜索无结果：EmptyState 展示“清除筛选/返回首页”等 CTA
- [ ] 网络错误：ErrorView 展示“重试”，点击后回调触发
- [ ] 权限错误：ErrorView 展示“申请权限/联系管理员”
- [ ] 自定义覆盖：外部传入 `title/message/detail` 覆盖默认映射

## 集成与表现
- [ ] 与页面现有布局/样式不冲突；紧凑 variant 在卡片/小区域适配
- [ ] 弱网：loading→empty/error 切换平滑，无抖动

## QA 执行步骤
1. 打开 `pages/empty-error-demo`：验证三类 EmptyState 与三类 ErrorView
2. 打开 `pages/{patients,services,activities,stats}/index`：触发空/错态并验证交互
3. 触发错误码：模拟 `E_PERM|E_VALIDATE|E_INTERNAL|E_DEPENDENCY` 并确认映射

## 出口标准
- 所有 AC 通过；功能/视觉/可访问性/集成无阻断问题
- 重要注意点记录在 QA 报告

