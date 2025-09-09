# Test Plan: FormField 组件（Story 7.9）

目标：验证 FormField 满足验收标准与设计系统规范，覆盖结构、状态、文案、交互、A11y、集成与健壮性。

## 范围
- 组件：`miniprogram/components/form-field/*`
- 演示页：`pages/form-field-demo`
- 参考：`docs/stories/7.9.component-form-field.md`、`docs/uiux/design-system/components.md#表单字段`、`docs/specs/validation-rules.md`

## 验收回归（AC 对应用例）
1) 组件结构（AC1）
- [ ] 结构包含：Label、Control 容器（slot:control）、HelpText?、ErrorText?
- [ ] 状态：`default|focus|error|disabled`

2) 样式与文案（AC2）
- [ ] 样式对齐设计系统 tokens（间距/圆角/字体/颜色）
- [ ] 错误文案遵循校验规则文档（字段名 + 规则提示）

3) 与 Button 协作（AC3）
- [ ] FormField 与 Button 间距统一；组合在表单区块显示一致

## 功能用例
- [ ] 状态切换：`setFocus/setBlur/setError/clearError` 生效
- [ ] 校验：`validate(value, rules)` 覆盖必填/正则/长度/自定义函数
- [ ] 错误优先：同时存在 help 与 error 时，只展示 error；描述关联指向 error
- [ ] 定位：`scrollIntoView()` 能滚动到字段附近

## A11y
- [ ] ARIA 关联：容器 `aria-labelledby` 指向 Label；`aria-describedby` 指向 Help 或 Error
- [ ] 错误提示：Error 容器 `role=alert` 且 `aria-live=polite`
- [ ] 必填：`aria-required` 与 `required` 一致；`aria-invalid` 与 `error` 状态一致

## 集成与表现
- [ ] 在 demo 中放入 `<input|picker|textarea>` 控件，焦点/错误样式统一
- [ ] 与 Button 组合：提交时错误字段高亮并可滚动到首个错误

## QA 执行步骤
1. 打开 `pages/form-field-demo`：验证默认/焦点/错误/禁用四类状态
2. 触发错误：留空必填、错误格式、长度不足/过长、自定义校验
3. 验证 `scrollIntoView()`：模拟提交失败滚动至第一个错误字段
4. 样式/间距：核对与 Button 组合的区块感

## 出口标准
- AC 全通过；功能/视觉/可访问性/集成无阻断问题
- 重要注意点记录在 QA 报告

