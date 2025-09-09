# QA Report: 表单页组件化替换（2025-09-09）

## 概览
- 目标：覆盖 Story 7.10 的 AC 与关键用例，验证 Button/FormField 在核心表单页的替换效果
- 结论：部分通过（tenancies/form、patients/form 达标；activities/form 仍使用自定义容器，待补齐）

## 执行环境
- WeChat DevTools（本地）
- 代码版本：当前 repo 工作副本

## 执行记录
- tenancies/form：已使用 `ui-form-field` + `ui-button`；流程与校验可用
- patients/form：已使用 `ui-form-field` + `ui-button`；流程与校验可用
- activities/form：`ui-button` 已接入；`ui-form-field` 尚未落地，仍为自定义 `.form-item` 容器

## 结果摘要（对应用例）
- AC-1 组件替换：部分通过（2/3 页面完成；activities/form 未完成字段容器替换）
- AC-2 流程可用：通过（成功/失败/校验错误流程均可用；错误使用统一映射）
- AC-3 A11y：通过（按钮触达尺寸与禁点、字段 error ARIA 关联正确；activities/form 待统一）

## 发现与建议
1) activities/form 替换建议
- 将 `.form-item` 模块迁移为 `ui-form-field`（Label/Control/Help/Error），统一错误呈现与 ARIA 关联
- 关联 `mapError` 与字段错误映射，减少分散实现

2) 一致性检查
- 已替换页面与 Demo 的间距/圆角/字体对齐；继续抽检 edge case（长文案、极端数值）

## 附件
- 测试计划：`docs/qa/test-plan-forms-refactor.md`
- 参考页面：`miniprogram/pages/{activities,tenancies,patients}/form.*`

