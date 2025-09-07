
import cloud from 'wx-server-sdk'
import { err, ok, errValidate } from '../packages/core-utils/errors'
import { hasAnyRole } from '../packages/core-rbac'
import { z } from 'zod'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const CreateSchema = z.object({
  type: z.enum(['statsMonthly','statsAnnual','custom']).default('statsMonthly'),
  params: z.record(z.any()).default({}),
  clientToken: z.string().optional(),
  requestId: z.string().optional()
})

const StatusSchema = z.object({ taskId: z.string().min(1), requestId: z.string().optional() })

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
      const r = await db.collection('ExportTasks').doc(p.data.taskId).get()
      if (!r?.data) return err('E_NOT_FOUND','task not found')
      const t = r.data as any
      // 审计：export.status（注意文档中的命名可能为 export.status）
      try { await db.collection('AuditLogs').add({ data: { actorId: OPENID || null, action: 'export.status', target: { taskId: p.data.taskId, status: t.status }, requestId: p.data.requestId || null, createdAt: Date.now() } }) } catch {}
      return ok({ status: t.status, downloadUrl: t.downloadUrl, expiresAt: t.expiresAt })
    }

    return ok({ ping: 'exports' })
  } catch (e:any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
