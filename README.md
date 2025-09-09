
# 小家服务管理小程序 · Milestone 0 一体化交付包

## 文档索引
- 文档总览与所有权: [docs/docs-index.md](docs/docs-index.md)
- 代码结构总览: [docs/source-tree.md](docs/source-tree.md)

**环境**：ENV_ID=`cloud1-3grb87gwaba26b64`（单环境）  
**包含**：
- 小程序（JS）+ 云函数（TS）项目骨架
- 一键脚本（构建/部署/初始化）
- 建库 & 索引模板（`init-db` + `indexes.schema.json`）
- 数据导入：本地脚本（b.xlsx→JSONL→导入）与云函数（COS fileID→导入）

## 0. 准备
- Node.js LTS + pnpm、微信开发者工具、TCB CLI（`npm i -g @cloudbase/cli`）
- `tcb login` 完成登录

## 1. 构建 & 初始化
```bash
pnpm i
pnpm -r --filter ./functions/* i
pnpm run build:functions
pnpm run build:tokens

# 建库（集合一次性创建）
pnpm run init:db
```

## 2. 部署函数
```bash
pnpm run deploy:all
pnpm run deploy:importxlsx
```

## 3. 导入数据（二选一）

### 方式A：本地脚本
```bash
# 放置 b.xlsx 到 scripts/data/b.xlsx
python scripts/convert_b_xlsx.py --in scripts/data/b.xlsx --out scripts/out
tcb database import --env cloud1-3grb87gwaba26b64 --collection Patients  --file scripts/out/patients.jsonl
tcb database import --env cloud1-3grb87gwaba26b64 --collection Tenancies --file scripts/out/tenancies.jsonl
```

### 方式B：云函数
```bash
# 将 b.xlsx 上传 COS（开发者工具/控制台皆可），得到 fileID
pnpm run deploy:importxlsx
wx cloud callFunction --name import-xlsx --data '{"action":"fromCos","payload":{"fileID":"<fileID>"}}'
```

示例（prepare/b.xlsx 的 COS 路径）
```bash
wx cloud callFunction --name import-xlsx --data '{"action":"fromCos","payload":{"fileID":"cloud://cloud1-3grb87gwaba26b64.636c-cloud1-3grb87gwaba26b64-1374503701/b.xlsx"}}'
```

## 4. 表头映射（已适配你提供的截图）

- 姓名 → `name`
- 身份证号 → `id_card`
- 入住时间 → `checkInDate`
- 出生日期 → `birthDate`
- 性别 → `gender`
- 籍贯 → `nativePlace`
- 民族 → `ethnicity`
- 就诊医院 → `hospital`
- 医院诊断 → `hospitalDiagnosis`
- 医生姓名 → `doctorName`
- 症状详情 → `symptoms`
- 医疗过程 → `medicalCourse`
- 后续治疗安排 → `followupPlan`
- 母亲姓名、电话、身份证 → 自动拆分为 `motherName` / `motherPhone` / `motherIdCard`
- 其他监护人 → `otherGuardians`（原样字符串）
- 家庭经济 → `familyEconomy`（原样字符串）
- 入住人 → `admitPersons`（Tenancies.extra 中保存）

> 额外字段会进入 `extra.*` 便于追溯；日期统一转 `YYYY-MM-DD`。

## 5. 设计令牌构建

本项目支持构建期令牌注入，将 `docs/uiux/design-system/tokens.md` 的设计配置注入到 WXSS 中：

```bash
# 构建设计令牌
pnpm run build:tokens
```

**特性**：
- 自动从 tokens.md 解析颜色、尺寸、阴影等令牌
- 验证关键令牌存在性，防止配置错误
- 失败时自动恢复备份文件
- 生成的 `miniprogram/styles/tokens.wxss` 保持向后兼容

**注意事项**：
- 修改 `tokens.md` 后需重新运行构建命令
- 构建失败时会自动恢复原始文件
- 关键令牌缺失会阻止构建并报错

## 6. 小程序运行
导入 `miniprogram/` 到微信开发者工具，首页"加载列表"调用 `patients.list`。
