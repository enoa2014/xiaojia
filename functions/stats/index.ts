
import cloud from 'wx-server-sdk'
import { ok, err } from '../packages/core-utils/errors'
import { hasAnyRole } from '../packages/core-rbac'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

export const main = async (event:any) => {
  const evt = event || {}
  const action = evt.action
  const { OPENID } = cloud.getWXContext?.() || ({} as any)
  const db = cloud.database()
  const started = Date.now()
  const reqId = (evt && (evt.payload && (evt.payload as any).requestId)) || null
  if (action === 'monthly') {
    const allowed = await hasAnyRole(db, OPENID, ['admin','social_worker'])
    if (!allowed) return err('E_PERM','需要权限')
    const payload = (evt && evt.payload) || {}
    const scope = String(payload.scope || 'services')
    const month = String(payload.month || '')
    if (!/^\d{4}-\d{2}$/.test(month)) return err('E_VALIDATE','month 需为 YYYY-MM')
    const year = Number(month.slice(0,4))
    const mon = Number(month.slice(5,7))
    const start = new Date(year, mon - 1, 1)
    const end = new Date(year, mon, 1)
    const days = new Date(year, mon, 0).getDate()
    const _ = db.command
    const items: Array<{ date: string; value: number }> = []
    const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const dayEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()+1).getTime()
    const countForDay = async (dayStr: string, idx: number): Promise<number> => {
      try {
        if (scope === 'services') {
          const r = await db.collection('Services').where({ date: dayStr } as any).count() as any
          return (r.total ?? r.count) || 0
        }
        if (scope === 'activities') {
          const r = await db.collection('Activities').where({ date: dayStr } as any).count() as any
          return (r.total ?? r.count) || 0
        }
        if (scope === 'patients') {
          const ds = new Date(year, mon - 1, idx)
          const from = dayStart(ds)
          const to = dayEnd(ds)
          const r = await db.collection('Patients').where({ createdAt: _.gte(from).and(_.lt(to)) } as any).count() as any
          return (r.total ?? r.count) || 0
        }
        // 默认不支持的 scope
        return 0
      } catch { return 0 }
    }
    for (let i = 1; i <= days; i++) {
      const d = new Date(year, mon - 1, i)
      const ds = toDateStr(d)
      const v = await countForDay(ds, i)
      items.push({ date: ds, value: v })
    }
    try { await db.collection('Metrics').add({ data: { ns: 'stats', action: 'monthly', ok: true, duration: Date.now()-started, requestId: reqId, actorId: OPENID||null, scope, ts: Date.now() } as any }) } catch {}
    return ok({ items, meta: { total: days, hasMore: false } })
  }
  if (action === 'yearly') {
    const allowed = await hasAnyRole(db, OPENID, ['admin','social_worker'])
    if (!allowed) return err('E_PERM','需要权限')
    const payload = (evt && evt.payload) || {}
    const scope = String(payload.scope || 'services')
    const yearStr = String(payload.year || '')
    if (!/^\d{4}$/.test(yearStr)) return err('E_VALIDATE','year 需为 YYYY')
    const year = Number(yearStr)
    const _ = db.command
    const items: Array<{ date: string; value: number }> = []
    const monthStart = (y:number,m:number) => new Date(y, m - 1, 1).getTime()
    const monthEnd = (y:number,m:number) => new Date(y, m, 1).getTime()
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2,'0')}`
      let value = 0
      try {
        if (scope === 'services') {
          const r = await db.collection('Services').where({
            // date: 'YYYY-MM-DD' 前缀匹配
            date: db.RegExp({ regexp: `^${ym}` }) as any
          } as any).count() as any
          value = (r.total ?? r.count) || 0
        } else if (scope === 'activities') {
          const r = await db.collection('Activities').where({
            date: db.RegExp({ regexp: `^${ym}` }) as any
          } as any).count() as any
          value = (r.total ?? r.count) || 0
        } else if (scope === 'patients') {
          const from = monthStart(year, m)
          const to = monthEnd(year, m)
          const r = await db.collection('Patients').where({ createdAt: _.gte(from).and(_.lt(to)) } as any).count() as any
          value = (r.total ?? r.count) || 0
        } else {
          value = 0
        }
      } catch { value = 0 }
      items.push({ date: ym, value })
    }
    try { await db.collection('Metrics').add({ data: { ns: 'stats', action: 'yearly', ok: true, duration: Date.now()-started, requestId: reqId, actorId: OPENID||null, scope, ts: Date.now() } as any }) } catch {}
    return ok({ items, meta: { total: 12, hasMore: false } })
  }
  if (action === 'counts') {
    const allowed = await hasAnyRole(db, OPENID, ['admin','social_worker'])
    if (!allowed) return err('E_PERM','需要权限')
    const cols: string[] = evt.collections || ['Patients','Tenancies','Activities','Registrations']
    const out: Record<string, number|null> = {}
    for (const name of cols) {
      try {
        const r = await db.collection(name as any).count()
        // @ts-ignore
        out[name] = (r && (r.total ?? r.count)) ?? 0
      } catch (e) {
        out[name] = null
      }
    }
    try { await db.collection('Metrics').add({ data: { ns: 'stats', action: 'counts', ok: true, duration: Date.now()-started, requestId: reqId, actorId: OPENID||null, ts: Date.now() } as any }) } catch {}
    return ok(out)
  }
  if (action === 'homeSummary') {
    // Determine role
    const role = await (async () => {
      try {
        const byOpen = await db.collection('Users').where({ openId: OPENID } as any).limit(1).get()
        if (byOpen?.data?.length) return byOpen.data[0].role || null
        try {
          const byId = await db.collection('Users').doc(OPENID).get()
          return byId?.data?.role || null
        } catch {}
      } catch {}
      return null
    })()

    // Time window: current month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    const _ = db.command

    // Helpers
    const count = async (name: string, where: any): Promise<number> => {
      try {
        const r = await db.collection(name as any).where(where).count() as any
        return (r.total ?? r.count) || 0
      } catch { return 0 }
    }

    // Metrics
    // Patients created this month
    const patientsMonthly = await count('Patients', { createdAt: _.gte(monthStart) })
    // Services created this month (manager: all; volunteer: self)
    let servicesWhere: any = { createdAt: _.gte(monthStart) }
    const isManager = await hasAnyRole(db, OPENID, ['admin','social_worker'])
    if (!isManager && OPENID) servicesWhere.createdBy = OPENID
    const servicesMonthly = await count('Services', servicesWhere)
    // Activities scheduled this month (status open/ongoing and date in YYYY-MM-*)
    const activitiesMonthly = await count('Activities', {
      status: _.in(['open','ongoing']),
      date: db.RegExp({ regexp: `^${monthStr}` }) as any
    })
    // Pending service reviews
    const pendingServiceReviews = await count('Services', { status: 'review' })
    // Pending permission approvals
    const pendingPermApprovals = await count('PermissionRequests', { status: 'pending' })

    // Notifications by role
    const notifications = (() => {
      if (role === 'admin') return pendingServiceReviews + pendingPermApprovals
      if (role === 'social_worker') return pendingServiceReviews
      return 0
    })()

    // Perm text by role
    const permText = (() => {
      if (role === 'admin') return '权限审批 • 系统统计 • 配置管理'
      if (role === 'social_worker') return '档案管理 • 服务审核 • 活动组织'
      if (role === 'volunteer') return '服务记录 • 档案查看 • 我的活动'
      if (role === 'parent') return '我的孩子 • 服务进展 • 亲子活动'
      return '正常 ✅'
    })()

    // Build 4 items per role aligning to homepage spec
    const items = (() => {
      if (role === 'admin') return [
        { label: '系统状态', value: '正常', icon: '✅', change: '' },
        { label: '在线用户', value: '0人', icon: '👥', change: '' },
        { label: '待处理事项', value: String(pendingServiceReviews + pendingPermApprovals) + '个', icon: '⚠️', change: '' },
        { label: '数据同步', value: '刚刚', icon: '🔄', change: '' }
      ]
      if (role === 'social_worker') return [
        { label: '今日工作量', value: '—', icon: '📈', change: '' },
        { label: '待审核', value: String(pendingServiceReviews) + '个', icon: '⏳', change: '' },
        { label: '本月档案', value: String(patientsMonthly) + '个', icon: '📁', change: '' },
        { label: '活动组织', value: String(activitiesMonthly) + '个', icon: '📅', change: '' }
      ]
      if (role === 'volunteer') return [
        { label: '本月服务', value: String(servicesMonthly) + '次', icon: '❤️', change: '' },
        { label: '下次活动', value: '—', icon: '📅', change: '' },
        { label: '服务时长', value: '—', icon: '⏱️', change: '' },
        { label: '志愿评分', value: '—', icon: '⭐', change: '' }
      ]
      if (role === 'parent') return [
        { label: '关注患者', value: '1人', icon: '🧒', change: '' },
        { label: '最新服务', value: '—', icon: '⏰', change: '' },
        { label: '参与活动', value: String(activitiesMonthly) + '次', icon: '🧩', change: '' },
        { label: '社区积分', value: '—', icon: '🌟', change: '' }
      ]
      // default (treat as social_worker)
      return [
        { label: '待审核', value: String(pendingServiceReviews) + '个', icon: '⏳', change: '' },
        { label: '本月档案', value: String(patientsMonthly) + '个', icon: '📁', change: '' },
        { label: '本月服务', value: String(servicesMonthly) + '次', icon: '❤️', change: '' },
        { label: '活动组织', value: String(activitiesMonthly) + '个', icon: '📅', change: '' }
      ]
    })()

    try { await db.collection('Metrics').add({ data: { ns: 'stats', action: 'homeSummary', ok: true, duration: Date.now()-started, requestId: reqId, actorId: OPENID||null, ts: Date.now() } as any }) } catch {}
    return ok({ role, items, notifications, permText })
  }
  try { await db.collection('Metrics').add({ data: { ns: 'stats', action: action || 'ping', ok: true, duration: Date.now()-started, requestId: reqId, actorId: OPENID||null, ts: Date.now() } as any }) } catch {}
    return ok({ ping: 'stats' })
}

// 新增：专项分析接口（占位实现，后续逐步完善聚合）
if (action === 'servicesAnalysis') {
  const allowed = await hasAnyRole(db, OPENID, ['admin','social_worker'])
  if (!allowed) return err('E_PERM','需要权限')
  const p = (evt && evt.payload) || {}
  const range = String(p.range || 'month')
  const month = String(p.month || '')
  const quarter = String(p.quarter || '')
  const _ = db.command
  // 时间窗口（简化：仅 month 支持，其他降级为当前月）
  const ym = /^\d{4}-\d{2}$/.test(month) ? month : (() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })()
  // summary（占位：按 Services.date 前缀统计）
  let total = 0
  try {
    const r:any = await db.collection('Services').where({ date: db.RegExp({ regexp: `^${ym}` }) as any }).count()
    total = (r.total ?? r.count) || 0
  } catch {}
  const summary = { totalServices: total, completedServices: total, avgRating: 0, mostPopularType: '' }
  // by-type（占位：五类固定，逐类 count）
  const types = ['visit','psych','goods','referral','followup']
  let typeItems:any[] = []
  try {
    let grand = 0
    const counts: Record<string, number> = {}
    for (const t of types) {
      try {
        const r:any = await db.collection('Services').where({ type: t, date: db.RegExp({ regexp: `^${ym}` }) as any }).count()
        const c = (r.total ?? r.count) || 0
        counts[t] = c
        grand += c
      } catch { counts[t] = 0 }
    }
    typeItems = types.map((t, i) => ({ type: t, count: counts[t]||0, percentage: grand ? Math.round((counts[t]||0)/grand*100) : 0, color: ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6'][i%5] }))
    if (grand > 0) summary.mostPopularType = typeItems.slice().sort((a,b)=>b.count-a.count)[0].type
  } catch {}
  // by-worker / rating-trend（占位空数组）
  const byWorker:any[] = []
  const ratingTrend:any[] = []
  try { await db.collection('Metrics').add({ data: { ns: 'stats', action: 'servicesAnalysis', ok: true, duration: Date.now()-started, requestId: reqId, actorId: OPENID||null, ts: Date.now(), range, ym, quarter } as any }) } catch {}
  return ok({ summary, byType: typeItems, byWorker, ratingTrend })
}

if (action === 'tenancyAnalysis') {
  const allowed = await hasAnyRole(db, OPENID, ['admin','social_worker'])
  if (!allowed) return err('E_PERM','需要权限')
  const p = (evt && evt.payload) || {}
  const what = String(p.type || evt?.subAction || '') // 兼容
  // 简化返回：summary + 3 个数组占位
  const summary = { totalBeds: 0, occupiedBeds: 0, occupancyRate: 0, avgStayDuration: 0 }
  const occupancyTrend:any[] = []
  const roomUtilization:any[] = []
  const stayDuration:any[] = []
  try { await db.collection('Metrics').add({ data: { ns: 'stats', action: 'tenancyAnalysis', ok: true, duration: Date.now()-started, requestId: reqId, actorId: OPENID||null, ts: Date.now() } as any }) } catch {}
  // 根据调用子类型返回对应部分（前端直接用对应接口）
  const sub = String((evt && evt.payload && evt.payload.kind) || (evt && evt.payload && evt.payload.type) || '')
  if (sub === 'summary') return ok(summary)
  if (sub === 'occupancy-trend') return ok(occupancyTrend)
  if (sub === 'room-utilization') return ok(roomUtilization)
  if (sub === 'stay-duration') return ok(stayDuration)
  return ok({ summary, occupancyTrend, roomUtilization, stayDuration })
}

if (action === 'activityAnalysis') {
  const allowed = await hasAnyRole(db, OPENID, ['admin','social_worker'])
  if (!allowed) return err('E_PERM','需要权限')
  const p = (evt && evt.payload) || {}
  const ym = String(p.month || '')
  // summary（占位：活动数量与参与数不可得，置 0）
  const summary = { totalActivities: 0, totalParticipants: 0, avgParticipationRate: 0, mostPopularActivity: '' }
  const participationTrend:any[] = []
  const byType:any[] = []
  const byAge:any[] = []
  try { await db.collection('Metrics').add({ data: { ns: 'stats', action: 'activityAnalysis', ok: true, duration: Date.now()-started, requestId: reqId, actorId: OPENID||null, ts: Date.now(), ym } as any }) } catch {}
  const sub = String(p.type || '')
  if (sub === 'summary') return ok(summary)
  if (sub === 'participation-trend') return ok(participationTrend)
  if (sub === 'by-type') return ok(byType)
  if (sub === 'participants-by-age') return ok(byAge)
  return ok({ summary, participationTrend, byType, byAge })
}
