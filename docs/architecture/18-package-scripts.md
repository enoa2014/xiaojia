## 18. package.json 一键脚本（基于单环境 ENV_ID=cloud1-3grb87gwaba26b64）

将以下片段合并到项目根目录 `package.json` 的 `scripts` 中；如使用 `pnpm`，请将 `npm run` 改为 `pnpm run`。

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
    "deploy:all": "run-s deploy:patients deploy:tenancies deploy:services deploy:activities deploy:registrations deploy:stats deploy:permissions deploy:users deploy:exports",
    "init:db": "tcb fn deploy init-db -e cloud1-3grb87gwaba26b64 --dir ./functions/init-db/dist --force && wx cloud callFunction --name init-db"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5",
    "tsup": "^7.2.0",
    "zod": "^3.23.8"
  }
}
```

使用示例
```bash
# 构建所有函数
pnpm run build:functions

# 一键部署全部函数
pnpm run deploy:all

# 初始化数据库（仅第一次）
pnpm run init:db
```

