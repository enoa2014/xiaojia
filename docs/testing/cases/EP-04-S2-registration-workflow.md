# QA 用例 · EP-04-S2 报名/取消/签到

目标：验证志愿者/用户对活动的报名、取消、签到完整流程，包括容量控制、候补机制、签到幂等性和状态管理。

## 前置条件
- 已部署函数：`registrations`（含 `register`、`cancel`、`checkin` actions）
- 已创建测试活动：包含有限容量和无限容量的活动
- 已配置用户角色：志愿者、社工、管理员
- 已建立 `Registrations` 集合和相关索引
- 小程序端已联调报名相关功能

## 前置测试数据
```javascript
const testActivities = [
  {
    _id: 'activity_limited',
    title: '小容量测试活动',
    capacity: 2, // 有限容量
    status: 'open'
  },
  {
    _id: 'activity_unlimited', 
    title: '无限容量测试活动',
    capacity: 0, // 无限容量
    status: 'open'
  },
  {
    _id: 'activity_closed',
    title: '已关闭活动',
    capacity: 10,
    status: 'closed'
  }
]

const testUsers = [
  { userId: 'user_001', name: '张志愿者' },
  { userId: 'user_002', name: '李志愿者' },  
  { userId: 'user_003', name: '王志愿者' }
]
```

## 用例

### 1) 成功报名（有容量活动）
**操作**：
```javascript
registrations.register({
  activityId: 'activity_limited'
})
```
**期望**：
- 返回：`{ ok: true, data: { status: 'registered' } }`
- 数据库记录：
  ```javascript
  {
    activityId: 'activity_limited',
    userId: 'user_001', 
    status: 'registered',
    createdAt: timestamp
  }
  ```

### 2) 容量满后进入候补
**前置**：活动容量为2，已有2人报名
**操作**：第3个用户报名
```javascript
registrations.register({
  activityId: 'activity_limited'
})
```
**期望**：
- 返回：`{ ok: true, data: { status: 'waitlist' } }`
- 数据库记录状态为 `waitlist`
- 前端提示：Toast显示"活动已满，您已进入候补名单"

### 3) 无限容量活动报名
**操作**：
```javascript
registrations.register({
  activityId: 'activity_unlimited'
})
```
**期望**：
- 返回：`{ ok: true, data: { status: 'registered' } }`
- 不受容量限制，直接报名成功

### 4) 重复报名检测
**前置**：用户已报名某活动
**操作**：同一用户再次报名同一活动
**期望**：
- 返回：`{ ok: false, error: { code: 'E_CONFLICT', msg: '您已经报名了此活动' } }`
- 数据库记录保持不变

### 5) 已关闭活动报名
**操作**：
```javascript
registrations.register({
  activityId: 'activity_closed'
})
```
**期望**：
- 返回：`{ ok: false, error: { code: 'E_VALIDATE', msg: '活动已关闭，无法报名' } }`

### 6) 不存在的活动报名
**操作**：
```javascript
registrations.register({
  activityId: 'non_existent_activity'
})
```
**期望**：
- 返回：`{ ok: false, error: { code: 'E_NOT_FOUND', msg: '活动不存在' } }`

### 7) 取消报名（已报名状态）
**前置**：用户已成功报名活动
**操作**：
```javascript
registrations.cancel({
  activityId: 'activity_limited'
})
```
**期望**：
- 返回：`{ ok: true, data: { updated: 1 } }`
- 数据库记录状态更新为 `cancelled`

### 8) 取消报名触发候补自动转正
**前置**：
- 活动容量2，已满员（2人registered）
- 有1人在候补名单（waitlist）

**操作**：已报名用户取消报名
**期望**：
- 取消用户状态变为 `cancelled`
- 最早的候补用户自动转为 `registered`
- 返回成功响应

### 9) 取消报名（候补状态）
**前置**：用户在候补名单中
**操作**：取消报名
**期望**：
- 返回：`{ ok: true, data: { updated: 1 } }`
- 状态更新为 `cancelled`
- 不影响其他候补顺序

### 10) 取消不存在的报名
**前置**：用户未报名任何活动
**操作**：尝试取消报名
**期望**：
- 返回：`{ ok: false, error: { code: 'E_NOT_FOUND', msg: '未找到报名记录' } }`

### 11) 用户自己签到
**前置**：用户已报名且状态为 `registered`
**操作**：
```javascript
registrations.checkin({
  activityId: 'activity_limited'
})
```
**期望**：
- 返回：`{ ok: true, data: { updated: 1 } }`
- 数据库记录添加 `checkedInAt` 时间戳
- 状态保持 `registered`

### 12) 管理员为他人签到
**操作**：
```javascript
registrations.checkin({
  activityId: 'activity_limited',
  userId: 'user_002' // 指定其他用户
})
```
**期望**：
- 管理员/社工：操作成功
- 普通志愿者：`E_PERM: 权限不足，只能为自己签到`

