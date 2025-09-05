# EP-02 入住/退住管理

## 目标
- 记录每次入住/退住，支持房间/床位/补助信息，便于后续统计与冲突检查。

## 业务价值（KPI）
- 入住记录完整率 ≥ 98%；冲突（同日同床位）漏判率 < 1%。

## 范围
- In: 入住创建（checkInDate、room、bed、subsidy、extra.admitPersons）；退住登记（checkOutDate）；按 patientId 归档查询与排序；列表/详情。
- Out: 实时床位占用看板（后续）；跨院区调度；复杂冲突自动解决。

## 关键用户故事（示例）
- 作为社工，我可以为患者新增一次入住记录，系统校验必填并可记录补助金额。
- 作为管理员，我可以为未退住的入住记录补录退住时间。
- 作为社工，我可以按患者/日期查看其入住历史。

## 验收标准（Epic 级）
- 入住创建：必填校验、与 Patients 关联（尽量回填 patientId）；可缺 room/bed；记录 createdAt。
- 退住：checkOutDate 可为空；补录不影响历史统计的一致性。
- 冲突：保留同日同床位冲突检测入口（后续开启）。

## API 契约影响
- tenancies.list / get / create / update（见 docs/api/contracts.md）。

## 数据模型与索引
- Tenancies：patientId+checkInDate(desc)；room+bed+checkInDate（后续）。

## 权限与安全
- 查看权限随角色而定，敏感字段（补助）可做字段级过滤。

## 依赖与顺序
- 依赖：EP-01 患者档案（patientId 关联）；EP-06 字段过滤。

## 风险与假设
- 历史数据可能缺失退住日期；同名无身份证的关联需人工确认。

## 里程碑
- MVP：入住创建/查询，退住登记。
- Next：床位冲突检测、占用看板。

## 指标
- 新增入住数/日；未退住占比；同日同床位冲突率。

## 变更记录
- v0.1 初始化。
