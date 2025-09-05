# 表单与业务校验规则

统一字段级与跨字段规则、身份证去重方案与错误文案规范，确保前后端一致、可追溯、可本地化。

## 通用规则
- 身份证号：格式校验 + 唯一去重（`Patients.id_card` 唯一）。18 位二代身份证，末位校验码大小写均可（X/x）。
- 电话：`^1[3-9]\d{9}$`（中国大陆 11 位手机号）。
- 日期：使用 ISO `YYYY-MM-DD`；业务上保证 `checkInDate <= checkOutDate`。
- 文本：去首尾空格，合并重复空格；长度限制（一般 ≤ 100；备注 ≤ 500），过滤明显违禁词。
- 图片：限制类型（jpg/png/webp）与大小（≤ 5MB/张）；后端进行病毒扫描或拒绝未知类型。
- 角色校验：后端依据用户角色/审批上下文过滤返回字段（见字段脱敏矩阵）。
- 一致性：前端与后端使用相同校验规则（后端为准，前端提前校验提升体验）。

## 身份证去重与合法性校验
- 结构：`6位地址码 + 8位出生日期(YYYYMMDD) + 3位顺序码 + 1位校验码`。
- 格式：`^\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$`。
- 校验码：采用国家标准加权算法计算；不匹配返回 `E_VALIDATE` 与文案“身份证格式或校验位错误”。
- 去重：后端以 `Patients.id_card` 唯一索引保证幂等；创建前做 existence check，冲突返回 `E_CONFLICT` 与文案“身份证已存在，请搜索后编辑”。
- 缺证档案：`id_card` 为空时允许创建但标记为“无证档案”；禁止将无证档案自动与他人合并（需人工确认）。

## 档案（Patients）
- 必填：`name`、`id_card`（无证档案场景可例外，需管理员开关）。
- 可选：`phone`、`birthDate`、`gender`、`nativePlace`、`ethnicity`、`hospital`、`hospitalDiagnosis`、`doctorName`、`symptoms`、`medicalCourse`、`followupPlan`、`mother*`、`otherGuardians`、`familyEconomy`。
- 字段级规则：
  - `name`：2–30 个字符，允许中文/字母/间隔点，不允许纯数字。
  - `id_card`：见“身份证去重与合法性校验”。
  - `phone`：可空；若填必须匹配手机号规则。
  - `birthDate`：必须是 <= 今日的 ISO 日期。
  - `motherPhone`/`motherIdCard`：如提供需分别通过手机号/身份证校验。
- 跨字段规则：
  - 编辑档案时，`id_card` 默认不可变更；如确需更改，需管理员审批并记录审计。
- 典型错误文案：
  - `身份证格式或校验位错误`（E_VALIDATE）
  - `身份证已存在，请搜索后编辑`（E_CONFLICT）
  - `手机号格式错误`（E_VALIDATE）

## 入住/退住（Tenancies）
- 必填：`checkInDate` 与 `patientId` 或 `id_card` 至少其一。
- 可选：`checkOutDate`、`room`、`bed`、`subsidy`、`extra.admitPersons`。
- 字段级规则：
  - `checkInDate`：ISO 日期，<= 今日（可放宽为任意历史日期）。
  - `checkOutDate`：可空；若填，需 `checkOutDate >= checkInDate`。
  - `subsidy`：数值 ≥ 0，最多两位小数。
- 跨字段规则：
  - 若仅提供 `id_card`，创建时尝试查询 Patients，命中则回填 `patientId`；未命中也允许写入，后续回填。
  - 保留“同日同床位冲突检测”入口：`room+bed+checkInDate` 组合冲突判定，冲突提示但不阻塞创建（后续可配置为强校验）。
- 错误文案：
  - `入住日期不能为空`（E_VALIDATE）
  - `退住日期不能早于入住日期`（E_VALIDATE）
  - `该床位在当日可能已被占用，请确认后提交`（E_CONFLICT）

## 服务记录（Services）
- 必填：`patientId`、`type`、`date`。
- 可选：`desc`（≤ 500）`images[]`（每张 ≤ 5MB，最多 9 张）。
- 枚举：`type ∈ visit|psych|goods|referral|followup`；`status ∈ review|approved|rejected`。
- 跨字段与状态机：
  - 创建时 `status=review`；审核仅允许 `review → approved|rejected`。
  - `rejected` 必须提供 `reason`（20–200 字）。
  - 志愿者只能创建属于自己的记录（`createdBy=当前用户`），只能查看本人提交；管理员/社工可全量查看。
- 错误文案：
  - `请选择服务类型`（E_VALIDATE）
  - `审核驳回需填写理由`（E_VALIDATE）

## 活动/报名（Activities/Registrations）
- 活动字段：`title`（2–40）`date`（ISO 日期时间）`location`（≤ 80）`capacity ≥ 0` `status ∈ open|ongoing|done|closed`。
- 报名字段：唯一性（同一 `userId+activityId` 不可重复报名）；`status ∈ registered|waitlist|cancelled`；`checkedInAt?`。
- 规则：
  - 容量满自动进入候补（waitlist）。
  - 取消后可再次报名（进入队尾）。
  - 签到幂等：同一用户多次签到只记录一次时间戳。
- 错误文案：
  - `活动名不能为空`（E_VALIDATE）
  - `名额已满，已加入候补`（E_CONFLICT 或业务成功提示）
  - `您已报名，请勿重复操作`（E_CONFLICT）

## 权限申请（PermissionRequests）
- 必填：`fields[]`（从白名单选择：`id_card|phone|diagnosis` …）`reason`（≥ 20）`expiresAt`（默认 30 天，最大 90 天）。
- 审批：管理员可 `approve/reject`；通过后在有效期内返回明文字段；到期自动回收。
- 错误文案：
  - `请勾选需要申请的字段`（E_VALIDATE）
  - `请填写申请理由（不少于 20 字）`（E_VALIDATE）
  - `审批已过期或无效`（E_PERM/E_NOT_FOUND）

## 跨字段业务规则总览
- 身份证去重：创建 Patients 前校验唯一；冲突返回 `E_CONFLICT` 并给出指引。
- 入退住日期：`checkInDate <= checkOutDate`；退住为空视为在住状态。
- 服务审核：仅允许受控状态流转；拒绝需理由；写 AuditLogs。
- 活动容量：满员进入候补；报名唯一；签到幂等。
- 权限窗口：审批通过后明文可见；字段过滤统一在后端执行。

## 错误提示文案规范（UI Copy）
- 风格：简短、直白、可执行；避免技术细节；优先给出解决路径。
- 结构：
  - 表单内联：字段下方提示，如“身份证格式或校验位错误”。
  - Toast：短句提示，如“名额已满，已加入候补”。
  - Dialog（重大操作/审批）：包含标题、说明与行动按钮。
- 语气：不指责用户；避免“非法/错误操作”等用语；使用“请…/需…”引导。
- 统一映射（与错误码）：详见 `docs/api/error-codes.md`；非标准错误一律落入“网络异常，请稍后重试”。
- 本地化：当前为中文；如需多语，统一从字典取文案，避免硬编码。

## 实施与对齐
- 后端：各函数以 zod 定义入参 schema，错误统一抛出 `{ ok:false, error:{ code,msg,details? } }`。
- 前端：提交前做同等校验，内联高亮错误字段；对业务错误码进行 Toast/引导操作（如跳转权限申请页）。
- 日志：对 `E_CONFLICT/E_VALIDATE/E_INTERNAL` 统一上报埋点 `api_error`，含 `name/code/duration/requestId`。

