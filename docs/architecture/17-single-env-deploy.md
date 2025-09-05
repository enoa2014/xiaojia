## 17. 单环境部署清单（5）

前置
- 已开通云开发，拿到 `ENV_ID`；微信开发者工具项目已勾选“云开发”。

命令
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

# 一次性初始化数据库集合（可选，仅第一次）
tcb fn deploy init-db -e $ENV_ID --dir ./functions/init-db/dist --force
wx cloud callFunction --name init-db

# 批量部署（可按需精简）
for fn in patients tenancies services activities registrations stats permissions users exports; do 
  tcb fn deploy "$fn" -e $ENV_ID --dir ./functions/$fn/dist --force; 
done
```

发布注意
- 单环境不做灰度；如需回滚，用上一版本构建工件重新部署。
- 导出任务/统计等重任务放入 `ExportTasks` 队列处理，避免阻塞交互。

