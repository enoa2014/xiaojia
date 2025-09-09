# QA Report: Chart 容器交互增强（Story 7.16）

## 概览
- 目标：验证 chart-container 的时间范围切换、维度筛选、占位/骨架与 mock 交互
- 结论：CONCERNS（存在 1 个必须修复项 + 2 个改进项）

## 执行环境
- WeChat DevTools（本地）
- 代码版本：当前工作副本（2025-09-09）

## 验收对应用例
- AC-1：
  - 时间范围切换：通过（7d/30d/90d/custom 交互与事件触发正常）
  - 维度筛选：未通过（picker 变更未正确映射选项值，筛选条件未更新）
- AC-2：空/错/加载占位：基本通过（error/empty 正常；skeleton 使用 type=chart 当前未呈现）
- AC-3：mock：通过（normal/empty/error/loading 场景可切换）

## 发现与建议
1) 维度筛选值映射（Must Fix）
- 现象：`onFilterChange` 使用 `dataset.value`，而 `picker` 的 `bindchange` 返回 `e.detail.value`（索引）。
- 影响：筛选条件未被设置，`filterChange` 事件传出的 `filters` 为空或错误。
- 建议修复：在 `onFilterChange` 中读取 `const idx = e.detail.value; const key = e.currentTarget.dataset.key; const opt = (this.data.filterOptions||[]).find(f=>f.key===key); const val = opt?.options[idx]?.value || '';` 然后更新 `currentFilters[key]=val` 并触发事件。

2) 骨架 `type=chart`（Should Improve）
- 现象：`loading-skeleton` 未实现 `chart` 模板，加载时不显示骨架。
- 建议：改用 `type=custom` + 自定义骨架，或为 skeleton 组件新增 `chart` 模板。

3) A11y（Should Improve）
- 时间范围按钮：为选中项添加 `aria-pressed=true`，或改用 `role=tablist/tab` 结构。
- 筛选区：为容器与每组 filter 增加 `aria-label` 描述。

4) 色板（Advisory）
- mock 数据颜色使用 HEX；后续建议改为 tokens 或样式变量，便于主题联动。

## 结论
- Gate: CONCERNS（合规上线需先修复筛选值映射问题；其余为非阻断改进项）

