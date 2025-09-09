// 轻量埋点封装：优先使用 wx.reportAnalytics，降级 console
const toCanonical = (event, props = {}) => {
  const out = []
  try {
    switch (event) {
      case 'service_form_submit':
        out.push(['service_submit_click', {
          requestId: props.requestId,
          type: props.serviceType,
          imagesCount: props.attachmentCount,
          hasImages: props.hasAttachments
        }])
        break
      case 'service_form_submit_success':
        out.push(['service_submit_result', {
          requestId: props.requestId,
          duration: props.duration,
          code: 'OK'
        }])
        break
      case 'service_form_submit_error':
        out.push(['service_submit_result', {
          requestId: props.requestId,
          duration: props.duration,
          code: props.error || 'ERR'
        }])
        break
      case 'export_create_start':
        out.push(['export_create_submit', {
          requestId: props.requestId,
          month: props.month
        }])
        break
      case 'export_create_success':
        out.push(['export_create_result', {
          requestId: props.requestId,
          duration: props.duration,
          code: 'OK'
        }])
        break
      case 'export_create_error':
        out.push(['export_create_result', {
          requestId: props.requestId,
          duration: props.duration,
          code: props.code || props.error || 'ERR'
        }])
        break
      case 'activities_list_loaded':
        out.push(['activities_list_view', {
          requestId: props.requestId,
          statusTab: props.filter,
          count: props.count,
          duration: props.duration
        }])
        break
      case 'activity_form_submit':
        // treat as create result OK if present
        out.push(['activity_create_result', {
          requestId: props.requestId,
          duration: props.duration,
          code: 'OK'
        }])
        break
      default:
        break
    }
  } catch(_) {}
  return out
}

export const track = (event, props = {}) => {
  try {
    // 微信小程序内置埋点（需在后台配置事件ID），此处直接透传字段
    if (typeof wx !== 'undefined' && typeof wx.reportAnalytics === 'function') {
      // 注意：reportAnalytics 的第二个参数需为扁平对象且键名需配置
      wx.reportAnalytics(event, props)
      // 同步上报一份标准化事件（若存在映射）
      const more = toCanonical(event, props)
      more.forEach(([ev, pr]) => {
        try { wx.reportAnalytics(ev, pr) } catch(_){ /* ignore */ }
      })
    } else if (typeof console !== 'undefined') {
      console.info('[analytics]', event, props)
      const more = toCanonical(event, props)
      more.forEach(([ev, pr]) => console.info('[analytics:canonical]', ev, pr))
    }
  } catch (e) {
    try { console.debug && console.debug('[analytics:error]', e) } catch {}
  }
}
