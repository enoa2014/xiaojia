# 小家服务管理桌面版（Windows）

本目录存放桌面版工程代码，基于 Electron + React + SQLite 构建，目标是在 Windows 环境中离线运行原有微信小程序的核心流程。

## 主要目录
- `app/main/`: Electron 主进程代码，负责窗口、IPC、数据库初始化。
- `app/preload/`: 预加载脚本，向 Renderer 暴露受控 API。
- `app/renderer/`: 前端界面（React + Vite），逐步迁移小程序页面。
- `shared/`: 桌面端与小程序共享的模型/常量/工具。
- `scripts/`: 构建、打包、初始化数据库等脚本。

## 开发流程
```bash
pnpm install                  # 仍在仓库根目录执行
pnpm --filter ./windows install
pnpm --filter ./windows dev   # 启动 Vite、预加载编译与 Electron 主进程
```

> `dev` 脚本会并行执行三个任务：
> 1. `vite` 负责前端热更新；
> 2. `tsc --watch` 生成 `dist/preload/index.js`，供 Electron 预加载；
> 3. `tsx` 启动主进程。若需单独调试，可分别运行 `dev:renderer`、`dev:preload`、`dev:main`。

生产构建：
```bash
pnpm --filter ./windows build
pnpm --filter ./windows package    # 产出安装包（electron-builder）
```

## 数据库存储
- 使用 `better-sqlite3` 与 Electron 主进程直接交互，数据库文件默认放在 `app.getPath('userData')` 下。
- `app/main/database.ts` 现阶段仅创建 `meta` 表用于演示；后续迁移时需基于 `indexes.schema.json` 与云函数 Schema 设计完整的表结构。

## 页面迁移建议
1. 参考 `docs/windows-desktop-plan.md`，先梳理各业务流程的依赖关系。
2. 逐页迁移 `miniprogram/pages/*`：
   - WXML → React JSX；
   - WXSS → CSS Modules/CSS-in-JS 或全局样式，优先复用设计 Tokens。
3. 将 `miniprogram/services/api.js` 中的 API 调用转换为 `window.api` IPC 调用，主进程内调用本地服务模块。
4. 云函数的 `service.ts` 可直接放入 `shared/` 并调整数据访问层为 SQLite。

## 待办清单
- [ ] 完成 SQLite 表结构设计与迁移脚本。
- [ ] 迁移核心业务页面：患者、活动、报名、权限等。
- [ ] 构建主题系统，支持不同角色的配色切换。
- [ ] 集成自动化测试（Vitest/Playwright）验证关键流程。

如需了解整体迁移策略，请查看 `../docs/windows-desktop-plan.md`。
