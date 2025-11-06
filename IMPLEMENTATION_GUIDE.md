# 医生端前端API集成实施指南

## 📋 项目概述

本项目为医院挂号系统的医生端前端应用,基于Vue 3 + TypeScript + Element Plus开发。本次工作完成了API接口的集成,将前端与后端服务连接。

## ✅ 已完成的工作

### 1. API服务层实现

#### 1.1 TypeScript类型定义 (`src/services/types.ts`)

定义了所有API相关的TypeScript类型接口:

- **基础响应类型**: `ApiResponse<T>`
- **登录相关**: `LoginRequest`, `LoginResponse`
- **排班相关**: `Shift`, `ShiftsResponse`
- **患者相关**: `Patient`, `PatientsResponse`, `RegisterRecord`
- **加号申请**: `AddNumberApplication`, `AddNumberResultRequest`
- **系统通知**: `Notification`, `NotificationsResponse`
- **医生信息**: `DoctorProfile`, `DoctorProfileResponse`
- **班次变更**: `ScheduleChangeRequest`
- **就诊状态**: `PatientStatusRequest`
- **SSE事件**: `SSEMessageHandler`, `SSEErrorHandler`

#### 1.2 Axios配置和API函数 (`src/services/api.ts`)

完整实现了Axios实例配置和所有API接口函数:

**Axios配置**:

- 自动添加Authorization头(Bearer Token)
- 请求/响应拦截器
- 统一错误处理(401/403/404/500等)
- 自动重定向到登录页(未授权时)

**API接口函数**(共10个):

1. `login()` - 医生登录
2. `getShifts()` - 获取排班列表
3. `getPatients()` - 获取患者列表
4. `getRegisterRecords()` - 获取患者挂号记录
5. `submitAddNumberResult()` - 审核加号请求
6. `getDoctorProfile()` - 获取医生个人信息
7. `submitScheduleChangeRequest()` - 提交班次变更申请
8. `updatePatientStatus()` - 更新患者就诊状态
9. `subscribeAddNumberNotifications()` - 订阅加号申请(SSE)
10. `subscribeNotifications()` - 订阅系统通知(SSE)

**SSE支持**:

- 实现了Server-Sent Events连接
- 自动JSON解析
- 错误处理和重连机制

### 2. 数据转换层实现

#### 2.1 数据转换工具 (`src/utils/dataTransform.ts`)

实现了API数据格式与前端展示格式之间的转换:

**常量映射**:

- `TIME_PERIOD_MAP`: 时段编号 -> 文本 (1:"上午", 2:"下午", 3:"晚上")
- `TIME_PERIOD_DETAIL_MAP`: 时段编号 -> 详细时间
- `TIME_PERIOD_REVERSE_MAP`: 时段文本 -> 编号

**转换函数**:

1. `formatDateTime()` - ISO时间 -> 本地格式
2. `transformPatient()` - API患者数据 -> 前端格式
3. `transformAddNumberRequest()` - API加号申请 -> 前端格式
4. `transformNotification()` - API通知 -> 前端格式
5. `transformScheduleToWeekTable()` - 线性排班列表 -> 周表格格式
6. `getDateFromWeekday()` - 周几+偏移 -> 具体日期

#### 2.2 数据管理Composable (`src/composables/useDoctorData.ts`)

创建了Vue Composition API的可复用数据管理逻辑:

**功能**:

- 统一管理医生数据(个人信息、排班、患者、通知等)
- 自动订阅SSE连接
- 组件挂载时自动初始化
- 组件卸载时自动清理资源
- Loading和Error状态管理

**导出的数据和方法**:

- `doctorProfile` - 医生个人信息
- `shifts` - 排班列表
- `patients` - 患者列表
- `addNumberRequests` - 加号申请列表
- `notifications` - 系统通知列表
- `loadDoctorProfile()` - 加载医生信息
- `loadShifts()` - 加载排班数据
- `loadPatients()` - 加载患者列表
- `initialize()` - 初始化所有数据

### 3. 环境配置

创建了三个环境配置文件:

- `.env` - 默认配置
- `.env.development` - 开发环境配置
- `.env.production` - 生产环境配置

所有文件都定义了 `VITE_API_BASE_URL` 变量用于配置后端API地址。

