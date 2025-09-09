const cloud = require('wx-server-sdk')
const ok = (data) => ({ ok: true, data })
const err = (code, msg, details) => ({ ok: false, error: { code, msg, details } })

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const p95 = (arr) => {
  if (!arr || !arr.length) return 0
  const sorted = [...arr].sort((a,b)=>a-b)
  const idx = Math.ceil(0.95 * sorted.length) - 1
  const pos = Math.max(0, Math.min(sorted.length - 1, idx))
  return sorted[pos]
}

exports.main = async (event) => {
  try {
    const evt = event || {}
    const action = evt.action
    const payload = evt.payload || {}
    const now = Date.now()
    const { OPENID } = (cloud.getWXContext && cloud.getWXContext()) || {}
    const _ = db.command
    const ensureCollections = async () => {
      try { await db.createCollection('Metrics') } catch(_) {}
      try { await db.createCollection('Alerts') } catch(_) {}
    }
    const ensureAllCollections = async () => {
      const names = [
        'Patients','Tenancies','Services','Activities','Registrations',
        'Users','PermissionRequests','Stats','ExportTasks','AuditLogs',
        'Metrics','Alerts'
      ]
      for (const name of names) { try { await db.createCollection(name) } catch(_) {} }
    }

    if (action === 'cronCheck') {
      await ensureCollections()
      const windowMs = Number(payload.windowMs || 10 * 60 * 1000)
      const errRateThreshold = Number(payload.errorRate || 0.02)
      const p95Threshold = Number(payload.p95 || 800)
      const exportFailThreshold = Number(payload.exportFail || 0.03)
      const slaHours = Number(payload.approvalSlaHours || 24)
      const since = now - windowMs

      const alerts = []

      // 1) Error rate by ns
      for (const ns of ['stats','exports']) {
        try {
          const snap = await db.collection('Metrics').where({ ns, ts: _.gte(since) }).limit(1000).get()
          const rows = (snap && snap.data) || []
          const total = rows.length
          const errors = rows.filter(d => d && d.ok === false).length
          const rate = total ? errors / total : 0
          if (total >= 50 && rate > errRateThreshold) {
            alerts.push({ type: 'error_rate', level: 'warning', ns, rate, total, threshold: errRateThreshold })
          }
        } catch(_) {}
      }

      // 2) P95 by ns:action
      try {
        const snap = await db.collection('Metrics').where({ ts: _.gte(since) }).limit(1000).get()
        const rows = (snap && snap.data) || []
        const groups = {}
        for (const m of rows) {
          if (!m || m.ok !== true || typeof m.duration !== 'number') continue
          const key = `${m.ns}:${m.action}`
          if (!groups[key]) groups[key] = []
          groups[key].push(m.duration)
        }
        for (const key of Object.keys(groups)) {
          const arr = groups[key]
          if (!arr || arr.length < 20) continue
          const v = p95(arr)
          if (v > p95Threshold) alerts.push({ type: 'latency_p95', level: 'warning', key, p95: v, threshold: p95Threshold, samples: arr.length })
        }
      } catch(_) {}

      // 3) Export failure rate
      try {
        const snap = await db.collection('ExportTasks').where({ createdAt: _.gte(since) }).limit(1000).get()
        const rows = (snap && snap.data) || []
        const total = rows.length
        const failed = rows.filter(d => d && d.status === 'failed').length
        const rate = total ? failed / total : 0
        if (total >= 20 && rate > exportFailThreshold) alerts.push({ type: 'export_fail_rate', level: 'warning', rate, total, threshold: exportFailThreshold })
      } catch(_) {}

      // 4) Approval SLA
      try {
        const overDueSince = now - slaHours * 60 * 60 * 1000
        const snap = await db.collection('PermissionRequests').where({ status: 'pending', createdAt: _.lte(overDueSince) }).limit(1000).get()
        const count = ((snap && snap.data) || []).length
        if (count > 0) alerts.push({ type: 'approval_sla_breach', level: 'info', count, olderThanHours: slaHours })
      } catch(_) {}

      const saved = []
      for (const a of alerts) {
        try {
          const r = await db.collection('Alerts').add({ data: Object.assign({ createdAt: now, actorId: OPENID || null }, a) })
          if (r && r._id) saved.push(r._id)
        } catch(_) {}
      }
      return ok({ alerts: alerts.length, saved })
    }

    if (action === 'initCollections') {
      await ensureAllCollections()
      return ok({ initialized: true })
    }

    return ok({ ping: 'observability' })
  } catch (e) {
    return err(e.code || 'E_INTERNAL', e.message, e.stack)
  }
}
