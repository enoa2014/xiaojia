# 测试计划：前端埋点接入与校验（Analytics）

## 目标
验证统计与导出等关键事件的埋点上报已接入，属性完整且与契约一致；在未开启自定义分析时退化为控制台日志。

## 范围
- miniprogram/services/analytics.js（事件映射）
- pages/stats/index（stats_view 与维度/范围变更）
- pages/exports/index（export_create_* 系列）

## 事件清单
- stats
  - `stats_view`：{ requestId, scope, dimension, month?, year?, duration }
  - `stats_dimension_change`：{ dimension, timeDim }
  - `stats_scope_change`：{ scope }
  - `stats_month_change`：{ month }
  - `stats_year_change`：{ year }
- exports
  - `export_create_submit`：{ requestId, month? }
  - `export_create_result`：{ requestId, duration, code: 'OK'|'ERR' }

## 用例
1. 统计页加载
   - 打开统计页 → 成功加载数据
   - 期望：上报 `stats_view`（包含 scope/month 或 year）
2. 维度切换
   - 切换到“本年/本月/今天/本周”
   - 期望：上报 `stats_dimension_change`（dimension 与 timeDim）
3. 范围切换
   - 切换 scope（服务/活动/档案）
   - 期望：上报 `stats_scope_change`（scope）
4. 时间选择器
   - 修改 month/year
   - 期望：分别上报 `stats_month_change` 与 `stats_year_change`
5. 导出创建
   - 选择模板（stats-monthly），点击创建导出
   - 期望：先上报 `export_create_submit`，完成后上报 `export_create_result`（code=OK/ERR）

## 采样校验
- 采样 10 次页面加载，统计 `stats_view` 的必填属性命中率 ≥ 100%
- 错误路径：模拟后端返回 `E_PERM|E_INTERNAL`，检查 `export_create_result.code=ERR`

## 通过标准
- 事件均可上报且属性完整
- 控制台降级打印 `[analytics]` 与 `[analytics:canonical]` 日志可见

