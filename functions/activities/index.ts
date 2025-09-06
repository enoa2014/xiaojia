
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { isRole } from '../packages/core-rbac'
import { ActivitiesListSchema, ActivityCreateSchema } from './schema'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }

const IdSchema = z.object({ id: z.string() })

export const main = async (event:any): Promise<Resp<any>> => {
  try {
    const { action, payload } = event || {}
    const { OPENID } = cloud.getWXContext?.() || ({} as any)

    const canCreate = async (): Promise<boolean> => (await isRole(db, OPENID, 'admin')) || (await isRole(db, OPENID, 'social_worker'))
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
        let coll = db.collection('Activities').where(query)
        if (qp.sort && Object.keys(qp.sort).length) {
          const [k, v] = Object.entries(qp.sort)[0]
          // @ts-ignore
          coll = (coll as any).orderBy(k, v === -1 ? 'desc' : 'asc')
        } else {
          // 默认按 date desc
          // @ts-ignore
          coll = (coll as any).orderBy('date','desc')
        }
        let total = 0
        try {
          const c = await db.collection('Activities').where(query).count() as any
          total = (c.total ?? c.count) || 0
        } catch {}
        const res = await (coll as any)
          .skip((qp.page-1)*qp.pageSize)
          .limit(qp.pageSize)
          .get()
        const items = res.data
        const hasMore = (qp.page * qp.pageSize) < total
        return { ok: true, data: { items, meta: { total, hasMore } } }
      }
      case 'get': {
        const { id } = IdSchema.parse(payload || {})
        const r = await db.collection('Activities').doc(id).get()
        if (!r?.data) return { ok: false, error: { code: 'E_NOT_FOUND', msg: 'activity not found' } }
        return { ok: true, data: r.data }
      }
      case 'create': {
        // RBAC：仅管理员/社工可创建
        if (!(await canCreate())) return { ok:false, error:{ code:'E_PERM', msg:'仅管理员/社工可发布活动' } }
        const parsed = ActivityCreateSchema.safeParse(payload?.activity || payload || {})
        if (!parsed.success) {
          const issues = parsed.error.issues || []
          const first = issues[0]
          const path = (first && first.path && first.path.join('.')) || ''
          let msg = '填写有误'
          if (path.includes('title')) msg = '标题需 2–40 字'
          else if (path.includes('date')) msg = '请选择日期'
          else if (path.includes('location')) msg = '地点需 ≤80 字'
          else if (path.includes('capacity')) msg = '容量需为 ≥0 的整数'
          else if (path.includes('status')) msg = '状态不合法'
          return { ok:false, error:{ code:'E_VALIDATE', msg, details: issues } }
        }
        const a = parsed.data
        const doc = { ...a, createdAt: Date.now() }
        const { _id } = await db.collection('Activities').add({ data: doc as any })
        return { ok: true, data: { _id } }
      }
      default:
        return { ok: false, error: { code: 'E_ACTION', msg: 'unknown action' } }
    }
  } catch (e:any) {
    return { ok: false, error: { code: e.code || 'E_INTERNAL', msg: e.message, details: e.stack } }
  }
}
