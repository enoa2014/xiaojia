
const call = async (name, action, payload = {}) => {
  const res = await wx.cloud.callFunction({ name, data: { action, payload } })
  const r = res && res.result
  if (!r || r.ok !== true) {
    const err = (r && r.error) || { code: 'E_UNKNOWN', msg: '未知错误' }
    throw Object.assign(new Error(err.msg), { code: err.code, details: err.details })
  }
  return r.data
}
export const api = {
  patients: {
    list: (q) => call('patients', 'list', q)
  }
}
export const mapError = (code) => ({
  E_AUTH: '请先登录后再试',
  E_PERM: '权限不足',
  E_VALIDATE: '填写有误',
  E_NOTFOUND: '数据不存在',
  E_CONFLICT: '数据冲突',
  E_INTERNAL: '服务异常'
}[code] || '网络异常，请稍后重试')
