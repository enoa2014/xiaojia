# Test Plan: Button 组件（Story 7.8）

目标：验证 Button 满足故事验收标准与设计系统规范，覆盖变体、状态、尺寸、交互、A11y、集成与健壮性。

## 范围
- 组件：`miniprogram/components/button/*`
- 使用页：`pages/services/form`、`pages/patients/form` 等表单页
- 演示页：`pages/button-demo`
- 参考：`docs/stories/7.8.component-button.md`、`docs/uiux/design-system/components.md#按钮（Button）`

## 验收回归（AC 对应用例）
1) 组件创建与属性（AC1）
- [ ] 变体：`primary|secondary|ghost|danger` 渲染正确
- [ ] 状态：`default|disabled|loading` 表现正确，`pressed` 有轻微动效
- [ ] 尺寸：`sm|md` 高度/字号/内边距符合规范

2) 样式对齐（AC2）
- [ ] 颜色与对比度达标（白字 on 彩底 ≥4.5:1）
- [ ] 动效：hover/active 的缩放与阴影
- [ ] 禁用/加载态：透明度/禁点/Spinner 可见性

3) 页面替换（AC3）
- [ ] 服务表单：保存草稿/清除/提交 等按钮替换为组件后流程可用
- [ ] 患者表单：主要操作使用组件，提交流程可用

## 功能用例
- [ ] 点击：normal 状态触发 `tap`，携带 `{ variant,size,text }`
- [ ] 禁用：`disabled=true` 不触发 `tap`，`hover-class` 不生效
- [ ] 加载：`loading=true` 显示 spinner，不触发 `tap`；`aria-disabled=true`
- [ ] 图标：`icon/iconRight` 正确渲染；仅图标/圆形/全宽布局正常
- [ ] 表单：`formType/openType` 透传生效
- [ ] 长文案：文本省略不破坏布局

## A11y
- [ ] 原生 `<button>` 语义；`aria-label` 支持自定义说明
- [ ] `aria-disabled` 同步 `disabled||loading`
- [ ] 触达尺寸：`md=80rpx`，`sm=64rpx`；若需≥88rpx，可由外层容器放大

## 集成与表现
- [ ] 与页面现有样式不冲突；间距/圆角/阴影符合 tokens
- [ ] 弱网：提交时 loading→normal 过渡无抖动

## QA 执行步骤
1. 打开 `pages/button-demo`：验证变体/尺寸/状态/图标/全宽/圆形
2. 打开 `pages/services/form`：验证保存草稿/清除/提交（含 loading）
3. 打开 `pages/patients/form`：验证主要操作与禁用/校验失败提示
4. 弱网模拟：提交按钮 loading 态禁点与 Spinner 显示

## 出口标准
- AC 全通过；功能/视觉/可访问性/集成无阻断问题
- 重要注意点记录在 QA 报告

