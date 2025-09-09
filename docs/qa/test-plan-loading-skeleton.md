# Test Plan: Loading Skeleton 统一（Story 7.11）

目标：验证骨架屏组件与接入页面满足统一规范，覆盖触发时序、过渡、A11y、主题与资源清理。

## 范围
- 组件：`miniprogram/components/loading-skeleton/*`
- 页面：`pages/patients/{index,detail}`（已接入）
- 参考：`docs/stories/7.11.loading-skeleton-unification.md`、`docs/process/coding-standards.md`

## 验收对应用例
1) 组件模板（AC1）
- [ ] 列表/详情/自定义三类骨架模板渲染正常
- [ ] 动画：`shimmer|pulse|none` 切换正常

2) 触发时序（AC2）
- [ ] 发起请求 ≤300ms 未返回 → 显示骨架
- [ ] ≤300ms 即返回 → 不显示骨架（避免闪烁）
- [ ] 返回后：执行淡出过渡，平滑显示内容

3) 页面接入（AC3）
- [ ] patients/index：列表型骨架显示/淡出按时序，无闪烁；下拉刷新保持一致
- [ ] patients/detail：详情型骨架显示/淡出按时序，无闪烁；返回时无残留

## A11y
- [ ] 容器 `role=status`、`aria-live=polite`、`aria-busy` 一致
- [ ] 主题切换/深色模式适配正常

## 健壮性
- [ ] 卸载清理：页面 `finally/onUnload` 清理定时器，骨架不残留
- [ ] 弱网/断网：与 7.7 Empty/Error 不冲突

## QA 步骤
1. 模拟弱网：设置 500–1500ms 延迟，观察骨架 ≤300ms 出现
2. 模拟快网：100ms 内返回，不显示骨架
3. 切换主题/切页返回，确认无残留与样式破坏

## 出口标准
- AC 全通过；A11y 与清理机制达标；无闪烁/跳变

