# TabBar 统一处理方案

## 概述

为了解决各页面 TabBar 处理逻辑不一致的问题，引入了统一的 TabBar 处理工具 (`utils/tabbar.js`)，确保所有页面的 TabBar 状态同步行为一致。

## 问题背景

之前各页面存在以下不一致问题：
1. **函数命名不统一**：`syncTabbarLocalFirst()`、`updateTabBar()`、`syncTabBarState()` 等
2. **处理逻辑差异**：有些页面双重同步，有些单次同步
3. **调用时机不同**：onShow、onLoad、loadUserProfile 等不同位置调用
4. **角色获取方式不一致**：本地存储、服务端获取的优先级和处理方式不同

## 解决方案

### 1. 统一工具函数 (`utils/tabbar.js`)

提供以下标准化方法：

```javascript
const { syncTabBar } = require('../../utils/tabbar')

// 在页面的 onShow() 中调用
syncTabBar('/pages/services/index')
```

### 2. 统一处理流程

`syncTabBar()` 方法的处理流程：

1. **本地优先同步**：使用本地存储的角色信息快速更新 TabBar，避免闪烁
   - 优先读取 `debug_role`（调试用）
   - 其次读取 `user_roles`（缓存的用户角色）
   
2. **异步服务端同步**：从服务器获取最新角色并覆盖本地状态
   - 更新本地角色存储
   - 刷新 TabBar 显示

3. **容错处理**：服务端同步失败时确保本地状态正确

### 3. 标准化的页面实现

所有 TabBar 页面现在统一使用：

```javascript
onShow() {
  // 使用统一的 TabBar 同步方法
  const { syncTabBar } = require('../../utils/tabbar')
  syncTabBar('/pages/[current-page]/index')
  
  // ... 其他页面逻辑
}
```

## 更新内容

### 已更新的页面

- ✅ `pages/services/index.js` - 移除了旧的 `syncTabbarLocalFirst()`、`updateTabBar()` 方法
- ✅ `pages/patients/index.js` - 移除了旧的 `syncTabbarLocalFirst()`、`syncRoleToTabbar()` 方法  
- ✅ `pages/activities/index.js` - 移除了旧的 `syncTabBarState()` 方法，清理了重复的 TabBar 调用
- ✅ `pages/stats/index.js` - 移除了旧的同步方法，增加了独立的权限检查
- ✅ `pages/index/index.js` - 移除了 onLoad 中的 `syncRoleFromServer()` 调用（保留方法定义用于手动切换）

### 移除的方法

各页面不再需要自己实现以下方法：
- `syncTabbarLocalFirst()`
- `syncRoleToTabbar()` 
- `updateTabBar()`
- `syncTabBarState()`

## 工具函数 API

### `syncTabBar(pagePath)`
**推荐使用的主方法**
- 参数：`pagePath` - 当前页面路径，如 `/pages/services/index`
- 功能：本地优先 + 异步服务端同步

### `syncTabbarLocalFirst(pagePath)`
**本地优先同步**
- 仅使用本地存储的角色信息
- 快速响应，无网络依赖

### `syncRoleFromServer(pagePath)`
**服务端同步**
- 从服务器获取最新角色并更新
- 返回服务端角色信息

### `setActiveTab(pagePath)`
**仅设置选中状态**
- 不涉及角色同步，仅更新 TabBar 选中项

## 优势

1. **行为一致性**：所有页面 TabBar 同步行为完全一致
2. **代码简化**：各页面无需重复实现同步逻辑
3. **用户体验**：本地优先策略避免 TabBar 闪烁
4. **可维护性**：集中管理，易于维护和调试
5. **容错能力**：网络异常时仍能正常显示

## 注意事项

1. 新增 TabBar 页面时，只需在 `onShow()` 中调用 `syncTabBar()`
2. 如果页面有特殊的角色权限处理逻辑，可以在 TabBar 同步后单独处理
3. 调试模式下可以通过 `debug_role` 存储切换角色进行测试

## 实际使用方法

由于微信小程序模块加载的限制，现在使用简化版本 `tabbar-simple.js`：

```javascript
onShow() {
  try {
    const { syncTabBar } = require('../../components/utils/tabbar-simple')
    syncTabBar('/pages/services/index')
  } catch (error) {
    console.warn('Failed to load tabbar utils:', error)
    // 回退到简单的选中态设置
    try { 
      const tb = this.getTabBar && this.getTabBar()
      if (tb && tb.setActiveByRoute) tb.setActiveByRoute('/pages/services/index')
    } catch(_) {}
  }
}
```

简化版本的特点：
- 移除了复杂的依赖关系，使用微信小程序原生 API
- 包含完整的容错处理，确保 TabBar 正常工作
- 功能与原版本完全一致