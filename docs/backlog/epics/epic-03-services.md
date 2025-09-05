# EP-03 家庭服务记录

## 目标
- 支持志愿者提交探访/心理/物资/转介/随访等服务记录，社工审核流转，保障记录可追溯。

## 业务价值（KPI）
- 提交成功率 ≥ 99%；审核平均时长 ≤ 2 天；驳回率可视化。

## 范围
- In: 记录创建（patientId、type、date、desc、images?）；审核（review→approved/rejected，驳回需 reason）；列表/详情；图片上传。
- Out: 多媒体批量上传与处理流水线；复杂统计维度（交由统计 Epic）。

## 关键用户故事（示例）
- 志愿者可提交一条探访记录（含图片），重复提交用 clientToken 幂等去重。
- 社工可审核记录，将状态设为 approved/rejected（驳回需填写理由）。
- 管理员/社工可按患者或日期筛选服务记录。

## 验收标准（Epic 级）
- 创建：zod 校验必填，图片类型/大小校验；返回 {ok}；重复 clientToken 需返回同一结果。
- 审核：状态机受控（仅 review→approved/rejected），并写 AuditLogs。
- 列表：支持 patientId、createdBy、type、status 等筛选；分页稳定。

## API 契约影响
- services.list / get / create / review（见 docs/api/contracts.md）。

## 数据模型与索引
- Services：createdBy+date(desc)，patientId+date(desc)，status。

## 权限与安全
- 志愿者仅可查看本人提交记录；管理员/社工可查全部；敏感描述可按角色遮蔽。

## 依赖与顺序
- 依赖：EP-01 患者档案；EP-06 审计与权限过滤；上传封装。

## 风险与假设
- 图片体积与数量导致上传失败率上升；弱网下重试策略需明确。

## 里程碑
- MVP：创建/审核/查询；
- Next：草稿箱、批量上传、模板化表单。

## 指标
- 每日创建数；审核 Throughput；驳回原因分布。

## 变更记录
- v0.1 初始化。
