## 11. 验收清单（抽样）

### EP-04-S1 活动发布与列表
- 字段校验：title(2–40)/date(YYYY-MM-DD)/location(≤80)/capacity≥0/status∈open|ongoing|done|closed。
- 列表筛选：状态 Tab 正确生效；日期 `from/to` 过滤有效。
- 排序：默认 `date desc`；自定义排序参数可用（如按 `date`）。
- 空错态：空列表提示友好；网络/服务错误提示友好且可重试（下拉刷新）。
- 性能：列表加载 P95 ≤ 500ms（不含冷启动）；表单提交 ≤ 800ms。
- 索引：`status+date` 已创建并生效（采样校验查询计划）。
 - RBAC：仅管理员/社工可创建活动，非授权返回 `E_PERM`（前端提示明确）。

注：报名/取消/签到验证见 EP-04-S2。
