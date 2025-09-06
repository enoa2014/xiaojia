# QA 用例 · EP-01-S2 患者档案查看（脱敏/审批窗口内明文）

目标：验证按角色权限的字段脱敏、权限申请后明文显示、审计日志记录的完整性。

## 前置条件
- 已部署函数：`patients`（含 `get`）、`permissions`（含权限申请功能）
- 已创建测试患者：`name=李小明`, `id_card=110105199001011234`, `phone=13900000000`, `hospitalDiagnosis=急性白血病`
- 已配置角色：志愿者、社工、管理员用户
- 小程序端已联调 `pages/patients/detail`

## 用例

### 1) 志愿者查看档案（默认脱敏）
**操作**：志愿者用户查看患者详情
**期望后端**：
- `id_card`: 显示为 `************1234`
- `phone`: 显示为 `***0000` 
- `hospitalDiagnosis`: 显示为 `诊断信息已脱敏`
- `permission.hasSensitive`: `false`

**期望前端**：详情页敏感字段显示脱敏信息，显示"申请查看明文"按钮

### 2) 社工无权限查看档案（默认脱敏）
**操作**：社工用户查看患者详情（未申请权限）
**期望**：与志愿者相同的脱敏显示

### 3) 社工申请权限后查看（明文显示）
**前置**：社工已提交权限申请并获得审批通过，设置 `expiresAt` 为 30 天后
**操作**：社工用户查看同一患者详情
**期望后端**：
- `id_card`: 显示明文 `110105199001011234`
- `phone`: 显示明文 `13900000000`
- `hospitalDiagnosis`: 显示明文 `急性白血病`
- `permission.fields`: `['id_card', 'phone', 'diagnosis']`
- `permission.expiresAt`: 时间戳（30天后）
- `permission.hasSensitive`: `true`
- 审计日志写入：`actorId`, `action: 'patients.readSensitive'`, `target: { patientId, fields }`

**期望前端**：详情页显示明文信息，显示权限过期倒计时

### 4) 管理员查看档案（默认明文）
**操作**：管理员用户查看患者详情
**期望**：所有字段默认明文显示，无需申请权限

### 5) 权限过期后回收
**前置**：模拟权限过期（设置 `expiresAt` 为过去时间）
**操作**：之前有权限的社工用户再次查看详情
**期望**：回到脱敏状态，与用例2相同

### 6) 无效患者ID
**操作**：使用不存在的患者ID调用 `patients.get`
**期望**：返回 `{ ok: false, error: { code: 'E_NOT_FOUND', msg: 'patient not found' } }`

### 7) 参数校验错误
**操作**：不提供 `id` 参数或提供非字符串 `id`
**期望**：返回 `{ ok: false, error: { code: 'E_VALIDATE', msg: '参数不合法' } }`

## 验证步骤

### 后端验证
1. 创建不同角色的测试用户（模拟不同 OPENID）
2. 调用 `patients.get` 验证不同角色的返回结果
3. 创建权限申请记录，验证审批通过后的明文返回
4. 检查 `AuditLogs` 集合中的审计记录是否正确写入
5. 验证权限过期机制

### 前端验证
1. 在 `pages/patients/detail` 页面测试不同角色的显示效果
2. 验证"申请查看明文"按钮的显示和跳转
3. 验证权限倒计时显示
4. 测试网络错误和加载状态

### 测试数据
```javascript
// 测试患者数据
const testPatient = {
  name: '李小明',
  id_card: '110105199001011234',
  id_card_tail: '1234',
  phone: '13900000000',
  hospitalDiagnosis: '急性白血病',
  createdAt: Date.now()
}

// 权限申请数据
const permissionRequest = {
  requesterId: 'social_worker_openid',
  patientId: 'test_patient_id',
  fields: ['id_card', 'phone', 'diagnosis'],
  reason: '随访需要核实患者联系方式和诊断信息',
  status: 'approved',
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30天后
}
```

## 预期结果检查清单

- [ ] 志愿者查看档案时敏感字段正确脱敏
- [ ] 社工无权限时与志愿者相同脱敏效果
- [ ] 社工有权限时显示明文且写入审计日志
- [ ] 管理员默认可查看所有明文
- [ ] 权限过期后自动回收明文访问
- [ ] 参数校验和错误处理正确
- [ ] 前端UI根据权限状态正确显示
- [ ] 审计日志记录完整准确

## 风险点
- 权限检查逻辑绕过
- 审计日志写入失败
- 时间过期判断不准确
- 角色权限混淆
- 敏感信息泄露

## 执行记录
- 执行人：
- 执行时间：
- 测试环境：cloud1-3grb87gwaba26b64
- 结果：[ ] PASS [ ] FAIL
- 问题记录：