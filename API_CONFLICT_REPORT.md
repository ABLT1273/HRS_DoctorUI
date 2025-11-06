# API接口与前端展示逻辑冲突分析报告

## 执行摘要

通过对比 `医院挂号系统-医生端.apifox.json` API文档与现有前端代码(`Home.vue`),发现了几处数据格式不匹配的问题。这些问题需要在前端进行数据转换处理,但总体上**没有不可调和的冲突**。

## 详细冲突分析

### 1. 排班列表数据格式差异 ⚠️ 需要转换

#### API返回格式

```typescript
{
  shifts: [
    {
      date: '2025-10-23', // ISO日期格式
      docName: '张医生',
      timePeriod: 1, // 时段编号: 1=上午, 2=下午, 3=晚上
      docId: 'DOC001',
    },
  ]
}
```

#### 前端期望格式

前端使用的是**周表格展示**,数据结构为:

```typescript
;[
  {
    timeSlot: '上午 8:00-12:00',
    week1_mon: '李医生',
    week1_tue: '张艺',
    week1_wed: '',
    // ... 17列周的数据
  },
]
```

#### 解决方案

需要编写数据转换函数,将线性的排班列表转换为周表格格式:

- 将 `timePeriod` (1/2/3) 映射到 timeSlot
- 将 `date` 按周分组,转换为 week\*\_day 格式
- 填充 `docName` 到对应单元格

**影响程度**: 中等 - 需要额外的数据处理逻辑  
**可解决性**: ✅ 完全可解决

---

### 2. 患者列表字段名差异 ⚠️ 轻微差异

#### API返回格式

```typescript
{
  patients: [
    {
      patientName: '张三', // API使用 patientName
      registerId: 'REG001',
      gender: '男',
      age: 35,
      scheduleDate: '2025-10-23',
      timePeriod: 1, // API使用 timePeriod (数字)
    },
  ]
}
```

#### 前端期望格式

```typescript
{
  name: "张三",               // 前端使用 name
  gender: "男",
  age: 35,
  department: "内科",        // API未返回科室信息
  date: "2025-10-23",        // 前端使用 date
  shift: "上午"              // 前端使用 shift (文本)
}
```

#### 解决方案

1. 字段名映射: `patientName` → `name`, `scheduleDate` → `date`
2. 时段转换: `timePeriod` (1/2/3) → `shift` ("上午"/"下午"/"晚上")
3. 科室字段缺失: 需要从其他接口补充,或要求后端添加该字段

**影响程度**: 轻微 - 简单的字段映射  
**可解决性**: ✅ 完全可解决

---

### 3. 加号申请通知格式差异 ⚠️ 字段名不一致

#### API返回格式 (SSE)

```typescript
{
  addApplications: [
    {
      addId: 'ADD001', // API使用 addId
      patientName: '周八',
      applyTime: '2025-10-01T12:30:00', // ISO datetime
      targetDate: '2025-10-23',
      targetTimePeriod: 1,
      note: '急性腹痛', // API使用 note
    },
  ]
}
```

#### 前端期望格式

```typescript
{
  patientName: "周八",
  requestTime: "2025-10-01 12:30",  // 格式化后的时间
  reason: "急性腹痛"                // 前端使用 reason
}
```

#### 解决方案

1. 字段映射: `applyTime` → `requestTime`, `note` → `reason`
2. 时间格式化: 将 ISO datetime 转换为本地格式
3. 保存 `addId` 用于审核操作

**影响程度**: 轻微 - 简单的字段映射和格式化  
**可解决性**: ✅ 完全可解决

---

### 4. 系统通知格式差异 ⚠️ 字段名不一致

#### API返回格式 (SSE)

```typescript
{
  notifications: [
    {
      id: 'NOTIFY001',
      title: '系统维护通知',
      content: '系统将于今晚22:00-24:00进行维护...',
      createdAt: '2025-10-01T08:00:00', // ISO datetime
    },
  ]
}
```

#### 前端期望格式

```typescript
{
  title: "系统维护通知",
  content: "系统将于今晚22:00-24:00进行维护...",
  time: "2025-10-01 08:00"  // 格式化后的时间
}
```

#### 解决方案

1. 字段映射: `createdAt` → `time`
2. 时间格式化: 将 ISO datetime 转换为本地格式

**影响程度**: 轻微 - 简单的字段映射和格式化  
**可解决性**: ✅ 完全可解决

---

### 5. 医生个人信息展示差异 ⚠️ 缺少诊室ID

#### API返回格式

```typescript
{
  doctor: {
    doctorId: "DOC001",
    name: "张艺",
    department: "内科",
    clinicId: "CLINIC001",    // 诊室ID
    title: "主治医师"
  }
}
```

#### 前端期望展示

```vue
<el-descriptions-item label="姓名">{{ username }}</el-descriptions-item>
<el-descriptions-item label="ID">123456</el-descriptions-item>
<el-descriptions-item label="科室">内科</el-descriptions-item>
<el-descriptions-item label="职称">主治医师</el-descriptions-item>
```

