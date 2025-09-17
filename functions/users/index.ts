
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { ok, err } from '../packages/core-utils/errors'
import { getDB, paginate } from '../packages/core-db'
import { hasAnyRole } from '../packages/core-rbac'
import { errValidate } from '../packages/core-utils/errors'
import { hashPassword, verifyPassword, needsRehash } from '../packages/core-auth'

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
    const ensureCollection = async (name: string) => {
      try { await db.createCollection(name as any) } catch(_) {}
    }
    const setDocSafe = async (collection: string, id: string, data: any) => {
      const copy = { ...(data || {}) }
      try { delete (copy as any)._id } catch(_) {}
      return db.collection(collection as any).doc(id).set({ data: copy })
    }

    switch (action) {
      case 'login': {
        await ensureCollection('AuthAccounts')
        // 用户名密码登录（后端校验）
        const Schema = z.object({ username: z.string().min(3).max(50), password: z.string().min(6).max(100) })
        const { username, password } = Schema.parse(payload || {})
        const accSnap = await db.collection('AuthAccounts').where({ username } as any).limit(1).get()
        const account = accSnap?.data?.[0]
        if (!account || !verifyPassword(password, account.passwordHash)) {
          return err('E_AUTH', '昵称/姓名或密码错误')
        }
        
        // 检查账号状态
        if (account.status !== 'active') {
          if (account.status === 'pending') {
            return err('E_AUTH', '账号正在审批中，请等待管理员审核')
          } else {
            return err('E_AUTH', '账号已被禁用')
          }
        }
        // 若密码参数变更，需要透明升级存储
        try {
          if (needsRehash(account.passwordHash)) {
            const nextHash = hashPassword(password)
            await db.collection('AuthAccounts').doc(account._id).update({ data: { passwordHash: nextHash, updatedAt: Date.now() } })
          }
        } catch (_) {}
        // 根据账号绑定角色到当前 OPENID 的 Users 文档（RBAC 统一使用 OPENID）
        if (!OPENID) return err('E_AUTH','未登录')
        const role: 'admin'|'social_worker'|'volunteer'|'parent' = account.role || 'admin'
        // Upsert by openId or _id
        let docId: string | null = null
        let existing: any = null
        try {
          const byOpen = await db.collection('Users').where({ openId: OPENID } as any).limit(1).get()
          if (byOpen.data?.length) { existing = byOpen.data[0]; docId = existing._id }
        } catch {}
        if (!docId) {
          try { const byId = await db.collection('Users').doc(OPENID).get(); if (byId?.data) { existing = byId.data; docId = OPENID } } catch {}
        }
        const now = Date.now()
        const data: any = { ...(existing || {}), openId: OPENID, role, roles: [role], status: 'active', updatedAt: now, createdAt: existing?.createdAt || now }
        if (docId) await setDocSafe('Users', docId, data)
        else { const r = await db.collection('Users').add({ data }); docId = r._id }
        try { await db.collection('AuditLogs').add({ data: { action: 'auth_login', actorId: OPENID, boundRole: role, createdAt: now } }) } catch {}
        return ok({ user: { openId: OPENID, role, roles: [role], status: 'active', name: data.name || null, avatar: data.avatar || null } })
      }
      case 'registerAuth': {
        await ensureCollection('AuthAccounts')
        // 后台账号注册（受控）：
        // 1) 如不存在任何 admin 账号，允许创建首个 admin；
        // 2) 否则仅管理员可创建；
        const Schema = z.object({
          username: z.string().min(3).max(30).regex(/^[a-zA-Z][a-zA-Z0-9_\-]{2,29}$/),
          password: z.string().min(6).max(100),
          role: z.enum(['admin','social_worker']).default('social_worker')
        })
        const input = Schema.parse(payload || {})
        // 检查是否已有 admin 账号
        const admins = await db.collection('AuthAccounts').where({ role: 'admin' } as any).limit(1).get()
        const hasAdmin = Array.isArray(admins?.data) && admins.data.length > 0
        if (hasAdmin) {
          if (!OPENID) return err('E_AUTH','未登录')
          const allowed = await hasAnyRole(db, OPENID, ['admin'])
          if (!allowed) return err('E_PERM','需要管理员权限')
        } else {
          // 首个 admin 允许自由创建，但若传 role 非 admin 则仍需管理员
          if (input.role !== 'admin') {
            if (!OPENID) return err('E_AUTH','未登录')
            const allowed = await hasAnyRole(db, OPENID, ['admin'])
            if (!allowed) return err('E_PERM','需要管理员权限')
          }
        }
        // 检查用户名是否重复
        const dup = await db.collection('AuthAccounts').where({ username: input.username } as any).limit(1).get()
        if (dup?.data?.length) return err('E_CONFLICT','用户名已存在')
        const now = Date.now()
        const passwordHash = hashPassword(input.password)
        const doc = { username: input.username, passwordHash, role: input.role, createdAt: now, updatedAt: now }
        const r = await db.collection('AuthAccounts').add({ data: doc as any })
        try { await db.collection('AuditLogs').add({ data: { action: 'auth_register', actorId: OPENID || null, username: input.username, role: input.role, createdAt: now } }) } catch {}
        return ok({ _id: r._id, username: input.username, role: input.role })
      }
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
          
          // 激活对应的AuthAccounts记录
          try {
            await db.collection('AuthAccounts').where({ openId: targetId } as any).update({
              data: { status: 'active', role: p.role, updatedAt: Date.now() }
            })
          } catch (e) {
            console.warn('Failed to activate auth account:', e)
          }
          
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
        const isTestMode = !!(event && event.payload && (event.payload.test === true || event.payload.test === 1 || event.payload.test === '1'))
        // 校验入参
        const RelativeSchema = z.object({
          patientName: z.string().min(1).max(50),
          relation: z.enum(['father','mother','guardian','other']),
          patientIdCard: z.string().regex(/^[0-9]{17}[0-9Xx]$/)
        })
        const RegisterSchema = z.object({
          nickname: z.string().max(30).optional(),
          password: z.string().min(6).max(100),
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
        await ensureCollection('AuthAccounts')
        await ensureCollection('Users')
        await ensureCollection('AuditLogs')
        
        // 确定登录用的用户名（昵称优先，否则使用姓名）
        const loginName = input.nickname?.trim() || input.name
        
        // 检查登录名是否已被使用
        const nameCheck = await db.collection('AuthAccounts').where({ username: loginName } as any).limit(1).get()
        if (nameCheck?.data?.length) {
          return err('E_CONFLICT', `${input.nickname ? '昵称' : '姓名'} "${loginName}" 已被使用，请换一个`)
        }
        
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
        try { await db.collection('AuditLogs').add({ data: { action: 'user_register_attempt', actorId: OPENID, test: !!isTestMode, createdAt: now } }) } catch {}
        // 若当前 OPENID 已绑定管理员：
        // - 非测试模式：返回冲突，提示使用测试模式或更换微信
        // - 测试模式：使用合成 testOpenId 以生成独立的 Users 记录，不影响管理员账号
        const isAdminOpenId = !!(doc && ((doc.role === 'admin') || (Array.isArray(doc.roles) && doc.roles.includes('admin'))))
        const targetOpenId = (isAdminOpenId && isTestMode) ? `test:${OPENID}:${now}` : OPENID
        if (isAdminOpenId && !isTestMode) {
          return err('E_CONFLICT', '当前微信已绑定管理员，请使用测试注册模式或更换微信号')
        }
        const next = {
          ...(doc || {}),
          openId: targetOpenId,
          nickname: input.nickname || null,
          loginName: loginName, // 用于登录的名称
          name: input.name,
          phone: input.phone,
          id_card: input.id_card,
          applyRole: input.applyRole,
          relative: input.relative || null,
          status: 'pending',
          isTest: (isAdminOpenId && isTestMode) ? true : undefined,
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

        if (docId && targetOpenId === OPENID) {
          await setDocSafe('Users', docId, next)
        } else {
          // 对于测试模式（targetOpenId 为合成 id），或首次注册，新增记录
          await db.collection('Users').add({ data: next })
        }
        
        // 创建登录凭证账号，但是role设为pending，待审批通过后才能激活
        const passwordHash = hashPassword(input.password)
        const authAccount = {
          username: loginName,
          passwordHash,
          role: next.applyRole, // 使用申请的角色
          status: 'pending', // 设为pending状态，审批通过后才能登录
          openId: targetOpenId,
          isTest: (isAdminOpenId && isTestMode) ? true : undefined,
          createdAt: now,
          updatedAt: now
        }
        await db.collection('AuthAccounts').add({ data: authAccount })
        try { await db.collection('AuditLogs').add({ data: { action: 'user_register_submitted', actorId: OPENID, targetOpenId, createdAt: now } }) } catch {}
        
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
          const r = await db.collection('Users').add({ data: { ...data } as any })
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
        const data = { ...(doc || {}), openId: OPENID, updatedAt: Date.now() } as any
        if (input.name != null) { data.name = input.name; data.displayName = input.name }
        if (input.avatar != null) { data.avatar = input.avatar }
        if (docId) {
          await setDocSafe('Users', docId, data)
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
        const data = { ...(doc || {}), openId: OPENID, starredPatients: stars, updatedAt: Date.now() }
        if (docId) {
          await setDocSafe('Users', docId, data as any)
        } else {
          const r = await db.collection('Users').add({ data: data as any })
          docId = r._id
        }
        return ok({ stars })
      }
      case 'logout': {
        if (!OPENID) return err('E_AUTH','未登录')
        // 清除用户状态，将status设为logged_out
        let doc: any = null
        let docId: string | null = null
        try {
          const byOpen = await db.collection('Users').where({ openId: OPENID } as any).limit(1).get()
          if (byOpen.data?.length) { doc = byOpen.data[0]; docId = doc._id }
        } catch {}
        if (!doc) {
          try { const byId = await db.collection('Users').doc(OPENID).get(); if (byId?.data) { doc = byId.data; docId = OPENID } } catch {}
        }
        if (docId) {
          const data = { ...(doc || {}), openId: OPENID, status: 'logged_out', updatedAt: Date.now() }
          await setDocSafe('Users', docId, data)
          try { await db.collection('AuditLogs').add({ data: { action: 'user_logout', actorId: OPENID, createdAt: Date.now() } }) } catch {}
        }
        return ok({ success: true })
      }
      default:
        return ok({ ping: 'users', action })
    }
  } catch (e: any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
