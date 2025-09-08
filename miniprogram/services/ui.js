// Lightweight UI helpers for consistent, safe prompts

export const showActionSheetSafe = ({ itemList = [], itemColor = '#333' } = {}) => {
  return new Promise((resolve) => {
    try {
      wx.showActionSheet({
        itemList,
        itemColor,
        success: (res) => resolve(res),
        fail: () => resolve(null)
      })
    } catch (_) {
      resolve(null)
    }
  })
}

export default { showActionSheetSafe }

