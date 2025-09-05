## 16. 导出与定时任务：异步队列设计（4）

**数据结构**
```ts
// ExportTasks
{ _id, type: 'statsMonthly'|'statsAnnual', params: {}, status: 'pending'|'running'|'done'|'failed',
  retries: 0, maxRetries: 3, nextRunAt?: number, downloadUrl?: string, expiresAt?: number, createdBy, createdAt }
```

**流程（ASCII）**
```
客户端 → exports.create → 写入 ExportTasks(status=pending)
         定时触发 exports.run → 拉取 pending/到期任务 → 执行聚合 → 生成文件(COS)
         → 回写 downloadUrl+expiresAt → 通知客户端（轮询/消息）
         失败 → retries++ → 计算 nextRunAt(指数退避) → 重新排队（<=maxRetries）
```

**exports/index.ts 关键逻辑**
```ts
import cloud from 'wx-server-sdk'; cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database(); const _ = db.command

export const main = async (event:any) => {
  const { action, payload, uid } = event
  if (action === 'create') {
    const task = { type: payload.type, params: payload.params||{}, status:'pending', retries:0, maxRetries:3, createdBy: uid, createdAt: Date.now() }
    await db.collection('ExportTasks').add({ data: task })
    return { ok: true, data: task }
  }
  if (action === 'run') {
    const now = Date.now()
    const { data: tasks } = await db.collection('ExportTasks').where({ status: _.in(['pending','running']), nextRunAt: _.lte(now) }).limit(5).get()
    for (const t of tasks) {
      try {
        await db.collection('ExportTasks').doc(t._id).update({ data: { status: 'running' } })
        // TODO: 执行聚合/生成文件，上传 COS，得到 downloadUrl/expiresAt
        await db.collection('ExportTasks').doc(t._id).update({ data: { status: 'done', downloadUrl: 'cos://...', expiresAt: now + 30*60*1000 } })
      } catch (e) {
        const retries = (t.retries||0) + 1
        const backoff = Math.min(60*60*1000, Math.pow(2, retries) * 1000)
        await db.collection('ExportTasks').doc(t._id).update({ data: { status: retries>= (t.maxRetries||3) ? 'failed' : 'pending', retries, nextRunAt: now + backoff } })
      }
    }
    return { ok: true, data: { handled: tasks.length } }
  }
  return { ok: false, error: { code: 'E_ACTION', msg: 'unknown action' } }
}
```

定时
- 在控制台为 `exports` 添加定时触发（每 5 分钟运行一次 `run`）。

