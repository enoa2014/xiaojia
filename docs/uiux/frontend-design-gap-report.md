# 前端页面 vs 设计文档 差距分析报告（MVP 版）

- 日期：2025-09-08
- 范围：`miniprogram/pages/*`、`miniprogram/app.wxss`、`miniprogram/styles/tokens.wxss`
- 参照文档：
  - `docs/uiux/design-system/tokens.md`
  - `docs/uiux/design-system/components.md`
  - `docs/uiux/UX-分析报告-小家服务管理小程序.md`
  - `docs/uiux/ui_design_spec_document.html`
  - `docs/uiux/ia_design.md`

## 执行摘要
- 整体：前端功能基本完整，但与设计系统/IA 在“设计令牌”“组件复用”“导航头一致性”“主题联动”“状态规范”等方面存在差距。
- 主要差距：样式硬编码较多、Tokens 覆盖不全、组件化不足、导航与边距策略不统一、空/错/加载状态表现不一致。
- 优先建议：集中化 Tokens 与工具类、统一导航头/内边距、落地核心复用组件（Button/StatCard/ActionCard/RoleBadge/Empty/Error/Loading）、按 IA 对齐页面与流程。

## 设计令牌（Tokens）差距
- 现状：仅少量页面引入简化版 `styles/tokens.wxss`；大量 WXSS 直接硬编码颜色/渐变/间距。
- 规范：品牌/语义/灰阶/角色色、间距、圆角、阴影、动效、z-index 等令牌统一。
- 差距：
  - 多处硬编码颜色/渐变（导航头、chips、inputs）。
  - `tokens.wxss` 覆盖有限，未全局导入；页面各自声明 CSS 变量导致不一致。
  - `app.wxss` 缺少 token 工具类（如 `.text-primary`、`.bg-primary`、`.shadow-sm`）。
  - 动效/层级未体系化，取值随意。
- 建议：
  - 扩充 `styles/tokens.wxss` 并在 `app.wxss` 全局引入；提供文本/背景/阴影/圆角/间距等工具类。
  - 以工具类/预编译方式替换硬编码（WXSS 对 CSS 变量/媒体查询有限制）。

## 组件（Components）差距
- 现状：多数 UI 在页面内实现，复用度低；状态/尺寸不统一。
- 规范：Button/Input/FormField/Tag/Badge/Card/Tabs/Dialog/Toast/Empty/Error/Skeleton/RoleBadge/MaskedField/KPI Card/Chart 容器应具状态与尺寸。
- 差距：
  - Button 变体/状态缺失；StatCard/RoleBadge 复用不足；Empty/Error/Loading 不统一；MaskedField 未抽象。
- 建议：
  - 建立组件库：`button`、`form-field`、`role-badge`、`stat-card`、`action-card`、`empty-state`、`error-view`、`loading-skeleton`、`masked-field`、`chart-container`。
  - 逐步替换首页/患者/服务/活动/统计重复结构为组件，统一尺寸/状态/间距。

## 导航与布局差距
- 现状：部分页已 sticky 导航，但 padding/负外边距策略不一，满宽铺设不统一（统计页已修复）。
- 规范：统一导航头（令牌化颜色/阴影/高度）、TabBar 5 主场景、二级导航一致。
- 差距：
  - 个别页头部渐变/内边距策略不同步；存在写死类名未随主题联动。
  - `.page` 容器 padding 与头部/列表负外边距使用不统一。
- 建议：
  - 统一导航 DOM/样式，使用 `{{theme.headerBg}}` + 令牌化阴影/高度。
  - 规范 `.page { padding: 0 24rpx }`，满宽元素用 `margin: 0 -24rpx` 抵消。

## 主题与角色（Theming）差距
- 现状：首页支持按角色换色；其他页面接入不全，部分类名写死。
- 规范：角色色一致、全站联动；角色徽章与权限提示统一。
- 差距：
  - 未全量接入 `applyThemeByRole`；活动表单曾固定类（已改动态）。
  - 角色徽章未普及。
- 建议：
  - 全页在 `onShow/onLoad` 调用 `applyThemeByRole`；所有头部用 `{{theme.headerBg}}`。
  - 统一使用 `role-badge` 展示身份。

## 信息架构（IA）落地差距
- 符合：Tab 结构匹配；Patients 列表呈现优先关注/在住/历史意图；Services 有类型/状态筛选。
- 差距：
  - 活动“日历视图（月/周）”未实现；
  - 统计“专项分析”子页未落地，导出中心流程待补；
  - 审批/审计页未成体系（仅申请页）。
- 建议：
  - 实现活动日历与后台管理；完善“我的参与”“签到”流转。
  - 在统计页落地服务/入住/参与/志愿者效能子页；补导出中心。
  - 补 approvals/audits 页面路由与守卫。

## 状态（加载/空/错误）差距
- 现状：各页处理不统一；骨架屏/错误文案/CTA 不一致。
- 规范：统一 Loading/Empty/Error 组件与文案，骨架出现 ≤300ms。
- 差距：
  - 骨架屏样式与时序分散；空态缺少明确 CTA；错误提示偏技术化。
- 建议：
  - 统一 `loading-skeleton`（列表/详情）、`empty-state`（友好文案+操作）、`error-view`（错误码映射+重试）。
  - 串联 `mapError` 与标准文案，提供页面级重试/回退。

## 可访问性（A11y）差距
- 现状：`@media` 方案受 WXSS 限制；标签/焦点/触达尺寸未统一。
- 规范：对比度/尺寸/焦点/可读性达标；动效可降级。
- 差距与建议：
  - 提供 A11y 工具类（隐藏文本、焦点环）；字段配 Label/错误辅助文本；触达尺寸 ≥ 88rpx。
  - 用“页面级 class”开关动效，替代 `@media`。

## 快速改进（P0）
- Tokens：扩充 `styles/tokens.wxss` 并全局引入；新增工具类并替换硬编码。
- 主题：全页接入 `applyThemeByRole`；清除写死类名；RoleBadge 普及。
- 组件：快速落地 `role-badge`、`stat-card`、`action-card` 替换首页/统计/服务/活动关键区块。
- 状态：落地 `empty-state` 与 `error-view` 组件到列表型页面。

## 短期（P1）
- `button`/`form-field` 组件（含变体/状态）并替换表单页；统一骨架屏并标准时序；实现活动“日历视图”；完善统计页 KPI 卡与图表容器。

## 中期（P2）
- 统计专项分析子页与导出中心；审批/审计页面；图表容器与交互；引入构建期令牌注入。

## 风险
- WXSS 限制导致变量/媒体查询能力不足，优先工具类/预编译方案。
- 大范围样式替换需分期与视觉回归。
- 主题传递需依赖全局角色状态与 `onShow` 兜底。

## 交付计划
- 第 1 周：Tokens+工具类；统一导航/内边距；主题联动全站；落地 `RoleBadge/StatCard/ActionCard`；统一列表 Empty/Error。
- 第 2 周：`Button/FormField` 组件；替换表单页；活动日历；统计页结构优化；统一骨架屏。
- 第 3 周：统计专项分析与导出中心；审批/审计页面；图表容器；联调与 QA。

---

> 如需，我可以立刻：
> 1) 扩充并全局引入 `styles/tokens.wxss` 与工具类；
> 2) 脚手架 `role-badge`/`stat-card`/`action-card` 并改造统计页+服务页示范；
> 3) 提供“Tokens/组件替换清单”以跟踪各页面落地进度。

