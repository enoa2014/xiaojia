// 轻量埋点封装：优先使用 wx.reportAnalytics，降级 console
export const track = (event, props = {}) => {
  try {
    // 微信小程序内置埋点（需在后台配置事件ID），此处直接透传字段
    if (typeof wx !== 'undefined' && typeof wx.reportAnalytics === 'function') {
      // 注意：reportAnalytics 的第二个参数需为扁平对象且键名需配置
      wx.reportAnalytics(event, props)
    } else if (typeof console !== 'undefined') {
      console.info('[analytics]', event, props)
    }
  } catch (e) {
    try { console.debug && console.debug('[analytics:error]', e) } catch {}
  }
}

