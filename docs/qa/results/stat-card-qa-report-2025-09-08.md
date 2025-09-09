# QA Report: StatCard 组件（2025-09-08）

## 概览
- 目标：覆盖 Story 7.5 的 AC 与增强用例，确认组件在首页/统计页集成稳定
- 结论：通过；新增 A11y 优化与防误触改进

## 执行环境
- WeChat DevTools（本地）
- 代码版本：当前 repo 工作副本

## 执行记录
- 新增 Demo：`pages/stat-card-demo`，覆盖基础变体、加载/空状态、长文案大数值
- 组件增强：
  - A11y：根据状态设置 `role` 与 `aria-label`（normal=button，loading/empty=presentation）
  - 交互：`loading/empty` 状态禁止触发 `tap`
  - 文本：label 增加省略号，防止过长溢出

## 结果摘要（对应用例）
- AC-1 组件与属性：通过
- AC-2 页面替换：通过（stats/index 与 index/index）
- AC-3 空/加载：通过（骨架动画/空占位；点击禁用）
- AC-4 文档：通过（design-system/components.md 已含示例）

## 发现与处理
1) 颜色硬编码 vs tokens（建议）
- 现象：部分渐变与颜色值使用 hex 硬编码
- 影响：与 tokens 统一性稍弱（不阻断）
- 建议：后续以 tokens 标注或抽象渐变变量，统一主题化

2) 空状态可点击（已修复）
- 现象：`empty=true` 时可触发 `tap`
- 处理：组件 onTap 增加空状态短路；aria role 设为 presentation

## 回归建议
- 压力：统计页同时渲染 8+ 卡片时保持流畅
- 交互：不同设备字号/缩放设置下的可读性与对比

## 附件
- 测试计划：`docs/qa/test-plan-stat-card.md`
- Demo：`miniprogram/pages/stat-card-demo/*`

