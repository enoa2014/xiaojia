# Test Plan: ActionCard 组件（Story 7.6）

目标：验证 ActionCard 满足故事验收标准、设计系统规范与集成稳定性，覆盖交互、视觉、可访问性、健壮性与性能。

## 范围
- 组件：`miniprogram/components/action-card/*`
- 使用点：`pages/index/index`（快速操作）、`pages/services/index`（快速记录）、`pages/activities/index`（类型入口）
- 演示页：`pages/action-card-demo`（QA 专用）
- 规范文档：`docs/stories/7.6.component-action-card.md`、`docs/uiux/design-system/components.md`

## 验收回归（AC 对应用例）
1) 组件与属性
- [ ] 支持 `title|desc?|icon?|disabled?|loading?`；点击事件冒泡（`tap`）
- [ ] 触达尺寸≥88rpx；按压反馈（scale/阴影/渐变条）符合规范

2) 页面替换
- [ ] 首页快速操作区域使用 `action-card`
- [ ] 服务页快速记录使用 `action-card`（2列网格）
- [ ] 活动页类型入口使用 `action-card`（2列网格）

3) 状态与动效
- [ ] `hover-class` 生效仅限可交互态；禁用/加载时无 hover 效果
- [ ] `loading=true` 显示 spinner，禁止点击
- [ ] `disabled=true` 透明度降低，禁止点击

4) A11y
- [ ] `role=button`；`aria-label` 由 `title/desc/状态` 生成
- [ ] `aria-disabled` 在 `disabled` 或 `loading` 为真

## 功能用例
- [ ] 点击事件：在 normal 状态触发并带上 `customData`
- [ ] 禁用/加载态：不触发点击；与 `hover-class` 不冲突
- [ ] 文本溢出：`title/desc` 过长省略不破坏布局
- [ ] 图标可选：无图标时布局不跳变

## 集成与表现
- [ ] 与页面现有样式不冲突；边距/圆角/阴影与 tokens 一致
- [ ] 弱网：从 loading → normal 过渡无闪烁
- [ ] 多卡片（≥8）时滚动与点击流畅

## QA 执行步骤（建议）
1. 打开 `pages/action-card-demo` 验证：基础用法、状态（加载/禁用）、长文案、无图标
2. 打开 `pages/index/index` 验证快速操作点击与视觉反馈
3. 打开 `pages/services/index` 与 `pages/activities/index` 验证网格布局与交互
4. 模拟弱网：让页面数据延迟设置 `loading=false`，观察动效与点击可用性

## 出口标准（Pass 条件）
- 所有 AC 通过；功能/视觉/可访问性/集成项无阻断问题
- 重要注意点已记录在 QA 报告

