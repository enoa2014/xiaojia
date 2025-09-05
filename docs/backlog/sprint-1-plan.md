# Sprint 1 计划（2 周）

- Sprint Goal: 交付最小闭环（建档/服务/活动/权限），打通前后端与部署链路。
- Timebox: 10 个工作日（含 1 天缓冲）
- 环境: 单环境部署（ENV_ID=cloud1-3grb87gwaba26b64）

## 范围与故事（8）
1. EP-01-S1 身份证唯一去重与冲突提示（P0, M）API: patients.create（幂等、唯一索引、E_CONFLICT）
2. EP-01-S2 档案查看（脱敏/审批窗口内明文）（P0, S）API: patients.get（基于角色+审批过滤）
3. EP-01-S3 档案搜索/筛选（P1, S）API: patients.list（前缀/尾4位/分页/排序+meta）
4. EP-03-S1 志愿者提交服务记录（P0, M）API: services.create（幂等、校验、图片占位）
5. EP-03-S2 社工审核记录（P0, S）API: services.review（review→approved|rejected，驳回需理由）
6. EP-04-S1 活动发布与列表（P1, S）API: activities.create/list（状态/容量/筛选）
7. EP-04-S2 报名/取消/签到（P1, M）API: registrations.register/cancel/checkin（候补、幂等）
8. EP-06-S1 字段级权限申请与审批（P0, M）API: permissions.request.submit/approve/reject（TTL、审计）

## 排期（Sequencing）
- Week 1: EP-06-S1 → EP-01-S1/S2 → EP-03-S1/S2
- Week 2: EP-04-S1/S2 → EP-01-S3 → E2E 验收与修正

依赖：EP-01-S2 依赖 EP-06-S1；EP-03-S2 依赖 EP-03-S1；EP-04-S2 依赖 EP-04-S1。

## 交付物（Deliverables）
- Backend: 各域函数按 contracts.md 实现（幂等/错误码/审计）
- Frontend: 调用封装按 quick-reference.md；页面接入（档案/服务/活动/权限）
- Data: `init-db` 索引/集合；字段脱敏矩阵生效
- Docs: PRD/契约/数据字典同步更新；本计划文件
- Tests: 单元/集成/端到端覆盖关键路径（test-plan.md）

## DoR / DoD
- DoR: 验收标准明确；契约已对齐；数据字典与校验规则就绪；UI 交互稿链接齐全
- DoD: 前后端联调通过；错误码与审计落地；用例通过率达标；文档同步更新；可部署与回滚说明

## Owner 分工（示例）
- Backend: patients/services/activities/registrations/permissions
- Frontend: 档案/服务/活动/权限 页面与组件接入
- QA: 冲突/权限/幂等/候补/签到等关键场景
- PO/架构: 契约一致性与范围控制、风险把关

## 风险与缓解
- 权限边界复杂 → 白名单字段+统一过滤中间层，先小范围生效
- 幂等/候补并发 → 使用 clientToken 与唯一键校验，提供回退提示
- 时间压力 → 严控范围，非必要功能移入下迭代（导出/年度统计）

## 变更记录
- v0.1 创建 Sprint 1 计划（由 PO 提交）

## 故事任务清单（Backend / Frontend / Testing）

### EP-01-S1 身份证唯一去重与冲突提示
- Backend:
  - 定义 `Patient` 校验（id_card 18 位校验位、phone、birthDate≤today），Zod/TS 类型统一。
  - 建立 `Patients.id_card` 唯一索引；支持 `clientToken` 幂等；冲突返回 `E_CONFLICT`。
  - 实现 `patients.create`：字段白名单、未知字段忽略、审计写入（action=create）。
  - 测试：重复创建触发冲突；并发冲突；非法参数校验失败。
- Frontend:
  - 新建档案表单本地校验与示例占位；生成并携带 `clientToken`。
  - 错误映射：`E_CONFLICT` 友好提示并引导到搜索页。
  - 成功跳转详情/列表刷新；弱网提交态与重试。
- Testing:
  - E2E：合法创建成功可见；重复身份证提示冲突。
  - 边界：空值/格式错、弱网重复点击不产生重复记录。

### EP-01-S2 档案查看（脱敏/审批窗口内明文）
- Backend:
  - 实现 `patients.get`：按 `field-masking-matrix` 与审批 TTL 过滤字段；角色/RBAC 校验。
  - 审批通过窗口内返回明文；每次敏感读取写 `AuditLogs`（actorId/target/timestamp）。
  - 测试：不同角色/审批状态返回脱敏/明文正确；审计记录写入。
