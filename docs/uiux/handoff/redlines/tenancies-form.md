# Redlines · 入住记录表单（pages/tenancies/form）

## 概览
- 对应 EP-02-S1 新增入住记录；从“档案详情/入住记录”Tab 进入。
- 路由：`pages/tenancies/form`

## 栅格与间距
- 页面左右 24rpx；字段间距 16rpx；分组标题与字段间距 12rpx。

## 字体/颜色（tokens）
- Label：20rpx `--gray-700`；输入：20rpx `--text-primary`；错误：`--color-danger-600`。

## 字段与组件
- patient（patientId|id_card 二选一）
  - patientId 选择器高度 88rpx；或 id_card 输入高度 88rpx。
- checkInDate（必填）
  - 触发区 88rpx；占位“选择入住日期”。
- checkOutDate（可选）
  - 触发区 88rpx；校验不早于 checkInDate；错误文案“退住日期不能早于入住日期”。
- room / bed（可选）
  - 输入高度 88rpx；同行双列：每列宽度 338rpx，间距 24rpx。
- subsidy（可选）
  - 输入高度 88rpx；右侧单位“元”（20rpx 灰文）；≥0，两位小数。
- extra.admitPersons（可选）
  - 高度 88rpx；占位“入住人（原样字符串）”。
- 提交按钮：高度 80rpx；Primary 变体；Loading 态。

## 冲突提示（软提示）
- 文案：“该床位在当日可能已被占用，请确认后提交”。
- 样式：Dialog 标题 24rpx；正文 20rpx；主按钮 Primary、次按钮 Ghost。

## 可达性
- 触控≥88rpx；错误定位；对比度≥4.5:1。

## 参考
- 故事：`docs/backlog/stories/EP-02-S1-tenancy-create.md`
- 校验：`docs/specs/validation-rules.md`
- 设计系统：`docs/uiux/design-system/*`
- Figma：<在此填入链接>
