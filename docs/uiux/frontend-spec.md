# 前端开发规范（WeChat Mini Program）

版本：v1.0  
来源：汇总 docs/uiux/*、PRD 分片、Architecture 分片、API 契约与校验规范

## 1. 导航与信息架构
- TabBar（5）：工作台/档案/服务/活动/统计（参考 ia_design.md 1.1）
- 页面深度：各域 2–3 层；二级页统一顶栏返回（88rpx，高度/样式见 ia_design.md 2.2）
- 路由规范：
  - `pages/index/*`（工作台）
  - `pages/patients/{list,detail,form}`
  - `pages/services/{index,form,detail,review}`
  - `pages/activities/{index,detail,manage}`
  - `pages/stats/{index,detail}`

## 2. 首页（工作台）UI/交互（见 homepage_design_spec.md）
- 区域：导航区/用户状态/快速操作 2x2/数据总览/任务提醒/最近更新/TabBar
- 视觉：
  - 主色 #22C55E 渐变；标题 28rpx，品牌图标 32rpx；工具栏图标 24rpx
  - 用户状态区背景 #F0FDF4，分割线 #DCFCE7；角色徽章不同配色
- 交互：
  - 快速操作卡 active 轻微缩放；统计卡横向滑动；待办项可滑动删除或跳转
  - 权限可视化：显示当前角色与权限状态（通过/需申请）
- 性能：首屏骨架屏（状态区、2x2 占位、统计占位）≤ 300ms；首包控制 ≤ 2MB

## 3. 档案域（Patients）
- 列表：顶部固定搜索（姓名前缀/证件尾 4 位）；分组：优先关注/在住/历史（ia_design.md）
- 详情：分 Tab（基本资料/入住记录/服务记录/权限申请）；敏感字段默认脱敏
- 表单：新建/编辑校验（见 validation-rules.md）
- API 映射：`patients.list/get/create/update`（contracts.md 校验摘要一致）

## 4. 入住/退住（Tenancies）
- 列表：按 `checkInDate desc`；详情：在住/已退住标识
- 表单：必填 `checkInDate` 与 `patientId|id_card`；退住日期≥入住日期；补助≥0（两位小数）
- API：`tenancies.list/get/create/update`

## 5. 服务记录（Services）
- 入口：服务 Tab 概览 + 快速记录（探访/心理/物资/转介/随访）
- 记录表单：必填 `patientId,type,date`；`desc≤500`；图片≤9 张，每张≤5MB；弱网草稿
- 审核：`review→approved|rejected`，驳回需理由 20–200 字
- 列表：我的记录（按状态筛选）、团队记录（社工）；默认时间倒序
- API：`services.list/get/create/review`

## 6. 活动与报名（Activities/Registrations）
- 列表/日历：状态筛选（open/ongoing/done/closed）；我的参与
- 报名：满员候补；重复报名提示；签到幂等仅记录一次
- API：`activities.*`、`registrations.*`

## 7. 统计与导出（Stats/Exports）
- 仪表盘：关键指标卡 + 趋势图（交互缩放/Tooltip）；空数据占位
- 导出：创建任务→轮询状态→下载临时 URL（30 分钟）；失败可重试
- API：`stats.monthly/yearly`、`export.create/status`

## 8. 权限与安全（字段可见性）
- 角色：admin/social_worker/volunteer/parent
- 矩阵：见 field-masking-matrix.md（id_card/phone/diagnosis 默认脱敏）
- 申请：`permissions.request.submit/approve/reject`；到期自动回收；敏感读写与审批写 AuditLogs
- 详情页：无权限点击敏感字段 → 引导到申请页

## 9. 通用交互与状态
- 空态：统一插画/文案；提供行动按钮（如“去创建/去申请权限”）
- 加载：骨架屏（列表：头像+两行；详情：标题占位+字段占位）
- 错误：
  - 表单内联错误（E_VALIDATE）；Toast 友好提示（mapError）；
  - 可重试错误码（E_RATE_LIMIT/E_DEPENDENCY/E_INTERNAL）使用 `callWithRetry`（api.js）
- 成功反馈：轻 Toast + 页面局部刷新；重要操作展示结果页

## 10. 组件与样式
- 组件：RoleBadge、MaskedField、StatCard、ActionGrid、EmptyState、ErrorState、Skeleton、ImagePicker
- 命名：wxml 使用 `kebab-case`；wxss 使用 BEM-like；JS 变量 camelCase
- 色彩：主色 #22C55E；灰度 Tailwind 风格（gray-50~900）
- 字体：标题 28/24/20rpx；正文 20rpx；按钮 24rpx
- 间距：容器 24rpx；元素间距 16/8rpx；圆角 16rpx

## 11. 表单与校验（关键摘要）
- 身份证：18 位+校验位，唯一去重（创建冲突 → E_CONFLICT）
- 电话：`^1[3-9]\d{9}$`；出生日期 ≤ 今日
- 入退住：`checkOutDate≥checkInDate`；补助≥0
- 服务审核：驳回需理由；图片数量/大小限制
- 权限申请：字段白名单、理由≥20 字、TTL 默认 30 天

## 12. API 调用约定
- 调用：`wx.cloud.callFunction({ name, data:{ action, payload, clientToken? } })`
- 返回：`{ ok:true,data } | { ok:false,error:{ code,msg,details? } }`
- 分页：`page>=1`、`pageSize∈[10,100]`；过滤/排序见 contracts.md
- 幂等：创建/导出类需 `clientToken`；
- 重试：`callWithRetry` 对 `E_RATE_LIMIT|E_DEPENDENCY|E_INTERNAL` 指数退避

## 13. 可访问性与可用性
- 对比度：文字/背景最低 4.5:1；按钮/链接 3:1
- 触控：可点击区域≥ 88x88rpx；元素间距≥ 8rpx
- 反馈：所有点击/加载/错误均有状态；Toast 不遮挡关键按钮
- 本地化：中文为主，错误文案统一 mapError 映射

## 14. 性能与容量
- 首屏加载 ≤ 1.5s（弱网≤ 3s）；交互响应 ≤ 100ms
- 列表分页：每页 20；下拉刷新 + 触底加载；缓存最近一页
- 图片：上传前压缩；展示使用缩略图，点击预览原图

## 15. 埋点与监控（前端）
- 事件：页面曝光、按钮点击、表单提交、接口错误（含 code、duration、requestId）
- 指标：转化率（新建档案/提交记录/报名）、错误率、P95 接口时延

### 15.1 事件模型与实现
- 封装：`miniprogram/services/analytics.js` 暴露 `track(event, props)`；优先 `wx.reportAnalytics(event, props)`，未配置时降级 console。
- 事件命名：`<domain>_<action>[_<stage>]`，一律小写下划线。
- 公共字段：`requestId`（本地生成 `req-<ts>-<rand>`）、`duration`（ms，从发起到结束）、`code`（OK | 错误码）。

### 15.2 Tenancies（入住）事件
1) 提交发起：`tenancy_create_submit`
   - 字段：
     - `requestId: string`
     - `hasPatientId: boolean`
     - `hasIdCard: boolean`
     - `hasRoom: boolean`
     - `hasBed: boolean`
2) 提交结果：`tenancy_create_result`
   - 字段：
     - `requestId: string`（与 submit 一致）
     - `duration: number`（ms）
     - `code: 'OK' | 'E_VALIDATE' | 'E_CONFLICT' | 'E_INTERNAL' | ...`

实现参考：`pages/tenancies/form.js` 中 `onSubmit` 已接入上述事件。

### 15.3 配置与校验
- 后台配置：需在小程序管理后台 → 统计 → 自定义分析 中创建对应事件和字段映射。
- 本地联调：若未配置，`track` 自动降级为 `console.info('[analytics]', event, props)`。
- 数据一致性：`requestId` 在 submit/result 间保持一致；`duration` 合理（通常 < 2s）。

## 16. 验收清单（前端）
- 角色差异：首页模块/权限提示符合角色
- 脱敏：无权限默认脱敏；审批通过窗口内明文展示
- 表单：关键校验与错误文案符合规范；弱网草稿可恢复
- 重试：可重试错误码触发退避；用户感知文案友好
- 可用性：空态完整、加载与错误状态覆盖、对比度/触控符合规范

参考
- PRD：docs/prd.md
- 架构：docs/architecture.md 及分片
- 契约/错误码：docs/api/contracts.md、docs/api/error-codes.md、docs/api/quick-reference.md
- 校验规范：docs/specs/validation-rules.md
- 脱敏矩阵：docs/data/field-masking-matrix.md
