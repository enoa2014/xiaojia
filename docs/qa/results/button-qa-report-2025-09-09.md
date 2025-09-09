# QA Report: Button 组件（2025-09-09）

## 概览
- 目标：覆盖 Story 7.8 的 AC 与增强用例，确认组件在表单页集成稳定
- 结论：通过；A11y/禁用与加载态一致性良好

## 执行环境
- WeChat DevTools（本地）
- 代码版本：当前 repo 工作副本

## 执行记录
- 演示页：`pages/button-demo` 覆盖变体/尺寸/状态/图标/全宽/圆形
- 表单接入：`pages/services/form` 与 `pages/patients/form` 主要操作替换为组件

## 结果摘要（对应用例）
- AC-1 组件与属性：通过（four variants、two sizes、三态）
- AC-2 样式对齐：通过（色值与tokens一致，动效/对比度合理）
- AC-3 页面替换：通过（提交流程可用，loading 禁点，Spinner 可见）

## 发现与建议
1) 触达尺寸（建议）
- `md=80rpx`、`sm=64rpx` 与设计规范一致；若严格 ≥88rpx，可由外层容器策略放大关键按钮高度

2) 二次确认（后续需求）
- 危险操作（danger）在业务层统一二次确认弹窗（不阻断本次验收）

## 回归建议
- 真机抽检：中文/英文系统、字体缩放对按钮文本的影响
- 弱网抽检：提交 loading 持续1–2s 时的反馈及时性

## 附件
- 测试计划：`docs/qa/test-plan-button.md`
- Demo：`miniprogram/pages/button-demo/*`

