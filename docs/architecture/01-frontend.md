## 1. 前端（微信小程序 · JavaScript）

技术要点

- 原生 JS + WXML/WXSS；`app.js` 初始化 `wx.cloud.init({ env: ENV_ID })`。
- 统一 API 封装：`call(fn, payload)` → `wx.cloud.callFunction({ name: fn, data: payload })`。
- 本地缓存策略：最近搜索、筛选条件、上次统计维度；弱网下展示 Skeleton。
- 错误与权限：对后端标准错误码（如 `E_AUTH`, `E_PERM`, `E_VALIDATE`）做 Toast/重试/申请权限引导。
- 文件上传：`wx.cloud.uploadFile`（或后端下发临时凭证直传 COS）。

目录建议

```
/miniprogram
  ├─ app.js / app.json / app.wxss
  ├─ config/env.js              # ENV_ID、开关位
  ├─ services/api.js            # callFunction 封装 & 拦截
  ├─ services/upload.js         # 文件上传封装
  ├─ utils/format.js time.js    # 工具库
  ├─ components/                # 组件（RoleBadge/MaskedField/...）
  └─ pages/
      ├─ index/                 # 首页/工作台
      ├─ patients/{list,detail,form}
      ├─ services/{index,form,review}
      ├─ activities/{index,detail,manage}
      ├─ stats/index
      └─ approvals/index
```

