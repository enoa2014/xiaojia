
import { api, mapError, callWithRetry } from '../../services/api'
Page({
  data: { list: [] },
  async loadPatients() {
    try {
      const list = await callWithRetry('patients','list',{ page: 1, pageSize: 10 })
      this.setData({ list })
    } catch (e) {
      wx.showToast({ icon: 'none', title: mapError(e.code) })
      console.error(e)
    }
  }
})
