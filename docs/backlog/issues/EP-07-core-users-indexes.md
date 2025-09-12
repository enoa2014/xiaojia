Title: chore(db): EP-07 Users 集合字段与索引同步
Labels: db, auth, P1

Summary:
为 `Users` 集合增加/确认字段（status/role/roles/name/phone/id_card/relative/createdAt/updatedAt）与索引（openId|_id 唯一、status、role、createdAt）。

Acceptance:
- 索引生效；必要字段具备；迁移脚本（如需）完成。

Tasks:
- [ ] 字段对齐与数据字典更新
- [ ] 索引创建/确认
- [ ] 迁移脚本与回滚策略

Links:
- Epic: docs/backlog/epics/epic-07-auth-and-accounts.md
