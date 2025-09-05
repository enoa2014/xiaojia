
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

## 5. 小程序运行
导入 `miniprogram/` 到微信开发者工具，首页“加载列表”调用 `patients.list`。
