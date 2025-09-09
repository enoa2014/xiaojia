# 统计专项分析与导出中心 API 接口文档

## 概述

本文档定义了支持 Story 7.14 统计专项分析子页与导出中心功能所需的后端 API 接口。

## 1. 服务效果分析 API

### 1.1 获取服务效果分析数据
**接口**: `api.stats.servicesAnalysis(params)`
**云函数**: `stats`
**Action**: `servicesAnalysis`

**请求参数**:
```typescript
interface ServicesAnalysisParams {
  period?: 'week' | 'month' | 'quarter' | 'year'
  startDate?: string  // YYYY-MM-DD
  endDate?: string    // YYYY-MM-DD
}
```

**响应数据**:
```typescript
interface ServicesAnalysisData {
  serviceTypeDistribution: {
    type: string      // 服务类型名称
    count: number     // 服务次数
    percentage: number // 占比百分比
  }[]
  workerEfficiency: {
    workerId: string  // 工作人员ID
    workerName: string // 工作人员姓名
    serviceCount: number // 服务次数
    avgRating: number // 平均评分
    efficiency: number // 效率评分
  }[]
  ratingTrends: {
    date: string      // YYYY-MM-DD
    avgRating: number // 当日平均评分
    serviceCount: number // 服务次数
  }[]
  summary: {
    totalServices: number    // 总服务次数
    avgRating: number       // 总体平均评分
    activeWorkers: number   // 活跃工作人员数
    topServiceType: string  // 主要服务类型
  }
}
```

## 2. 入住情况分析 API

### 2.1 获取入住情况分析数据
**接口**: `api.stats.tenancyAnalysis(params)`
**云函数**: `stats`
**Action**: `tenancyAnalysis`

**请求参数**:
```typescript
interface TenancyAnalysisParams {
  period?: 'week' | 'month' | 'quarter' | 'year'
  startDate?: string
  endDate?: string
}
```

**响应数据**:
```typescript
interface TenancyAnalysisData {
  occupancyTrend: {
    date: string        // YYYY-MM-DD
    occupancyRate: number // 入住率百分比
    totalRooms: number    // 总房间数
    occupiedRooms: number // 已入住房间数
  }[]
  roomUtilization: {
    roomId: string      // 房间ID
    roomNumber: string  // 房间号
    status: 'occupied' | 'vacant' | 'maintenance' // 房间状态
    occupancyDays: number // 入住天数
    utilizationRate: number // 利用率
    currentTenant?: string  // 当前住客
  }[]
  durationDistribution: {
    range: string       // 入住时长范围 (如 "1-7天", "8-30天")
    count: number       // 该范围内的住客数量
    percentage: number  // 占比
  }[]
  summary: {
    currentOccupancyRate: number // 当前入住率
    totalRooms: number          // 总房间数
    occupiedRooms: number       // 已入住房间数
    avgStayDuration: number     // 平均入住时长(天)
  }
}
```

## 3. 活动参与分析 API

### 3.1 获取活动参与分析数据
**接口**: `api.stats.activityAnalysis(params)`
**云函数**: `stats`
**Action**: `activityAnalysis`

**请求参数**:
```typescript
interface ActivityAnalysisParams {
  period?: 'week' | 'month' | 'quarter' | 'year'
  startDate?: string
  endDate?: string
}
```

**响应数据**:
```typescript
interface ActivityAnalysisData {
  participationTrend: {
    date: string           // YYYY-MM-DD
    totalActivities: number // 当日活动总数
    totalParticipants: number // 当日参与总人次
    avgParticipation: number  // 平均每场参与人数
  }[]
  activityTypeDistribution: {
    type: string          // 活动类型
    count: number         // 活动场次
    participants: number  // 参与总人次
    avgParticipants: number // 平均参与人数
  }[]
  ageDistribution: {
    ageGroup: string      // 年龄组 (如 "60-70", "70-80")
    participants: number  // 参与人数
    percentage: number    // 占比
  }[]
  summary: {
    totalActivities: number     // 总活动数
    totalParticipants: number   // 总参与人次
    avgParticipation: number    // 平均参与率
    mostPopularType: string     // 最受欢迎活动类型
  }
}
```

## 4. 导出中心 API

### 4.1 创建导出任务
**接口**: `api.exports.create(templateId, params, clientToken, requestId)`
**云函数**: `exports`
**Action**: `create`

**请求参数**:
```typescript
interface CreateExportRequest {
  templateId: string    // 模板ID
  params: {
    month?: string      // YYYY-MM 格式
    quarter?: string    // YYYY-Q1 格式
    dateRange?: {
      start: string     // YYYY-MM-DD
      end: string       // YYYY-MM-DD
    }
  }
  clientToken: string   // 客户端令牌，防重复提交
  requestId: string     // 请求ID，用于追踪
}
```

