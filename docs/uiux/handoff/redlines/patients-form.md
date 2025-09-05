# Redlines · 患者建档表单（pages/patients/form）

## 概览
- 目标：用于 EP-01-S1 患者建档；保证身份证唯一与格式正确，提供清晰的错误反馈。
- 路由：`pages/patients/form`
- 适配：单列布局，基准宽度 750rpx（小程序标准）。

## 栅格与间距（rpx）
- 页面内边距：左右 24rpx；模块间距 24rpx；字段垂直间距 16rpx。
- 触控目标：高度 ≥ 88rpx；左右可点击留白 ≥ 8rpx。

## 字体与颜色（引用 tokens）
- 标题：28rpx `--text-primary`；Label：20rpx `--gray-700`；输入：20rpx `--text-primary`。
- 主色：`--color-primary-600`；边框：`--gray-300`；错误：`--color-danger-600`。

## 字段规格
- 姓名 name
  - 高度 88rpx；输入区左右内边距 24rpx；占位“请输入姓名”。
- 身份证 id_card（必填）
  - 高度 88rpx；校验状态：Default / Focus / Error。
  - Error 文案：`身份证格式或校验位错误`（对齐 validation-rules）。
- 手机号 phone（可选）
  - 高度 88rpx；键盘类型 number；格式提示“11位手机号”。
- 出生日期 birthDate（可选）
  - 选择器触发区高度 88rpx；右侧箭头 24rpx；占位“选择日期”。
- 更多信息（折叠）
  - 折叠头高度 72rpx；图标 24rpx；展开内容与基本字段一致的间距与字体。

## 组件与状态
- Input / Picker：
  - Default：边框 `--gray-300`；圆角 `--radius-md`；背景 `#FFF`。
  - Focus：边框 `--color-primary-600`；阴影 `--shadow-sm`。
  - Error：边框 `--color-danger-600`；下方 ErrorText 18rpx，行距 1.4。
- 提交按钮：
  - 高度 80rpx；圆角 `--radius-lg`；Primary 变体；Loading 态左侧 20rpx spinner。

## 切图与资源
- 图标：返回、展开/收起、日期，24rpx，1x/2x（小程序自动适配）。

## 空/错/加载
- 加载（Skeleton）：标题条 28rpx ×1；字段骨架 88rpx ×3；间距同上。
- 错误：内联 + 顶部 Toast，不遮挡按钮；颜色遵循 tokens。

## 可达性
- 错误定位自动滚动至字段；对比度 ≥ 4.5:1；触控≥88rpx。

## 参考
- 设计系统：`docs/uiux/design-system/*`
- 校验：`docs/specs/validation-rules.md`
- 故事：`docs/backlog/stories/EP-01-S1-patient-create-unique-id.md`
- Figma：<在此填入链接>
