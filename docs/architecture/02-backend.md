## 2. 后端（云函数 · TypeScript）

运行：Node.js LTS（≥16），TypeScript 构建（`esbuild`/`tsup`）产出到 `dist/`。  
模式：单仓多函数（按域拆分）；共享 `lib/`（校验、RBAC、日志、DB 封装）。

目录建议

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

通用 Handler 约定

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

关键中间件

- RBAC/ABAC：按角色 + 字段白名单（身份证/联系方式等仅在审批通过内显示）。
- 校验：`zod` 定义请求/响应 schema；拒绝未通过请求。
- 审计：对敏感读写、权限审批、导出生成写 `AuditLogs`。
- 幂等：提交服务记录/报名/导出任务使用 `clientToken` 去重。

