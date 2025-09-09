
import cloud from 'wx-server-sdk'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const collections = [
  'Patients','Tenancies','Services','Activities','Registrations',
  'Users','PermissionRequests','Stats','ExportTasks','AuditLogs',
  'Metrics','Alerts'
]
export const main = async (event?: any) => {
  const action = event && (event as any).action
  if (action === 'wipe-some') {
    const cols = (event && (event as any).collections) || []
    const limit = Math.max(1, Math.min(((event && (event as any).limit) || 50), 200))
    const removed: Record<string, number> = {}
    for (const name of cols) {
      let count = 0
      try {
        const snap = await db.collection(name as any).limit(limit).get()
        const ids = (snap.data || []).map((d:any) => d._id).filter(Boolean)
        for (const id of ids) { await db.collection(name as any).doc(id).remove(); count++ }
      } catch (e) {}
      removed[name] = count
    }
    return { ok: true, data: { removed, limit } }
  }
  if (action === 'wipe-all') {
    const wiped: Array<{ name: string; removed?: number; error?: string }> = []
    for (const name of collections) {
      try {
        let removed = 0
        while (true) {
          const snap = await db.collection(name as any).limit(1000).get()
          const ids = (snap.data || []).map((d:any) => d._id).filter(Boolean)
          if (!ids.length) break
          // delete in small batches to avoid timeouts
          const chunk = (arr:string[], size:number) => arr.reduce((res:string[][],_,i)=> (i%size? res[res.length-1].push(arr[i]) : res.push([arr[i]]), res), [])
          const chunks = chunk(ids, 50)
          for (const grp of chunks) {
            await Promise.all(grp.map((id:string) => db.collection(name as any).doc(id).remove()))
            removed += grp.length
          }
        }
        wiped.push({ name, removed })
      } catch (e:any) {
        wiped.push({ name, error: (e && e.message) || String(e) })
      }
    }
    return { ok: true, data: { wiped } }
  }
  const created: string[] = []
  for (const name of collections) {
    try { await db.createCollection(name as any); created.push(name) } catch(e) {}
  }
  return { ok: true, data: { created } }
}
