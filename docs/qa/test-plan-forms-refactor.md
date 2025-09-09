# Test Plan: 表单页组件化替换（Story 7.10）

目标：验证已选表单页使用 Button/FormField 组件后的功能与一致性，覆盖流程、样式、校验与可访问性。

## 范围
- 页面：`miniprogram/pages/{activities/form, tenancies/form, patients/form}`（优先这三页）
- 组件：`components/{button, form-field}`
- 参考：`docs/stories/7.10.forms-refactor-to-components.md`、`docs/specs/validation-rules.md`

## 验收对应用例（AC）
1) 组件替换（AC1）
- [ ] 目标页按钮替换为 `ui-button`
- [ ] 目标页字段容器替换为 `ui-form-field`

2) 流程可用（AC2）
- [ ] 成功提交：成功提示/跳转符合预期
- [ ] 失败提交：`mapError` 映射友好文案，提供重试/修正路径
- [ ] 校验错误：错误文本在字段下方展示且清晰

3) A11y（AC3）
- [ ] 触达尺寸、对比度达标
- [ ] 错误文本与字段的 ARIA 关联正确（`aria-describedby` 指向 error）

## 功能用例
- [ ] 必填/格式/长度/自定义校验触发并显示到对应字段
- [ ] 首个错误滚动定位（如实现），或可快速发现与修正
- [ ] Button loading 禁点，避免重复提交；Success/Toast 反馈一致

## 页面专项
- activities/form：标题/分类/描述/时间地点/报名设置/权限设置等字段验证
- tenancies/form：入住/退住日期、补助等数值与格式
- patients/form：姓名/证件/手机号等基础信息

## 出口标准
- AC 全部通过；若存在页面未替换到组件，标注为差距并进入后续修复

