
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { ok, err } from '../packages/core-utils/errors'
import { getDB, paginate } from '../packages/core-db'
import { hasAnyRole } from '../packages/core-rbac'
import { errValidate } from '../packages/core-utils/errors'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }

const SetRoleSchema = z.object({
  role: z.enum(['admin', 'social_worker', 'volunteer', 'parent'])
})

const SetProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  avatar: z.string().min(1).max(10).optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'empty payload' })

export const main = async (event: any): Promise<Resp<any>> => {
  try {
    const { action, payload } = event || {}
    const { OPENID } = cloud.getWXContext?.() || ({} as any)

    switch (action) {
      case 'getProfile': {
        if (!OPENID) return err('E_AUTH','未登录')
        let doc: any = null
        try {
          const byOpen = await db.collection('Users').where({ openId: OPENID } as any).limit(1).get()
          if (byOpen.data?.length) doc = byOpen.data[0]
        } catch {}
        if (!doc) {
          try {
            const byId = await db.collection('Users').doc(OPENID).get()
            if (byId?.data) doc = byId.data
          } catch {}
        }
        if (!doc) return ok({ openId: OPENID, role: null, roles: [], status: null })
        return ok({
          openId: OPENID,
          role: doc.role || null,
          roles: doc.roles || (doc.role ? [doc.role] : []),
          status: doc.status || null,
          name: doc.name || doc.displayName || null,
          avatar: doc.avatar || null
        })
      }
      case 'listRegistrations': {
        if (!OPENID) return err('E_AUTH','未登录')
        const allowed = await hasAnyRole(db, OPENID, ['admin','social_worker'])
        if (!allowed) return err('E_PERM','需要管理员/社工权限')
        const Q = z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20), status: z.enum(['pending','active','rejected']).default('pending') })
        const qp = Q.parse(payload || {})
        const base = db.collection('Users').where({ status: qp.status } as any)
        const { items, meta } = await paginate(base, { page: qp.page, pageSize: qp.pageSize, sort: { createdAt: -1 } }, { fallbackSort: { createdAt: -1 }, countQuery: db.collection('Users').where({ status: qp.status } as any) })
        // 输出脱敏（不返回身份证号；电话仅返回脱敏版本）
        const maskPhone = (p?: string | null) => {
          if (!p) return null
          return String(p).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
        }
        const safeItems = items.map((u: any) => ({ openId: u.openId || u._id, name: u.name || null, phoneMasked: maskPhone(u.phone), applyRole: u.applyRole || null, relative: u.relative || null, status: u.status || null, createdAt: u.createdAt || null, updatedAt: u.updatedAt || null }))
        return ok({ items: safeItems, meta })
      }
      case 'reviewRegistration': {
        if (!OPENID) return err('E_AUTH','未登录')
        const allowed = await hasAnyRole(db, OPENID, ['admin','social_worker'])
        if (!allowed) return err('E_PERM','需要管理员/社工权限')
        const ReviewSchema = z.object({ openId: z.string().min(1), decision: z.enum(['approve','reject']), role: z.enum(['volunteer','parent']).optional(), reason: z.string().max(200).optional() })
        const p = ReviewSchema.parse(payload || {})
        const targetId = p.openId
        const docRes = await db.collection('Users').where({ openId: targetId } as any).limit(1).get()
        const doc = docRes?.data?.[0] || null
        const id = (doc && doc._id) || targetId
        if (p.decision === 'approve') {
          if (!p.role) return errValidate('通过审批需指定角色')
          const patch: any = { status: 'active', role: p.role, roles: [p.role], updatedAt: Date.now() }
          await db.collection('Users').doc(id).update({ data: patch })
          try { await db.collection('AuditLogs').add({ data: { action: 'user_review', actorId: OPENID, targetOpenId: targetId, decision: 'approve', role: p.role, createdAt: Date.now() } }) } catch {}
          return ok({ openId: targetId, status: 'active', role: p.role })
        } else {
          const patch: any = { status: 'rejected', rejectReason: p.reason || '', updatedAt: Date.now() }
          await db.collection('Users').doc(id).update({ data: patch })
          try { await db.collection('AuditLogs').add({ data: { action: 'user_review', actorId: OPENID, targetOpenId: targetId, decision: 'reject', reason: p.reason || '', createdAt: Date.now() } }) } catch {}
          return ok({ openId: targetId, status: 'rejected' })
        }
      }
      case 'register': {
        if (!OPENID) return err('E_AUTH','未登录')
        // 校验入参
        const RelativeSchema = z.object({
          patientName: z.string().min(1).max(50),
          relation: z.enum(['father','mother','guardian','other']),
          patientIdCard: z.string().regex(/^[0-9]{17}[0-9Xx]$/)
        })
        const RegisterSchema = z.object({
          name: z.string().min(2).max(30),
          phone: z.string().regex(/^1\d{10}$/),
          id_card: z.string().regex(/^[0-9]{17}[0-9Xx]$/),
          applyRole: z.enum(['volunteer','parent']),
          relative: RelativeSchema.optional()
        }).refine((v) => v.applyRole !== 'parent' || !!v.relative, { message: '亲属需填写关联患者信息' })

        const parsed = RegisterSchema.safeParse(payload || {})
        if (!parsed.success) {
          return errValidate('参数不合法', parsed.error.issues)
        }
        const input = parsed.data
        // 查询是否已有用户
        let doc: any = null
        let docId: string | null = null
        try {
          const byOpen = await db.collection('Users').where({ openId: OPENID } as any).limit(1).get()
          if (byOpen.data?.length) { doc = byOpen.data[0]; docId = doc._id }
        } catch {}
        if (!doc) {
          try {
            const byId = await db.collection('Users').doc(OPENID).get()
            if (byId?.data) { doc = byId.data; docId = OPENID }
          } catch {}
        }

        const now = Date.now()
        const next = {
          ...(doc || {}),
          _id: docId || OPENID,
          openId: OPENID,
          name: input.name,
          phone: input.phone,
          id_card: input.id_card,
          applyRole: input.applyRole,
          relative: input.relative || null,
          status: 'pending',
          updatedAt: now,
          createdAt: doc?.createdAt || now
        } as any

        // 幂等：若已是 pending 且内容一致，直接返回现状
        if (doc && doc.status === 'pending') {
          const same =
            doc.name === next.name &&
            doc.phone === next.phone &&
            doc.id_card === next.id_card &&
            doc.applyRole === next.applyRole &&
            JSON.stringify(doc.relative || null) === JSON.stringify(next.relative || null)
          if (same) {
            return ok({ status: 'pending' })
          }
        }

        if (docId) {
          await db.collection('Users').doc(docId).set({ data: next })
        } else {
          await db.collection('Users').add({ data: next })
        }
        return ok({ status: 'pending' })
      }
      case 'setRole': {
        if (!OPENID) return err('E_AUTH','未登录')
        const { role } = SetRoleSchema.parse(payload || {})

        // Upsert user doc by openId or _id
        let docId: string | null = null
        try {
          const byOpen = await db.collection('Users').where({ openId: OPENID } as any).limit(1).get()
          if (byOpen.data?.length) docId = byOpen.data[0]._id
        } catch {}
        if (!docId) {
          try {
            const byId = await db.collection('Users').doc(OPENID).get()
            if (byId?.data) docId = OPENID
          } catch {}
        }

        const data = { openId: OPENID, role, roles: [role], updatedAt: Date.now() }
        if (docId) {
          await db.collection('Users').doc(docId).set({ data: { ...data } as any })
        } else {
          const r = await db.collection('Users').add({ data: { _id: OPENID, ...data } as any })
          docId = r._id
        }
        return ok({ _id: docId, role })
      }
      case 'getStars': {
        if (!OPENID) return err('E_AUTH','未登录')
        const db = getDB()
        // Try by openId field, then by _id
        let doc: any = null
        try {
          const byOpen = await db.collection('Users').where({ openId: OPENID } as any).limit(1).get()
          if (byOpen.data?.length) doc = byOpen.data[0]
        } catch {}
        if (!doc) {
          try {
            const byId = await db.collection('Users').doc(OPENID).get()
            if (byId?.data) doc = byId.data
          } catch {}
        }
        const stars = Array.isArray(doc?.starredPatients) ? (doc!.starredPatients as string[]) : []
        return ok({ stars })
      }
      case 'setProfile': {
        if (!OPENID) return err('E_AUTH','未登录')
        const input = SetProfileSchema.parse(payload || {})
        // Upsert existing user
        let doc: any = null
        let docId: string | null = null
        try {
          const byOpen = await db.collection('Users').where({ openId: OPENID } as any).limit(1).get()
          if (byOpen.data?.length) { doc = byOpen.data[0]; docId = doc._id }
        } catch {}
        if (!doc) {
          try { const byId = await db.collection('Users').doc(OPENID).get(); if (byId?.data) { doc = byId.data; docId = OPENID } } catch {}
        }
        const data = { ...(doc || {}), _id: docId || OPENID, openId: OPENID, updatedAt: Date.now() } as any
        if (input.name != null) { data.name = input.name; data.displayName = input.name }
        if (input.avatar != null) { data.avatar = input.avatar }
        if (docId) {
          await db.collection('Users').doc(docId).set({ data })
        } else {
          const r = await db.collection('Users').add({ data })
          docId = r._id
        }
        return ok({ _id: docId, name: data.name || null, avatar: data.avatar || null })
      }
      case 'toggleStar': {
        if (!OPENID) return err('E_AUTH','未登录')
        const ToggleSchema = z.object({ patientId: z.string(), value: z.boolean().optional() })
        const { patientId, value } = ToggleSchema.parse(payload || {})
        const db = getDB()
        // Load existing doc
        let doc: any = null
        let docId: string | null = null
        try {
          const byOpen = await db.collection('Users').where({ openId: OPENID } as any).limit(1).get()
          if (byOpen.data?.length) { doc = byOpen.data[0]; docId = doc._id }
        } catch {}
        if (!doc) {
          try {
            const byId = await db.collection('Users').doc(OPENID).get()
            if (byId?.data) { doc = byId.data; docId = OPENID }
          } catch {}
        }
        const existing = Array.isArray(doc?.starredPatients) ? (doc!.starredPatients as string[]) : []
        const set = new Set(existing)
        if (typeof value === 'boolean') {
          if (value) set.add(patientId); else set.delete(patientId)
        } else {
          // toggle
          if (set.has(patientId)) set.delete(patientId); else set.add(patientId)
        }
        const stars = Array.from(set)
        const data = { ...(doc || {}), _id: docId || OPENID, openId: OPENID, starredPatients: stars, updatedAt: Date.now() }
        if (docId) {
          await db.collection('Users').doc(docId).set({ data: data as any })
        } else {
          const r = await db.collection('Users').add({ data: data as any })
          docId = r._id
        }
        return ok({ stars })
      }
      default:
        return ok({ ping: 'users', action })
    }
  } catch (e: any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
