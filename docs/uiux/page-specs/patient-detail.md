# 档案详情（Patients Detail）前端实现细则

目标：提供患者档案的分栏详情视图，遵循字段脱敏策略，聚合入住/服务记录，并支持一键权限申请。

## 1. 页面结构（WXML 轮廓）
```
<view class="page">
  <nav-bar title="档案详情" />
  <skeleton wx:if="loading" type="detail" />
  <error-state wx:elif="error" code="{{error.code}}" onRetry="reload" />
  <view wx:else>
    <patient-header data="{{patient}}" />
    <tabs current="{{tab}}" bindchange="onTab">
      <tab title="基本资料"><basic-info data="{{patient}}"/></tab>
      <tab title="入住记录"><tenancies-list items="{{tenancies}}"/></tab>
      <tab title="服务记录"><services-list items="{{services}}"/></tab>
      <tab title="权限申请"><permission-panel patientId="{{patient._id}}"/></tab>
    </tabs>
  </view>
  </view>
```

关键组件
- `patient-header`：头像/姓名/角色徽章/脱敏提示
- `basic-info`：字段分组 + `MaskedField`（点击无权限字段 → 跳转权限申请）
- `tenancies-list`：入住历史卡片（在住/已退住标识）
- `services-list`：服务记录（状态徽章）
- `permission-panel`：字段级权限申请入口

## 2. 状态图（ASCII）
```
[Idle] → (load) → [Loading] → (ok) → [Content]
                         └→ (error) → [Error]
[Content] -- switch tab --> [Content]
[Content] -- click Masked --> [PermissionApply]
```

## 3. 数据模型与字段来源
- 主实体：`Patient`
  - 关键字段：`name`、`id_card(masked)`、`phone(masked)`、`birthDate`、`diagnosis(level)`、`family.economicLevel`、`createdAt`
  - 可见性：按 `docs/data/field-masking-matrix.md` 执行；无权限默认脱敏；审批通过窗口内明文
- 关联实体：
  - `Tenancies`（按 `checkInDate desc`）
  - `Services`（按 `date desc`）

字段映射参考：`docs/data/data-dictionary.md`

## 4. API 与数据流
- 首次加载：
  - `patients.get({ id })` → patient
  - `tenancies.list({ page:1,pageSize:20, filter:{ patientId:id } })` → tenancies
  - `services.list({ page:1,pageSize:20, filter:{ patientId:id } })` → services
- 重试策略：对 `list` 接口使用 `callWithRetry`；`get` 出错展示 ErrorState
- 脱敏点击：跳转权限申请页，提交 `permissions.request.submit`

## 5. 交互流程（顺序图）
```
User → Page: onLoad(id)
Page → API: patients.get
API → Page: patient (masked/clear per approval)
Page → API: tenancies.list / services.list
API → Page: lists
User → UI: tap masked field
UI → Nav: to permissions/apply?patientId=...
```

## 6. 验证与错误
- 校验：无
- 错误处理：
  - E_PERM：显示“无权限查看，去申请”并提供跳转
  - E_NOT_FOUND：展示空态“档案不存在或已被删除”
  - 列表错误可重试（退避）

## 7. 埋点
- 页面曝光：patientId、role
- Tab 切换：tabName
- 点击敏感字段：fieldName、hasApproval

## 8. 验收清单
- 无权限默认脱敏，审批后窗口内明文
- 入住/服务列表分页与空态完整
- 异常码映射与重试生效，错误提示友好
