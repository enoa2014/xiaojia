# 数据初始化方案：从入住登记表（prepare/b.xlsx）导入

本方案用于将原始入住登记表（每行=一次入住记录，缺退住时间；同一患者可能多次入住）初始化到云开发数据库的 Patients 与 Tenancies 两个集合。该文档仅描述流程与规则，不涉及编码实现。

## 目标与范围
- 目标：
  - 为每个唯一患者建立一条 Patients 记录（身份证去重）。
  - 为每条入住记录建立一条 Tenancies 记录（可多条/人）。
  - 为后续功能（权限、统计、导出）提供规范化数据基础。
- 范围：首次初始化；不包含退住补录与后续纠错（另行计划）。

## 源数据与字段映射（b.xlsx → DB）
- 文件：`prepare/b.xlsx`，读取第一个工作表。
- 字段映射（列名 → 集合.字段）：
  - 姓名 → Patients.name
  - 身份证号 → Patients.id_card（唯一）、Patients.id_card_tail（末4位，便于搜索）
  - 入住时间 → Tenancies.checkInDate（ISO 日期，YYYY-MM-DD）
  - 出生日期 → Patients.birthDate（ISO 日期）
  - 性别 → Patients.gender
  - 籍贯 → Patients.nativePlace
  - 民族 → Patients.ethnicity
  - 就诊医院 → Patients.hospital
  - 医院诊断 → Patients.hospitalDiagnosis
  - 医生姓名 → Patients.doctorName
  - 症状详情 → Patients.symptoms
  - 医疗过程 → Patients.medicalCourse
  - 后续治疗安排 → Patients.followupPlan
  - 母亲姓名、电话、身份证 → 解析为 Patients.motherName / motherPhone / motherIdCard
  - 其他监护人 → Patients.otherGuardians
  - 家庭经济 → Patients.familyEconomy
  - 入住人 → Tenancies.extra.admitPersons（保留原文）
- Tenancies 其它字段：`checkOutDate=null`、`room=null`、`bed=null`、`subsidy=null`、`createdAt=now()`。

## 标准化与清洗规则
- 空白与分隔：去首尾空格；中文/英文逗号、顿号、多个空白统一为单空格。
- 日期：支持 Excel 日期序列与文本日期，统一转 ISO `YYYY-MM-DD`。无法解析则置 `null` 并计入报表。
- 手机号：从“母亲姓名、电话、身份证”中提取中国大陆手机号 `^1[3-9]\d{9}$`。
- 身份证：从同字段提取 18 位身份证（末位 X 允许大小写）。
- 性别/枚举：保持原值，后续在前端/清洗时做映射（可选：`男/女 -> male/female`）。
- 脱敏辅助：同时生成 `id_card_tail`（末4位），便于脱敏检索。

## 去重与关联策略
- 患者唯一键：`id_card`。
  - 若 `id_card` 存在：按身份证进行 upsert（存在则跳过创建）。
  - 若 `id_card` 为空：视为“无证档案”，按以下策略处理：
    - 初始建议：不自动合并，按行生成患者（避免误并）。
    - 可选合并条件（需人工确认后启用）：`name + birthDate + motherPhone` 完全一致时合并。
- 入住记录关联：
  - 当 `id_card` 存在：先（或同时）创建/获取 Patients，再创建 Tenancies，写入 `patientId` 与 `id_card`。
  - 当 `id_card` 缺失：Tenancies 暂存 `patientKey`（如 `name` 或本行生成的临时 patientId），后续通过人工确认或规则回填 `patientId`。

## 索引与约束（与 indexes.schema.json、数据字典一致）
- Patients
  - 唯一索引：`id_card`（导入前建议先检查重复，导入时跳过重复创建）。
  - 查询索引：`name + id_card_tail`、`createdAt(desc)`（可选）。
- Tenancies
  - 查询索引：`patientId + checkInDate(desc)`、`id_card + checkInDate(desc)`。
  - 冲突检测（后续迭代）：`room+bed+checkInDate` 组合索引。

## 导入步骤（两种方式二选一）
- 方式 A：云函数导入（推荐，已具雏形）
  1) 使用微信开发者工具/COS 上传 `prepare/b.xlsx`。
  2) 调用云函数 `import-xlsx`，`action='fromCos'`，传入 `fileID`。
  3) 函数按上述映射与规则处理，返回统计：导入的 Patients / Tenancies 数量与行数。
- 方式 B：本地脚本 + JSONL 导入
  1) 将 `b.xlsx` 转换为 `patients.jsonl` 与 `tenancies.jsonl`（各行一 JSON 记录，字段同上）。
  2) 先导入 Patients，再导入 Tenancies：`tcb database import --env <ENV> --collection <name> --file <path>`。
  3) 若 Tenancies 中仅存有 `id_card`/`patientKey`，导入后执行“回填 patientId”脚本：
     - 用 `id_card` 连接 Patients，写回 `patientId`；
     - 统计未匹配项目，进入人工复核清单。

## 质量校验与对账
- 计数对齐：`b.xlsx` 有效行数 ≈ `Tenancies.count()`（允许空行/异常行差异）。
- 患者去重：按 `id_card` 去重后的数量 ≈ `Patients.count()`（无证档案除外）。
- 随机抽样：抽取 ≥30 条比对字段是否准确（日期、母亲信息解析）。
- 空值与异常：
  - `checkInDate` 为空的入住记录数量；
  - 无 `id_card` 的患者数量；
  - 日期解析失败数量。
- 关联合法性：`Tenancies.patientId` 为空的记录清单（需人工处理）。

## 审计与安全
- 审计：记录导入批次、操作者、时间、文件 `fileID` 与统计结果到 `AuditLogs`。
- 脱敏：前端默认按《字段级脱敏矩阵》进行遮蔽，身份证与电话不在无权限角色明文展示。

## 变更与回滚
- 变更：任何映射或规则调整需更新本方案与《数据字典》《校验规则》。
- 回滚：保留导入前数据库快照（或按导入批次标签可删除本批次写入）。

## 待确认事项（建议评审）
1) “无证档案”的合并条件是否启用（`name + birthDate + motherPhone`）。
2) 性别/民族等枚举值是否标准化为固定字典（影响前端展示）。
3) `Tenancies.patientId` 的回填策略（导入时实时回填 vs 导入后批处理）。
4) 是否需要从“母亲姓名、电话、身份证”之外解析父亲/监护人信息（若存在）。

## 附：导入逻辑伪代码（仅示意）
```
for row in rows:
  patientId = ensurePatient(row)
  createTenancy(patientId, row)

ensurePatient(row):
  if row.id_card:
    p = Patients.findOne({ id_card: row.id_card })
    if !p: p = Patients.insert({ ...mappedPatientFields(row), id_card_tail: tail4(row.id_card), createdAt: now })
    return p._id
  else:
    // 无证档案：是否启用合并规则待确认
    p = Patients.insert({ ...mappedPatientFields(row), createdAt: now })
    return p._id
```

— 以上方案与现有仓库中的 `import-xlsx` 函数映射保持一致，可作为后续实现参考基础。
