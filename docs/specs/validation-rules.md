# 表单与业务校验规则

统一字段与跨字段规则、错误提示规范，确保前后端一致。

## 通用规则
- 身份证号：格式合法校验 + 唯一去重（Patients.id_card）
- 电话：`^1\d{10}$`（中国大陆）
- 日期：ISO 字符串；入退住需 `checkInDate <= checkOutDate`
- 文本：去首尾空格，长度限制与违禁词过滤（如备注 ≤ 500 字）
- 图片：类型/尺寸限制；病毒扫描（后端）

## 档案（Patients）
- 必填：`name` `id_card`
- 业务：`id_card` 创建前查重；编辑不可变更或需管理员审批
- 错误文案：
  - `身份证格式错误`（E_VALIDATE）
  - `身份证已存在，请搜索后编辑`（E_CONFLICT）

## 入住/退住（Tenancies）
- 必填：`patientId` `checkInDate` `room` `bed`
- 业务：`room+bed+checkInDate` 冲突检测（同日不可重复入住）；退住日期可空

## 服务记录（Services）
- 必填：`patientId` `type` `date`
- 业务：`status` 流转 `review -> approved/rejected`，拒绝需 `reason`

## 活动/报名（Activities/Registrations）
- 活动：`capacity >= 0`；状态机 `open -> ongoing -> done`/`closed`
- 报名：容量校验；取消后可再报名（规则可配置）

## 权限申请（PermissionRequests）
- 必填：`fields[]` `reason`；审批人/到期时间必填
- 业务：到期自动回收；任一敏感读取需存在有效批文

## 错误提示规范
- 表单内联 + Toast；高亮错误字段
- 避免技术细节，提供解决建议

