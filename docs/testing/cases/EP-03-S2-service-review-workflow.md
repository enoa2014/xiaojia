# QA 用例 · EP-03-S2 服务记录审核（通过/驳回）

目标：验证社工/管理员对志愿者提交的服务记录进行审核的完整流程，包括状态流转、权限控制和审计记录。

## 前置条件
- 已部署函数：`services`（含 `review` action）
- 已创建测试服务记录：状态为 `review`（待审核）
- 已配置角色：社工、管理员（有审核权限），志愿者（无审核权限）
- 小程序端已联调审核相关页面
- 已建立 `AuditLogs` 集合用于记录审核操作

## 前置测试数据
```javascript
const testServiceRecord = {
  _id: 'service_001',
  patientId: 'patient_001',
  type: 'visit',
  date: '2025-09-05',
  desc: '上门探访，患者状态良好',
  status: 'review',
  createdBy: 'volunteer_openid',
  createdAt: 1693900000000
}
```

## 用例

### 1) 社工审核通过服务记录
**操作**：
```javascript
services.review({
  id: 'service_001',
  decision: 'approved'
})
```
**期望**：
- 返回：`{ ok: true, data: { updated: 1 } }`
- 数据库记录状态更新：`status: 'approved'`
- 审计日志写入：
  ```javascript
  {
    actorId: 'social_worker_openid',
    action: 'services.review',
    target: { serviceId: 'service_001', decision: 'approved' },
    timestamp: Date.now()
  }
  ```

### 2) 社工驳回服务记录（需要理由）
**操作**：
```javascript
services.review({
  id: 'service_001', 
  decision: 'rejected',
  reason: '服务记录描述不够详细，缺少具体的服务内容和时间'
})
```
**期望**：
- 返回：`{ ok: true, data: { updated: 1 } }`
- 数据库记录状态更新：`status: 'rejected'`，`rejectionReason: '服务记录描述不够详细...'`
- 审计日志记录包含驳回理由

### 3) 驳回时缺少理由
**操作**：
```javascript
services.review({
  id: 'service_001',
  decision: 'rejected'
  // 缺少 reason 字段
})
```
**期望**：
- 返回：`{ ok: false, error: { code: 'E_VALIDATE', msg: '驳回服务记录时必须提供理由' } }`
- 数据库记录状态保持不变

### 4) 理由长度校验
**理由过短**：
```javascript
services.review({
  id: 'service_001',
  decision: 'rejected', 
  reason: '太短' // <20字符
})
```
**期望**：`E_VALIDATE: 驳回理由至少需要20个字符`

**理由过长**：
```javascript
services.review({
  id: 'service_001',
  decision: 'rejected',
  reason: '理由'.repeat(100) // >200字符
})
```
**期望**：`E_VALIDATE: 驳回理由不能超过200个字符`

### 5) 状态流转控制
**有效流转**：`review` → `approved` 或 `rejected`

**无效流转测试**：
- 对已审批的记录再次审核：
  ```javascript
  // 先设置状态为 approved
  services.review({ id: 'approved_service', decision: 'rejected', reason: '...' })
  ```
  **期望**：`E_VALIDATE: 只能审核状态为review的服务记录`

- 对已驳回的记录再次审核：类似处理

### 6) 权限控制验证
**有权限角色**（社工、管理员）：
- 成功执行审核操作

**无权限角色**（志愿者）：
- **期望**：`{ ok: false, error: { code: 'E_PERM', msg: '权限不足，无法执行审核操作' } }`
- 数据库记录保持不变
- 无审计日志写入

### 7) 服务记录不存在
**操作**：
```javascript
services.review({
  id: 'non_existent_id',
  decision: 'approved'
})
```
**期望**：
- 返回：`{ ok: false, error: { code: 'E_NOT_FOUND', msg: '服务记录不存在' } }`

### 8) 参数校验
**无效决定值**：
```javascript
services.review({
  id: 'service_001',
  decision: 'invalid_decision'
})
```
**期望**：`E_VALIDATE: decision 必须是 approved 或 rejected`

**缺少必填参数**：
```javascript
services.review({
  decision: 'approved'
  // 缺少 id
})
```
**期望**：`E_VALIDATE: id 为必填字段`

