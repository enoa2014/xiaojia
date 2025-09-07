## 5. 权限与安全（RBAC + 字段级控制）

- 角色：`admin`、`social_worker`、`volunteer`、`parent`。
- 字段级：`id_card`、`phone`、`diagnosis` 等默认脱敏；基于 `PermissionRequests` 临时解密，TTL 到期自动回收。
- 读写规则：在函数层做鉴权 + 返回字段过滤；敏感写入（导出、审批）写入 `AuditLogs`。
- 数据导出：生成文件仅管理员/社工可创建；链接短时有效（如 30min）。

### 审计日志（Audit Logs）
- 统一字段：`{ actorId, action, target, requestId?, createdAt, ip? }`；`target` 严禁包含敏感明文。
- 覆盖动作：
  - `patients.readSensitive`（明文读取窗口内）
  - `permissions.request.submit / permissions.approve / permissions.reject`
  - `services.review`
  - `exports.create / export.status`（创建与状态变更）
- 查询接口：`audits.list({ page,pageSize, filter:{ from,to, action?, actorId? } })`（仅 `admin`）
- 索引建议：`createdAt(desc)`、`action+createdAt(desc)`、`actorId+createdAt(desc)`

### RBAC 矩阵（摘要）
- patients：
  - create/update：`admin|social_worker`
  - get/list：所有登录角色可读；默认脱敏，审批窗口内明文
- tenancies：
  - list/get/create/update：`admin|social_worker`
- services：
  - create：`volunteer|social_worker|admin`
  - review：`admin|social_worker`
  - list：志愿者仅本人（`createdBy=OPENID`）；`admin|social_worker` 全量
- activities：
  - create：`admin|social_worker`
  - list/get：所有角色
- registrations：
  - register/cancel：登录用户自身
  - checkin：`admin|social_worker`；普通用户仅可为自己
  - list：按 activity 仅 `admin|social_worker`；按 `userId='me'` 任意登录用户
- permissions：
  - request.submit：登录用户
  - request.approve/reject：`admin`
  - request.list：请求者查看自己的申请；`admin` 可按请求人/状态筛选
- stats / exports：`admin|social_worker`
- users：
  - me.get/profile.update：登录用户自身