- Frontend:
  - 详情页脱敏展示与“申请查看明文”入口；审批通过时提示剩余时长。
  - 错误与空态：无权限引导到权限申请；加载骨架屏。
- Testing:
  - 角色切换校验脱敏/明文；审批过期后再次脱敏；审计可查。

### EP-01-S3 档案搜索/筛选
- Backend:
  - 扩展 `patients.list`：支持 `name` 前缀、`id_card_tail` 精确、`createdAt` 范围；返回 `meta.total/hasMore`；`sort` 入参。
  - 索引：`name_prefix`、`id_card_tail`、`createdAt` 复合索引建议与脚本。
  - 测试：分页边界（page=1/超界）、排序稳定性、过滤组合。
- Frontend:
  - 搜索框与筛选面板（姓名前缀/尾4位/时间范围）；分页与上拉加载。
  - 空态、错误态与重试；保留上次筛选条件。
- Testing:
  - 数据集检索正确性；分页连贯性；筛选切换缓存。

### EP-03-S1 志愿者提交服务记录
- Backend:
  - 定义 `Service` 校验（`type ∈ visit|psych|goods|referral|followup`、`date` ISO、`desc≤500`、`images[]≤9`）。
  - 实现 `services.create`：幂等 `clientToken`；图片字段先占位；写入 `createdBy/createdAt`。
  - 测试：缺必填/非法 type/图片超限报错；幂等重复提交返回相同结果。
- Frontend:
  - 提交表单与图片上传封装；失败保留草稿；提交/加载态与重试。
  - 成功后清空表单/返回列表；错误码映射与提示。
- Testing:
  - E2E：创建后列表可见；弱网断点续提；图片多选上限。

### EP-03-S2 社工审核记录
- Backend:
  - 实现 `services.review`：仅允许 `review→approved|rejected`；被拒需 `reason(20–200)`；RBAC 校验。
  - 并发保护：按当前状态乐观更新；记录审计（action=review, decision）。
  - 测试：非法流转、缺少理由、非授权角色操作均报错。
- Frontend:
  - 审核队列列表（过滤 `status=review`）；详情页审核操作（通过/驳回+理由）。
  - 操作确认弹窗、提交态、结果提示；列表刷新与本地状态同步。
- Testing:
  - E2E：通过/驳回流程；无理由驳回提示；权限受限提示。

### EP-04-S1 活动发布与列表
- Backend:
  - 实现 `activities.create/list`：字段校验（title2–40、date、location≤80、capacity≥0、status∈open|ongoing|done|closed）。
  - 过滤：按状态/时间范围；索引：`status/date`；返回分页与排序。
  - 测试：非法字段与容量负数；过滤与排序正确性。
- Frontend:
  - 发布表单与校验；活动列表（状态 Tab/时间排序/状态徽标）。
  - 详情页占位（为报名功能准备）。
- Testing:
  - E2E：创建后列表可见；筛选/排序交互正确；空态展示。

### EP-04-S2 报名/取消/签到
- Backend:
  - 实现 `registrations.register/cancel/checkin`：保证 `userId+activityId` 唯一；满员进入 `waitlist`；签到幂等。
  - 取消释放名额并自动补位（waitlist→registered）；错误码一致化。
  - 测试：重复报名报错；满员→候补；取消→补位；签到仅记录一次。
- Frontend:
  - 详情页行动面板：报名/取消/签到按钮按 `reg.status` 与 `capacity` 态切换。
  - 状态提示（已报名/候补中/已取消/已签到）；并发操作禁用与防抖。
- Testing:
  - E2E：满员报名进入候补；取消后自动补位；签到按钮幂等。

### EP-06-S1 字段级权限申请与审批
- Backend:
  - 实现 `permissions.request.submit/approve/reject/list`：字段白名单校验；`reason≥20`；`expiresAt` 默认30天（最大90）。
  - 审批通过写 TTL；与 `patients.get` 集成生效；所有敏感读取/审批写 `AuditLogs`。
  - 测试：非法字段/理由过短报错；审批后生效/到期回收；审计完整。
- Frontend:
  - 权限申请表单与状态页（时间线/状态徽标）；详情页集成“申请查看明文”。
  - 审批页（通过/驳回+理由）；TTL 倒计时展示与到期提醒文案。
- Testing:
  - E2E：申请→审批→详情页明文可见；到期后恢复脱敏；无权角色限制。
