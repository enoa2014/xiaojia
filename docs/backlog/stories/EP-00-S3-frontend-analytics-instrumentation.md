# Story: EP-00-S3 前端埋点接入与校验（Analytics Instrumentation）
Status: Planned

## Story
- As: 产品/分析/QA
- I want: 接入核心路径的前端埋点并校验
- So that: 支持后续分析与告警

## Scope
- In：
  - 事件：`tenancy_create_submit/result`、`tenancy_checkout_submit/result`、`service_submit_click/result`、`activity_create_submit/result|activities_list_view`、`perm_request_submit/result`、`export_create_submit/result`；
  - 属性：包含 `requestId`、关键字段（has*、count、type、code、duration）；
  - 校验：采样检查事件与属性完整性，并输出简要报告。
- Out：多渠道聚合与可视化（后续）。

### 事件字段规范（Event Schema）
- tenancy_create_submit：`{ requestId, hasPatientId, hasIdCard, hasRoom, hasBed }`
- tenancy_create_result：`{ requestId, duration, code }`
- tenancy_checkout_submit：`{ requestId, tenancyId }`
- tenancy_checkout_result：`{ requestId, duration, code }`
- service_submit_click：`{ requestId, type, imagesCount, hasImages }`
- service_submit_result：`{ requestId, duration, code }`
- activity_create_submit：`{ requestId, capacity, status, hasLocation }`
- activity_create_result：`{ requestId, duration, code }`
- activities_list_view：`{ requestId, statusTab, count, duration }`
- perm_request_submit：`{ requestId, fields, expiresDays, length }`
- perm_request_result：`{ requestId, duration, code }`
- export_create_submit：`{ requestId, month }`
- export_create_result：`{ requestId, duration, code }`

### 采集位置（Collection Points）
- 参考文件：
  - `miniprogram/pages/tenancies/form.js:onSubmit`（tenancy_create_*）
  - `miniprogram/pages/tenancies/checkout.js:onSubmit`（tenancy_checkout_*）
  - `miniprogram/pages/services/form.js:onSubmit`（service_*）
  - `miniprogram/pages/activities/form.js:submit`（activity_create_*）
  - `miniprogram/pages/activities/index.js:refresh`（activities_list_view）
  - `miniprogram/pages/permissions/apply.js:onSubmit`（perm_request_*）
  - `miniprogram/pages/exports/index.js:onCreate/onCheck`（export_create_*）

### 去重与重试（Dedup & Retry）
- `requestId` 由 `genRequestId(prefix)` 生成并全流程贯穿；同一交互仅产生一次 `result`（OK/失败）。
- 失败重试：重试时不重复上报 `submit`；`result` 保留最近一次（可在事件内附带 `retryCount` 可选）。

### 采样与报告（Sampling & Report）
- 周期：7 天；
- 报告字段：覆盖率（事件出现/应出现）、缺失属性列表、异常 code 统计；
- 输出：存档到 `docs/reports/analytics-samples-<YYYY-MM-DD>.md`（可选）。

## Acceptance Criteria
- AC1 事件接入
  - Given 执行上述用户操作
  - Then 产生相应事件一次；属性完整
- AC2 失败合并
  - Given 重试
  - Then 仅产生一次 `result`（OK/失败）
- AC3 报告
  - Given 一周内采样
  - Then 输出覆盖率与缺失项列表

## Tasks
- FE：
  - T1 所有事件接入，使用 `genRequestId(prefix)` 贯穿
- QA：
  - T2 采样验证并出具报告（覆盖率/缺失项）
- Docs：
  - T3 更新 `docs/testing/test-plan.md` 的埋点校验章节

## 测试用例（建议）
- 每类事件成功/失败路径均产生一次 `result`；`requestId` 贯穿且唯一。
- 重试：仅保留一次 `result`；不重复 `submit`。
- 采样报告：包含覆盖率与缺失属性列表；导出保存（可选）。

## References
- 埋点封装：`miniprogram/services/analytics.js`
- 测试计划：`docs/testing/test-plan.md#埋点校验（Analytics）`

## Dependencies
- requestId 透传、后端审计 EP-06-S2

## Risks
- 事件激增 → 采样/限速，阶段性上报

## DoR
- [x] 事件清单明确

## DoD
- [ ] 事件接入；采样报告；测试与文档更新
