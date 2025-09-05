# 小家服务管理小程序 — 系统架构蓝图（前端 JS · 后端 TS · 腾讯云存储/云函数/云数据库）

**版本**：v2.0\
**约束**：前端 JavaScript（微信小程序原生 JS + WXML/WXSS），后端 TypeScript（云函数 Node.js LTS≥16），数据与文件依托腾讯云开发（CloudBase：云数据库/云函数/COS）

分片索引（Shard Index）
- 00. 总览：docs/architecture/00-overview.md
- 01. 前端：docs/architecture/01-frontend.md
- 02. 后端：docs/architecture/02-backend.md
- 03. 数据模型：docs/architecture/03-data-model.md
- 04. 云存储（COS）：docs/architecture/04-storage-cos.md
- 05. 权限与安全：docs/architecture/05-security-rbac.md
- 06. 关键流程：docs/architecture/06-flows.md
- 07. API 契约风格：docs/architecture/07-api-contract-style.md
- 08. 部署与环境：docs/architecture/08-deployment-env.md
- 09. 观测与稳定性：docs/architecture/09-observability.md
- 10. 风险与边界：docs/architecture/10-risks-boundaries.md
- 11. 验收清单：docs/architecture/11-acceptance-checklist.md
- 12. 下一步落地：docs/architecture/12-next-steps.md
- 13. TS 模板：docs/architecture/13-ts-templates.md
- 14. 建表与索引：docs/architecture/14-db-indexes.md
- 15. 前端 API/上传：docs/architecture/15-frontend-api-upload.md
- 16. 导出与定时任务：docs/architecture/16-exports-queue.md
- 17. 单环境部署清单：docs/architecture/17-single-env-deploy.md
- 18. package.json 脚本：docs/architecture/18-package-scripts.md

---

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

---

## 1. 前端（微信小程序 · JavaScript）

**技术要点**

- 原生 JS + WXML/WXSS；`app.js` 初始化 `wx.cloud.init({ env: ENV_ID })`。
- 统一 API 封装：`call(fn, payload)` → `wx.cloud.callFunction({ name: fn, data: payload })`。
- 本地缓存策略：最近搜索、筛选条件、上次统计维度；弱网下展示 Skeleton。
- 错误与权限：对后端标准错误码（如 `E_AUTH`, `E_PERM`, `E_VALIDATE`）做 Toast/重试/申请权限引导。
- 文件上传：`wx.cloud.uploadFile`（或后端下发临时凭证直传 COS）。

**目录建议**

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

---

## 2. 后端（云函数 · TypeScript）

**运行**：Node.js LTS（≥16），TypeScript 构建（`esbuild`/`tsup`）产出到 `dist/`。\
**模式**：单仓多函数（按域拆分）；共享 `lib/`（校验、RBAC、日志、DB 封装）。

**目录建议**

```
/functions
  ├─ packages/
  │   ├─ core-rbac/      # 角色/字段级权限、申请校验
  │   ├─ core-db/        # DB 连接、集合封装、索引工具
  │   └─ core-utils/     # zod 校验、错误、日志、id 生成
  ├─ patients/           # index.ts handler.ts schema.ts
  ├─ tenancies/
  ├─ services/
  ├─ activities/
  ├─ registrations/
  ├─ stats/
  ├─ permissions/
  ├─ users/
  └─ exports/
```

**通用 Handler 约定**

```ts
// 响应包：统一 { ok, data?, error? }
export type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } };

// 入口：根据 action 分发，所有入参用 zod 校验
export async function main(event: { action: string; payload?: any; uid: string; role: string }): Promise<Resp<any>> {
  try {
    switch (event.action) {
      case 'list':   return listPatients(event);
      case 'get':    return getPatient(event);
      case 'upsert': return upsertPatient(event);
      default:       return { ok: false, error: { code: 'E_ACTION', msg: 'unknown action' } };
    }
  } catch (e:any) {
    logError(e, event);
    return { ok: false, error: { code: e.code || 'E_INTERNAL', msg: e.message } };
  }
}
```

**关键中间件**

- **RBAC/ABAC**：按角色 + 字段白名单（身份证/联系方式等仅在审批通过内显示）。
- **校验**：`zod` 定义请求/响应 schema；拒绝未通过请求。
- **审计**：对敏感读写、权限审批、导出生成写 `AuditLogs`。
- **幂等**：提交服务记录/报名/导出任务使用 `clientToken` 去重。

