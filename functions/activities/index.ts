
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

const IdSchema = z.object({ id: z.string().min(1) })
const GetIdCompatSchema = z.object({ id: z.string().min(1) }).or(z.object({ activityId: z.string().min(1) }))
const UpdateCompatSchema = z.object({ id: z.string().min(1), patch: ActivityCreateSchema.partial() })
  .or(z.object({ activityId: z.string().min(1), data: ActivityCreateSchema.partial() }))

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
        const idObj = GetIdCompatSchema.parse(payload || {}) as any
        const id = idObj.id || idObj.activityId
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
      case 'update': {
        // RBAC：仅管理员/社工可更新
        const allowed = await hasAnyRole(db, OPENID, ['admin','social_worker'])
        if (!allowed) return err('E_PERM','仅管理员/社工可更新活动')
        const parsed = UpdateCompatSchema.safeParse(payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return errValidate(m.msg, parsed.error.issues)
        }
        const p: any = parsed.data
        const id = p.id || p.activityId
        const patch = p.patch || p.data || {}
        // 过滤空补丁
        const cleanPatch: any = {}
        for (const k of Object.keys(patch)) {
          const v = (patch as any)[k]
          if (v !== undefined) cleanPatch[k] = v
        }
        if (!Object.keys(cleanPatch).length) return ok({ updated: 0 })
        await db.collection('Activities').doc(id).update({ data: { ...cleanPatch, updatedAt: Date.now() } })
        // 审计
        try { await db.collection('AuditLogs').add({ data: { actorId: OPENID||null, action: 'activities.update', target: { id }, createdAt: Date.now() } }) } catch {}
        return ok({ updated: 1 })
      }
      default:
        return err('E_ACTION','unknown action')
    }
  } catch (e:any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
