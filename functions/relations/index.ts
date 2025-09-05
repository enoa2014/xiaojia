import cloud from 'wx-server-sdk'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function linkBatch(limit: number, offset: number) {
  const coll = db.collection('Tenancies')
  const snap = await coll.orderBy('createdAt','asc').skip(offset).limit(limit).get()
  let matchedById = 0, matchedByName = 0, unchanged = 0, updated = 0
  for (const t of snap.data || []) {
    if (t.patientId) { unchanged++; continue }
    const idc = t.id_card || null
    const name = t.patientName || null
    let pid: string | null = null
    if (idc) {
      const ps = await db.collection('Patients').where({ id_card: idc }).limit(1).get()
      if (ps.data && ps.data.length) { pid = ps.data[0]._id; matchedById++ }
    }
    if (!pid && name) {
      const ps = await db.collection('Patients').where({ name }).limit(1).get()
      if (ps.data && ps.data.length) { pid = ps.data[0]._id; matchedByName++ }
    }
    if (pid) {
      try {
        await coll.doc(t._id).update({ data: { patientId: pid } })
        updated++
      } catch (e) {}
    }
  }
  return { total: snap.data?.length || 0, matchedById, matchedByName, unchanged, updated }
}

export const main = async (event:any) => {
  const evt = event || {}
  const action = evt.action
  if (action === 'link-tenancies') {
    const batchSize = Math.max(1, Math.min(evt.batchSize || 80, 200))
    const offset = Math.max(0, evt.offset || 0)
    const res = await linkBatch(batchSize, offset)
    return { ok: true, data: { batchSize, offset, ...res } }
  }
  return { ok: true, data: { ping: 'relations' } }
}