### 13) 签到幂等性测试
**前置**：用户已签到过
**操作**：同一用户再次签到
**期望**：
- 返回：`{ ok: true, data: { updated: 0 } }`（表示无更新）
- Toast提示：`已经签到过了`
- `checkedInAt` 时间保持不变

### 14) 未报名用户签到
**前置**：用户未报名活动
**操作**：尝试签到
**期望**：
- 返回：`{ ok: false, error: { code: 'E_NOT_FOUND', msg: '未找到报名记录或已取消' } }`

### 15) 候补状态用户签到
**前置**：用户在候补名单中
**操作**：尝试签到
**期望**：
- 根据业务规则：
  - 方案A：不允许候补用户签到 → `E_VALIDATE: 候补用户无法签到`
  - 方案B：允许且自动转为正式报名 → 状态更新为 `registered` + 签到时间

### 16) 报名列表查询
**按活动查询**：
```javascript
registrations.list({
  activityId: 'activity_limited'
})
```
**期望**：返回该活动的所有报名记录

**按用户查询**：
```javascript
registrations.list({
  userId: 'me' // 或具体用户ID
})
```
**期望**：返回该用户的所有报名记录

**按状态过滤**：
```javascript
registrations.list({
  activityId: 'activity_limited',
  status: 'registered'
})
```
**期望**：返回指定状态的报名记录

### 17) 前端集成测试
**活动详情页**：
- 显示报名状态（未报名/已报名/候补中/已取消）
- 报名/取消按钮状态控制
- 容量信息显示（已报名/总容量）
- 签到按钮（仅已报名用户可见）

**我的报名页面**：
- 显示用户所有报名记录
- 按状态分类显示
- 提供取消和签到操作

**管理端（社工/管理员）**：
- 查看活动报名列表
- 批量签到功能
- 候补名单管理

### 18) 并发操作测试
**并发报名测试**：
- 多用户同时报名容量有限的活动
- 验证容量控制的准确性
- 确保不会超额报名

**并发取消测试**：
- 多个候补用户存在时，一个报名用户取消
- 验证只有一个候补用户转为正式报名

## 验证步骤

### 后端验证
1. 云函数测试面板测试各种报名场景
2. 验证容量控制逻辑的准确性
3. 测试候补机制的自动转正
4. 验证签到幂等性
5. 测试并发操作的数据一致性

### 前端验证
1. 测试报名流程的用户体验
2. 验证状态显示和按钮控制
3. 测试权限控制在UI层的体现
4. 验证各种提示信息的准确性

### 数据一致性验证
1. 检查报名记录的完整性
2. 验证状态流转的正确性
3. 确认容量统计的准确性
4. 验证签到时间的记录

## 容量控制逻辑测试

### 场景A：容量从0到满员再到候补
```javascript
// 活动容量设为2
const testScenario = async () => {
  // 第1人报名 → registered
  await registrations.register({ activityId: 'test_activity', userId: 'user_001' })
  
  // 第2人报名 → registered  
  await registrations.register({ activityId: 'test_activity', userId: 'user_002' })
  
  // 第3人报名 → waitlist
  await registrations.register({ activityId: 'test_activity', userId: 'user_003' })
  
  // 第1人取消 → user_003 自动转为 registered
  await registrations.cancel({ activityId: 'test_activity', userId: 'user_001' })
}
```

## 预期结果检查清单

### 报名功能
- [ ] 有容量活动正常报名
- [ ] 无容量活动不受限制
- [ ] 容量满时进入候补
- [ ] 重复报名被正确阻止
- [ ] 已关闭活动无法报名

### 取消功能
- [ ] 已报名用户可以取消
- [ ] 候补用户可以取消
- [ ] 取消后触发候补自动转正
- [ ] 未报名用户取消报错

### 签到功能  
- [ ] 已报名用户可以签到
- [ ] 签到时间正确记录
- [ ] 签到操作幂等性
- [ ] 权限控制（代签）有效
- [ ] 未报名/候补用户签到处理正确

### 状态管理
- [ ] 状态流转符合业务逻辑
- [ ] 并发操作数据一致性
- [ ] 容量控制准确无误

### 用户体验
- [ ] 前端状态显示准确
- [ ] 操作反馈清晰友好
- [ ] 权限控制UI体现
- [ ] 报名列表信息完整

## 执行记录
- 执行人：
- 执行时间：
- 测试环境：cloud1-3grb87gwaba26b64
- 结果：[ ] PASS [ ] FAIL
- 容量控制测试：[ ] PASS [ ] FAIL
- 候补机制测试：[ ] PASS [ ] FAIL  
- 签到幂等性测试：[ ] PASS [ ] FAIL
- 并发操作测试：[ ] PASS [ ] FAIL
- 问题记录：