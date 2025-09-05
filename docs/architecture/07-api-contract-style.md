## 7. API 契约（统一风格）

- 调用：`wx.cloud.callFunction({ name: 'patients', data: { action: 'list', payload } })`
- 返回：`{ ok: true, data } | { ok: false, error: { code, msg, details? } }`
- 错误码：`E_AUTH`（未登录）`E_PERM`（无权限）`E_VALIDATE`（参数）`E_NOTFOUND` `E_CONFLICT` `E_INTERNAL`。

