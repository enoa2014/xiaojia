# 测试用例：EP-02-S1 新增入住记录（Tenancy Create）

版本：v1.0（2025-09-06）  
关联：PRD 4.1、Contracts.tenancies、Validation Rules、UI 前端规范 15.2

## 预置条件
- 已部署 `patients`、`tenancies` 云函数，ENV_ID 正确配置。
- 小程序可运行，具备“新增入住”入口。

## 用例清单（对应 AC）

- AC1 成功创建（P1, E2E）
  1) 进入“新增入住”，填写 patientId 与 checkInDate
  2) 提交
  3) 期望：Toast“新增成功”；返回列表并按 checkInDate 降序可见新记录

- AC2 日期关系（P1, E2E + P0, Unit/Int）
  1) 退住日期 < 入住日期提交
  2) 期望：内联“退住日期不能早于入住日期” + E_VALIDATE Toast
  3) 退住日期 = 入住日期提交成功（集成）

- AC3 冲突提醒（软提示，不阻断）（P1, E2E）
  1) 先创建一条含 room+bed+checkInDate 的记录
  2) 再次用同 room+bed+checkInDate 提交
  3) 期望：弹窗提示冲突；取消→终止；确认→仍可创建成功

- AC4 身份关联（P1, 集成/E2E）
  1) 仅填写 id_card（存在对应 Patients）+ checkInDate 提交
  2) 期望：创建成功；DB 中该入住记录带有 patientId（回填匹配结果）

- AC5 在住状态（P1, E2E）
  1) 创建一条未退住记录
  2) 返回患者详情页
  3) 期望：显示“在住”状态（以最近未退住记录判断）

- AC6 体验与 A11y（P1, E2E）
  - 提交按钮 Loading 态，重复点击无副作用
  - 触控≥88x88rpx，标签对比度达标

## 埋点校验（前端规范 15.2）
- `tenancy_create_submit`：包含 requestId、hasPatientId/hasIdCard/hasRoom/hasBed
- `tenancy_create_result`：包含 requestId、duration、code（OK 或错误码）
- 本地调试：未配置自定义分析时，控制台打印 `[analytics]` 日志

## CLI 辅助（可选）
- 通过 CloudBase CLI 调用进行集成验证：
```
# 生成合法身份证（需校验位算法）→ 创建患者
# 然后仅凭 id_card 创建入住，检查回填 patientId
```

## 通过标准
- 所有 P1 场景通过；P0 校验无误；UI/可访问性符合规范
- 事件上报字段完整、requestId 一致、duration 合理