---

## 3. 数据模型（云数据库 · 关键集合与索引）

> 字段名可按现有数据清洗脚本对齐；以下为最小必需集。

**Patients**

- `name` `id_card[unique]` `phone(masked)` `diagnosis(level)` `family.economicLevel`
- 索引：`id_card` 唯一；`name+id_card_tail` 组合查询；`createdAt` 倒序。

**Tenancies**

- `patientId` `checkInDate` `checkOutDate?` `room` `bed` `subsidy`
- 索引：`patientId+checkInDate(desc)`；`room+bed+checkInDate` 冲突检测（后续开启）。

**Services**

- `patientId` `type`(`visit|psych|goods|referral|followup`) `date` `desc` `images[]` `status(review|rejected|approved)` `createdBy`
- 索引：`createdBy+date(desc)`；`patientId+date(desc)`；`status` 过滤。

**Activities / Registrations**

- 活动：`title` `date` `location` `capacity` `status(open|closed|ongoing|done)`
- 报名：`activityId` `userId` `status(registered|waitlist|cancelled)` `checkedInAt?`
- 索引：`activityId+status`；`userId+date(desc)`。

**PermissionRequests**

- `requesterId` `fields[]` `patientId?` `reason` `status(pending|approved|rejected)` `expiresAt`

**Stats / ExportTasks / AuditLogs**

- 聚合月/年指标；导出任务状态与 `downloadUrl(expiresAt)`；操作审计流水。

---

## 4. 云存储（COS）与文件流

- 目录：`avatars/`、`patients/`、`activities/`、`services/`、`exports/`。
- 上传：前端 `wx.cloud.uploadFile`；或函数下发临时密钥直传（限制类型/尺寸/病毒扫描）。
- 访问：私有读，下载通过 **临时 URL**（导出）或经后端签名；图片样式处理使用 CDN 转码样式。

---

## 5. 权限与安全（RBAC + 字段级控制）

- 角色：`admin`、`social_worker`、`volunteer`、`parent`。
- 字段级：`id_card`、`phone`、`diagnosis` 等默认脱敏；基于 `PermissionRequests` 临时解密，TTL 到期自动回收。
- 读写规则：在函数层做鉴权 + 返回字段过滤；敏感写入（导出、审批）写入 `AuditLogs`。
- 数据导出：生成文件仅管理员/社工可创建；链接短时有效（如 30min）。

---

## 6. 关键流程（ASCII 时序）

**A) 服务记录提交（志愿者）**

```
pages/services/form  →  services.fn(action:create)
  填写表单/图片       校验(zod)→RBAC→写 Services→返回 {ok}
  弱网重试/草稿箱      审核状态初始 pending；通知社工
```

**B) 敏感字段查看申请（社工/志愿者）**

```
patients/detail → 点击「申请查看」 → permissions.fn(action:request)
  生成申请单 → 管理员审批 → 设置 TTL → 返回倒计时/状态
  在详情接口按授权窗口返回原始字段，否则脱敏
```

**C) 活动报名与签到**

```
activities/detail → registrations.fn(action:register)
  容量判定：满则 waitlist；社工端可签到（去重）→ 写 checkedInAt
```

---

## 7. API 契约（统一风格）

- **调用**：`wx.cloud.callFunction({ name: 'patients', data: { action: 'list', payload } })`
- **返回**：`{ ok: true, data } | { ok: false, error: { code, msg, details? } }`
- **错误码**：`E_AUTH`（未登录）`E_PERM`（无权限）`E_VALIDATE`（参数）`E_NOTFOUND` `E_CONFLICT` `E_INTERNAL`。

---

## 8. 部署与环境（单环境）

> 当前仅 **1 套环境（prod）**，不区分 dev/test。所有构建与部署均面向同一 `ENV_ID`。

**ENV 约定**
- `ENV_ID`：你的腾讯云开发环境 ID（示例：`cloud1-3grb87gwaba26b64`）。
- 小程序前端在 `app.js` 初始化：
  ```js
  // app.js
  App({
    onLaunch() {
      wx.cloud.init({ env: 'cloud1-3grb87gwaba26b64' })
    }
  })
  ```

