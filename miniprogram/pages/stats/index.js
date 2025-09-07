import { api, mapError, genRequestId } from '../../services/api'
import { track } from '../../services/analytics'

Page({
  data: { ready: true, loading: false, month: '', items: [], error: '', role: null },
  onShow(){
    try { const tb = this.getTabBar && this.getTabBar(); if (tb && tb.setActiveByRoute) tb.setActiveByRoute('/pages/stats/index') } catch(_) {}
    this.syncRoleToTabbar()
    this.initMonth()
    this.load()
  },
  async syncRoleToTabbar(){
    try { const prof = await require('../../services/api').api.users.getProfile(); const tb = this.getTabBar && this.getTabBar(); if (tb && tb.setRole) tb.setRole(prof.role || 'social_worker'); this.setData({ role: prof.role || null }) } catch(_) {}
  },
  initMonth(){
    const d = new Date()
    const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    this.setData({ month: m })
  },
  async load(){
    this.setData({ loading: true, error: '' })
    const started = Date.now()
    const reqId = genRequestId('stats')
    try {
      const items = await api.stats.monthly('services', this.data.month)
      const arr = (items && items.items) ? items.items : (Array.isArray(items) ? items : [])
      // 计算趋势摘要
      let total = 0, maxV = -1, minV = Number.MAX_SAFE_INTEGER
      let maxD = '', minD = ''
      for (const it of arr) {
        const v = Number(it && it.value || 0)
        total += v
        if (v > maxV) { maxV = v; maxD = it.date }
        if (v < minV) { minV = v; minD = it.date }
      }
      const avg = arr.length ? Math.round((total / arr.length) * 100) / 100 : 0
      this.setData({ items: arr, total, avg, maxValue: maxV < 0 ? 0 : maxV, maxDate: maxD, minValue: minV === Number.MAX_SAFE_INTEGER ? 0 : minV, minDate: minD })
      // 埋点
      try { track('stats_view_monthly', { requestId: reqId, scope: 'services', month: this.data.month, duration: Date.now() - started }) } catch(_){ }
    } catch(e){
      const code = e.code || 'E_INTERNAL'
      this.setData({ error: mapError(code) })
      try { track('stats_view_monthly', { requestId: reqId, scope: 'services', month: this.data.month, duration: Date.now() - started, code }) } catch(_){ }
    } finally {
      this.setData({ loading: false })
    }
  }
})
