# Mock 集合与快速导入（Postman / Thunder Client）

## Thunder Client（VS Code）
- 安装扩展：Thunder Client
- 导入集合：Collections → Import → From File → 选择 `docs/api/mocks/thunder-collection.json`
- 导入环境（可选）：Environments → Import → 添加 `BASE_URL` 变量（如 `https://mock.local/functions` 或本地网关）
- 运行：选择请求，点击 Send（请求体已按 `docs/api/prototype.md` 的事件包格式）

变量说明
- `BASE_URL`：指向函数网关的根地址，例如：
  - Mock 网关：`https://mock.local/functions`
  - 本地：`http://127.0.0.1:8787/functions`
  - 自行部署的 API 网关或代理：`https://<your-domain>/functions`

## Postman
- 导入：Import → File → 选择 `docs/api/mocks/postman_collection.json`
- 运行：根据集合中的示例直接发送；如需要，设置环境变量 `BASE_URL` 并在 URL 中替换

参考
- 契约：`docs/api/contracts.md`
- 示例原型：`docs/api/prototype.md`
- 错误码与退避：`docs/api/error-codes.md`、`docs/api/quick-reference.md`
