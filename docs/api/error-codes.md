# 错误码与前端处理

统一应用层错误码，便于前端一致处理与日志追踪。

| 代码 | 说明 | 前端处理 |
|-----|------|----------|
| E_AUTH | 未登录/会话过期 | 跳转登录/重新授权，保留返回路径 |
| E_PERM | 权限不足 | Toast 提示 + 引导申请权限（如进入权限申请页）|
| E_VALIDATE | 参数/业务校验失败 | 表单内联提示 + 高亮错误字段 |
| E_NOT_FOUND | 目标不存在 | Toast/空态，占位展示 |
| E_CONFLICT | 唯一冲突/状态冲突 | 显示冲突详情（如身份证已存在/床位冲突），提供解决指引 |
| E_RATE_LIMIT | 频控限制 | 退避重试/冷却提示 |
| E_DEPENDENCY | 外部依赖异常 | 重试与降级策略 |
| E_INTERNAL | 未知错误 | 友好提示 + 上报 requestId |

响应示例：
```
{ "code": "E_VALIDATE", "message": "身份证格式错误", "requestId": "..." }
```

日志与追踪：
- 云函数内记录 requestId、用户、入口、参数摘要、错误栈（敏感脱敏后）
- 前端对非 0 code 上报埋点 event：`api_error`，属性含 name/code/path/duration

