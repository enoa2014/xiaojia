## 15. 前端 API/上传封装与错误码（3）

**api.js**
```js
// /miniprogram/services/api.js
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
    list: (q) => call('patients', 'list', q),
    get: (id) => call('patients', 'get', { id }),
    upsert: (data) => call('patients', 'upsert', data)
  },
  services: {
    create: (data) => call('services', 'create', data)
  }
}

export const mapError = (code) => ({
  E_AUTH: '请先登录后再试',
  E_PERM: '权限不足，如需访问请发起申请',
  E_VALIDATE: '填写有误，请检查后重试',
  E_NOTFOUND: '数据不存在或已被删除',
  E_CONFLICT: '数据冲突，请刷新后重试',
  E_INTERNAL: '服务异常，请稍后重试'
}[code] || '网络异常，请稍后重试')
```

**upload.js**
```js
// /miniprogram/services/upload.js
export const uploadImage = async (filePath, dir = 'services') => {
  const ext = filePath.split('.').pop()
  const cloudPath = `${dir}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { fileID } = await wx.cloud.uploadFile({ cloudPath, filePath })
  return fileID
}
```

**前端调用示例**
```js
try {
  const list = await api.patients.list({ page: 1, pageSize: 20 })
  this.setData({ list })
} catch (e) {
  wx.showToast({ icon: 'none', title: mapError(e.code) })
}
```

