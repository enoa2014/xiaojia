# Test Plan: RoleBadge 组件（Story 7.4）

目标：验证 RoleBadge 组件满足故事验收标准、设计系统规范与集成稳定性，覆盖功能、视觉、可访问性、健壮性与性能。

## 范围
- 组件：`miniprogram/components/role-badge/*`
- 使用点：`pages/index`、`pages/stats`、`pages/role-badge-demo`（QA 专用）
- 设计文档：`docs/stories/7.4.component-role-badge.md`、`docs/uiux/design-system/components.md`

## 验收回归（AC 对应用例）
1) 组件与属性
- [ ] RoleBadge 支持 `roleKey`、`size(sm|md)`、`text?`
- [ ] 颜色与尺寸使用 tokens，`--role-*`、`--font-*`、`--space-*`、`--radius-*`

2) 页面替换
- [ ] 首页/工作台展示正常，无样式串扰
- [ ] 统计页展示正常，无样式串扰

3) A11y
- [ ] `role="badge"` 存在，`aria-label` 语义正确并随 `text` 变化
- [ ] 文本对比度≥4.5:1（白字 on 角色背景）
- [ ] 触达区域：md 高度≥88rpx；若作为点击容器，外围点击区≥88rpx

4) 文档
- [ ] `docs/uiux/design-system/components.md` 含属性/尺寸/状态/示例

## 功能用例
- [ ] 基本：`admin|social|volunteer|parent` 各角色展示默认文案
- [ ] 尺寸：`sm` 与 `md` 样式差异正确
- [ ] 文案覆盖：传入 `text` 时覆盖默认文案，aria-label 随之更新
- [ ] 无效值兜底：`roleKey=''|'unknown'|null|undefined` 显示兜底配置（不崩溃）
- [ ] 动态变更：`roleKey` 或 `text` 变更后 UI 和 aria 同步更新
- [ ] 别名支持：`social_worker` 等价于 `social`（兼容现有页面）

## 视觉与样式
- [ ] 角色色映射：背景为 `--role-<key>`，文本为 `--text-on-primary`
- [ ] 尺寸规格：`sm` 高度约 60rpx，`md` 高度约 88rpx，内边距符合 tokens
- [ ] 文本溢出：长文案不溢出容器，不影响布局（nowrap 可接受）
- [ ] 状态反馈：按压态有细微反馈（缩放/透明度）

## 可访问性与国际化
- [ ] 屏幕阅读：朗读内容为“<默认角色> 角色徽章: <text?>”
- [ ] 焦点顺序：不抢占交互组件焦点（非可点击组件）
- [ ] 本地化：中文为主；英文/多语言未来拓展不阻塞（无硬编码阻碍）

## 集成与主题
- [ ] `pages/index` 与 `pages/stats` 中组件注册路径正确
- [ ] 与 `services/theme.applyThemeByRole` 并存时无冲突
- [ ] 在不同主题色导航栏下可见性良好

## 性能与稳定性
- [ ] 列表大量渲染（>50 个）无明显卡顿
- [ ] 属性频繁变更不引发 setData 报错

## QA 执行步骤（建议）
1. 在微信开发者工具打开 `miniprogram/` 项目
2. 浏览 `pages/role-badge-demo/index` 页面，逐项核对：
   - 默认/小尺寸/别名与异常/长文本四组
3. 浏览首页与统计页，确认替换点渲染正常
4. 结合无障碍检查：选择高对比度模拟器主题，人工确认文本对比
5. 列表压力：将 demo 中任一 row 克隆 20 次，观察流畅度

## 预期问题与处置
- 角色键不一致（social vs social_worker）→ 组件侧归一化兼容
- `sm` 高度 < 88rpx：若作为点击区，外层容器需保证触达尺寸

## 出口标准（Pass 条件）
- 所有 AC 通过，功能/视觉/可访问性/集成项无阻断问题
- 已记录兼容性与使用注意事项

