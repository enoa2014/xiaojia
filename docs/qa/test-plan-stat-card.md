# Test Plan: StatCard 组件（Story 7.5）

目标：验证 StatCard 满足故事验收标准、设计系统规范与集成稳定性，覆盖功能、视觉、可访问性、健壮性与性能。

## 范围
- 组件：`miniprogram/components/stat-card/*`
- 使用点：`pages/stats/index`（KPI区+快速统计）、`pages/index/index`（数据总览）
- 演示页：`pages/stat-card-demo`（QA 专用）
- 规范文档：`docs/stories/7.5.component-stat-card.md`、`docs/uiux/design-system/components.md`

## 验收回归（AC 对应用例）
1) 组件与属性
- [ ] 支持 `value`、`label`、`icon?`、`variant?`、`loading?`、`empty?`
- [ ] 尺寸/间距符合规范（最小200rpx，padding 24rpx，圆角16rpx）

2) 页面替换
- [ ] 统计页KPI与快速统计均使用 `stat-card`
- [ ] 首页数据总览使用 `stat-card`

3) 空/加载
- [ ] `loading=true` 显示骨架，禁用点击
- [ ] `empty=true` 显示空占位，禁用点击

4) 文档
- [ ] 设计系统文档包含属性/尺寸/状态/示例

## 功能用例
- [ ] 渲染：不同 `value/label/icon/variant` 正常渲染
- [ ] 状态：loading/empty/normal 三态切换正确
- [ ] 点击：normal 状态触发 `tap` 事件并携带 `value/label/variant`
- [ ] 非可用：loading 或 empty 不触发 `tap`
- [ ] 长文案：label 过长不破坏布局（已做省略）
- [ ] 大数值：value 为长数字/百分比显示正常

## 视觉与样式
- [ ] 变体色：default | primary | success | warning | danger | info 显示符合预期
- [ ] 字体：value 48rpx/600，label 20rpx；对比度≥4.5:1
- [ ] 骨架动画：1.5s 循环，视觉平滑

## 可访问性
- [ ] role/aria：normal = `role=button` 且 `aria-label="<label>: <value>"`
- [ ] loading/empty = `role=presentation` 且 `aria-label` 正确描述
- [ ] 点击区≥88rpx（组件高度200rpx满足）

## 集成与表现
- [ ] 统计页水平滑动区域中卡片间距/对齐无错位
- [ ] 弱网：loading → normal 过渡无闪烁；空数据时 empty 呈现
- [ ] 多卡片并行渲染无明显卡顿

## QA 执行步骤（建议）
1. 打开 `pages/stat-card-demo` 验证三组：基础变体、加载/空状态、长文案大数值
2. 打开 `pages/stats/index` 验证 KPI 滑动区与快速统计（切换时间维度）
3. 打开 `pages/index/index` 验证数据总览区卡片渲染
4. 模拟弱网：延迟数据填充，观察骨架→正常/空切换

## 预期问题与处置
- 发现：部分渐变/颜色使用硬编码（建议后续对齐 tokens）；不阻断本故事通过
- 发现：label 过长可能溢出（已加省略号样式）；如需多行显示可扩展 props

## 出口标准（Pass 条件）
- 所有 AC 通过；功能/视觉/可访问性/集成项无阻断问题
- 重要注意点已记录在 QA 报告