#### 解决方案

API提供的字段完全满足前端需求,直接映射即可:

- `name` → 姓名
- `doctorId` → ID
- `department` → 科室
- `title` → 职称
- `clinicId` → 可选展示(诊室)

**影响程度**: 无冲突  
**可解决性**: ✅ 完美匹配

---

### 6. 班次变更申请参数差异 ⚠️ 需要参数转换

#### 前端表单数据

```typescript
{
  type: "leave",          // 或 "shift"
  leaveDays: 3,
  leaveReason: "家中有事",
  selectedShift: "周一 上午",
  shiftReason: "需要处理紧急事务"
}
```

#### API期望格式

```typescript
{
  docId: "DOC001",
  originalScheduleId: "SCHEDULE001",  // 原班次ID
  changeType: 1,                       // 0=调班, 1=请假
  targetDate: "2025-10-23",            // 调班时需要
  timePeriod: 1,                       // 调班时需要
  targetDoctorId: "DOC002",            // 调班时可选
  leaveTimeLength: 3,                  // 请假天数
  reason: "家中有事"
}
```

#### 解决方案

1. 类型转换: `"leave"` → `changeType: 1`, `"shift"` → `changeType: 0`
2. 获取 `originalScheduleId`: 从选中的排班单元格中获取
3. 解析目标时间: 将 "周一 上午" 转换为具体的 `targetDate` 和 `timePeriod`

**影响程度**: 中等 - 需要额外的ID查询和日期计算  
**可解决性**: ✅ 可解决,但需要维护排班ID映射

---

### 7. 患者就诊状态切换 ⚠️ 前端未实现

#### API接口

```
POST /doctor/patient/status
{
  doctorId: "DOC001",
  registerId: "REG001",
  doctorStatus: 1,      // 0=空闲, 1=坐诊
  patientStatus: 1      // 0=未就诊, 1=就诊中, 2=完成
}
```

#### 前端现状

前端当前只有"接诊"按钮,点击后显示消息:

```javascript
const handleDiagnosis = (index) => {
  ElMessage.success(`已开始接诊 ${patientList.value[index].name}`)
  // 实际项目中应该跳转到诊疗页面
}
```

#### 解决方案

1. 在接诊时调用 `updatePatientStatus` API
2. 设置 `doctorStatus: 1` (坐诊中)
3. 设置 `patientStatus: 1` (就诊中)
4. 完成诊疗后调用 API 设置 `patientStatus: 2` (完成)

**影响程度**: 中等 - 需要新增API调用  
**可解决性**: ✅ 完全可解决

---

## 不可调和的冲突

**无** - 所有冲突都可以通过数据转换和适配层解决。

---

## 需要后端配合的优化建议

### 1. 患者列表缺少科室信息

**问题**: API的 `GET /doctor/patients` 未返回患者的 `department` 字段  
**建议**: 后端在返回患者列表时增加科室信息

### 2. 排班数据缺少排班ID

**问题**: 班次变更申请需要 `originalScheduleId`,但当前API未在排班列表中提供  
**建议**: `GET /doctor/shifts` 返回时增加 `scheduleId` 字段

示例:

```typescript
{
  shifts: [
    {
      scheduleId: 'SCHEDULE001', // 新增字段
      date: '2025-10-23',
      docName: '张医生',
      timePeriod: 1,
      docId: 'DOC001',
    },
  ]
}
```

### 3. 时段编号规范

**建议**: 在API文档中明确标注时段编号映射:

- `1` = 上午 (8:00-12:00)
- `2` = 下午 (14:00-18:00)
- `3` = 晚上 (19:00-21:00)

---

## 实施计划

### 阶段1: 数据适配层 (已完成)

✅ 创建 TypeScript 类型定义 (`src/services/types.ts`)  
✅ 配置 Axios 实例和拦截器 (`src/services/api.ts`)  
✅ 实现所有 API 接口函数

### 阶段2: 数据转换工具 (进行中)

🔄 创建排班数据转换函数  
🔄 创建时段映射工具  
🔄 创建时间格式化工具  
🔄 集成到前端组件

### 阶段3: UI集成 (待完成)

⏳ 更新 `DoctorLogin.vue` 使用真实API (已完成)  
⏳ 更新 `Home.vue` 使用真实API  
⏳ 测试所有功能  
⏳ 处理边界情况和错误

---

## 结论

经过详细分析,**API接口与前端展示逻辑之间不存在不可调和的冲突**。所有差异都可以通过以下方式解决:

1. ✅ **数据转换**: 字段名映射、格式转换
2. ✅ **适配层**: 在前端创建数据适配函数
3. ✅ **时间格式化**: 统一时间格式处理
4. ⚠️ **后端优化** (可选): 增加缺失字段以提升用户体验

建议按照上述实施计划继续推进前后端集成工作。

---

**生成时间**: 2025-10-28  
**分析工具**: Claude Code  
**API文档版本**: 医院挂号系统-医生端.apifox.json
