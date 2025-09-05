
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
    try { await db.createCollection(name as any); created.push(name) } catch(e) {}
  }
  return { ok: true, data: { created } }
}
