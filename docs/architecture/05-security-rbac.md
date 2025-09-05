## 5. 权限与安全（RBAC + 字段级控制）

- 角色：`admin`、`social_worker`、`volunteer`、`parent`。
- 字段级：`id_card`、`phone`、`diagnosis` 等默认脱敏；基于 `PermissionRequests` 临时解密，TTL 到期自动回收。
- 读写规则：在函数层做鉴权 + 返回字段过滤；敏感写入（导出、审批）写入 `AuditLogs`。
- 数据导出：生成文件仅管理员/社工可创建；链接短时有效（如 30min）。