### 4. 登录页面集成 (`src/views/DoctorLogin.vue`)

更新了登录页面以使用真实API:

**变更**:

- 从模拟登录改为调用真实API
- 使用 `login()` API函数
- 保存返回的token和doctorId到localStorage
- 添加了TypeScript类型支持
- 改进了错误处理

**字段映射**:

- 前端表单 `username` -> API `docId`
- 前端表单 `password` -> API `pass`

## 📊 API冲突分析报告

已生成详细的冲突分析报告: `API_CONFLICT_REPORT.md`

**关键发现**:

- ✅ **无不可调和的冲突**
- ⚠️ 7处需要数据转换的差异
- 📝 3条后端优化建议

**主要差异**:

1. 排班数据格式(线性列表 vs 周表格) - 已实现转换函数
2. 患者列表字段名不一致 - 已实现转换函数
3. 加号申请和通知的字段名差异 - 已实现转换函数
4. 时间格式(ISO vs 本地格式) - 已实现格式化函数

## 🚀 如何使用

### 1. 在组件中使用API

#### 方式A: 直接调用API函数

```typescript
import { login, getPatients, getDoctorProfile } from '@/services/api'

// 登录
const response = await login({ docId: 'DOC001', pass: 'password' })
localStorage.setItem('token', response.token)

// 获取患者列表
const patients = await getPatients('DOC001')
console.log(patients.patients)
```

#### 方式B: 使用Composable(推荐)

```typescript
import { useDoctorData } from '@/composables/useDoctorData'

const { doctorProfile, shifts, patients, addNumberRequests, notifications, loading, error } =
  useDoctorData()

// 数据会自动加载和订阅
```

### 2. 使用数据转换工具

```typescript
import {
  transformPatient,
  transformAddNumberRequest,
  transformScheduleToWeekTable,
  TIME_PERIOD_MAP,
} from '@/utils/dataTransform'

// 转换患者数据
const apiPatient = await getPatients('DOC001')
const frontendPatients = apiPatient.patients.map(transformPatient)

// 转换排班数据
const apiShifts = await getShifts('DOC001')
const { scheduleData, weekDays, scheduleMap } = transformScheduleToWeekTable(apiShifts.shifts)

// 时段编号转文本
const timePeriodText = TIME_PERIOD_MAP[1] // "上午"
```

### 3. SSE连接示例

```typescript
import { subscribeAddNumberNotifications } from '@/services/api'

// 订阅加号申请通知
const eventSource = subscribeAddNumberNotifications(
  'DOC001',
  (data) => {
    console.log('收到加号申请:', data.addApplications)
    // 更新UI
  },
  (error) => {
    console.error('SSE错误:', error)
  },
)

// 组件卸载时关闭连接
onUnmounted(() => {
  eventSource.close()
})
```

## 📁 项目结构

```
/home/user/HRS_DoctorUI/
├── src/
│   ├── services/               # API服务层
│   │   ├── api.ts             # Axios配置和API函数
│   │   └── types.ts           # TypeScript类型定义
│   ├── utils/                 # 工具函数
│   │   └── dataTransform.ts   # 数据转换工具
│   ├── composables/           # Vue Composables
│   │   └── useDoctorData.ts   # 医生数据管理
│   ├── views/                 # 页面组件
│   │   ├── DoctorLogin.vue    # 登录页(已集成API)
│   │   └── Home.vue           # 主页(待集成)
│   ├── router/                # 路由配置
│   │   └── index.ts           # 路由定义
│   └── main.ts                # 应用入口
├── .env                        # 环境变量(默认)
├── .env.development            # 开发环境
├── .env.production             # 生产环境
├── API_CONFLICT_REPORT.md      # API冲突分析报告
├── IMPLEMENTATION_GUIDE.md     # 实施指南(本文件)
└── 医院挂号系统-医生端.apifox.json  # API文档
```

## 🔧 待完成的工作

### 1. Home.vue集成(高优先级)

Home.vue是主要的工作台页面,需要将模拟数据替换为真实API调用:

**需要更新的功能**:

