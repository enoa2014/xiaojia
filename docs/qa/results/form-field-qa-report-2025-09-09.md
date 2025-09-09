# QA Report: FormField 组件（2025-09-09）

## 概览
- 目标：覆盖 Story 7.9 的 AC 与增强用例，确认组件在表单场景的可用性与一致性
- 结论：通过；结构/状态/文案/A11y/协作均达标

## 执行环境
- WeChat DevTools（本地）
- 代码版本：当前 repo 工作副本

## 执行记录
- 演示页：`pages/form-field-demo` 覆盖默认/焦点/错误/禁用与多控件嵌入
- 校验能力：验证必填/正则/长度/自定义函数；错误文案遵循校验规范
- 定位能力：`scrollIntoView()` 可将页面滚动至错误字段附近

## 结果摘要（对应用例）
- AC-1 结构与状态：通过（Label/Control/Help/Error + 四种状态）
- AC-2 样式与文案：通过（tokens 一致；错误文案清晰）
- AC-3 协作验证：通过（与 Button 组合间距统一）

## 发现与建议
1) ARIA describedby
- 当前 error 优先于 help（符合预期）；若需并列描述，可考虑在无冲突时拼接 id，但保持简单优先，无须本次修改

2) 真实页面替换（后续）
- 活动/服务/患者表单仍有自定义容器，建议按 7.10 分批替换为 FormField，统一交互

## 附件
- 测试计划：`docs/qa/test-plan-form-field.md`
- Demo：`miniprogram/pages/form-field-demo/*`

