## 8. 部署与环境（单环境）

当前仅 1 套环境（prod），不区分 dev/test。所有构建与部署均面向同一 ENV_ID。

ENV 约定
- `ENV_ID`：你的腾讯云开发环境 ID（示例：`cloud1-3grb87gwaba26b64`）。
- 小程序前端在 `app.js` 初始化：
```js
App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-3grb87gwaba26b64' })
  }
})
```

构建与部署
- 一次登录（任一终端）：`tcb login`
- 设置环境变量：
  - Windows CMD：`set ENV_ID=cloud1-3grb87gwaba26b64`
  - PowerShell：`$env:ENV_ID='cloud1-3grb87gwaba26b64'`
  - Linux/WSL：`export ENV_ID=cloud1-3grb87gwaba26b64`
- 后端构建：
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
- 定时任务：控制台为 `stats`/`exports` 配置 CRON（如 `0 3 * * *`）。

前端发布要点
- `app.json` 开启云能力：`{"cloud": true}`。
- `config/env.js` 固化唯一 `ENV_ID`。

数据初始化
- 首次上线执行 `init-db` 创建集合与基础索引；避免覆盖线上数据。

