
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { hasAnyRole } from '../packages/core-rbac'
import { paginate } from '../packages/core-db'
import { mapZodIssues } from '../packages/core-utils/validation'
import { ok, err, errValidate } from '../packages/core-utils/errors'
import { ActivitiesListSchema, ActivityCreateSchema } from './schema'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }

const IdSchema = z.object({ id: z.string() })

export const main = async (event:any): Promise<Resp<any>> => {
  try {
    const { action, payload } = event || {}
    const { OPENID } = cloud.getWXContext?.() || ({} as any)

    const canCreate = async (): Promise<boolean> => hasAnyRole(db, OPENID, ['admin', 'social_worker'])
    switch (action) {
      case 'list': {
        const qp = ActivitiesListSchema.parse(payload || {})
        const _ = db.command
        let query: any = {}
        if (qp.filter) {
          const f = qp.filter as any
          if (f.status) query.status = f.status
          if (f.from || f.to) {
            const range: any = {}
            if (f.from) range[_.gte] = f.from
            if (f.to) range[_.lte] = f.to
            query.date = range
          }
        }
        const base = db.collection('Activities').where(query)
        const { items, meta } = await paginate(base, { page: qp.page, pageSize: qp.pageSize, sort: qp.sort }, { fallbackSort: { date: -1 }, countQuery: db.collection('Activities').where(query) })
        return ok({ items, meta })
      }
      case 'get': {
        const { id } = IdSchema.parse(payload || {})
        const r = await db.collection('Activities').doc(id).get()
        if (!r?.data) return err('E_NOT_FOUND','activity not found')
        return ok(r.data)
      }
      case 'create': {
        // RBAC：仅管理员/社工可创建
        if (!(await canCreate())) return err('E_PERM','仅管理员/社工可发布活动')
        const parsed = ActivityCreateSchema.safeParse(payload?.activity || payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return errValidate(m.msg, parsed.error.issues)
        }
        const a = parsed.data
        const doc = { ...a, createdAt: Date.now() }
        const { _id } = await db.collection('Activities').add({ data: doc as any })
        return ok({ _id })
      }
      default:
        return err('E_ACTION','unknown action')
    }
  } catch (e:any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
