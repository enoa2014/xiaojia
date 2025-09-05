# 工程规范与协作流程

## 分支模型（Trunk-based）
- 主干：`main`（受保护；禁止直接 push；必须经 PR 合并）
- 分支命名：`<type>/<scope>-<short>`
  - type：`feat|fix|docs|refactor|test|chore|perf|revert`
  - scope：域或模块（如 `patients`、`services`、`miniprogram`、`infra`）
  - short：简短目的（英文连字符，≤ 5 词）
  - 示例：`feat/patients-create-form`、`fix/services-review-status`
- 发布与热修：
  - 标签：语义化版本 `vX.Y.Z`；必要时添加 `-rc.N`
  - 热修：`fix/hotfix-<short>` → PR 到 `main`，合并后打补丁标签
- 变基策略：优先使用 squash merge 压缩提交；必要时 rebase 以保持线性历史

## 提交信息（Conventional Commits）
- 结构：`<type>(<scope>): <subject>`（≤ 72 字符）
  - 可选 body：动机/变更影响/注意事项（空一行后换段）
  - 可选 footer：`Closes #123`、`BREAKING CHANGE: ...`
- 常用 type：
  - `feat`: 新功能；`fix`: 缺陷修复；`docs`: 文档；`refactor`: 重构（无行为变化）
  - `test`: 测试相关；`chore`: 构建/脚本/杂项；`perf`: 性能；`revert`: 回滚
- 示例：
  - `feat(patients): enforce ID-card uniqueness with zod + index`
  - `fix(miniprogram): map E_NOT_FOUND to friendly toast`

## 代码评审标准（PR）
- 必要性：所有变更经 PR 合并；至少 1 名 Reviewer 通过；CI 绿灯
- 尺寸建议：变更 ≤ 400 行（排除锁/生成物）；超出需拆分或明确理由
- 检查清单：
  - 需求对齐：PR 描述与 Issue/Story 一致，包含验收标准与截图（如适用）
  - 契约一致：入参与出参、错误码与 `docs/api/contracts.md` 一致
  - 安全与权限：按 `field-masking-matrix` 过滤；敏感操作写审计
  - 质量：新增或更新测试；关键路径覆盖；日志可追踪（含 requestId）
  - 性能：列表/聚合有索引支撑；避免 N+1；图片/文件大小限制
  - 文档：PR 模板内“文档与契约”项已勾选并同步

## 目录与命名约定
- 云函数（TS）
  - 结构：`functions/<domain>/{index.ts,schema.ts,service.ts}`；构建产物 `dist/`
  - 命名：文件/目录使用 `kebab-case`；类型名/类名使用 `PascalCase`；变量/函数 `camelCase`
  - 测试：如有，放置 `functions/<domain>/__tests__/*.test.ts`
- 小程序（JS）
  - 页面：`miniprogram/pages/<page>/{index.js,index.json,index.wxml,index.wxss}`
  - 服务：`miniprogram/services/{api.js,upload.js}`；工具：`miniprogram/utils/*.js`
  - 命名：文件与目录使用 `kebab-case`；常量使用全大写蛇形 `LIKE_THIS`
- 文档（Docs）
  - 路径：`docs/<area>/<topic>.md`；长文可分片（见 `docs/prd/*`, `docs/architecture/*`）
  - 语言：中文为主，接口/代码保留英文标识；文件名用英文-kebab-case

## Issue 与里程碑使用方式
- Issue 类型：使用模板创建（Bug、Feature）；必要时补充 Docs/Tech-debt 模板
- 关联：在 Issue 标题或描述中引用 Epic/Story ID（如 `EP-03-S1`），与 PR 使用 `Closes #` 自动关联
- 标签：`type:bug|feature|docs|tech-debt`、`prio:P0|P1|P2`、`size:S|M|L`、`area:patients|services|...`
- 里程碑：对应迭代（MVP/Must/Should）；Issue 必须归档到某个里程碑
- 看板：Backlog → In Progress → Review → Done；PR 合并即自动移动到 Done
- 准备与完成：在 Issue 中勾选 DoR/DoD（见 `docs/backlog/definition-of-ready-done.md`）

## 配置与密钥
- 严禁把密钥/Token/私钥提交到仓库（含历史）；必要时用平台安全配置或环境变量
- `ENV_ID`/AppID 等在本地配置文件管理；如区分环境，采用 `project.private.config.json` 或平台环境变量

## CI/CD（概览）
- 检查：Lint/Build/Test →（可选）预览环境 → Deploy（手动/受控）
- 质量门禁：
  - 构建/测试通过；关键函数变更清单可见
  - 需要时二次确认（tag/release 前）
- 回滚：保留上一版本构建工件/配置；支持一键回滚到上一个标签

## 其他实践
- 变更可观测性：为重要路径增加结构化日志与 requestId 贯穿
- 错误处理：统一错误码/文案（见 `docs/api/error-codes.md`、`docs/specs/validation-rules.md`）
- 文档健康：关键文档 >2 个迭代未更新需复核（见 `docs/docs-index.md`）
