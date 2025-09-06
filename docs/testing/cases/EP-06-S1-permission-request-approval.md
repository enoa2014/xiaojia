# QA 用例 · EP-06-S1 字段级权限申请与审批

目标：验证用户申请查看敏感字段权限的完整流程，包括申请提交、审批决策、TTL管理和审计记录。

## 前置条件
- 已部署函数：`permissions`（含 `request.submit`、`approve`、`reject`、`list` actions）
- 已创建测试患者：包含敏感字段（id_card、phone、diagnosis）
- 已配置角色：志愿者/社工（可申请），管理员（可审批）
- 已建立 `PermissionRequests` 和 `AuditLogs` 集合
- 小程序端已联调权限申请相关功能

## 前置测试数据
```javascript
const testPatient = {
  _id: 'patient_sensitive_001',
  name: '李小明',
  id_card: '110105199001011234',
  phone: '13900000000', 
  hospitalDiagnosis: '急性白血病'
}

const testUsers = [
  { openid: 'volunteer_001', role: 'volunteer', name: '张志愿者' },
  { openid: 'social_worker_001', role: 'social_worker', name: '李社工' },
  { openid: 'admin_001', role: 'admin', name: '王管理员' }
]
```

## 用例

### 1) 成功提交权限申请
**操作**：
```javascript
permissions.request.submit({
  fields: ['id_card', 'phone', 'diagnosis'],
  patientId: 'patient_sensitive_001',
  reason: '为了能够更好地为患者提供后续的跟踪服务和紧急联系，需要查看患者的身份证号码、联系电话和诊断信息，以便建立完整的服务档案。'
})
```
**期望**：
- 返回：`{ ok: true, data: { _id: 'permission_request_id', expiresAt: null } }`（申请阶段暂无过期时间）
- 数据库记录：
  ```javascript
  {
    requesterId: 'volunteer_001',
    patientId: 'patient_sensitive_001',
    fields: ['id_card', 'phone', 'diagnosis'],
    reason: '为了能够更好地...',
    status: 'pending',
    createdAt: timestamp
  }
  ```

### 2) 字段白名单校验
**有效字段**：
- `id_card`（身份证）
- `phone`（联系电话）  
- `diagnosis`（诊断信息）

**无效字段**：
```javascript
permissions.request.submit({
  fields: ['invalid_field', 'unauthorized_data'],
  patientId: 'patient_001',
  reason: '测试无效字段...'
})
```
**期望**：
- 返回：`{ ok: false, error: { code: 'E_VALIDATE', msg: '包含不允许申请的字段' } }`

### 3) 申请理由长度校验
**理由过短**：
```javascript
permissions.request.submit({
  fields: ['id_card'],
  patientId: 'patient_001', 
  reason: '需要查看'  // <20字符
})
```
**期望**：`E_VALIDATE: 申请理由至少需要20个字符`

**理由过长**：
```javascript
permissions.request.submit({
  fields: ['id_card'],
  patientId: 'patient_001',
  reason: '理由'.repeat(200)  // 假设超过最大限制
})
```
**期望**：根据设定的最大长度返回相应错误

**有效理由长度**：20-500字符范围内

### 4) 必填字段校验
**缺少字段列表**：
```javascript
permissions.request.submit({
  patientId: 'patient_001',
  reason: '需要查看患者信息进行后续跟踪服务'
  // 缺少 fields
})
```
**期望**：`E_VALIDATE: fields 为必填字段`

**缺少申请理由**：
```javascript
permissions.request.submit({
  fields: ['id_card'],
  patientId: 'patient_001'
  // 缺少 reason
})
```
**期望**：`E_VALIDATE: reason 为必填字段`

### 5) 患者ID关联校验
**不存在的患者ID**：
```javascript
permissions.request.submit({
  fields: ['id_card'],
  patientId: 'non_existent_patient',
  reason: '需要查看患者信息进行后续跟踪服务'
})
```
**期望**：`E_NOT_FOUND: 患者不存在` 或根据业务逻辑允许（后续验证）

