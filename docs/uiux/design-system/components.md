# 组件与状态规范（Components & States）

目标：提升一致性与可用性，定义核心组件的变体、状态、尺寸与可访问性要点。

## 按钮（Button）
- 变体：Primary（填充）、Secondary（描边）、Ghost（幽灵）、Danger（危险）
- 状态：Default / Pressed / Disabled / Loading
- 尺寸：`md`（高度 80rpx，字体 24rpx），`sm`（高度 64rpx，字体 20rpx）
- 规范：
  - Primary：背景 `--color-primary-600`，文本 `--text-on-primary`
  - Disabled：`opacity: var(--opacity-disabled)`，禁止交互
  - Loading：左侧 20rpx spinner；文本保持可读
- a11y：按钮文本明确动作；危险操作需二次确认 Dialog

## 输入框（Input / Textarea）
- 状态：Default / Focus / Error / Disabled
- 样式：圆角 `--radius-md`，边框 `--gray-300`；Focus 边框 `--color-primary-600`
- 错误：下方 20rpx 红色文案，配合图标提示
- a11y：`aria-label` 或显式 `<label>`；错误描述与字段关联

## 表单字段（FormField）
- 结构：Label（20rpx，`--gray-700`） + Control + HelpText + ErrorText
- 校验：见 validation-rules.md；错误内联提示优先

## 标签与徽章（Tag / Badge）
- 角色徽章：使用角色色（Role Badges）；文本白色
- 状态徽章：success/warning/danger/info 语义色 + 图标

## 卡片（Card）
- 容器：`--radius-lg` + `--shadow-sm`；内边距 `--space-6`
- 列表项：左右分布，右侧可放状态或箭头；按下 `transform: scale(0.98)`

## Tabs / Segmented
- 高度 72rpx；选中态底部 4rpx 线（`--color-primary-600`）
- a11y：选中项 `aria-selected=true`；标签文本可被朗读

## 模态与抽屉（Dialog / ActionSheet）
- 遮罩：`rgba(0,0,0, var(--opacity-overlay))`
- 弹层：`--radius-lg` + `--shadow-lg`；主按钮右侧放置
- a11y：焦点圈定至弹层，关闭后返回触发点

## Toast / EmptyState / ErrorState / Skeleton
- Toast：显示 2–3s；不遮挡关键操作；避免堆栈
- EmptyState：插画+文案+行动按钮（如“去创建”）
- ErrorState：错误码映射（mapError），提供重试/反馈
- Skeleton：列表（头像+两行），详情（标题+段落），加载 ≤ 300ms 出现

## 列表项（ListItem）
- 结构：左（头像/图标） 中（标题+副标题） 右（状态/箭头）
- 可触达区域：高度≥88rpx；间距≥8rpx

## 专用组件
- RoleBadge：根据角色显示颜色+图标；用于用户卡片/列表
- MaskedField：默认显示掩码（如 `***1234`）；点击无权限时引导到申请页
- KPI Card：统计卡（数值 28rpx，标签 20rpx，图标可选）
- Chart 容器：留出 24rpx 内边距；空数据占位

实现建议
- 在 `miniprogram/components/` 下拆分组件；样式统一使用 tokens.md 定义的色板/间距/圆角/阴影。
