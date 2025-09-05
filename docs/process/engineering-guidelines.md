# 工程规范与协作流程

## 分支与发布
- 模型：Trunk-based（主分支 `main`）
- 规则：功能分支 `feat/<scope>-<short>`；修复 `fix/...`；文档 `docs/...`
- 合并：PR 必经评审与 CI 通过；保持小步提交
- 版本：语义化标签（如 `v0.1.0`）；里程碑绑定 PR/Issue

## 提交信息（Conventional Commits）
- `feat: ...` 新功能
- `fix: ...` 缺陷修复
- `docs: ...` 文档
- `refactor: ...` 重构（无行为变化）
- `chore: ...` 构建/脚本/杂项

## 代码评审
- 清单：需求对齐、接口契约、错误码、日志可追踪性、安全与权限、性能热点、测试覆盖
- 尺寸：PR ≤ 400 行为宜；超出需拆分

## 目录与命名
- 云函数：`functions/<domain>/index.ts`，公共库 `functions/_shared`
- 小程序：`miniprogram/pages/...`，服务封装 `miniprogram/services/...`
- 文档：`docs/<area>/<doc>.md`，按域归档

## Issue/里程碑
- Issue 模板：背景/目标/范围外/验收/风险
- 里程碑：对应迭代周期（MVP/Must/Should）
- 看板：Backlog → In Progress → Review → Done

## 配置与密钥
- 严禁提交敏感凭证；使用开发者工具安全配置或环境变量
- `ENV_ID`/AppID 在本地配置文件中管理（有必要时区分 dev/test/prod）

## CI/CD（概览）
- 阶段：Lint/Build/Test → Deploy（手动或受控）
- 质量门禁：测试通过、变更影响函数列表展示、需二次确认
- 回滚：保留前一版本构建产物与配置

