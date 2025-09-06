
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { ok, err } from '../packages/core-utils/errors'
import { hasAnyRole } from '../packages/core-rbac'
import { isRole } from '../packages/core-rbac'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }

const ListSchema = z.object({
  activityId: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(['registered','waitlist','cancelled']).optional()
}).partial()

const RegisterSchema = z.object({ activityId: z.string() })
const CancelSchema = z.object({ activityId: z.string() })
const CheckinSchema = z.object({ activityId: z.string(), userId: z.string().optional() })

export const main = async (event:any): Promise<Resp<any>> => {
  try {
    const { action, payload } = event || {}
    const ctx = cloud.getWXContext?.() || ({} as any)
    const OPENID = ctx.OPENID
    const now = Date.now()

    // RBAC helpers（用于 checkin 任意用户）
    const canManage = async (): Promise<boolean> => (await isRole(db, OPENID, 'admin')) || (await isRole(db, OPENID, 'social_worker'))

    switch (action) {
      case 'list': {
        const q = ListSchema.parse(payload || {})
        const _ = db.command
        const query: any = {}
        const isManager = await hasAnyRole(db, OPENID, ['admin','social_worker'])
        if (q.activityId) {
          if (!isManager) return err('E_PERM','需要权限')
          query.activityId = q.activityId
        }
        if (q.userId) {
          // 非管理角色仅允许 userId='me'
          const val = q.userId === 'me' ? OPENID : q.userId
          if (!isManager && val !== OPENID) return err('E_PERM','需要权限')
          query.userId = val
        }
        // 无过滤时，非管理角色不允许枚举
        if (!isManager && !q.activityId && !q.userId) return err('E_PERM','需要权限')
        if (q.status) query.status = q.status
        const res = await db.collection('Registrations').where(query).orderBy('createdAt','desc').get()
        return ok(res.data)
      }
      case 'register': {
        const { activityId } = RegisterSchema.parse(payload || {})
        if (!OPENID) return err('E_AUTH','请先登录')
        const trx = await db.startTransaction()
        try {
          // 获取活动
          const actRes = await trx.collection('Activities').doc(activityId).get()
          const activity = actRes?.data as any
          if (!activity) { await trx.rollback(); return { ok:false, error:{ code:'E_NOT_FOUND', msg:'活动不存在' } } }
          const capacity = typeof activity.capacity === 'number' ? activity.capacity : 0
          // 查询现有报名
          const existRes = await trx.collection('Registrations').where({ activityId, userId: OPENID }).limit(1).get()
          const exist = (existRes.data && existRes.data[0]) || null
          if (exist && (exist.status === 'registered' || exist.status === 'waitlist')) {
            await trx.commit()
            return err('E_CONFLICT', exist.status === 'registered' ? '已报名' : '已在候补')
          }
          // 统计当前已报名人数（registered）
          let registeredCount = 0
          try { const c = await trx.collection('Registrations').where({ activityId, status: 'registered' }).count() as any; registeredCount = (c.total ?? c.count) || 0 } catch {}
          const isUnlimited = capacity === 0
          const canRegister = isUnlimited || (registeredCount < capacity)
          if (exist) {
            // 从 cancelled 重新加入
            await trx.collection('Registrations').doc(exist._id).update({ data: { status: canRegister ? 'registered' : 'waitlist', registeredAt: canRegister ? now : null, createdAt: exist.createdAt || now } })
            await trx.commit()
            return ok({ status: canRegister ? 'registered' : 'waitlist' })
          } else {
            // 新建报名记录
            const doc: any = { activityId, userId: OPENID, status: canRegister ? 'registered' : 'waitlist', createdAt: now }
            if (canRegister) doc.registeredAt = now
            const addRes = await trx.collection('Registrations').add({ data: doc })
            await trx.commit()
            return ok({ _id: addRes._id, status: doc.status })
          }
        } catch (e:any) {
          try { await (db as any).runTransaction?.(() => Promise.resolve()) } catch {}
          return err(e.code || 'E_INTERNAL', e.message)
        }
      }
      case 'cancel': {
        const { activityId } = CancelSchema.parse(payload || {})
        if (!OPENID) return err('E_AUTH','请先登录')
        const trx = await db.startTransaction()
        try {
          const regRes = await trx.collection('Registrations').where({ activityId, userId: OPENID }).limit(1).get()
          const reg = (regRes.data && regRes.data[0]) || null
          if (!reg) { await trx.rollback(); return err('E_NOT_FOUND','未报名') }
          if (reg.status === 'cancelled') { await trx.commit(); return ok({ updated: 0 }) }
          await trx.collection('Registrations').doc(reg._id).update({ data: { status: 'cancelled', cancelledAt: now } })
          // 自动补位：若活动有限额，尝试将最早候补转为 registered
          const actRes = await trx.collection('Activities').doc(activityId).get()
          const activity = actRes?.data as any
          const capacity = typeof activity?.capacity === 'number' ? activity.capacity : 0
          const isUnlimited = capacity === 0
          if (!isUnlimited) {
            // 重新统计已报名人数
            let registeredCount = 0
            try { const c = await trx.collection('Registrations').where({ activityId, status: 'registered' }).count() as any; registeredCount = (c.total ?? c.count) || 0 } catch {}
            if (registeredCount < capacity) {
              // 取最早候补转正
              const wl = await trx.collection('Registrations').where({ activityId, status: 'waitlist' }).orderBy('createdAt','asc').limit(1).get()
              const first = (wl.data && wl.data[0]) || null
              if (first) {
                await trx.collection('Registrations').doc(first._id).update({ data: { status: 'registered', registeredAt: now } })
              }
            }
          }
          await trx.commit()
          return ok({ updated: 1 })
        } catch (e:any) {
          try { await (db as any).runTransaction?.(() => Promise.resolve()) } catch {}
          return err(e.code || 'E_INTERNAL', e.message)
        }
      }
      case 'checkin': {
        const { activityId, userId } = CheckinSchema.parse(payload || {})
        const targetUserId = userId || OPENID
        if (!targetUserId) return err('E_AUTH','请先登录')
        // 非管理角色仅允许为自己签到
        if (userId && !(await canManage())) return err('E_PERM','仅管理员/社工可为他人签到')
        const regRes = await db.collection('Registrations').where({ activityId, userId: targetUserId }).limit(1).get()
        const reg = (regRes.data && regRes.data[0]) || null
        if (!reg) return err('E_NOT_FOUND','未报名')
        if (reg.checkedInAt) return ok({ updated: 0 })
        await db.collection('Registrations').doc(reg._id).update({ data: { checkedInAt: now } })
        return ok({ updated: 1 })
      }
      default:
        return err('E_ACTION','unknown action')
    }
  } catch (e:any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
