# 原始数据导入运行手册（Runbook）

本手册记录本次从原始 Excel（prepare/b.xlsx）导入至微信云开发数据库的完整流程、规则、产物与结果，便于复现与审计。

## 源数据与解析
- 源文件：`prepare/b.xlsx`
- 工作表：主数据位于 Sheet1；存在两行表头（第1行为分组标题，第2行为具体字段）。
- 表头合并策略：第二行优先，空则回退第一行（示例列：姓名、身份证号、出生日期、入住时间、家庭地址、父亲/母亲姓名电话身份证号等）。

## 患者合并与清洗规则
- 身份证优先：18 位格式与校验码通过视为有效，按身份证去重合并。
- 父母身份证误填识别：若“孩子身份证号”与父/母身份证完全一致，视为孩子身份证缺失（不据此分裂个体）。
- 轻微错填容错：当姓名/出生日期或父/母手机号匹配时，若两身份证哈明距离 ≤ 2，视为同一人合并到可信证号。
- 无身份证时的合并优先级：
  1) 姓名 + 出生日期 + 父/母手机号
  2) 姓名 + 出生日期
  3) 姓名
- 字段补全：在合并时回填缺失字段（地址、医院/诊断、父母信息等）。
- 空占位剔除：若 name 为空、且核心字段（身份证/出生/地址/父母信息等）均为空，则丢弃该记录，不再导出。

## 入住记录（Tenancies）
- 映射：
  - `id_card`: 来自行内身份证号（或通过父/母解析/规则回填后的人证号）；
  - `patientName`: 行内“姓名”；
  - `checkInDate`: 行内“入住时间”转 ISO（YYYY-MM-DD）；
  - `extra.admitPersons`: 行内“入住人”；
  - 其他字段初始化为 null（`checkOutDate/room/bed/subsidy`）。
- 去重键：`(id_card 或 patientName) + checkInDate + admitPersons`。

## 工具与产物
- 生成脚本：`scripts/export_jsonl.py`（Python 3）
  - 用法：`python3 scripts/export_jsonl.py prepare/b.xlsx output`
  - 产物：
    - `output/patients.json`（JSONL，每行一个患者）
    - `output/tenancies.json`（JSONL，每行一条入住记录）
- 本次产物统计：
  - Patients：69（合并后且剔除空占位）
  - Tenancies：243（去重后）

## 云数据库操作
- 环境：`ENV_ID=cloud1-3grb87gwaba26b64`
- 清空集合：批次删除（已实现于 `functions/init-db` 的 `action=wipe-some`），循环直至 `Patients=0` 且 `Tenancies=0`。
- 重建集合：`init-db` 幂等创建集合。
- 索引下发：`cloudbaserc.json`（CloudBase Framework）
  - Patients：`id_card` 唯一、`name + id_card_tail`、`createdAt`；
  - Tenancies：`id_card + checkInDate`、`patientId + checkInDate`、`createdAt`。

## 导入与关联
- 导入：在云开发控制台，选择“按行分隔的 JSON（JSONL）”导入：
  - Patients：`output/patients.json`
  - Tenancies：`output/tenancies.json`
- 关联回填：部署 `functions/relations`，`action=link-tenancies` 分批回填 `Tenancies.patientId`：
  - 规则：优先 `id_card` 精确匹配 → 回退 `patientName` 精确匹配；
  - 执行：按批（例：80 条/批，offset 0/80/160/...）调用直至 `total=0`。
- 最终计数（导入与关联后）：
  - Patients：69
  - Tenancies：243

## 代码与指引
- 清洗与导出脚本：`scripts/export_jsonl.py`
- 关系回填函数：`functions/relations`（`link-tenancies`）
- 集合初始化/清空：`functions/init-db`（`main` / `action=wipe-some`）
- 统计辅助：`functions/stats`（`action=counts`）
- 索引配置：根目录 `cloudbaserc.json` 与 `indexes.schema.json`

## 复现步骤（摘要）
1) 本地生成：`python3 scripts/export_jsonl.py prepare/b.xlsx output`
2) 清空集合（循环调用 `wipe-some` 至 0）：Patients、Tenancies
3) 重建集合 + 下发索引（CloudBase Framework）
4) 控制台导入 `output/patients.json`、`output/tenancies.json`
5) 分批回填：调用 `relations: link-tenancies`（batchSize/offset）
6) 校验统计：`stats: counts`，抽样核对 `Tenancies.patientId` ↔ `Patients._id`

## 变更记录
- v1.0 建立导入运行手册，记录合并/剔除规则与最终结果；添加回填与索引流程（2025-09-05）

