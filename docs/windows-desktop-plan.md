# Windows 桌面版迁移方案

## 目标
- 在 Windows 桌面端复刻现有微信小程序的核心能力，满足离线/局域网使用场景。
- 使用本地数据库持久化数据，保证可脱网运行。
- 尽可能复用现有前端/业务逻辑与数据结构，降低维护成本。

## 技术选型
- **壳层**：Electron（Chromium + Node.js），确保可访问本地文件系统和 SQLite。
- **前端框架**：React + TypeScript + Vite。通过组件化和路由实现小程序页面的 1:1 还原。
- **样式方案**：将 `wxss` 中的设计 Tokens 抽取为 CSS 变量，复用 `miniprogram/styles` 中的 tokens，通过构建脚本生成。
- **数据库**：SQLite（通过 `better-sqlite3` 同步访问），由主进程统一读写，保证线程安全。
- **数据访问层**：在 Electron preload 中暴露 `window.api`，Renderer 通过 IPC 与主进程交互，主进程调用服务层操作 SQLite。

## 模块划分
- `windows/app/main/`：Electron 主进程、数据库初始化、IPC Handler。
- `windows/app/preload/`：暴露受控 API，屏蔽 Node.js 能力。
- `windows/app/renderer/`：React 页面、组件与状态管理。
- `windows/shared/`：与小程序共享的 model、schema、常量（从 `miniprogram/services`、`functions/*/schema.ts` 抽取可复用逻辑）。
- `windows/scripts/`：桌面版的构建/打包脚本（Vite、Electron Builder）。

## 与现有项目的衔接
1. **页面迁移**：参考 `miniprogram/pages/*`，将 WXML 结构转换为 React 组件，`Page` 生命周期对应 React hooks。
2. **服务层迁移**：将 `miniprogram/services` 中的业务逻辑拆分为纯函数，移动到 `windows/shared/services`；Renderer 调用时通过 IPC 请求主进程。
3. **云函数替换**：把 `functions/*/service.ts` 的业务逻辑封装成可直接调用的模块，在主进程内引用，数据访问改为 SQLite。
4. **主题/配色**：复用 `styles/tokens.wxss`，通过脚本生成 `tokens.css` 并在 Renderer 中加载。
5. **数据初始化**：提供 `windows/scripts/init-db.ts` 从现有 JSONL 数据或云导出的文件写入 SQLite。

## 开发流程
1. `pnpm install`（根目录统一管理依赖）；`pnpm --filter ./windows` 维护桌面端依赖。
2. `pnpm run dev --filter ./windows` 启动 Vite dev server + Electron。
3. `pnpm run build --filter ./windows` 生成生产包；`pnpm run package --filter ./windows` 使用 Electron Builder 产出安装包。

## 后续重点
- 梳理权限体系与登录流程，决定是否脱敏或引入本地账号体系。
- 分析现有云函数数据库 schema，设计 SQLite 表结构与索引。
- 编写端到端测试脚本验证关键流程（患者管理、活动报名等）。
- 将公共常量/类型抽离到 `windows/shared`，避免重复维护。
