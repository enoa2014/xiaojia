# Story: EP-01-S4 患者列表页改造（P0：真实筛选与项内容）
Status: Draft

## Story
- As: 社工/管理员
- I want: 在患者列表页按“在住/历史”等真实状态筛选，并看到与住宿相关的关键信息（楼栋·床位/入住天数/诊断标签）
- So that: 快速定位在住患者与重点对象，提高现场管理与沟通效率

## Design & Specs
- 设计：docs/uiux/xiaojia_patient_design_doc.html（档案列表页章节）
- 实施方案：docs/specs/patients-list-implementation-plan.md（P0 范围）

## Scope
- In:
  - 顶部筛选 Tabs 生效：all/inhouse/history → `filter.status`（all 不传）
  - 列表项字段对齐：
    - meta 行：`{building}号楼{room}-{bed} · 入住{daysInResidence}天`（无数据则“—”）
    - 标签：`diagnosisTags[]`
  - 优先关注置顶区（本地星标）
  - 分页/上拉加载/搜索防抖（延续既有实现）
  - 基础埋点（view/filter/star/item）
- Out:
  - 楼栋分组段头与计数（见 EP-01-S5）
  - 统计概览扩展与更多快速操作（见 EP-01-S5）

## Acceptance Criteria
- AC1 在住筛选
  - Given Tab=在住
  - When 加载列表
  - Then 仅返回最近入住记录未退住的患者项
- AC2 历史筛选
  - Given Tab=历史
  - When 加载列表
  - Then 返回最近入住记录已退住或无入住记录的患者项
- AC3 列表项字段
  - Given 任一患者项
  - When 渲染
  - Then meta 行显示“{楼栋}{房间}-{床位} · 入住{N}天”；若缺失最近入住信息则显示“—”
- AC4 优先关注置顶
  - Given 用户已为若干患者标星
  - When 渲染列表
  - Then 显示“⭐ 优先关注 (N)”组头并置顶这些患者项
- AC5 性能
  - When 连续分页加载
  - Then P95 列表加载 ≤ 1.5s；滚动体验流畅，无明显卡顿
- AC6 埋点
  - When 首次进入/切换筛选/点击项/切换星标
  - Then `patients_list_view`/`patients_filter_change`/`patient_item_click`/`patient_star_toggle` 事件产生一次、参数完整

## UI/UX
- 页面：`miniprogram/pages/patients/index`
- Tabs：全部/在住/历史（“即将出院”暂隐藏）
- 列表项：卡片化，头像、姓名+年龄、meta（楼栋·床位/入住天数）、标签、星标、操作区（查看档案/入住管理/服务记录——权限视角色控制）

## API & Contract
- `patients.list({ page,pageSize, filter:{ name?, id_card_tail?, createdFrom?, createdTo?, status? }, sort?, include:['lastTenancy','tags'] })`
  - out: `{ items: PatientListItem[], meta:{ total, hasMore } }`
  - `PatientListItem` 增补：`lastTenancy`、`inResidence`、`daysInResidence`、`diagnosisTags`（详见实施方案）
- 非功能：参数校验失败 → `E_VALIDATE`；其它异常 → `E_INTERNAL`

## Data
- Patients：基本信息/创建时间/脱敏字段
- Tenancies：用于最近入住摘要（checkInDate / checkOutDate / room / bed）

## Tasks
- FE：
  - [ ] 将 Tab → `filter.status` 映射（all/inhouse/history）
  - [ ] 渲染 meta 行（楼栋·床位/入住天数）与 `diagnosisTags`；缺失显示“—”
  - [ ] 优先关注置顶分组（使用现有本地星标）
  - [ ] 埋点：view/filter/star/item
- BE：
  - [ ] `patients.list` 支持 `include=['lastTenancy','tags']` 与 `filter.status`
  - [ ] 返回 `inResidence/daysInResidence/diagnosisTags`
  - [ ] 校验与索引核验（见方案）
- QA：
  - [ ] 过滤正确性（inhouse/history）
  - [ ] 字段兜底展示
  - [ ] 分页性能与错误码
  - [ ] 埋点唯一性与参数完整性

## DoR
- [x] 设计稿已对齐；
- [x] 实施方案（P0）明确；
- [x] 契约草案准备好，风险可控；

## DoD
- [ ] AC 全通过；
- [ ] 文档/契约/测试计划同步；
- [ ] 性能达标；

---

## Dev Notes
- 若 BE 暂未提供 `include`，FE 以“—”兜底 meta 行并隐藏状态筛选以免误导。

