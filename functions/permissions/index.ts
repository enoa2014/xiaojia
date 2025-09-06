
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { isRole } from '../packages/core-rbac'
import { mapZodIssues } from '../packages/core-utils/validation'
import { ok, err, errValidate } from '../packages/core-utils/errors'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }

const SubmitSchema = z.object({
  fields: z.array(z.enum(['id_card','phone','diagnosis'])).nonempty(),
  patientId: z.string().min(1),
  reason: z.string().min(20),
  expiresDays: z.enum(['30','60','90']).transform(Number).optional()
})

const ApproveSchema = z.object({ id: z.string(), expiresAt: z.number().optional() })
const RejectSchema = z.object({ id: z.string(), reason: z.string().min(20).max(200) })
const ListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  filter: z.object({ requesterId: z.string().optional(), patientId: z.string().optional(), status: z.enum(['pending','approved','rejected']).optional() }).partial().optional()
})

export const main = async (event:any): Promise<Resp<any>> => {
  try {
    const { action, payload } = event || {}
    const { OPENID } = cloud.getWXContext?.() || ({} as any)

    const isAdmin = async (): Promise<boolean> => isRole(db, OPENID, 'admin')
    switch (action) {
      case 'request.submit': {
        const parsed = SubmitSchema.safeParse(payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return { ok:false, error:{ code:'E_VALIDATE', msg: m.msg, details: parsed.error.issues } }
        }
        const p = parsed.data
        const { OPENID } = cloud.getWXContext?.() || ({} as any)
        if (!OPENID) return { ok:false, error:{ code:'E_AUTH', msg:'请先登录' } }
        const now = Date.now()
        const expiresDays = p.expiresDays || 30
        const requestedExpiresAt = now + expiresDays * 24 * 60 * 60 * 1000
        const doc = {
          requesterId: OPENID,
          patientId: p.patientId,
          fields: p.fields,
          reason: p.reason,
          status: 'pending',
          requestedExpiresAt,
          createdAt: now
        }
        const res = await db.collection('PermissionRequests').add({ data: doc as any })
        return ok({ _id: res._id, expiresAt: requestedExpiresAt })
      }
      case 'request.approve': {
        const parsed = ApproveSchema.safeParse(payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return { ok:false, error:{ code:'E_VALIDATE', msg: m.msg, details: parsed.error.issues } }
        }
        const { id, expiresAt } = parsed.data
        // 角色校验：需要管理员权限
        if (!(await isAdmin())) return err('E_PERM','需要管理员权限')
        const now = Date.now()
        const exp = expiresAt && expiresAt > now ? expiresAt : (now + 30*24*60*60*1000)
        await db.collection('PermissionRequests').doc(id).update({ data: { status: 'approved', expiresAt: exp, approvedAt: now, approvedBy: OPENID || null } })
        try {
          await db.collection('AuditLogs').add({ data: { actorId: OPENID || null, action: 'permissions.approve', target: { requestId: id }, createdAt: now } })
        } catch {}
        return ok({ updated: 1 })
      }
      case 'request.reject': {
        const parsed = RejectSchema.safeParse(payload || {})
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues)
          return { ok:false, error:{ code:'E_VALIDATE', msg: m.msg, details: parsed.error.issues } }
        }
        const { id, reason } = parsed.data
        // 角色校验：需要管理员权限
        if (!(await isAdmin())) return err('E_PERM','需要管理员权限')
        const now = Date.now()
        await db.collection('PermissionRequests').doc(id).update({ data: { status: 'rejected', rejectedAt: now, rejectedBy: OPENID || null, rejectReason: reason } })
        try {
          await db.collection('AuditLogs').add({ data: { actorId: OPENID || null, action: 'permissions.reject', target: { requestId: id }, createdAt: now } })
        } catch {}
        return ok({ updated: 1 })
      }
      case 'request.list': {
        const qp = ListSchema.safeParse(payload || {})
        if (!qp.success) {
          const m = mapZodIssues(qp.error.issues)
          return errValidate(m.msg, qp.error.issues)
        }
        const q = qp.data
        let where: any = {}
        if (q.filter) {
          const f = q.filter as any
          if (f.requesterId) where.requesterId = f.requesterId
          if (f.patientId) where.patientId = f.patientId
          if (f.status) where.status = f.status
        }
        // 可见性限制：非管理员仅能查看自己的申请
        if (!(await isAdmin())) {
          where.requesterId = OPENID
        }
        const res = await db.collection('PermissionRequests').where(where).orderBy('createdAt','desc').skip((q.page-1)*q.pageSize).limit(q.pageSize).get()
        return ok(res.data)
      }
      default:
        return err('E_ACTION','unsupported action')
    }
  } catch (e:any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
