## 14. 云数据库建表与索引脚本（2）

**A. 一次性初始化函数（init-db/index.ts）**
```ts
import cloud from 'wx-server-sdk'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const collections = [
  'Patients','Tenancies','Services','Activities','Registrations',
  'Users','PermissionRequests','Stats','ExportTasks','AuditLogs'
]

export const main = async () => {
  const created: string[] = []
  for (const name of collections) {
    try { await db.createCollection(name as any); created.push(name) } catch(e:any) { /* 已存在忽略 */ }
  }
  return { ok: true, data: { created } }
}
```
> 说明：云函数侧可创建集合。复合索引建议在控制台或通过 Schema 配置导入；下方提供模板。

**B. 索引模板（indexes.schema.json）**
```json
{
  "Patients": {
    "indexes": [
      { "name": "idx_id_card", "unique": true, "keys": { "id_card": 1 } },
      { "name": "idx_name_tail", "keys": { "name": 1, "id_card_tail": 1 } }
    ]
  },
  "Services": {
    "indexes": [
      { "name": "idx_createdBy_date", "keys": { "createdBy": 1, "date": -1 } },
      { "name": "idx_patient_date",  "keys": { "patientId": 1, "date": -1 } }
    ]
  },
  "Activities": { "indexes": [ { "name": "idx_status_date", "keys": { "status": 1, "date": 1 } } ] }
}
```

**C. 回滚建议**
- 集合回滚：仅删除空集合；生产环境避免物理删除，使用逻辑字段 `deletedAt`。
- 索引回滚：创建新索引→数据迁移验证→删除旧索引（避免长时间锁表）。

