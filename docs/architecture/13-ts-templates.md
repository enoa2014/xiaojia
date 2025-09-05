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

