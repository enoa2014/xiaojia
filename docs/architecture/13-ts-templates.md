## 13. 云函数 TypeScript 模板（1）

**(a) 通用 tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "dist",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "Node"
  },
  "include": ["**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

**(b) tsup 构建（tsup.config.ts）**
```ts
import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  target: 'node16',
  minify: false,
  sourcemap: true,
  clean: true
})
```

**(c) 通用入口（index.ts）**
```ts
import cloud from 'wx-server-sdk'
import { z } from 'zod'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

export type Resp<T> = { ok: true; data: T } | { ok: false, error: { code: string; msg: string; details?: any } }

const ListSchema = z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20) })

export const main = async (event: any): Promise<Resp<any>> => {
  try {
    const { action, payload, uid, role } = event || {}
    switch (action) {
      case 'list': {
        const qp = ListSchema.parse(payload || {})
        const res = await db.collection('Patients').orderBy('createdAt','desc').skip((qp.page-1)*qp.pageSize).limit(qp.pageSize).get()
        return { ok: true, data: res.data }
      }
      default:
        return { ok: false, error: { code: 'E_ACTION', msg: 'unknown action' } }
    }
  } catch (e:any) {
    return { ok: false, error: { code: e.code || 'E_INTERNAL', msg: e.message, details: e.stack } }
  }
}
```

**(d) 共享包结构**
```
/functions/packages/
  core-rbac/   # 导出 check(role, action, fields)
  core-db/     # 导出 getDB()
  core-utils/  # 导出 zod schemas、errors、logger
```

**(e) 共享包用法示例**
```ts
// 统一响应与错误（core-utils/errors）
import { ok, err, errValidate } from '../packages/core-utils/errors'
import { mapZodIssues } from '../packages/core-utils/validation'

// 分页/排序/计数（core-db）
import { paginate, getDB, getCmd, getOpenId } from '../packages/core-db'

// 角色判定（core-rbac）
import { hasAnyRole } from '../packages/core-rbac'

export const main = async (event:any) => {
  const db = getDB()
  const _ = getCmd()
  const OPENID = getOpenId()
  try {
    switch (event?.action) {
      case 'list': {
        const q = { status: 'open' }
        const base = db.collection('Activities').where(q)
        const { items, meta } = await paginate(base, { page: 1, pageSize: 20, sort: { date: -1 } }, { fallbackSort: { date: -1 } })
        return ok({ items, meta })
      }
      case 'create': {
        // 仅管理员/社工可创建
        if (!(await hasAnyRole(db, OPENID, ['admin','social_worker']))) return err('E_PERM','需要审核权限')
        // ... 校验 & 入库
        return ok({ _id: 'new-id' })
      }
      default:
        return err('E_ACTION','unknown action')
    }
  } catch (e:any) {
    // Zod 校验失败时：
    if (e?.issues) {
      const m = mapZodIssues(e.issues)
      return errValidate(m.msg, e.issues)
    }
    return err(e.code || 'E_INTERNAL', e.message)
  }
}
```
