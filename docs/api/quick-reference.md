# API 快速参考（小程序调用与约定）

## 统一调用
- 事件包：`{ action: string, payload?: any, clientToken?: string }`
- 响应包：
  - 成功：`{ ok: true, data: any }`
  - 失败：`{ ok: false, error: { code: string, msg: string, details?: any } }`
- 函数清单：patients / tenancies / services / activities / registrations / permissions / users / stats / exports / init-db / import-xlsx

## 分页 / 过滤 / 排序
- 分页：`page >= 1`，`pageSize ∈ [10,100]`
- 过滤：按域定义（姓名前缀、证件尾4位、date 范围、type/status 枚举等）
- 排序：对象 `{ field: 1|-1 }`，默认 `{ createdAt: -1 }`

## 幂等 / 审计
- 创建/导出类接口需传 `clientToken` 做幂等
- 敏感读写/审批/导出写 `AuditLogs`

## 错误码（摘要）
- 认证/权限：`E_AUTH`、`E_PERM`
- 校验/冲突/不存在：`E_VALIDATE`、`E_CONFLICT`、`E_NOT_FOUND`
- 限流/依赖/内部：`E_RATE_LIMIT`、`E_DEPENDENCY`、`E_INTERNAL`
- 其他：`E_ACTION`（未知 action）、`E_ARG`（缺参数）

## 重试与退避（前端建议）
- 不重试：`E_AUTH | E_PERM | E_VALIDATE | E_CONFLICT | E_NOT_FOUND`
- 可重试：`E_RATE_LIMIT | E_DEPENDENCY | E_INTERNAL` 指数退避（500ms 起，×2，≤10s，20–30% 抖动，≤3 次）

## 代码片段：带指数退避的调用封装
```js
// /miniprogram/services/api.js（示例实现见仓库）
const RETRY_CODES = new Set(['E_RATE_LIMIT','E_DEPENDENCY','E_INTERNAL'])
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function callOnce(name, action, payload={}) {
  const res = await wx.cloud.callFunction({ name, data: { action, payload } })
  const r = res && res.result
  if (!r || r.ok !== true) {
    const err = (r && r.error) || { code: 'E_INTERNAL', msg: '未知错误' }
    throw Object.assign(new Error(err.msg), { code: err.code, details: err.details })
  }
  return r.data
}

export async function callWithRetry(name, action, payload={}, opts={}) {
  const { maxRetries=3, baseDelay=500, jitter=0.3 } = opts
  let attempt = 0, delay = baseDelay
  while (true) {
    try { return await callOnce(name, action, payload) } catch (e) {
      attempt++
      if (!RETRY_CODES.has(e.code) || attempt > maxRetries) throw e
      const j = 1 + (Math.random()*2 - 1) * jitter // ±jitter
      await sleep(Math.min(10000, delay) * j)
      delay *= 2
    }
  }
}
```

## 示例
```js
// patients.list（带退避重试）
import { callWithRetry } from '../services/api'
const items = await callWithRetry('patients', 'list', { page: 1, pageSize: 20 })
```

更多详情：
- 合同与校验：docs/api/contracts.md
- 错误码与退避：docs/api/error-codes.md
- 字段可见性/审批：docs/data/field-masking-matrix.md
