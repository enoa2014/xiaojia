
// 生成简单 requestId（可用于审计与埋点串联）
export const genRequestId = (prefix = 'req') => `${prefix}-${Date.now()}-${Math.floor(Math.random()*1e6)}`

const call = async (name, action, payload = {}) => {
  const res = await wx.cloud.callFunction({ name, data: { action, payload } })
  const r = res && res.result
  if (!r || r.ok !== true) {
    const err = (r && r.error) || { code: 'E_INTERNAL', msg: '未知错误' }
    throw Object.assign(new Error(err.msg), { code: err.code, details: err.details })
  }
  return r.data
}
// 带指数退避的封装（示例）
const RETRY_CODES = new Set(['E_RATE_LIMIT','E_DEPENDENCY','E_INTERNAL'])
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
export const callWithRetry = async (name, action, payload = {}, opts = {}) => {
  const { maxRetries = 3, baseDelay = 500, jitter = 0.3 } = opts
  let attempt = 0, delay = baseDelay
  while (true) {
    try {
      return await call(name, action, payload)
    } catch (e) {
      attempt++
      if (!RETRY_CODES.has(e.code) || attempt > maxRetries) throw e
      const j = 1 + (Math.random()*2 - 1) * jitter
      await sleep(Math.min(10000, delay) * j)
      delay *= 2
    }
  }
}
export const api = {
  patients: {
    list: (q) => call('patients', 'list', q),
    get: (id, requestId) => call('patients', 'get', { id, requestId }),
    create: (patient, clientToken) => callWithRetry('patients', 'create', { patient, clientToken })
  },
  permissions: {
    submit: ({ fields, patientId, reason, expiresDays }, requestId) =>
      call('permissions', 'request.submit', { fields, patientId, reason, expiresDays: String(expiresDays), requestId }),
    approve: (id, expiresAt, requestId) =>
      call('permissions', 'request.approve', { id, expiresAt, requestId }),
    reject: (id, reason, requestId) =>
      call('permissions', 'request.reject', { id, reason, requestId }),
    list: async (q = {}) => {
      // 统一返回形状：{ items, hasMore }
      // 后端当前返回数组（无 meta），此处以 pageSize 猜测 hasMore
      const page = q.page || 1
      const pageSize = q.pageSize || 20
      // 允许顶层 status → 后端 filter.status
      const payload = { ...q }
      if (q.status) {
        payload.filter = Object.assign({}, q.filter || {}, { status: q.status })
        delete payload.status
      }
      const res = await call('permissions', 'request.list', payload)
      const items = Array.isArray(res) ? res : (res && res.items) || []
      const hasMore = Array.isArray(res?.items) && typeof res?.hasMore === 'boolean'
        ? !!res.hasMore
        : (Array.isArray(items) ? items.length >= pageSize && page >= 1 : false)
      return { items, hasMore }
    }
    ,process: async ({ requestId, action, reason }, reqId) => {
      // 映射 approve/reject
      if (action === 'approve') {
        return call('permissions', 'request.approve', { id: requestId, requestId: reqId })
      }
      if (action === 'reject') {
        return call('permissions', 'request.reject', { id: requestId, reason, requestId: reqId })
      }
      throw Object.assign(new Error('不支持的操作'), { code: 'E_ACTION' })
    }
    ,createRequest: async ({ patientId, fields, reason, duration }, requestId) => {
      // duration → expiresDays 粗略映射：1d|3d|7d|15d → 1|3|7|15（天）
      const map = { '1d': 1, '3d': 3, '7d': 7, '15d': 15 }
      const expiresDays = map[duration] || 7
      return call('permissions', 'request.submit', { patientId, fields, reason, expiresDays: String(expiresDays), requestId })
    }
    ,getPatientPermissions: async (patientId) => {
      // 汇总当前用户对某患者的权限状态
      const { items } = await api.permissions.list({ page: 1, pageSize: 50, filter: { patientId } })
      const now = Date.now()
      const approved = items.filter(it => it.status === 'approved' && (!it.expiresAt || it.expiresAt > now))
      const pending = items.filter(it => it.status === 'pending')
      const rejected = items.filter(it => it.status === 'rejected')
      const expiresAt = approved.length ? Math.min(...approved.map(it => it.expiresAt || now)) : null
      const status = approved.length ? 'approved' : (pending.length ? 'pending' : (rejected.length ? 'rejected' : 'none'))
      return { status, expiresAt, pendingRequests: pending.length }
    }
  },
  users: {
    getProfile: () => call('users', 'getProfile'),
    setRole: (role) => call('users', 'setRole', { role })
  },
  tenancies: {
    list: (q) => call('tenancies','list', q),
    get: (id) => call('tenancies','get', { id }),
    create: (tenancy, clientToken) => callWithRetry('tenancies','create', { tenancy, clientToken }),
    update: (id, patch) => call('tenancies','update', { id, patch })
  },
  services: {
    list: (q) => call('services','list', q),
    get: (id) => call('services','get', { id }),
    create: (service, clientToken) => callWithRetry('services','create', { service, clientToken }),
    review: (id, decision, reason, requestId) => call('services','review', { id, decision, reason, requestId })
  },
  activities: {
    list: (q) => call('activities','list', q),
    get: (id) => call('activities','get', { id }),
    create: (activity, clientToken) => callWithRetry('activities','create', { activity, clientToken })
    ,update: (id, patch) => call('activities','update', { id, patch })
  },
  registrations: {
    list: (q) => call('registrations', 'list', q),
    register: (activityId) => call('registrations', 'register', { activityId }),
    cancel: (activityId) => call('registrations', 'cancel', { activityId }),
    checkin: (activityId, userId) => call('registrations', 'checkin', { activityId, userId }),
    // 兼容别名（部分页面调用 checkIn）
    checkIn: (activityId, userId) => call('registrations', 'checkin', { activityId, userId })
  },
  audits: {
    list: async (q = {}) => {
      // 适配返回：后端 { items, meta } → { items, hasMore }
      const res = await call('audits','list', q)
      const items = res?.items || []
      const hasMore = (res?.meta && typeof res.meta.hasMore === 'boolean') ? !!res.meta.hasMore : false
      return { items, hasMore }
    }
  },
  exports: {
    create: (type, params = {}, clientToken, requestId) => {
      // 模板到后端类型的最小映射：支持 stats-monthly → statsMonthly；其余降级为 custom
      const typeMap = { 'stats-monthly': 'statsMonthly', 'stats-quarterly': 'statsAnnual' }
      const mappedType = typeMap[type] || (typeof type === 'string' ? type : 'custom')
      const safeType = ['statsMonthly','statsAnnual','custom'].includes(mappedType) ? mappedType : 'custom'
      return call('exports','create', { type: safeType, params, clientToken, requestId })
    },
    status: (taskId, requestId) => call('exports','status', { taskId, requestId })
    ,history: (q = {}) => call('exports','history', q)
  },
  stats: {
    homeSummary: (payload = {}) => call('stats','homeSummary', payload),
    monthly: (scope, month) => call('stats','monthly', { scope, month }),
    yearly: (scope, year) => call('stats','yearly', { scope, year })
    ,servicesAnalysis: (type, params = {}) => call('stats','servicesAnalysis', { type, ...params })
    ,tenancyAnalysis: (type, params = {}) => call('stats','tenancyAnalysis', { type, ...params })
    ,activityAnalysis: (type, params = {}) => call('stats','activityAnalysis', { type, ...params })
  }
}
export const mapError = (code) => ({
  E_AUTH: '请先登录后再试',
  E_PERM: '无权限操作',
  E_VALIDATE: '填写有误',
  E_NOT_FOUND: '数据不存在',
  E_CONFLICT: '数据冲突',
  E_INTERNAL: '服务异常'
}[code] || '网络异常，请稍后重试')
