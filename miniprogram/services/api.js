
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
    get: (id) => call('patients', 'get', { id }),
    create: (patient, clientToken) => callWithRetry('patients', 'create', { patient, clientToken })
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
    review: (id, decision, reason) => call('services','review', { id, decision, reason })
  },
  activities: {
    list: (q) => call('activities','list', q),
    get: (id) => call('activities','get', { id }),
    create: (activity, clientToken) => callWithRetry('activities','create', { activity, clientToken })
  },
  registrations: {
    list: (q) => call('registrations', 'list', q),
    register: (activityId) => call('registrations', 'register', { activityId }),
    cancel: (activityId) => call('registrations', 'cancel', { activityId }),
    checkin: (activityId, userId) => call('registrations', 'checkin', { activityId, userId })
  }
}
export const mapError = (code) => ({
  E_AUTH: '请先登录后再试',
  E_PERM: '权限不足',
  E_VALIDATE: '填写有误',
  E_NOT_FOUND: '数据不存在',
  E_CONFLICT: '数据冲突',
  E_INTERNAL: '服务异常'
}[code] || '网络异常，请稍后重试')