**响应数据**:
```typescript
interface CreateExportResponse {
  taskId: string        // 任务ID
  status: 'pending' | 'running' | 'done' | 'failed'
  progress: number      // 进度百分比 0-100
  estimatedTime?: number // 预计完成时间(秒)
  message?: string      // 状态消息
}
```

### 4.2 查询任务状态
**接口**: `api.exports.status(taskId)`
**云函数**: `exports`
**Action**: `status`

**请求参数**:
```typescript
interface TaskStatusRequest {
  taskId: string
}
```

**响应数据**:
```typescript
interface TaskStatusResponse {
  taskId: string
  status: 'pending' | 'running' | 'done' | 'failed'
  progress: number      // 0-100
  downloadUrl?: string  // 完成后的下载链接
  errorMessage?: string // 失败时的错误信息
  createdAt: string    // ISO 时间戳
  completedAt?: string // 完成时间
}
```

### 4.3 获取导出历史
**接口**: `api.exports.history()`
**云函数**: `exports`
**Action**: `history`

**请求参数**: 无

**响应数据**:
```typescript
interface ExportHistoryItem {
  id: string
  templateId: string
  templateName: string    // 模板显示名称
  templateIcon: string   // 模板图标
  status: 'pending' | 'running' | 'done' | 'failed'
  statusText: string     // 状态显示文本
  downloadUrl?: string   // 下载链接
  createdAt: string      // 创建时间显示文本
  createdBy: string      // 创建者名称
  params: Record<string, any> // 导出参数
}

type ExportHistoryResponse = ExportHistoryItem[]
```

## 5. 用户权限检查 API

### 5.1 获取用户权限信息
**接口**: `api.users.getProfile()`
**云函数**: `users`
**Action**: `getProfile`

**请求参数**: 无

**响应数据**:
```typescript
interface UserProfile {
  id: string
  name: string
  role: 'admin' | 'social_worker' | 'nurse' | 'volunteer' | 'parent'
  permissions: string[]  // 权限列表
  department?: string    // 部门
  status: 'active' | 'inactive'
}
```

## 6. 支持的导出模板

### 6.1 模板类型定义
```typescript
interface ExportTemplate {
  id: 'stats-monthly' | 'stats-quarterly' | 'patients-summary' | 'services-detail'
  name: string
  description: string
  icon: string
  type: 'monthly' | 'quarterly' | 'data'
  params: ('month' | 'quarter' | 'dateRange')[]
}
```

### 6.2 预定义模板
1. **月度统计报表** (`stats-monthly`)
   - 参数: `month` (YYYY-MM)
   - 包含: 服务量、入住率、活动参与等月度数据

2. **季度分析报告** (`stats-quarterly`) 
   - 参数: `quarter` (YYYY-Q1)
   - 包含: 季度服务效果分析和趋势对比

3. **档案汇总表** (`patients-summary`)
   - 参数: `dateRange` (start/end)
   - 包含: 患者基础信息和入住记录汇总

4. **服务记录详单** (`services-detail`)
   - 参数: `dateRange` (start/end) 
   - 包含: 按时间范围导出详细服务记录

## 7. 错误代码

### 7.1 统计分析相关错误
- `E_STATS_NO_DATA` - 指定时间范围内无数据
- `E_STATS_INVALID_PERIOD` - 无效的时间周期参数
- `E_STATS_DATE_RANGE_TOO_LARGE` - 查询时间范围过大

### 7.2 导出相关错误
- `E_EXPORT_TEMPLATE_NOT_FOUND` - 导出模板不存在
- `E_EXPORT_INVALID_PARAMS` - 导出参数无效
- `E_EXPORT_TASK_NOT_FOUND` - 导出任务不存在
- `E_EXPORT_DUPLICATE_REQUEST` - 重复的导出请求
- `E_EXPORT_QUOTA_EXCEEDED` - 超出导出配额限制

### 7.3 权限相关错误
- `E_PERM_INSUFFICIENT` - 权限不足，用于统计分析和导出功能的访问控制
- `E_AUTH_REQUIRED` - 需要身份验证

## 8. 实现优先级

### 高优先级 (必须实现)
1. 用户权限检查 API - 所有页面都需要权限验证
2. 基础的统计分析数据 API - 至少返回模拟数据结构
3. 导出任务创建和状态查询 - 核心导出功能

### 中优先级 (建议实现)  
1. 导出历史记录 API
2. 详细的统计分析数据处理
3. 真实数据的导出生成

### 低优先级 (可后期优化)
1. 导出任务的高级管理功能
2. 统计数据的缓存和优化
3. 导出文件的高级格式支持

## 9. 数据安全注意事项

1. **下载链接安全**: 
   - 导出的下载链接应使用临时签名URL
   - 建议设置较短的有效期(如1小时)
   - 链接应包含用户权限验证

2. **数据脱敏**:
   - 导出数据中的敏感个人信息应根据用户角色进行脱敏
   - 管理员可看全部信息，其他角色看部分信息

3. **审计日志**:
   - 所有导出操作都应记录审计日志
   - 包括操作者、导出内容、时间等信息