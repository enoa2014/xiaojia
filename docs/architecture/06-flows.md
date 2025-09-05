## 6. 关键流程（ASCII 时序）

**A) 服务记录提交（志愿者）**
```
pages/services/form  →  services.fn(action:create)
  填写表单/图片       校验(zod)→RBAC→写 Services→返回 {ok}
  弱网重试/草稿箱      审核状态初始 pending；通知社工
```

**B) 敏感字段查看申请（社工/志愿者）**
```
patients/detail → 点击「申请查看」 → permissions.fn(action:request)
  生成申请单 → 管理员审批 → 设置 TTL → 返回倒计时/状态
  在详情接口按授权窗口返回原始字段，否则脱敏
```

**C) 活动报名与签到**
```
activities/detail → registrations.fn(action:register)
  容量判定：满则 waitlist；社工端可签到（去重）→ 写 checkedInAt
```