### 6) 管理员审批通过申请
**前置**：存在待审批的权限申请
**操作**：
```javascript
permissions.request.approve({
  id: 'permission_request_001',
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000  // 30天后过期
})
```
**期望**：
- 返回：`{ ok: true, data: { updated: 1 } }`
- 数据库记录更新：
  ```javascript
  {
    status: 'approved',
    expiresAt: timestamp_30_days_later,
    approvedBy: 'admin_001',
    approvedAt: timestamp
  }
  ```
- 审计日志写入：
  ```javascript
  {
    actorId: 'admin_001',
    action: 'permissions.approve',
    target: { requestId: 'permission_request_001', fields: [...] },
    timestamp: Date.now()
  }
  ```

### 7) 管理员驳回申请
**操作**：
```javascript
permissions.request.reject({
  id: 'permission_request_002',
  reason: '申请理由不够充分，请提供更详细的服务必要性说明'
})
```
**期望**：
- 返回：`{ ok: true, data: { updated: 1 } }`
- 数据库记录更新：
  ```javascript
  {
    status: 'rejected',
    rejectionReason: '申请理由不够充分...',
    rejectedBy: 'admin_001',
    rejectedAt: timestamp
  }
  ```
- 审计日志写入相应记录

### 8) 过期时间设置校验
**默认过期时间**：30天
**自定义过期时间**：
```javascript
permissions.request.approve({
  id: 'permission_request_001',
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000  // 7天后过期
})
```

**最大过期时间限制**：
```javascript
permissions.request.approve({
  id: 'permission_request_001', 
  expiresAt: Date.now() + 100 * 24 * 60 * 60 * 1000  // 100天后（超过90天限制）
})
```
**期望**：`E_VALIDATE: 权限有效期不能超过90天`

### 9) 权限状态流转控制
**有效流转**：`pending` → `approved` 或 `rejected`

**无效流转**：
- 对已审批的申请再次审批：
  ```javascript
  permissions.request.approve({ id: 'already_approved_request', expiresAt: ... })
  ```
  **期望**：`E_VALIDATE: 只能审批状态为pending的申请`

- 对已驳回的申请再次处理：类似处理

### 10) 权限申请列表查询
**按申请人查询**：
```javascript
permissions.request.list({
  requesterId: 'volunteer_001'
})
```
**期望**：返回该用户的所有权限申请记录

**按状态过滤**：
```javascript
permissions.request.list({
  status: 'pending'
})
```
**期望**：返回所有待审批的申请

**按患者过滤**：
```javascript
permissions.request.list({
  patientId: 'patient_001'
})
```
**期望**：返回该患者相关的所有权限申请

### 11) 权限生效验证
**前置**：权限申请已审批通过且在有效期内
**操作**：查看患者详情
```javascript
patients.get({ id: 'patient_sensitive_001' })
```
**期望**：
- 敏感字段返回明文（而非脱敏）
- 返回权限信息：
  ```javascript
  {
    permission: {
      fields: ['id_card', 'phone', 'diagnosis'],
      expiresAt: timestamp,
      hasSensitive: true
    }
  }
  ```
- 审计日志记录敏感字段读取

### 12) 权限过期处理
**前置**：设置权限已过期（expiresAt < 当前时间）
**操作**：尝试查看患者详情
**期望**：
- 敏感字段回到脱敏状态
- `permission.hasSensitive: false`
- 不写入敏感读取审计日志

### 13) 重复申请检测
**前置**：用户已有pending状态的申请
**操作**：同一用户为同一患者再次申请相同字段
**期望**：
- 方案A：阻止重复申请 → `E_CONFLICT: 已存在待审批的申请`
- 方案B：允许并覆盖/合并申请

### 14) 权限范围控制
**无权申请用户**：
- 如果有角色限制，测试无权限用户的申请
- **期望**：`E_PERM: 权限不足，无法申请字段权限`

