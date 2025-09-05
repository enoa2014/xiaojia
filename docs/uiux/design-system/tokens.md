# 设计 Token（Tokens）

目标：统一视觉与交互规格，使跨页面/组件一致可复用。单位以 rpx 为主；颜色以十六进制或 rgba 表达。

## 颜色（Colors）
- 品牌（Primary）
  - `--color-primary-600: #22C55E`（主）：按钮主色/高亮
  - `--color-primary-700: #16A34A`（深）：Pressed 背景
  - `--color-primary-400: #34D399`（浅）：强调/选中背景
- 语义（Semantic）
  - 成功：`--color-success-600: #16A34A`
  - 警告：`--color-warning-600: #F59E0B`
  - 危险：`--color-danger-600: #EF4444`
  - 信息：`--color-info-600: #3B82F6`
- 中性色（Gray 50–900）
  - `--gray-900: #111827`、`--gray-700: #374151`、`--gray-500: #6B7280`
  - `--gray-300: #D1D5DB`、`--gray-200: #E5E7EB`、`--gray-50: #F9FAFB`
- 角色色（Role Badges）
  - 管理员：`--role-admin: #7C3AED`（紫）
  - 社工：`--role-social: #2563EB`（蓝）
  - 志愿者：`--role-volunteer: #F59E0B`（橙）
  - 家长：`--role-parent: #EC4899`（粉）
- 背景与文本
  - 背景主：`--bg-primary: #FFFFFF`、次：`--bg-subtle: #F0FDF4`
  - 文本主：`--text-primary: #111827`、次：`--text-secondary: #374151`
  - 反白文本：`--text-on-primary: #FFFFFF`

对比度目标：正文与背景 ≥ 4.5:1；按钮/链接文本 ≥ 3:1。

## 字体（Typography）
- 标题：`--font-h1: 28rpx`、`--font-h2: 24rpx`、`--font-h3: 20rpx`
- 正文：`--font-body: 20rpx`、注释 `--font-caption: 18rpx`
- 行高：`--lh-tight: 1.2`、`--lh-normal: 1.5`、`--lh-loose: 1.7`
- 字重：`--weight-regular: 400`、`--weight-medium: 500`、`--weight-bold: 600`

## 间距（Spacing）
- 基础刻度（4 的倍数）：`4/8/12/16/24/32/40/48` rpx
- 令牌：`--space-1: 4rpx`、`--space-2: 8rpx`、`--space-3: 12rpx`、`--space-4: 16rpx`、`--space-6: 24rpx`、`--space-8: 32rpx`

## 圆角（Radius）
- `--radius-sm: 8rpx`、`--radius-md: 12rpx`、`--radius-lg: 16rpx`

## 阴影（Elevation）
- `--shadow-sm: 0 2rpx 8rpx rgba(0,0,0,0.04)`
- `--shadow-md: 0 4rpx 16rpx rgba(0,0,0,0.08)`
- `--shadow-lg: 0 8rpx 24rpx rgba(0,0,0,0.12)`

## 动画（Motion）
- 时长：`--duration-fast: 150ms`、`--duration-base: 250ms`、`--duration-slow: 400ms`
- 缓动：`--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)`

## 层级（Z-Index）
- 导航：100；抽屉/弹层：1000；Toast：2000

## 透明度（Opacity）
- 禁用：`--opacity-disabled: 0.5`、遮罩：`--opacity-overlay: 0.4`

使用建议
- WXSS 不一定支持 CSS 变量；建议集中在 `app.wxss` 定义样式工具类（如 `.text-primary`, `.bg-primary`, `.shadow-sm`），或借助构建将 Token 注入样式。
