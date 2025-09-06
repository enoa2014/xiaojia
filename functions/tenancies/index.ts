import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { ok, err, errValidate } from '../packages/core-utils/errors'
import { mapZodIssues } from '../packages/core-utils/validation'

cloud.init({ env: (cloud as any).DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// Schemas
const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20)
})

const ListSchema = PaginationSchema.extend({
  filter: z.object({
    patientId: z.string().optional(),
    id_card: z.string().optional(),
    room: z.string().optional(),
    bed: z.string().optional(),
    checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式不正确').optional()
  }).partial().optional()
})

const TenancyCreateSchema = z.object({
  patientId: z.string().optional(),
  id_card: z.string().optional(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  room: z.string().optional(),
  bed: z.string().optional(),
  subsidy: z.number().min(0).optional(),
  extra: z.object({ admitPersons: z.string().optional() }).partial().optional()
}).refine(v => !!(v.patientId || v.id_card), { message: 'patientId 或 id_card 必填' })

const UpdateSchema = z.object({ id: z.string(), patch: z.object({ checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }) })

export const main = async (event: any) => {
  try {
    const action = event && event.action
    switch (action) {
      case 'list': {
        const parsed = ListSchema.safeParse(event?.payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return errValidate(m.msg, parsed.error.issues)
        }
        const { page, pageSize, filter } = parsed.data
        const query: any = {}
        if (filter) {
          if (filter.patientId) query.patientId = filter.patientId
          if (filter.id_card) query.id_card = filter.id_card
          if (filter.room) query.room = filter.room
          if (filter.bed) query.bed = filter.bed
          if (filter.checkInDate) query.checkInDate = filter.checkInDate
        }
        let coll: any = db.collection('Tenancies')
        if (Object.keys(query).length) coll = coll.where(query)
        // 默认按 checkInDate desc
        try {
          const res = await coll.orderBy('checkInDate','desc').skip((page-1)*pageSize).limit(pageSize).get()
          return ok(res?.data || [])
        } catch {
          const res = await coll.skip((page-1)*pageSize).limit(pageSize).get()
          return ok(res?.data || [])
        }
      }
      case 'create': {
        const payload = event?.payload || {}
        const body = (payload.tenancy || payload) as any
        const parsed = TenancyCreateSchema.safeParse(body || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return errValidate(m.msg, parsed.error.issues)
        }
        const t = parsed.data
        // 出住日期关系
        if (t.checkOutDate && t.checkOutDate < t.checkInDate) {
          return errValidate('退住日期不能早于入住日期')
        }
        const clientToken = (payload && payload.clientToken) || null
        if (clientToken) {
          const existed: any = await db.collection('Tenancies').where({ clientToken }).limit(1).get()
          if (existed?.data?.length) return ok({ _id: existed.data[0]._id })
        }
        const doc: any = { ...t, createdAt: Date.now(), ...(clientToken ? { clientToken } : {}) }
        const addRes: any = await db.collection('Tenancies').add({ data: doc })
        return ok({ _id: addRes._id })
      }
      case 'update': {
        const parsed = UpdateSchema.safeParse(event?.payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return errValidate(m.msg, parsed.error.issues)
        }
        const { id, patch } = parsed.data
        const r = await db.collection('Tenancies').doc(String(id)).get()
        const cur: any = r && (r as any).data
        if (!cur) return err('E_NOT_FOUND','tenancy not found')
        if (cur.checkOutDate) return err('E_CONFLICT','当前记录已退住')
        const inDate = cur.checkInDate ? String(cur.checkInDate) : null
        if (inDate && patch.checkOutDate < inDate) return errValidate('退住日期不能早于入住日期')
        // 最近未退住记录保护
        try {
          const latest: any = await db.collection('Tenancies')
            .where({ ...(cur.patientId ? { patientId: String(cur.patientId) } : cur.id_card ? { id_card: String(cur.id_card) } : {}), checkOutDate: _.eq(null) })
            .orderBy('checkInDate','desc')
            .limit(1)
            .get()
          const latestDoc = latest?.data?.[0]
          if (!latestDoc || String(latestDoc._id) !== String(id)) {
            return err('E_CONFLICT','仅允许最近未退住记录退住')
          }
        } catch {
          return err('E_CONFLICT','仅允许最近未退住记录退住')
        }
        const upd = await db.collection('Tenancies')
          .where({ _id: String(id), checkOutDate: _.eq(null) })
          .update({ data: { checkOutDate: patch.checkOutDate } })
        const updated = (upd && ((upd as any).updated || ((upd as any).stats && (upd as any).stats.updated))) || 0
        if (!updated) return err('E_CONFLICT','当前记录已退住')
        return ok({ updated })
      }
      case 'db.ping': {
        let alive = false
        try { await db.collection('Patients').limit(1).get(); alive = true } catch { alive = true }
        return ok({ ping: 'db', alive, ts: Date.now() })
      }
      default:
        return ok({ echo: event || null, ts: Date.now() })
    }
  } catch (e: any) {
    return err(e.code || 'E_INTERNAL', e.message)
  }
}