**构建与部署**
- 一次登录（任一终端）：`tcb login`
- 设置环境变量：
  - Windows CMD：`set ENV_ID=cloud1-3grb87gwaba26b64`
  - PowerShell：`$env:ENV_ID='cloud1-3grb87gwaba26b64'`
  - Linux/WSL：`export ENV_ID=cloud1-3grb87gwaba26b64`

- 后端（TS 云函数）构建：
  ```bash
  pnpm i
  pnpm -r --filter ./functions/* i
  pnpm -r --filter ./functions/* build   # 产出各函数 dist/
  ```
- 部署云函数（按域逐个）：
  ```bash
  tcb fn deploy patients       -e $ENV_ID --dir ./functions/patients/dist --force
  tcb fn deploy tenancies      -e $ENV_ID --dir ./functions/tenancies/dist --force
  tcb fn deploy services       -e $ENV_ID --dir ./functions/services/dist --force
  tcb fn deploy activities     -e $ENV_ID --dir ./functions/activities/dist --force
  tcb fn deploy registrations  -e $ENV_ID --dir ./functions/registrations/dist --force
  tcb fn deploy stats          -e $ENV_ID --dir ./functions/stats/dist --force
  tcb fn deploy permissions    -e $ENV_ID --dir ./functions/permissions/dist --force
  tcb fn deploy users          -e $ENV_ID --dir ./functions/users/dist --force
  tcb fn deploy exports        -e $ENV_ID --dir ./functions/exports/dist --force
  ```
- 定时任务（如月度统计/导出清理）：在 **控制台 > 云开发 > 云函数 > 定时触发** 为 `stats`/`exports` 配置 CRON（示例：`0 3 * * *` 每日 03:00）。

**前端（JS）发布要点**
- `app.json` 开启云能力：`{"cloud": true}`。
- `config/env.js` 中固化唯一 `ENV_ID`；若需灰度，请在发布时手动切换构建分包版本，不使用多环境变量。

**数据初始化**
- 仅在首次上线执行 `init-db`（见附录脚本），创建集合与基础索引；避免覆盖线上数据。

---

## 9. 观测与稳定性

- 日志：函数入口打印 `requestId`/`uid`/`action`；错误堆栈入库抽样。
- 指标：函数错误率、P95 延迟、导出任务失败率、权限申请 SLA。
- 告警：连续错误阈值/导出失败阈值触发通知到运维群。

---

## 10. 风险与边界

- **HTTP 触发**：如需云函数 HTTP 直调，需配置安全域名/计费方案；小程序内推荐 `callFunction`。
- **并发负载**：统计/导出为重任务，避免在交互线程中执行，统一走异步队列（ExportTasks）。
- **索引缺失**：列表/统计必须建立组合索引，否则在 500+ 档案/万级服务记录下会退化。

---

## 11. 验收清单（抽样）

-

---

## 12. 下一步落地任务（建议）

1. 初始化环境的 `envId` 与安全规则；建库 + 建索引脚本。
2. 创建 `core-rbac`、`core-db`、`core-utils` 包并发布到各域函数。
3. 完成 `patients/services/activities/permissions` 4 个域的 MVP API 与前端接入。
4. 接入导出与定时任务；补齐审计与错误告警。
5. 组织数据演练（≥500 档案、≥10k 服务记录）做性能回归。



---

## 13. 云函数 TypeScript 模板（1）

