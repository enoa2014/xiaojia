## 4. 云存储（COS）与文件流

- 目录：`avatars/`、`patients/`、`activities/`、`services/`、`exports/`。
- 上传：前端 `wx.cloud.uploadFile`；或函数下发临时密钥直传（限制类型/尺寸/病毒扫描）。
- 访问：私有读，下载通过 临时 URL（导出）或经后端签名；图片样式处理使用 CDN 转码样式。

