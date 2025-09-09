# QA Report: RoleBadge 组件（2025-09-08）

## 概览
- 目标：覆盖 Story 7.4 的 AC 与增强用例，确认组件在首页/统计页集成稳定
- 结论：通过（见备注）；发现 1 项一致性问题已修复（键名别名）

## 执行环境
- WeChat DevTools（本地）
- 代码版本：当前 repo 工作副本

## 执行记录
- 新增 QA 专用页面：`pages/role-badge-demo/index`，覆盖默认/小尺寸/别名与异常/长文本
- 组件增强：兼容 `social_worker` → `social` 的键名归一化；WXML 使用 `roleClassKey`

## 结果摘要（对应用例）
- AC-1 组件与属性：通过
  - 支持 `roleKey`、`size(sm|md)`、`text?`；尺寸/色彩依赖 tokens
- AC-2 页面替换：通过
  - 首页与统计页展示正常；组件注册路径正确
- AC-3 A11y：基本通过
  - `role="badge"`、`aria-label` 正确；md 最小高 88rpx
  - 说明：`sm` 高度约 60rpx，若用作点击区需由外层容器保证触达尺寸≥88rpx（当前用法为展示型，无交互问题）
- AC-4 文档：通过
  - 设计系统文档包含属性、尺寸、示例

## 发现与修复
1) 键名不一致导致显示回退为 admin（缺陷）
- 现象：页面使用 `social_worker`；组件仅识别 `social`
- 影响：样式类 `role-badge--social_worker` 不存在，文案与色彩回退为 admin
- 处理：组件侧归一化 `_normalizeRoleKey`（"social_worker"→"social"），并使用 `roleClassKey` 渲染类名

## 建议与注意
- 若未来将 RoleBadge 用作可点击入口，请在外层容器保证触达尺寸≥88rpx
- 建议在 `services/theme` 中逐步统一键名到 `social`，以减少别名分支

## 附件
- 测试计划：`docs/qa/test-plan-role-badge.md`
- Demo 页面：`miniprogram/pages/role-badge-demo/*`

