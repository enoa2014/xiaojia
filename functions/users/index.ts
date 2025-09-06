
import cloud from 'wx-server-sdk'
import { z } from 'zod'
import { ok, err } from '../packages/core-utils/errors'

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }

const SetRoleSchema = z.object({
  role: z.enum(['admin', 'social_worker', 'volunteer', 'parent'])
})

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
        if (!doc) return ok({ openId: OPENID, role: null, roles: [] })
        return ok({ openId: OPENID, role: doc.role || null, roles: doc.roles || (doc.role ? [doc.role] : []) })
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
      default:
        return ok({ ping: 'users', action })
    }
  } catch (e: any) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
