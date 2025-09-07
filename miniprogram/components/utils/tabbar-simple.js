/**
 * TabBar 统一处理工具 - 简化版
 * 避免复杂的依赖关系，提供最基本的 TabBar 同步功能
 */

// 获取本地角色
function getLocalRole() {
  try {
    const debug = wx.getStorageSync('debug_role')
    if (debug && debug.key) return debug.key
  } catch (_) {}
  
  try {
    const roles = wx.getStorageSync('user_roles')
    if (Array.isArray(roles) && roles[0]) return roles[0]
  } catch (_) {}
  
  return 'parent'
}

// 本地优先同步 TabBar
function syncTabbarLocalFirst(pagePath) {
  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (!currentPage || !currentPage.getTabBar) return
    const tabBar = currentPage.getTabBar()
    if (!tabBar) return
    
    const localRole = getLocalRole()
    if (tabBar.setRole && localRole) {
      tabBar.setRole(localRole)
    }
    if (tabBar.setActiveByRoute && pagePath) {
      tabBar.setActiveByRoute(pagePath)
    }
  } catch (error) {
    console.warn('TabBar local sync failed:', error)
  }
}

// 从服务端同步角色到 TabBar
function syncRoleFromServer(pagePath) {
  wx.cloud.callFunction({
    name: 'users',
    data: { action: 'getProfile' }
  }).then(res => {
    if (res && res.result && res.result.ok) {
      const profile = res.result.data
      const serverRole = profile.role || 'parent'
      
      // 更新本地存储
      try {
        const roles = profile.roles && Array.isArray(profile.roles) 
          ? profile.roles 
          : (profile.role ? [profile.role] : ['parent'])
        wx.setStorageSync('user_roles', roles)
      } catch (_) {}
      
      // 更新 TabBar
      try {
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        if (currentPage && currentPage.getTabBar) {
          const tabBar = currentPage.getTabBar()
          if (tabBar) {
            if (tabBar.setRole) tabBar.setRole(serverRole)
            if (tabBar.setActiveByRoute && pagePath) tabBar.setActiveByRoute(pagePath)
          }
        }
      } catch (_) {}
    }
  }).catch(error => {
    console.warn('TabBar server sync failed:', error)
  })
}

// 统一的 TabBar 同步方法
function syncTabBar(pagePath) {
  // 1. 先用本地角色快速刷新，避免闪烁
  syncTabbarLocalFirst(pagePath)
  
  // 2. 异步从服务端获取最新角色并覆盖
  syncRoleFromServer(pagePath)
}

// 仅设置当前页面激活状态
function setActiveTab(pagePath) {
  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (currentPage && currentPage.getTabBar) {
      const tabBar = currentPage.getTabBar()
      if (tabBar && tabBar.setActiveByRoute && pagePath) {
        tabBar.setActiveByRoute(pagePath)
      }
    }
  } catch (error) {
    console.warn('Set active tab failed:', error)
  }
}

// CommonJS 导出
module.exports = {
  syncTabBar: syncTabBar,
  syncTabbarLocalFirst: syncTabbarLocalFirst,
  syncRoleFromServer: syncRoleFromServer,
  setActiveTab: setActiveTab,
  getLocalRole: getLocalRole
}