# 患者列表页改造实施方案（前端任务拆解 + 后端接口补充）

## 1. 范围与目标
- 页面：小程序患者列表页（miniprogram/pages/patients/index）
- 目标：对齐《docs/uiux/xiaojia_patient_design_doc.html》详细设计，实现分组展示、真实筛选、项内容字段一致、角色/权限可见性、统计概览与基础埋点，同时兼顾性能与可维护性。

## 2. 参考文档
- 设计：docs/uiux/xiaojia_patient_design_doc.html（档案列表页章节）
- 契约：docs/api/contracts.md
- 数据字典：docs/data/data-dictionary.md
- 架构：docs/architecture/*.md

## 3. 当前差距（摘要）
- 分组缺失：仅有“优先关注”Banner（本地星标），没有“当前在住（按楼栋）/历史档案”分组与计数。
- 筛选不生效：存在“在住/即将出院/历史”Tabs，但未落地真实过滤（TODO 占位）。
- 列表项字段不一致：设计要求“楼栋+床位/入住天数/诊断标签”；当前展示“籍贯+最近入住”。
- 快速操作与权限：缺“申请详情/联系家属/编辑信息”入口，未按角色/权限隐藏或禁用。
- 统计概览不足：仅总数，缺在住/本月新增/待完善等。
- 后端不足：`patients.list` 未返回最近入住摘要，无法驱动在住与楼栋分组。

## 4. 实施分期
- P0（本迭代必须）：
  - 后端：增强 `patients.list` 返回最近入住摘要；支持按状态过滤（在住/历史）。
  - 前端：筛选 Tabs 真正生效；列表项改为“楼栋·床位 / 入住天数 / 诊断标签”；星标置顶；基础埋点。
- P1（次优先）：
  - 后端：提供按楼栋分组计数接口（或 list 聚合可选段）。
  - 前端：分组渲染（优先关注/当前在住（按楼栋分段）/历史档案）；统计概览卡扩展；新增“申请详情/联系家属/编辑信息”。
- P2（体验/性能）：
  - 头像渐变底、视觉细节优化；骨架屏；（可选）虚拟列表/图片懒加载。

## 5. 后端接口补充建议（详细）

### 5.1 patients.list 增强（推荐实现）
- 入参（payload）：
  - `page?: number>=1`
  - `pageSize?: number<=100`
  - `filter?: { name?: string; id_card_tail?: string; createdFrom?: number; createdTo?: number; status?: 'inhouse'|'history'; building?: string }`
  - `sort?: { createdAt?: 1|-1 }`
  - `include?: ('lastTenancy'|'tags'|'meta')[]`（可选功能开关）
- 出参（data）：
  - `{ items: PatientListItem[], meta: { total: number; hasMore: boolean } }`
  - `PatientListItem` 字段建议：
    - `_id: string; name: string; id_card_tail?: string; createdAt: number`
    - `lastTenancy?: { checkInDate?: string; checkOutDate?: string; room?: string; bed?: string }`
    - `inResidence?: boolean`（lastTenancy 存在且无 checkOutDate）
    - `daysInResidence?: number`（如 inResidence=true，计算：today - checkInDate）
    - `diagnosisTags?: string[]`（从患者病情/级别派生的简短标签）
- 过滤逻辑：
  - `status='inhouse'`：存在最近未退住记录
  - `status='history'`：最近记录已退住或无记录
  - `building='3号楼'`：基于 `lastTenancy.room` 前缀/约定切分（后续可将 building 标准化字段持久化）
- 脱敏与权限：
  - 列表返回仅非敏感字段；敏感字段（如身份证明文）不在列表接口返回；
  - 不影响详情页的审批窗口机制。
- 验证（zod）：
  - `include` 值枚举校验；`status` 枚举；`building` 文本长度限制（≤20）。
- 索引建议：
  - `Patients.createdAt` 倒序、`name+id_card_tail` 组合；
  - `Tenancies.patientId+checkInDate(desc)`；如后续用 building，建议持久化 building 字段并加索引。

### 5.2 新增 patients.groupCounts（P1）
- 用途：驱动“当前在住（按楼栋分段）”分组头信息与计数。
- 入参：`{ scope?: 'inhouse'|'history'|'all' }`（默认 inhouse）
- 出参：`{ ok:true, data: { items: Array<{ building: string; count: number }> } }`
- 行为：
  - 从 `Tenancies` 聚合当前未退住记录，根据 `room` 前缀/映射得到 `building`，统计计数；
  - 建议在后端配置映射表（如“1号楼/2号楼/3号楼”前缀规则）。

### 5.3 （可选）patients.star.set / patients.star.unset（P1-P2）
- 若希望星标跨端共享，可将星标存于 `Stars` 集合（userId+patientId 唯一）。
- 当前实现为本地缓存，先维持现状以降复杂度。

## 6. 前端实现方案（详细）

### 6.1 数据与请求
- 请求 `patients.list` 时传 `include=['lastTenancy','tags']`；
- Filter 映射：
  - 顶部 Tabs → `filter.status`（all 不传；inhouse/history）
  - 日期区间 → `createdFrom/createdTo`（整天处理：toDate + 23:59:59.999）
  - 关键词 → `name`（前缀）或 `id_card_tail`（尾4位）
- 分组数据（P1）：
  - 调用 `patients.groupCounts({ scope:'inhouse' })` 获取楼栋段头部计数；
  - 前端将 items 以 `item.lastTenancy.room` 前缀归类（无则归为“未分组”）。

### 6.2 列表项字段映射
- 名称行：`name (脱敏不在列表展示；可加年龄文本)`
- 元信息行（meta）：
  - 优先显示：`{building}号楼{room}-{bed} · 入住{daysInResidence}天`；
  - 兜底：`—`（无最近入住信息）
- 标签：`diagnosisTags[]`（如“骨肉瘤/新入住”等）
- 星标：右上角按钮；置顶逻辑：星标项优先渲染在“优先关注组”。

### 6.3 分组渲染（P1）
- 分组顺序：
  1) ⭐ 优先关注（本地星标或服务端 Stars）
  2) 🏠 当前在住（按楼栋分段；段头显示“X号楼 (N)”）
  3) 📚 历史档案（分页加载）
- 初期在住/历史可以通过两个请求或一次请求后前端再分组（考虑分页一致性，推荐直接请求 inhouse/history 两次分别渲染，或使用同接口不同过滤分页）。

### 6.4 筛选 Tabs 生效
- “全部”→不传 `status`
- “在住”→`status='inhouse'`
- “历史”→`status='history'`
- “即将出院”→（如后端暂不支持）先隐藏或与“在住”共用，后续按规则（预计退住 ≤ N 天）落地。

### 6.5 快速操作与权限
- 操作区按钮：
  - “查看档案”→ 跳详情
  - “申请详情”→ 跳 `/pages/permissions/apply?pid={id}`（仅社工/志愿者可见；家长隐藏）
  - “联系家属”→ 跳详情并定位到联系方式 Tab（或直接唤起电话，需权限）
  - “编辑信息”→ 跳 `/pages/patients/form?id={id}`（仅 admin/social_worker）
  - “入住管理”→ 跳 `/pages/tenancies/form?pid={id}`（仅 admin/social_worker）
- 角色可见性：
  - 获取 `users.getProfile()` 的 `role`；根据角色设置 `canEdit/canManage/canApply` 等布尔位，模板 `wx:if` 控制显示。

### 6.6 统计概览（P1）
- 卡片扩展：
  - 在住数（patients.groupCounts sum 或 stats 接口）
  - 本月新增档案数（`createdAt>=monthStart`）
  - 待完善（字段缺失占位，后续定义规则）
  - 总数（已有）

### 6.7 埋点（Analytics）
- `patients_list_view`：{ tabKey, keywordLen, count, duration }
- `patients_filter_change`：{ from, to, tab }
- `patient_star_toggle`：{ id, starred }
- `patient_apply_perm_click`：{ id }
- `patient_item_click`：{ id }

### 6.8 性能与体验
- 分页：20 条/页，滚动触底加载；
- 防抖：搜索 300ms；
- 骨架屏：顶部卡片 + 列表卡片占位（P2）；
- （可选）虚拟列表：数据量较大时引入；头像懒加载待头像落地后加入。

## 7. 接口示例（草案）

### 7.1 patients.list（GET via callFunction）
请求：
```
wx.cloud.callFunction({
  name: 'patients',
  data: { action: 'list', payload: {
    page: 1, pageSize: 20,
    filter: { name: '张', status: 'inhouse', createdFrom: 1725100800000, createdTo: 1727702399999 },
    include: ['lastTenancy','tags'], sort: { createdAt: -1 }
  } }
})
```
响应（data）：
```
{ items: [{
    _id: 'p1', name: '张三', id_card_tail: '1234', createdAt: 1727000000000,
    lastTenancy: { room: '3', bed: '208', checkInDate: '2025-09-01' },
    inResidence: true, daysInResidence: 3,
    diagnosisTags: ['骨肉瘤','新入住']
}], meta: { total: 42, hasMore: true } }
```

### 7.2 patients.groupCounts（P1）
请求：`{ scope: 'inhouse' }`
响应：`{ items: [ { building: '1', count: 12 }, { building: '2', count: 8 }, { building: '3', count: 15 } ] }`

## 8. 验收标准（DoD）
- 功能：
  - Tabs 切换驱动真实过滤；
  - 列表项字段按设计展示（楼栋·床位/入住天数/标签），无数据用“—”；
  - 优先关注组置顶显示；
  - 操作区按角色/权限展示；
  - 统计概览至少 2 项（总数+在住数）。
- 安全：列表仅返回非敏感字段；不泄露明文敏感信息；
- 性能：分页 20 条，P95 列表加载 ≤ 1.5s；
- 埋点：上述 5 个事件均上报成功；
- 文档：契约/数据字典/测试计划同步更新。

## 9. 任务拆解（前端）
- P0：
  - [ ] 将 Tabs -> `filter.status` 接线（all/inhouse/history）
  - [ ] 列表项 UI 改造：meta 显示楼栋·床位/入住天数；标签用 `diagnosisTags`
  - [ ] 星标置顶分组（组头 Banner）
  - [ ] 埋点（view/filter/star/item/apply）
- P1：
  - [ ] 分组渲染（在住按楼栋分段；历史分组）
  - [ ] 统计概览卡扩展（在住数/本月新增/待完善）
  - [ ] 快速操作：申请详情/联系家属/编辑信息（含角色可见性）
- P2：
  - [ ] 骨架屏；头像渐变底；标签配色规范化；（可选）虚拟列表

## 10. 任务拆解（后端）
- P0：
  - [ ] `patients.list` 增强：`include=['lastTenancy','tags']` 支持；`filter.status` 支持
  - [ ] 数据脱敏与校验：仅返回非敏感字段，zod 枚举与范围校验
  - [ ] 索引核验：`Patients.createdAt`、`name+id_card_tail`、`Tenancies.patientId+checkInDate`
- P1：
  - [ ] `patients.groupCounts(scope)` 实现；building 映射规则与示例
  - [ ] 扩展 stats 接口（如需要）：在住/本月新增计数

## 11. 风险与缓解
- Tenancy 信息缺失：无法展示楼栋/入住天数 → 兜底“—”，保留 UI 占位；
- Building 推导不稳定：短期前缀规则，长期落地 `building` 字段并迁移；
- 分页一致性：分组视图与分页冲突 → 先按过滤独立分页，分组仅用于段头展示。

## 12. 发布与回滚
- BE→FE 顺序发布；FE 在 `include` 不支持时采用兜底字段（不渲染在住/天数）；
- 出现性能回退时，降低 include 带宽、移除复杂分组。

## 13. 测试要点（补充到 test-plan）
- 过滤正确性：status=inhouse/history；日期边界；关键词前缀/尾4位；
- 项内容：无 tenancy 时的兜底展示；inResidence 与 daysInResidence 计算；
- 分组：楼栋计数总和 = 在住数量；星标置顶；
- 角色可见性：不同角色按钮显隐正确；
- 性能：分页加载/滚动触底；
- 埋点：事件参数完整且单次操作唯一记录。