- ✅ 医生个人信息展示(使用 `getDoctorProfile()`)
- ✅ 排班表显示(使用 `getShifts()` + `transformScheduleToWeekTable()`)
- ✅ 患者列表(使用 `getPatients()` + `transformPatient()`)
- ✅ 加号申请列表(使用 `subscribeAddNumberNotifications()`)
- ✅ 系统通知列表(使用 `subscribeNotifications()`)
- ✅ 审核加号请求(使用 `submitAddNumberResult()`)
- ✅ 患者接诊(使用 `updatePatientStatus()`)
- ✅ 班次变更申请(使用 `submitScheduleChangeRequest()`)

**建议实施方式**:

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDoctorData } from '@/composables/useDoctorData'
import {
  transformScheduleToWeekTable,
  transformPatient,
  transformAddNumberRequest,
  transformNotification,
} from '@/utils/dataTransform'
import {
  submitAddNumberResult,
  updatePatientStatus,
  submitScheduleChangeRequest,
} from '@/services/api'

// 使用composable获取数据
const { doctorProfile, shifts, patients, addNumberRequests, notifications, loading } =
  useDoctorData()

// 转换数据为前端格式
const scheduleTransform = computed(() => transformScheduleToWeekTable(shifts.value))
const scheduleData = computed(() => scheduleTransform.value.scheduleData)
const weekDays = computed(() => scheduleTransform.value.weekDays)

const patientList = computed(() => patients.value.map(transformPatient))
const requestList = computed(() => addNumberRequests.value.map(transformAddNumberRequest))
const notificationList = computed(() => notifications.value.map(transformNotification))

// ... 其余逻辑
</script>
```

### 2. 后端协调(建议)

根据 `API_CONFLICT_REPORT.md` 中的建议,与后端团队协调以下优化:

#### 2.1 患者列表增加科室字段

**当前**: `GET /doctor/patients` 未返回科室信息
**建议**: 增加 `department` 字段

#### 2.2 排班数据增加排班ID

**当前**: 排班列表缺少 `scheduleId`
**建议**: 返回格式改为:

```json
{
  "shifts": [
    {
      "scheduleId": "SCHEDULE001",
      "date": "2025-10-23",
      "docName": "张医生",
      "timePeriod": 1,
      "docId": "DOC001"
    }
  ]
}
```

#### 2.3 时段编号规范文档化

**建议**: 在API文档中明确标注:

- 1 = 上午 (8:00-12:00)
- 2 = 下午 (14:00-18:00)
- 3 = 晚上 (19:00-21:00)

### 3. 错误处理增强

- 添加全局错误处理组件
- 实现错误日志收集
- 添加离线提示

### 4. 性能优化

- 实现数据缓存机制
- 添加请求防抖/节流
- 优化SSE重连策略

### 5. 测试

- 编写单元测试(Vitest)
- 编写E2E测试(Playwright)
- API集成测试

## 🧪 测试建议

### 手动测试检查清单

- [ ] 登录功能测试
  - [ ] 正确账号密码登录成功
  - [ ] 错误账号密码提示错误
  - [ ] Token正确保存
  - [ ] 登录后正确跳转

- [ ] 数据加载测试
  - [ ] 排班数据正确显示
  - [ ] 患者列表正确显示
  - [ ] 加号申请实时更新
  - [ ] 系统通知实时更新

- [ ] 交互功能测试
  - [ ] 患者接诊功能
  - [ ] 加号申请审核(同意/拒绝)
  - [ ] 班次变更申请提交
  - [ ] 退出登录功能

- [ ] 错误场景测试
  - [ ] 网络断开处理
  - [ ] Token过期处理
  - [ ] 服务器错误处理
  - [ ] SSE连接中断重连

## 🔐 安全注意事项

1. **Token存储**: 当前使用localStorage,生产环境建议使用httpOnly Cookie
2. **请求加密**: 生产环境必须使用HTTPS
3. **XSS防护**: Element Plus已内置防护,但需注意动态HTML渲染
4. **CSRF防护**: 如需要,可在Axios中添加CSRF Token

## 📞 联系与支持

如有问题,请联系:

- 项目文档: `README.md`
- API文档: `医院挂号系统-医生端.apifox.json`
- 冲突报告: `API_CONFLICT_REPORT.md`

---

**实施日期**: 2025-10-28  
**实施工具**: Claude Code  
**版本**: v1.0.0