### 9) 并发操作测试
**场景**：多个审核员同时审核同一记录
**操作**：同时发起两个审核请求
**期望**：
- 第一个请求成功，状态更新
- 第二个请求失败（状态已非 review）
- 数据一致性保持正确

### 10) 审计日志完整性
**审核通过后检查审计日志**：
```javascript
// 查询审计日志
AuditLogs.where({
  action: 'services.review',
  'target.serviceId': 'service_001'
})
```
**期望记录包含**：
- `actorId`：审核员的用户ID
- `action`: 'services.review'
- `target.serviceId`：被审核的服务记录ID
- `target.decision`：审核决定
- `target.reason`：驳回理由（如适用）
- `timestamp`：操作时间戳

### 11) 前端集成测试
**审核队列页面**：
- 显示所有状态为 `review` 的服务记录
- 按提交时间排序
- 提供筛选和搜索功能

**审核详情页面**：
- 显示服务记录完整信息
- 提供"通过"和"驳回"操作按钮
- 驳回时强制输入理由

**操作反馈**：
- 审核成功：Toast提示，返回列表页
- 审核失败：显示错误信息，保持在当前页

### 12) 通知机制（如果实现）
**审核完成后**：
- 通知原提交者（志愿者）审核结果
- 驳回时包含驳回理由
- 通过时确认记录已生效

## 验证步骤

### 后端验证
1. 云函数测试面板测试各种审核场景
2. 验证状态流转的正确性
3. 检查权限控制的有效性
4. 确认审计日志的完整记录
5. 测试并发操作的数据一致性

### 前端验证
1. 测试审核队列和详情页面的显示
2. 验证权限控制在UI层的体现
3. 测试操作反馈和错误处理
4. 验证驳回理由输入的用户体验

### 数据一致性验证
1. 确认服务记录状态更新正确
2. 验证审计日志与实际操作一致
3. 检查并发操作不会造成数据混乱

## 测试数据准备

### 服务记录测试数据
```javascript
const testServices = [
  {
    _id: 'service_review_001',
    patientId: 'patient_001',
    type: 'visit',
    status: 'review',
    desc: '详细的服务记录描述',
    createdBy: 'volunteer_001',
    createdAt: Date.now() - 3600000 // 1小时前
  },
  {
    _id: 'service_approved_001', 
    status: 'approved', // 已审批，用于测试无效流转
  },
  {
    _id: 'service_rejected_001',
    status: 'rejected' // 已驳回，用于测试无效流转
  }
]
```

### 用户角色测试数据
```javascript
const testUsers = [
  { openid: 'social_worker_001', role: 'social_worker' },
  { openid: 'admin_001', role: 'admin' }, 
  { openid: 'volunteer_001', role: 'volunteer' } // 无审核权限
]
```

## 预期结果检查清单

### 核心功能
- [ ] 社工/管理员可以成功审核通过服务记录
- [ ] 社工/管理员可以驳回服务记录并必须提供理由
- [ ] 志愿者无法执行审核操作（权限控制）
- [ ] 状态流转控制正确（仅review状态可审核）

### 数据完整性
- [ ] 审核后状态正确更新到数据库
- [ ] 驳回理由正确保存
- [ ] 审计日志完整记录所有审核操作
- [ ] 并发操作不会造成数据不一致

### 校验机制
- [ ] 理由长度校验（20-200字符）
- [ ] 决定值枚举校验（approved/rejected）
- [ ] 必填参数校验完整
- [ ] 不存在记录的错误处理

### 用户体验
- [ ] 前端权限控制与后端一致
- [ ] 操作成功/失败反馈清晰
- [ ] 审核队列显示和筛选正常
- [ ] 驳回理由输入体验良好

## 执行记录
- 执行人：
- 执行时间：
- 测试环境：cloud1-3grb87gwaba26b64
- 结果：[ ] PASS [ ] FAIL
- 权限测试：[ ] PASS [ ] FAIL  
- 审计日志：[ ] PASS [ ] FAIL
- 并发测试：[ ] PASS [ ] FAIL
- 问题记录：