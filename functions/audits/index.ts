import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { ok, err, errValidate } from '../packages/core-utils/errors'
import { hasAnyRole } from '../packages/core-rbac'
import { paginate } from '../packages/core-db'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command as any

const ListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  filter: z.object({
    from: z.union([z.string(), z.number()]).optional(),
    to: z.union([z.string(), z.number()]).optional(),
    action: z.string().min(1).optional(),
    actorId: z.string().min(1).optional()
  }).partial().optional()
})

const toTs = (v?: string|number|null): number|undefined => {
  if (v == null) return undefined
  if (typeof v === 'number') return v
  const d = new Date(v)
  const t = d.getTime()
  return isNaN(t) ? undefined : t
}

export const main = async (event:any) => {
  try {
    const { action, payload } = event || {}
    const { OPENID } = cloud.getWXContext?.() || ({} as any)
    if (action === 'list') {
      const qp = ListSchema.safeParse(payload || {})
      if (!qp.success) {
        return errValidate(qp.error.issues?.[0]?.message || '参数不合法', qp.error.issues)
      }
      // RBAC: admin only
      const allowed = await hasAnyRole(db, OPENID, ['admin'])
      if (!allowed) return err('E_PERM','需要管理员权限')

      const q = qp.data
      let where: any = {}
      const from = toTs(q.filter?.from)
      const to = toTs(q.filter?.to)
      if (from || to) {
        const range: any = {}
        if (from) range[_.gte] = from
        if (to) range[_.lte] = to
        where.createdAt = range
      }
      if (q.filter?.action) where.action = q.filter.action
      if (q.filter?.actorId) where.actorId = q.filter.actorId

      const base = db.collection('AuditLogs').where(where)
      const { items, meta } = await paginate(base, { page: q.page, pageSize: q.pageSize, sort: { createdAt: -1 } }, { fallbackSort: { createdAt: -1 }, countQuery: db.collection('AuditLogs').where(where) })
      return ok({ items, meta })
    }
    return err('E_ACTION','unknown action')
  } catch (e:any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}

