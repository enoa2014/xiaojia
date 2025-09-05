# 前端/云函数编码规范（Coding Standards）

适用范围：
- 前端：微信小程序（JavaScript/ES2019+，WXML/WXSS）
- 后端：云函数（TypeScript/Node.js 16+，wx-server-sdk）

## 1. 代码风格与命名
- 文件/目录：`kebab-case`；常量文件可用 `UPPER_SNAKE`。
- 变量/函数：`camelCase`；类型/类名：`PascalCase`。
- 组件文件（前端）：`miniprogram/components/<comp-name>/{index.wxml, index.wxss, index.js, index.json}`。
- 页面文件：`miniprogram/pages/<page>/{index.wxml, index.wxss, index.js, index.json}`。
- 云函数：`functions/<domain>/{index.ts, schema.ts, service.ts}`；构建产物 `dist/`。

## 2. 模块组织
- 前端：
  - `services/api.js`：统一 `wx.cloud.callFunction` 封装（含 `callWithRetry`）。
  - `services/upload.js`：统一上传封装。
  - `components/`：RoleBadge、MaskedField、KpiCard、ActionGrid 等复用组件。
- 后端：
  - `schema.ts`：zod 校验定义（in/out 结构）；
  - `index.ts`：`main(event)` 分发 action；
  - `service.ts`：复杂业务逻辑抽离，便于单测。

## 3. 异步与错误处理
- 前端：所有调用使用 `await` + `try/catch`；对 `E_RATE_LIMIT|E_DEPENDENCY|E_INTERNAL` 使用 `callWithRetry` 指数退避。
- 后端：统一返回 `{ ok:true,data } | { ok:false,error:{ code,msg,details? } }`；
  - 常见错误：`E_AUTH|E_PERM|E_VALIDATE|E_NOT_FOUND|E_CONFLICT|E_RATE_LIMIT|E_DEPENDENCY|E_INTERNAL|E_ACTION|E_ARG`。
  - 仅在最外层 `catch` 里兜底 `E_INTERNAL`；不要吞掉栈（保留到 `details`）。

## 4. 校验与安全
- 入参校验：统一用 zod（`schema.ts`）在函数入口处校验；前端表单同步校验（以文档为准）。
- 字段可见性：后端按角色/审批过滤敏感字段（见 `field-masking-matrix.md`）。
- 日志：避免写 PII 至日志；输出 `requestId`、action、概要。
- 配置：严禁硬编码密钥；环境变量或开发者工具配置管理；AppID/ENV_ID 仅存本地或 `project.config.json`。

## 5. 性能与可用性
- 分页：每页 20；触底加载 + 下拉刷新；弱网骨架屏 ≤ 300ms 出现。
- 图片：前端压缩/缩略图；上传大小≤5MB/张；最多 9 张。
- 列表：虚拟化（如有必要）；避免 N+1 请求（后端提供合适索引/筛选）。

## 6. 提交与分支
- 提交：Conventional Commits（`feat|fix|docs|refactor|test|chore|perf|revert`）。
- 分支：`<type>/<scope>-<short>`；合并采用 squash，保持线性历史（详见 `engineering-guidelines.md`）。

## 7. 测试与验证
- 后端：对于 `schema.ts` 和 `service.ts` 关键逻辑编写单测（如果工具链可用）。
- 前端：关键表单与调用路径编写 E2E 走查脚本（基于微信开发者工具或脚本化）。
- A11y：对比度/触控尺寸/焦点管理按 `design-system/accessibility.md` 验收。

## 8. 示例片段
- 前端错误映射：`mapError`（统一文案）；
- 幂等：创建/导出类 action 需 `clientToken`；重复提交应返回相同结果。

---

与本文配套：`docs/uiux/design-system/*`、`docs/api/contracts.md`、`docs/specs/validation-rules.md`、`docs/process/engineering-guidelines.md`。
