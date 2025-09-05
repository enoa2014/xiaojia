# 用户故事库（MVP 范围）

本文档将 PRD/Epic 细化为开发可执行的用户故事，并配套验收标准与依赖。请用统一模板撰写并持续维护。

## 写作模板
- 作为：{角色}
- 我想要：{目标}
- 以便：{业务价值}

### 验收标准（示例模板）
- 场景1：Given {前置条件} When {操作} Then {结果}
- 场景2：...
- 非功能：性能/安全/可用性/可追踪性等（如：列表加载 ≤ 1.5s）

### 补充信息
- 设计链接：Figma/文档/截图
- 接口契约：函数名/字段/错误码
- 埋点：事件名/属性/触发时机

## 故事分组（按 Epic）

### EP-01 患者与家庭档案（Patients）
- [ ] EP-01-S1 身份证唯一去重与冲突提示（P0，M）
  - 作为：社工；我想要：创建患者档案时自动校验身份证唯一；以便：避免重复档案。
  - 验收（G/W/T）：
    - Given 在新建表单输入已存在的身份证 When 点击提交 Then 返回 `E_CONFLICT`，并提示“身份证已存在，请搜索后编辑”。
    - Given 输入合法未占用身份证 When 提交 Then 返回 {ok:true} 且档案可在列表中看到。
    - 非功能：接口 P95 ≤ 300ms；错误有 requestId 可追踪。
  - 接口：patients.create；数据：Patients.id_card 唯一；依赖：EP-06（错误码规范）。

- [ ] EP-01-S2 档案查看（脱敏/原始切换）（P0，S）
  - 作为：志愿者/社工；我想要：按权限查看档案；以便：遵守最小暴露。
  - 验收：
    - 志愿者查看详情：身份证/电话以尾 4 位显示。
    - 审批通过窗口内（见 EP-06）社工查看详情：身份证/电话明文显示，并写审计。
  - 接口：patients.get；依赖：EP-06（权限申请与审计）。

- [ ] EP-01-S3 档案搜索/筛选（P1，S）
  - 作为：社工；我想要：按姓名前缀、证件尾 4 位筛选；以便：快速定位档案。
  - 验收：列表分页稳定；支持 `name` 前缀、`id_card_tail` 精确匹配；按 `createdAt desc` 排序。
  - 接口：patients.list；数据：`name+id_card_tail` 索引。

### EP-02 入住/退住（Tenancies）
- [ ] EP-02-S1 新增入住记录（P0，M）
  - 作为：社工；我想要：为患者新增一次入住（日期/房间/床位/补助可选）；以便：形成入住台账。
  - 验收：必填 `patientId|id_card` 和 `checkInDate`；成功返回 `_id`；记录 `createdAt`。
  - 接口：tenancies.create；依赖：EP-01（patientId 关联）。

- [ ] EP-02-S2 退住登记与排序（P1，S）
  - 作为：社工；我想要：为未退住记录补录退住日期；以便：闭环台账。
  - 验收：`checkOutDate` 可为空；列表按 `checkInDate desc` 排序；退住后展示区分状态。
  - 接口：tenancies.update / list。

### EP-03 家庭服务记录（Services）
- [ ] EP-03-S1 志愿者提交服务记录（P0，M）
  - 作为：志愿者；我想要：提交探访/心理/物资等服务记录；以便：沉淀服务数据。
  - 验收：必填 `patientId,type,date`；图片可选；`clientToken` 幂等；成功返回 `_id`。
  - 接口：services.create；依赖：上传封装、EP-01。

- [ ] EP-03-S2 社工审核记录（P0，S）
  - 作为：社工；我想要：审核记录为通过或驳回（需理由）；以便：保证数据质量。
  - 验收：状态仅允许 `review→approved|rejected`；驳回需 `reason`；写入审计。
  - 接口：services.review；依赖：EP-06 审计。

### EP-04 活动与报名（Activities/Registrations）
- [ ] EP-04-S1 活动发布与列表（P1，S）
  - 作为：社工；我想要：创建活动（标题/时间/地点/容量/状态）；以便：组织活动。
  - 验收：创建成功可在列表按状态/时间筛选；容量可为 0 表示无限。
  - 接口：activities.create / list。

- [ ] EP-04-S2 报名/取消/签到（P1，M）
  - 作为：志愿者；我想要：报名并签到；以便：参与活动且产生记录。
  - 验收：满员自动候补；重复报名提示已报名；签到幂等，仅记录一次时间戳。
  - 接口：registrations.register / cancel / checkin。

### EP-05 统计与导出（Stats/ExportTasks）
- [ ] EP-05-S1 月度统计展示（P1，M）
  - 作为：管理员；我想要：查看某月服务数量与趋势；以便：评估项目。
  - 验收：接口返回聚合数据；前端展示折线/柱状；空数据有占位提示。
  - 接口：stats.monthly。

- [ ] EP-05-S2 导出 Excel（临时链接）（P1，M）
  - 作为：管理员；我想要：导出某月统计为 Excel 并下载；以便：归档/汇报。
  - 验收：创建任务后轮询 status 至 done；返回临时 URL（30 分钟有效）。
  - 接口：export.create / export.status；依赖：COS。

### EP-06 权限与脱敏（PermissionRequests/AuditLogs）
- [ ] EP-06-S1 字段级权限申请与审批（P0，M）
  - 作为：社工/志愿者；我想要：申请查看身份证/电话等字段；以便：办事所需。
  - 验收：提交包含字段清单与理由；审批通过生成 TTL；到期自动回收。
  - 接口：permissions.request.submit / approve / reject；数据：PermissionRequests。

- [ ] EP-06-S2 审计日志（P0，S）
  - 作为：管理员；我想要：敏感读写/导出的审计留痕；以便：追责与合规。
  - 验收：记录 actorId、action、target、时间、requestId；可按时间筛选查询。
  - 数据：AuditLogs；依赖：各域统一写审计。

## 依赖与假设（示例）
- 依赖：云函数 patients.list 已提供分页/排序/过滤
- 假设：身份证校验规则与遮蔽规则一致

## 估算与优先级
- 估算：S(≤1d)/M(1-3d)/L(>3d)
- 优先级：P0/P1/P2（映射里程碑）

## 变更记录
- v0.1 初始化骨架
- v0.2 补充首批故事（EP-01..06，含 G/W/T、接口、优先级、估算）