**(a) 通用 tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "dist",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "Node"
  },
  "include": ["**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

**(b) tsup 构建（tsup.config.ts）**
```ts
import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  target: 'node16',
  minify: false,
  sourcemap: true,
  clean: true
})
```

**(c) 通用入口（index.ts）**
```ts
import cloud from 'wx-server-sdk'
import { z } from 'zod'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

export type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }

const ListSchema = z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20) })

export const main = async (event: any): Promise<Resp<any>> => {
  try {
    const { action, payload, uid, role } = event || {}
    switch (action) {
      case 'list': {
        const qp = ListSchema.parse(payload || {})
        const res = await db.collection('Patients').orderBy('createdAt','desc').skip((qp.page-1)*qp.pageSize).limit(qp.pageSize).get()
        return { ok: true, data: res.data }
      }
      default:
        return { ok: false, error: { code: 'E_ACTION', msg: 'unknown action' } }
    }
  } catch (e:any) {
    return { ok: false, error: { code: e.code || 'E_INTERNAL', msg: e.message, details: e.stack } }
  }
}
```

**(d) 共享包结构**
```
/functions/packages/
  core-rbac/   # 导出 check(role, action, fields)
  core-db/     # 导出 getDB()
  core-utils/  # 导出 zod schemas、errors、logger
```

---

## 14. 云数据库建表与索引脚本（2）

**A. 一次性初始化函数（init-db/index.ts）**
```ts
import cloud from 'wx-server-sdk'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const collections = [
  'Patients','Tenancies','Services','Activities','Registrations',
  'Users','PermissionRequests','Stats','ExportTasks','AuditLogs'
]

export const main = async () => {
  const created: string[] = []
  for (const name of collections) {
    try { await db.createCollection(name as any); created.push(name) } catch(e:any) { /* 已存在忽略 */ }
  }
  return { ok: true, data: { created } }
}
```
> 说明：云函数侧可创建集合。**复合索引**建议在控制台或通过 Schema 配置导入；下方提供模板。

**B. 索引模板（indexes.schema.json）**
```json
{
  "Patients": {
    "indexes": [
      { "name": "idx_id_card", "unique": true, "keys": { "id_card": 1 } },
      { "name": "idx_name_tail", "keys": { "name": 1, "id_card_tail": 1 } }
    ]
  },
  "Services": {
    "indexes": [
      { "name": "idx_createdBy_date", "keys": { "createdBy": 1, "date": -1 } },
      { "name": "idx_patient_date",  "keys": { "patientId": 1, "date": -1 } }
    ]
  },
  "Activities": { "indexes": [ { "name": "idx_status_date", "keys": { "status": 1, "date": 1 } } ] }
}
```
> 将该文件作为参考，在 **云开发控制台 > 数据库 > 索引** 中手动创建；或使用你现有的自动化管道导入。

**C. 回滚建议**
- 集合回滚：仅删除空集合；生产环境避免物理删除，使用逻辑字段 `deletedAt`。
- 索引回滚：创建新索引→数据迁移验证→删除旧索引（避免长时间锁表）。

---

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

---

## 16. 导出与定时任务：异步队列设计（4）

**数据结构**
```ts
// ExportTasks
{ _id, type: 'statsMonthly'|'statsAnnual', params: {}, status: 'pending'|'running'|'done'|'failed',
  retries: 0, maxRetries: 3, nextRunAt?: number, downloadUrl?: string, expiresAt?: number, createdBy, createdAt }
```

**流程（ASCII）**
```
客户端 → exports.create → 写入 ExportTasks(status=pending)
         定时触发 exports.run → 拉取 pending/到期任务 → 执行聚合 → 生成文件(COS)
         → 回写 downloadUrl+expiresAt → 通知客户端（轮询/消息）
         失败 → retries++ → 计算 nextRunAt(指数退避) → 重新排队（<=maxRetries）
```

**exports/index.ts 关键逻辑**
```ts
import cloud from 'wx-server-sdk'; cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database(); const _ = db.command

export const main = async (event:any) => {
  const { action, payload, uid } = event
  if (action === 'create') {
    const task = { type: payload.type, params: payload.params||{}, status:'pending', retries:0, maxRetries:3, createdBy: uid, createdAt: Date.now() }
    await db.collection('ExportTasks').add({ data: task })
    return { ok: true, data: task }
  }
  if (action === 'run') {
    const now = Date.now()
    const { data: tasks } = await db.collection('ExportTasks').where({ status: _.in(['pending','running']), nextRunAt: _.lte(now) }).limit(5).get()
    for (const t of tasks) {
      try {
        await db.collection('ExportTasks').doc(t._id).update({ data: { status: 'running' } })
        // TODO: 执行聚合/生成文件，上传 COS，得到 downloadUrl/expiresAt
        await db.collection('ExportTasks').doc(t._id).update({ data: { status: 'done', downloadUrl: 'cos://...', expiresAt: now + 30*60*1000 } })
      } catch (e) {
        const retries = (t.retries||0) + 1
        const backoff = Math.min(60*60*1000, Math.pow(2, retries) * 1000) // 1s→2s→4s…≤1h
        await db.collection('ExportTasks').doc(t._id).update({ data: { status: retries>= (t.maxRetries||3) ? 'failed' : 'pending', retries, nextRunAt: now + backoff } })
      }
    }
    return { ok: true, data: { handled: tasks.length } }
  }
  return { ok: false, error: { code: 'E_ACTION', msg: 'unknown action' } }
}
```

**定时**
- 在控制台为 `exports` 添加定时触发（每 5 分钟运行一次 `run`）。

---

## 17. 单环境部署清单（5）

**前置**
- 已开通云开发，拿到 `ENV_ID`；微信开发者工具项目已勾选“云开发”。

**命令**
```bash
# 登录一次
tcb login

# 设置 ENV_ID（任选其一）
export ENV_ID=cloud1-3grb87gwaba26b64         # Linux/WSL
set ENV_ID=cloud1-3grb87gwaba26b64            # Windows CMD
$env:ENV_ID='cloud1-3grb87gwaba26b64'         # PowerShell

# 安装与构建
pnpm i
pnpm -r --filter ./functions/* i
pnpm -r --filter ./functions/* build

# 一键初始化数据库集合（可选，仅第一次）
tcb fn deploy init-db -e $ENV_ID --dir ./functions/init-db/dist --force
wx cloud callFunction --name init-db  # 或在控制台直接触发

# 批量部署（可按需精简）
for fn in patients tenancies services activities registrations stats permissions users exports; do 
  tcb fn deploy "$fn" -e $ENV_ID --dir ./functions/$fn/dist --force; 
done
```

**发布注意**
- 单环境不做灰度；如需回滚，用上一版本构建工件重新部署。
- 导出任务/统计等重任务放入 `ExportTasks` 队列处理，避免阻塞交互。



---

## 18. package.json 一键脚本（基于单环境 ENV_ID=cloud1-3grb87gwaba26b64）

> 将以下片段合并到项目根目录 `package.json` 的 `scripts` 中；如使用 `pnpm`，请将 `npm run` 改为 `pnpm run`。

```jsonc
{
  "scripts": {
    "build:functions": "pnpm -r --filter ./functions/* build",
    "deploy:patients": "tcb fn deploy patients -e cloud1-3grb87gwaba26b64 --dir ./functions/patients/dist --force",
    "deploy:tenancies": "tcb fn deploy tenancies -e cloud1-3grb87gwaba26b64 --dir ./functions/tenancies/dist --force",
    "deploy:services": "tcb fn deploy services -e cloud1-3grb87gwaba26b64 --dir ./functions/services/dist --force",
    "deploy:activities": "tcb fn deploy activities -e cloud1-3grb87gwaba26b64 --dir ./functions/activities/dist --force",
    "deploy:registrations": "tcb fn deploy registrations -e cloud1-3grb87gwaba26b64 --dir ./functions/registrations/dist --force",
    "deploy:stats": "tcb fn deploy stats -e cloud1-3grb87gwaba26b64 --dir ./functions/stats/dist --force",
    "deploy:permissions": "tcb fn deploy permissions -e cloud1-3grb87gwaba26b64 --dir ./functions/permissions/dist --force",
    "deploy:users": "tcb fn deploy users -e cloud1-3grb87gwaba26b64 --dir ./functions/users/dist --force",
    "deploy:exports": "tcb fn deploy exports -e cloud1-3grb87gwaba26b64 --dir ./functions/exports/dist --force",

    // 一键批量部署：需安装 npm-run-all → pnpm add -D npm-run-all
    "deploy:all": "run-s deploy:patients deploy:tenancies deploy:services deploy:activities deploy:registrations deploy:stats deploy:permissions deploy:users deploy:exports",

    // 一次性初始化集合（首次上线后执行，可选）
    "init:db": "tcb fn deploy init-db -e cloud1-3grb87gwaba26b64 --dir ./functions/init-db/dist --force && wx cloud callFunction --name init-db"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5",
    "tsup": "^7.2.0",
    "zod": "^3.23.8"
  }
}
```

**使用示例**
```bash
# 构建所有函数
pnpm run build:functions

# 一键部署全部函数
pnpm run deploy:all

# 初始化数据库（仅第一次）
pnpm run init:db
```
