# Mock 数据说明

本目录包含用于前端开发和测试的模拟数据。

## 加号申请记录 (Add Number Applications)

### 数据文件

- `addNumberApplications.ts` - 包含两个加号申请记录的示例数据

### 用例说明

#### 用例1: 紧急加号申请 (urgentAddNumberApplication)

```typescript
{
  addId: 'ADD001',
  patientName: '张三',
  applyTime: '2025-11-14T09:30:00',
  targetDate: '2025-11-14',
  targetTimePeriod: 2, // 下午时段
  note: '患者突发高烧39.5度,伴有咳嗽症状,急需就诊。家属已在医院等候,恳请医生加号处理。'
}
```

**场景描述**: 患者因突发症状需要紧急就诊,申请当天下午时段加号

**测试要点**:

- 验证紧急情况的加号申请显示
- 测试医生快速审批流程
- 验证当天加号的时间冲突检测

#### 用例2: 常规加号申请 (regularAddNumberApplication)

```typescript
{
  addId: 'ADD002',
  patientName: '李四',
  applyTime: '2025-11-14T10:15:00',
  targetDate: '2025-11-15',
  targetTimePeriod: 1, // 上午时段
  note: '因临时出差无法按原预约时间就诊,希望能够加号到明天上午时段。患者已提前完成相关检查。'
}
```

**场景描述**: 患者因工作原因无法按原计划就诊,申请改约至明天上午

**测试要点**:

- 验证常规加号申请的显示和处理流程
- 测试跨日期的加号申请
- 验证申请原因的完整显示

## 使用方法

### 方法1: 直接导入使用

在组件中直接导入mock数据:

```typescript
import { getMockAddNumberApplications } from '@/mock/addNumberApplications'

// 在开发环境中使用mock数据
const mockData = getMockAddNumberApplications()
console.log('Mock加号申请列表:', mockData)
```

### 方法2: 在 composable 中使用

修改 `useDoctorData.ts` 以支持mock模式:

```typescript
import { getMockAddNumberApplications } from '@/mock/addNumberApplications'

// 在开发环境中,可以用mock数据替代API调用
if (import.meta.env.DEV && useMockData) {
  addNumberRequests.value = getMockAddNumberApplications()
}
```

### 方法3: 在API层模拟响应

修改 `api.ts` 中的SSE连接函数,在开发环境中返回mock数据:

```typescript
import { mockAddNumberApplicationsResponse } from '@/mock/addNumberApplications'

export function subscribeAddNumberNotifications(
  docId: string | undefined,
  onMessage: SSEMessageHandler<AddNumberApplicationsResponse>,
  onError?: SSEErrorHandler,
): EventSource {
  // 开发模式下使用mock数据
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK) {
    setTimeout(() => {
      onMessage(mockAddNumberApplicationsResponse)
    }, 1000)

    return {
      close: () => {},
      // ... 其他EventSource接口实现
    } as EventSource
  }

  // 生产模式使用真实API
  const url = docId ? `/add_number_notify_doctor?docId=${docId}` : '/add_number_notify_doctor'
  return createSSEConnection<AddNumberApplicationsResponse>(url, onMessage, onError)
}
```

### 方法4: 在浏览器控制台测试

```javascript
// 导入mock数据(需要在组件中先导入并暴露到window)
import {
  getMockAddNumberApplications,
  getMockAddNumberApplicationById,
} from '@/mock/addNumberApplications'

// 获取所有mock数据
const allApplications = getMockAddNumberApplications()
console.table(allApplications)

// 根据ID获取特定申请
const urgentApp = getMockAddNumberApplicationById('ADD001')
console.log('紧急申请:', urgentApp)
```

## 数据转换示例

使用 `dataTransform.ts` 中的转换函数将mock数据转换为前端格式:

```typescript
import { getMockAddNumberApplications } from '@/mock/addNumberApplications'
import { transformAddNumberRequest } from '@/utils/dataTransform'

const mockApplications = getMockAddNumberApplications()
const frontendData = mockApplications.map(transformAddNumberRequest)

console.log('转换后的前端数据:', frontendData)
// 输出格式:
// [
//   {
//     addId: 'ADD001',
//     patientName: '张三',
//     requestTime: '2025-11-14 09:30',
//     reason: '患者突发高烧39.5度...',
//     targetDate: '2025-11-14',
//     targetShift: '下午'
//   },
//   ...
// ]
```

## 环境变量配置

在 `.env.development` 文件中添加以下配置以启用mock模式:

```env
# 启用mock数据
VITE_USE_MOCK=true
```

## 扩展Mock数据

如需添加更多mock数据,可以在 `addNumberApplications.ts` 中添加新的示例:

```typescript
export const anotherAddNumberApplication: AddNumberApplication = {
  addId: 'ADD003',
  patientName: '王五',
  applyTime: '2025-11-14T13:30:00',
  targetDate: '2025-11-16',
  targetTimePeriod: 3, // 晚上时段
  note: '复诊患者,需要进行后续检查。',
}

// 更新获取函数
export function getMockAddNumberApplications(): AddNumberApplication[] {
  return [urgentAddNumberApplication, regularAddNumberApplication, anotherAddNumberApplication]
}
```

## 注意事项

1. **时间格式**: 确保 `applyTime` 使用 ISO 8601 格式 (例如: `2025-11-14T09:30:00`)
2. **时段编号**: `targetTimePeriod` 的有效值为 1(上午), 2(下午), 3(晚上)
3. **日期格式**: `targetDate` 使用 ISO 日期格式 (例如: `2025-11-14`)
4. **唯一ID**: 每个 `addId` 必须是唯一的
5. **生产环境**: 确保mock数据仅在开发/测试环境中使用,不要打包到生产环境
