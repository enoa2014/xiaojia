# 字段级脱敏矩阵（按角色/审批）

目标：在返回层面按角色与审批结果过滤/遮蔽敏感字段，默认最小暴露。

## 角色
- 管理员（admin）
- 社工（social_worker）
- 志愿者（volunteer）
- 家长（parent，仅与其子女相关）

## 矩阵（示例：Patients 集合）
| 字段 | 默认 | admin | social_worker | volunteer | parent |
|------|------|-------|---------------|----------|--------|
| name | 明文 | 明文 | 明文 | 明文 | 明文 |
| id_card | 脱敏：`******####` | 明文 | 申请后明文（审批通过+TTL） | 不可见 | 不可见 |
| phone | 脱敏：`***####` | 明文 | 申请后明文 | 不可见 | 仅与子女相关脱敏显示 |
| diagnosis | 脱敏（严重程度枚举） | 明文 | 明文 | 枚举级别 | 枚举级别 |

说明：
- 权限申请通过后，于 `expiresAt` 之前返回明文；到期自动回收
- 审计：任何明文读取和审批操作写入 `AuditLogs`

## 返回过滤示例
后端统一在函数层做：
```
filterByRole(userRole, fieldsRequested, approvalContext) => sanitizedData
```

## 审批策略
- 申请字段：`id_card`/`phone`/`diagnosis`
- 审批条件：服务需要/合法合规说明/最小授权原则
- 有效期：默认 30 天，可申请缩短/延长

