# CloudBase 私有扩展：云函数打包与发布

本指南修复 `extension://...` CodeUri 无法解析导致的 `ResourceNotFound.Package / baseCodeCosInfo Failed` 问题，提供标准化的打包产物与资源片段，确保在发布私有扩展时，扩展发布器能将本地 ZIP 转换并上传为 COS 对象。

## 一、打包产物

生成所有云函数的 ZIP 包（入口为 ZIP 根目录的 `index.js`）：

```bash
pnpm run package:functions
```

产物位置：`artifacts/extensions/<function>.zip`

包含内容：
- `index.js`（从 `functions/<name>/dist/index.js` 拷贝）
- `package.json`（函数目录内）
- 默认不包含 `node_modules/`（tsup 已打包依赖）。如需随包携带依赖，可添加 `BUNDLE_NODE_MODULES=1` 环境变量再打包。

## 二、生成扩展资源片段

生成可嵌入至私有扩展清单的资源定义（JSON/YAML 双份）：

```bash
pnpm run gen:extension:resources
```

输出：
- `output/extension-resources.json`
- `output/extension-resources.yaml`

片段中关键字段：
- `CodeUri: ./artifacts/extensions/<name>.zip`（相对私有扩展项目根或清单文件路径）
- `Runtime: Nodejs16.13`
- `Timeout: 60`（部分函数 120）
- `InstallDependency: true`
- `Handler: index.main`

> 注意：在私有扩展“发布”动作中，发布器会将相对路径的 ZIP 转换为 `extension://<hash>.zip` 并上传到 COS。安装阶段将以 `cos://...` 下发，`baseCodeCosInfo` 才会正确填充。

## 三、在私有扩展项目中集成

1. 将当前仓库 `artifacts/extensions/*.zip` 拷贝到你的私有扩展仓库（建议路径：`./artifacts/functions/`）。
2. 打开 `output/extension-resources.yaml`，将其中每个函数的条目合并到你的扩展清单资源处：
   - 保留 `Runtime: Nodejs16.13`，与本项目 tsup 输出兼容。
   - 保留 `InstallDependency: true`（ZIP 中已包含打包依赖，通常不需要 node_modules）。
   - 确保 `CodeUri` 为该 ZIP 的相对路径（不是 `extension://` 占位符）。
3. 发布私有扩展新版本（控制台/CLI），等待构建完成。

## 四、验证

安装扩展到目标环境后：
- 在安装日志/计划中检查各函数 Code 包路径应为 `cos://...`（不是 `extension://...`）。
- 用 CLI 抽查：

```bash
tcb fn detail -e <envId> tenancies | rg '运行环境|Runtime|Nodejs'
```

应显示 `Nodejs16.13`。

## 五、故障排查

- 报错 `ResourceNotFound.Package / baseCodeCosInfo Failed`：
  - 扩展清单中的 `CodeUri` 必须为可访问的 ZIP 相对路径；发布器负责替换与上传。
- 报错 `a version is building, please wait for end.`：
  - 上一版本仍在构建，请等待或在控制台取消后再重试发布。

