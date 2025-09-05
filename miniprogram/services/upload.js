
export const uploadImage = async (filePath, dir = 'services') => {
  const ext = filePath.split('.').pop()
  const cloudPath = `${dir}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { fileID } = await wx.cloud.uploadFile({ cloudPath, filePath })
  return fileID
}
