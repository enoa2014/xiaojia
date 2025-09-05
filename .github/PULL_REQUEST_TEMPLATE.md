# PR 标题（Conventional Commits）
# 例如：feat(patients): 支持创建与编辑

## 变更说明
- 背景/动机：
- 主要改动点：
- 不在范围（Out of Scope）：

## 相关需求 / Issue
- Closes #
- 链接：

## 变更类型
- [ ] feat 新功能
- [ ] fix 缺陷修复
- [ ] docs 文档变更
- [ ] refactor 重构（无行为变化）
- [ ] test 测试相关
- [ ] chore 构建/脚本/杂项

## 影响范围
- [ ] 云函数（functions/*）
- [ ] 小程序前端（miniprogram/*）
- [ ] 文档（docs/*）
- [ ] 配置/脚本/部署

## 风险与兼容性
- [ ] 数据结构变更（需迁移/索引变更）
- [ ] 重要接口改动（需版本公告/灰度）
- 回滚方案：

## 测试与验证
- 覆盖用例：
- 手动验证步骤：
- 截图/录屏（可选）：

## 文档与契约（必选项，按需勾选）
- [ ] PRD：docs/prd.md 已更新（如涉及需求变更）
- [ ] API 契约：docs/api/contracts.md 同步入参与出参/错误码
- [ ] 错误码：docs/api/error-codes.md 同步新增/调整
- [ ] 数据字典：docs/data/data-dictionary.md 同步字段/索引；必要时更新 indexes.schema.json
- [ ] 脱敏矩阵：docs/data/field-masking-matrix.md 同步可见性/审批
- [ ] 校验规则：docs/specs/validation-rules.md 同步字段与业务校验
- [ ] 文档索引：docs/docs-index.md 已同步收录/责任人

## 质量门禁
- [ ] 我已阅读并遵循工程规范：docs/process/engineering-guidelines.md
- [ ] 本分支通过本地/CI 构建与测试
- [ ] 评审所需上下文已提供（设计/链接/接口示例）

## 其他备注
- 部署注意事项：
- 影响评估：

---
小贴士：若为接口改动，请在描述中附上调用示例与预期响应；若影响导入流程，请参考 docs/data/init-from-b-reg.md。
