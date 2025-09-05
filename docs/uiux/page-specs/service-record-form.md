# 服务记录表单（Service Record Form）前端实现细则

目标：志愿者/社工快速提交服务记录（探访/心理/物资/转介/随访），支持弱网草稿、图片上传与受控审核流。

## 1. 页面结构（WXML 轮廓）
```
<view class="page">
  <nav-bar title="服务记录" />
  <form bindsubmit="onSubmit">
    <picker name="type" range="{{types}}" bindchange="onType" />
    <date-picker name="date" bindchange="onDate" />
    <textarea name="desc" maxlength="500" />
    <image-picker name="images" max="9" bindchange="onImages" />
    <button formType="submit" loading="{{submitting}}">提交</button>
  </form>
</view>
```

## 2. 状态图（表单）
```
[Idle] → (input) → [Dirty]
[Dirty] → (autosave) → [DraftSaved]
[Dirty] → (submit) → [Submitting] → (ok) → [Success]
                                   └→ (error) → [Error] → (edit) → [Dirty]
```

## 3. 字段与校验（来源：validation-rules.md）
- 必填：`patientId`（上下文传入或选择）、`type ∈ visit|psych|goods|referral|followup`、`date`（ISO）
- 可选：`desc≤500`、`images≤9` 每张≤5MB
- 业务：创建默认 `status='review'`；`clientToken` 保证幂等

## 4. API 与数据流
- 提交：`services.create({ service, clientToken })`
- 上传：选图后先压缩再 `wx.cloud.uploadFile`，得到 `fileID` 列入 `images[]`
- 重试：提交对 `E_RATE_LIMIT/E_DEPENDENCY/E_INTERNAL` 使用 `callWithRetry`
- 成功：Toast“提交成功，待审核”；返回上一页并刷新

## 5. 交互流程（顺序图）
```
User → UI: fill form
UI → Local: autosave draft (storage)
User → UI: submit
UI → API: services.create (clientToken)
API → UI: { ok }
UI → Nav: back & refresh list
```

## 6. 错误与提示
- E_VALIDATE：表单内联高亮字段（类型/日期/图片超限/描述过长）
- E_INTERNAL/E_DEPENDENCY/E_RATE_LIMIT：退避重试，失败保留草稿

## 7. 埋点
- 表单提交：patientId、type、imagesCount
- 失败上报：code、duration、requestId

## 8. 验收清单
- 必填校验完整；图片数量/体积限制生效
- 成功回退与列表刷新；草稿可恢复
- 可重试错误走退避；错误文案友好
