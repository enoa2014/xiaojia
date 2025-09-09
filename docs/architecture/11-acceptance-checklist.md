## 11. 验收清单（抽样）

### UI 组件库（抽样）
- RoleBadge（7.4）：
  - 属性：`roleKey|size(sm|md)|text?` 正确渲染；`social_worker` 别名兼容。
  - A11y：`role=badge`、`aria-label` 正确；md 触达≥88rpx（sm 展示型）。
  - 集成：首页/统计/档案详情替换无样式串扰。
- StatCard（7.5）：
  - 属性/状态：`value|label|icon|variant|loading|empty`；加载骨架/空占位符合规范。
  - 交互：loading/empty 禁止点击；normal 触发 `tap` 事件。
  - A11y：normal=`role=button`；loading/empty=`presentation`；`aria-label` 随状态变化。
- ActionCard（7.6）：
  - 属性/状态：`title|desc|icon|disabled|loading`；hover 仅在可点击态。
  - 交互：disabled/loading 禁止点击；`customData` 随事件传递。
  - A11y：`role=button`；`aria-disabled` 同步 disabled/loading；`aria-label` 动态生成。
- Empty/Error（7.7）：
  - EmptyState：`icon|title|description|action|secondary|variant|show`；`role=region`。
  - ErrorView：错误码映射与 CTA；`role=alert`；`retrying` 禁点且 `aria-disabled`。
 - Button（7.8）：
  - 变体/尺寸/状态：`primary|secondary|ghost|danger`；`sm|md`；`default|disabled|loading`。
  - 交互：`hover/active` 动效；loading 禁点与 Spinner 显示。
  - A11y：原生语义；`aria-disabled` 与禁用/加载一致；对比度达标。
 - FormField（7.9）：
  - 结构：Label + Control(slot) + Help + Error；状态 `default|focus|error|disabled`。
  - 文案：错误提示遵循 `validation-rules.md`；error 优先于 help。
  - A11y：容器 `aria-labelledby/aria-describedby`；Error `role=alert`、`aria-live=polite`。

### EP-04-S1 活动发布与列表
- 字段校验：title(2–40)/date(YYYY-MM-DD)/location(≤80)/capacity≥0/status∈open|ongoing|done|closed。
- 列表筛选：状态 Tab 正确生效；日期 `from/to` 过滤有效。
- 排序：默认 `date desc`；自定义排序参数可用（如按 `date`）。
- 空错态：空列表提示友好；网络/服务错误提示友好且可重试（下拉刷新）。
- 性能：列表加载 P95 ≤ 500ms（不含冷启动）；表单提交 ≤ 800ms。
- 索引：`status+date` 已创建并生效（采样校验查询计划）。
 - RBAC：仅管理员/社工可创建活动，非授权返回 `E_PERM`（前端提示明确）。

注：报名/取消/签到验证见 EP-04-S2。
