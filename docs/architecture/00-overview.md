# 小家服务管理小程序 — 系统架构蓝图（前端 JS · 后端 TS · 腾讯云存储/云函数/云数据库）

版本：v2.0  
约束：前端 JavaScript（微信小程序原生 JS + WXML/WXSS），后端 TypeScript（云函数 Node.js LTS≥16），数据与文件依托腾讯云开发（CloudBase：云数据库/云函数/COS）

## 0. 架构总览（High-level）
```
微信小程序（JS）
  ├─ UI（WXML/WXSS）
  ├─ 状态/服务层（API 封装、缓存、埋点）
  └─ wx.cloud.callFunction / wx.cloud.uploadFile
        │  JSON RPC（统一响应包）
        ▼
腾讯云开发（TCB）
  ├─ 云函数（TS）
  │   ├─ patients      档案/家庭
  │   ├─ tenancies     入住/退住
  │   ├─ services      服务记录
  │   ├─ activities    活动 & 报名
  │   ├─ stats         统计/导出视图
  │   ├─ permissions   权限申请/审批
  │   ├─ users         账号/角色/RBAC
  │   └─ exports       导出（异步任务）
  ├─ 云数据库（NoSQL）
  │   ├─ Patients / Tenancies / Services / Activities
  │   ├─ Registrations / Stats / Users / PermissionRequests
  │   └─ AuditLogs / ExportTasks
  └─ 云存储 COS
      ├─ avatars/  patients/  activities/  services/
      └─ exports/（Excel/PDF 临时下载）
```