**无权审批用户**：
```javascript
// 志愿者尝试审批
permissions.request.approve({
  id: 'permission_request_001',
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
})
```
**期望**：`E_PERM: 权限不足，只有管理员可以审批权限申请`

### 15) 前端集成测试
**申请表单**：
- 字段选择（复选框）
- 患者选择/搜索
- 理由输入（多行文本）
- 字符数实时显示

**申请状态页面**：
- 显示所有申请记录
- 状态徽标（待审批/已通过/已驳回）
- 过期倒计时显示

**审批管理页面**：
- 待审批队列
- 申请详情展示
- 审批/驳回操作
- 过期时间设置

**患者详情集成**：
- 敏感字段的脱敏/明文切换
- "申请查看权限"入口
- 权限到期提醒

### 16) 审计完整性验证
**检查审计日志记录**：
```javascript
AuditLogs.where({
  action: { $in: ['permissions.submit', 'permissions.approve', 'permissions.reject'] }
})
```
**期望包含**：
- 申请提交记录
- 审批通过/驳回记录  
- 敏感字段读取记录
- 完整的操作链路追踪

## 验证步骤

### 后端验证
1. 云函数测试面板测试完整申请-审批流程
2. 验证各种参数校验的准确性
3. 测试权限状态流转控制
4. 验证TTL机制的有效性
5. 检查审计日志的完整记录
6. 测试权限与患者详情查询的集成

### 前端验证
1. 测试申请表单的用户体验
2. 验证审批管理功能
3. 测试权限状态的可视化
4. 验证与患者详情页的集成

### 集成验证
1. 端到端权限申请流程测试
2. 权限生效后的敏感字段访问测试
3. 权限过期后的自动回收测试
4. 审计日志的完整性验证

## 测试数据

### 权限申请测试用例
```javascript
const testPermissionRequests = [
  {
    fields: ['id_card'],
    patientId: 'patient_001',
    reason: '需要核实患者身份信息，为其办理入住手续和相关证明文件'
  },
  {
    fields: ['phone', 'diagnosis'],
    patientId: 'patient_002', 
    reason: '患者病情需要定期跟踪，需要联系电话进行后续随访，同时了解诊断信息制定护理计划'
  },
  {
    fields: ['id_card', 'phone', 'diagnosis'],
    patientId: 'patient_003',
    reason: '作为患者的主要服务志愿者，需要全面了解患者基本信息、联系方式和病情诊断，以便提供针对性的服务支持'
  }
]
```

## 预期结果检查清单

### 申请功能
- [ ] 有效字段申请成功提交
- [ ] 字段白名单校验有效
- [ ] 申请理由长度校验正确
- [ ] 必填字段校验完整
- [ ] 重复申请检测机制有效

### 审批功能
- [ ] 管理员可以审批通过申请
- [ ] 管理员可以驳回申请并提供理由
- [ ] 过期时间设置和校验正确
- [ ] 无权用户被阻止审批

### 权限生效
- [ ] 审批通过后权限立即生效
- [ ] 敏感字段正确显示明文
- [ ] 权限到期自动回收
- [ ] 敏感字段读取写入审计

### 状态管理
- [ ] 申请状态流转符合逻辑
- [ ] 权限申请列表查询功能正确
- [ ] 前端状态显示与后端同步

### 审计完整性
- [ ] 所有关键操作写入审计日志
- [ ] 审计记录包含完整信息
- [ ] 敏感操作可追溯

## 执行记录
- 执行人：
- 执行时间：
- 测试环境：cloud1-3grb87gwaba26b64
- 结果：[ ] PASS [ ] FAIL
- 申请提交测试：[ ] PASS [ ] FAIL
- 审批流程测试：[ ] PASS [ ] FAIL
- 权限生效测试：[ ] PASS [ ] FAIL
- TTL机制测试：[ ] PASS [ ] FAIL
- 审计日志测试：[ ] PASS [ ] FAIL
- 问题记录：