# 测试用例：EP-02-S2 退住登记与排序（Tenancy Checkout）

版本：v1.0（2025-09-06）  
关联：EP-02-S2 故事、contracts.tenancies、validation-rules、frontend-spec（埋点 15.x）

## 预置条件
- 已部署 `tenancies` 云函数；ENV_ID 配置正确。
- 小程序可运行，患者详情页可进入“退住”页面。
- 准备数据：存在某患者至少一条“未退住”的最近入住记录（`checkOutDate` 为空）。

## 用例清单（按 AC）

### AC1 成功退住（P1, E2E + P1, Integration）
1) 进入“退住”页，选择 `checkOutDate >= checkInDate`，提交  
期望：Toast“退住已登记”；返回上一页；DB 中该记录写入 `checkOutDate`；返回 `{ ok:true, data:{ updated:1 } }`
2) 集成：调用 `tenancies.update({ id, patch:{ checkOutDate } })` 成功返回

### AC2 日期校验（P1, E2E + P0, Unit/Integration）
1) 选择 `checkOutDate < checkInDate`，提交  
期望：内联“退住日期不能早于入住日期”；错误码 `E_VALIDATE`
2) 边界：`checkOutDate === checkInDate` 应通过（集成）

### AC3 已退住保护（P1, E2E + P1, Integration）
1) 对已存在 `checkOutDate` 的记录再次提交退住  
期望：`E_CONFLICT`，文案“当前记录已退住”；不修改原数据

### AC4 详情“在住”状态更新（P1, E2E）
1) 退住成功后返回患者详情页  
期望：原“在住”状态变为“—”（或“已退住”），最近记录显示 `checkOutDate`

### AC5 列表与排序（P1, E2E）
1) 返回入住列表页  
期望：列表仍按 `checkInDate desc` 排序；在住/已退住标识正确（最近未退住→在住，否则已退住）

### AC6 体验与 A11y（P2, E2E）
- 提交按钮 Loading，重复点击无副作用
- 对比度与触控面积达标；错误提示清晰

## 埋点校验（前端规范）
- `tenancy_checkout_submit`：{ requestId, tenancyId }
- `tenancy_checkout_result`：{ requestId, duration, code }
- 本地联调：未配置自定义分析时打印 `[analytics]` 日志

## CLI 辅助（可选）
- 通过 CloudBase CLI：
```
# 1) 查找到某患者最近未退住记录（checkOutDate 为空）
# 2) 调用 tenancies.update 提交退住；重复调用应返回 E_CONFLICT
```

## 通过标准
- 所有 P1 场景通过；P0 校验无误；UI/可达性符合规范
- 事件上报字段完整、requestId 一致、duration 合理

