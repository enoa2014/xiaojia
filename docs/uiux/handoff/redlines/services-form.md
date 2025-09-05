# Redlines · 服务记录表单（pages/services/form）

## 概览
- 用于 EP-03-S1 服务记录提交；支持文字与图片，弱网草稿。
- 路由：`pages/services/form`

## 栅格与间距
- 页面左右 24rpx；字段间距 16rpx；图片九宫格：单元 212rpx，间距 12rpx。

## 字体/颜色（tokens）
- Label：20rpx `--gray-700`；输入：20rpx `--text-primary`；说明：18rpx `--gray-500`。
- 错误：`--color-danger-600`；主色：`--color-primary-600`。

## 字段与组件
- patientId（选择器/上下文显式展示）：高度 88rpx。
- type Segmented：5 个类型；高度 72rpx；选中底线 4rpx `--color-primary-600`。
- date 选择器：触发区 88rpx；箭头 24rpx。
- desc Textarea：最小高度 160rpx；字数提示（右下 18rpx）。
- images ImagePicker：九宫格；单元 212rpx；缩略图圆角 `--radius-md`；删除按钮 24rpx。
- 提交按钮：高度 80rpx；Loading 态。

## 状态
- Input/Picker：Default/Focus/Error；错误在下方显示，18rpx。
- Image 上传进度条：高度 8rpx，主色填充。

## 空/错/加载
- 错误映射：超限提示“最多 9 张，每张≤5MB”。
- Skeleton：字段骨架 + 图片网格占位。

## 可达性
- 触控≥88rpx；进度可见；错误定位与朗读友好。

## 参考
- 故事：`docs/backlog/stories/EP-03-S1-service-record-create.md`
- 校验：`docs/specs/validation-rules.md`
- 设计系统：`docs/uiux/design-system/*`
- Figma：<在此填入链接>
