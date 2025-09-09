
import cloud from 'wx-server-sdk'
import { err, ok, errValidate } from '../packages/core-utils/errors'
import { hasAnyRole } from '../packages/core-rbac'
import { z } from 'zod'
import { paginate } from '../packages/core-db'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const CreateSchema = z.object({
  type: z.enum(['statsMonthly','statsAnnual','custom']).default('statsMonthly'),
  params: z.record(z.any()).default({}),
  clientToken: z.string().optional(),
  requestId: z.string().optional()
})

const StatusSchema = z.object({ taskId: z.string().min(1), requestId: z.string().optional() })
const HistorySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20)
})

export const main = async (event:any) => {
  try {
    const { action, payload } = event || {}
    const { OPENID } = cloud.getWXContext?.() || ({} as any)
    const allowed = await hasAnyRole(db, OPENID, ['admin','social_worker'])
    if (!allowed) return err('E_PERM','需要权限')

    if (action === 'create') {
      const p = CreateSchema.safeParse(payload || {})
      if (!p.success) return errValidate('参数不合法', p.error.issues)

      // 幂等：按 clientToken 去重（如提供）
      if (p.data.clientToken) {
        const existed = await db.collection('ExportTasks').where({ clientToken: p.data.clientToken } as any).limit(1).get()
        if (existed?.data?.length) {
          const task = existed.data[0]
          // 审计：exports.create（重复也审计一次）
          try { await db.collection('AuditLogs').add({ data: { actorId: OPENID || null, action: 'exports.create', target: { taskId: task._id, type: task.type }, requestId: p.data.requestId || null, createdAt: Date.now() } }) } catch {}
          return ok({ taskId: task._id })
        }
      }
      const now = Date.now()
      const task = { type: p.data.type, params: p.data.params || {}, status: 'pending', retries: 0, maxRetries: 3, createdBy: OPENID || null, createdAt: now, clientToken: p.data.clientToken || null }
      const r = await db.collection('ExportTasks').add({ data: task as any })
      // 审计：exports.create
      try { await db.collection('AuditLogs').add({ data: { actorId: OPENID || null, action: 'exports.create', target: { taskId: r._id, type: p.data.type }, requestId: p.data.requestId || null, createdAt: now } }) } catch {}
      return ok({ taskId: r._id })
    }

    if (action === 'status') {
      const p = StatusSchema.safeParse(payload || {})
      if (!p.success) return errValidate('参数不合法', p.error.issues)
      const taskId = p.data.taskId
      const r = await db.collection('ExportTasks').doc(taskId).get()
      if (!r?.data) return err('E_NOT_FOUND','task not found')
      const t = r.data as any

      // 惰性处理：首次查询时生成临时下载链接并完成任务（MVP）
      if (t.status === 'pending' || t.status === 'running') {
        const now = Date.now()
        const expAt = now + 30 * 60 * 1000 // 30 分钟有效
        // 基于任务类型与参数构造占位链接（实际项目应生成真实文件并存储到 COS）
        const month = t?.params?.month || 'current'
        const type = String(t?.type || 'statsMonthly')
        const fakeUrl = `https://example.com/download/${type}-${month}.xlsx`
        await db.collection('ExportTasks').doc(taskId).update({ data: { status: 'done', downloadUrl: fakeUrl, expiresAt: expAt, updatedAt: now } })
        t.status = 'done'
        t.downloadUrl = fakeUrl
        t.expiresAt = expAt
      }

      // 审计：export.status
      try { await db.collection('AuditLogs').add({ data: { actorId: OPENID || null, action: 'export.status', target: { taskId, status: t.status }, requestId: p.data.requestId || null, createdAt: Date.now() } }) } catch {}
      return ok({ status: t.status, downloadUrl: t.downloadUrl, expiresAt: t.expiresAt })
    }

    if (action === 'history') {
      const qp = HistorySchema.safeParse(payload || {})
      if (!qp.success) return errValidate('参数不合法', qp.error.issues)
      const { page, pageSize } = qp.data
      const where = { createdBy: OPENID || null } as any
      const base = db.collection('ExportTasks').where(where)
      const { items, meta } = await paginate(base, { page, pageSize, sort: { createdAt: -1 } }, { fallbackSort: { createdAt: -1 }, countQuery: db.collection('ExportTasks').where(where) })
      const total = (meta && (meta as any).total) || 0
      const hasMore = (meta && (meta as any).hasMore) != null ? (meta as any).hasMore : (page * pageSize < total)
      return ok({ items, hasMore })
    }

    // CRON 清理动作：清理过期下载链接；失败任务重试计数占位（MVP）
    if (action === 'cronCleanup') {
      const now = Date.now()
      // 清理过期下载链接（到期后移除 downloadUrl/expiresAt）
      try {
        const _ = db.command as any
        const res = await db.collection('ExportTasks').where({ status: 'done', expiresAt: _.lt(now) }).get()
        const tasks = (res?.data || []) as any[]
        for (const it of tasks) {
          try { await db.collection('ExportTasks').doc(it._id).update({ data: { downloadUrl: null, expiresAt: null, updatedAt: now } }) } catch {}
        }
      } catch {}
      // 返回统计信息（占位）
      return ok({ cleaned: true, ts: now })
    }

    return ok({ ping: 'exports' })
  } catch (e:any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
