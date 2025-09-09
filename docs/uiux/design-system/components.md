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

### RoleBadge 角色徽章
用于统一显示用户角色标识的组件，基于设计系统token实现。

**属性（Properties）**
- `roleKey` (String): 角色标识符，支持 `admin | social | volunteer | parent`
- `size` (String): 尺寸规格，支持 `sm | md`，默认 `md` 
- `text` (String): 可选的自定义文本，未设置时使用默认角色名

**尺寸规格**
- `sm`: 最小高度 60rpx，字号 var(--font-caption)，内边距 var(--space-1) var(--space-2)
- `md`: 最小高度 88rpx，字号 var(--font-body)，内边距 var(--space-2) var(--space-3)

**角色颜色映射**
- 管理员 (`admin`): var(--role-admin) #7C3AED 紫色
- 社工 (`social`): var(--role-social) #2563EB 蓝色  
- 志愿者 (`volunteer`): var(--role-volunteer) #F59E0B 橙色
- 家长 (`parent`): var(--role-parent) #EC4899 粉色

**无障碍访问**
- role="badge"属性用于屏幕阅读器识别
- aria-label动态生成完整描述
- 最小触摸区域88rpx符合无障碍标准
- 文本对比度≥4.5:1

**使用示例**
```wxml
<!-- 基础用法 -->
<role-badge roleKey="admin"></role-badge>

<!-- 小尺寸 -->  
<role-badge roleKey="social" size="sm"></role-badge>

<!-- 自定义文本 -->
<role-badge roleKey="volunteer" text="资深志愿者"></role-badge>
```

**实现位置**
`miniprogram/components/role-badge/`

### StatCard 统计卡片组件
用于统一显示统计类数值的卡片组件，支持多种状态和变体，符合设计系统规范。

**属性（Properties）**
- `value` (String): 显示的主要数值，如 "125" 或 "99.5%"
- `label` (String): 数值标签说明，如 "总用户数" 或 "完成率"
- `icon` (String): 可选图标emoji，显示在卡片顶部
- `variant` (String): 视觉变体，支持 `default | primary | success | warning | danger | info`
- `loading` (Boolean): 加载状态，显示骨架屏动画
- `empty` (Boolean): 空状态，显示空数据占位符

**尺寸规格**
- 最小高度：200rpx
- 内边距：24rpx
- 圆角：16rpx（var(--radius-lg)）
- 主数值：48rpx，字重 600
- 标签文本：20rpx，颜色 var(--gray-500)
- 图标尺寸：48rpx

**变体颜色**
- `default`: 白色背景，文本 var(--text-primary)
- `primary`: 绿色渐变 #22C55E → #34D399，白色文本
- `success`: 成功绿色渐变 #16A34A → #22C55E，白色文本
- `warning`: 警告橙色渐变 #F59E0B → #FBBF24，白色文本
- `danger`: 危险红色渐变 #EF4444 → #F87171，白色文本
- `info`: 信息蓝色渐变 #3B82F6 → #60A5FA，白色文本

**状态规格**
- **加载状态**：显示骨架屏动画，1.5s无限循环，禁用点击
- **空状态**：显示📊图标和"暂无数据"文本，禁用点击
- **正常状态**：支持点击交互，缩放反馈 scale(0.98)

**无障碍访问**
- 点击区域最小88rpx符合触摸标准
- 支持点击事件触发，传递value/label/variant数据
- 合理的颜色对比度≥4.5:1（白色文本在彩色背景上）

**使用示例**
```wxml
<!-- 基础用法 -->
<stat-card value="125" label="总用户数" icon="👥"></stat-card>

<!-- 带变体 -->
<stat-card value="98.5%" label="成功率" icon="✅" variant="success"></stat-card>

<!-- 加载状态 -->
<stat-card loading="{{true}}" label="加载中"></stat-card>

<!-- 空状态 -->
<stat-card empty="{{true}}" label="暂无数据"></stat-card>
```

**实现位置**
`miniprogram/components/stat-card/`

**替换说明**
本组件已替换原有页面中的自定义KPI卡片实现：
- `pages/stats/index` KPI关键指标区域
- `pages/stats/index` 快速统计区域  
- `pages/index/index` 数据总览区域

- MaskedField：默认显示掩码（如 `***1234`）；点击无权限时引导到申请页
- Chart 容器：留出 24rpx 内边距；空数据占位

实现建议
- 在 `miniprogram/components/` 下拆分组件；样式统一使用 tokens.md 定义的色板/间距/圆角/阴影。
