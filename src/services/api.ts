import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  ShiftsResponse,
  PatientsResponse,
  RegisterRecordsResponse,
  AddNumberApplicationsResponse,
  AddNumberResultRequest,
  AddNumberResultResponse,
  NotificationsResponse,
  DoctorProfileResponse,
  ScheduleChangeRequest,
  ScheduleChangeResponse,
  PatientStatusRequest,
  SSEMessageHandler,
  SSEErrorHandler,
} from './types'

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: '/doctor',
  timeout: 3000,
  withCredentials: true, // 允许发送认证信息
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  },
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    console.error('响应错误:', error)

    // 处理错误
    if (error.response) {
      // 对于 500 错误，如果响应体中有业务 code（如 409），则返回响应而不是抛出异常
      // 这样可以在业务层处理特殊的业务错误码
      if (error.response.status === 500 && error.response.data) {
        const data = error.response.data as any
        if (data && typeof data.code === 'number') {
          // 有业务 code，返回响应供业务层处理
          return error.response
        }
      }

      switch (error.response.status) {
        case 401:
          {
            // 清除本地存储
            localStorage.removeItem('token')
            localStorage.removeItem('doctorAccount')
            // 判断是否是登录请求
            const isLoginRequest = error.config?.isLogin
            if (!isLoginRequest) {
              ElMessage.error('未授权，请重新登录')
              router.push('/login')
            }
          }
          break
        case 403:
          ElMessage.error('无权访问')
          break
        case 404:
          ElMessage.error('请求资源不存在')
          break
        case 500:
          ElMessage.error('服务器未响应，请稍后再试')
          break
        default:
          ElMessage.error(`请求失败: ${error.response.status}`)
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接')
    } else {
      ElMessage.error('请求配置错误')
    }

    return Promise.reject(error)
  },
)

// ============== API 接口函数 ==============

/**
 * 登录
 * POST /doctor/login
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>('/login', credentials, {
    // 标记登录请求，避免401时重复提示
    isLogin: true,
  })

  type LoginPayload = ApiResponse<LoginResponse> &
    Partial<LoginResponse> & {
      doctorID?: string
    }

  const data = response.data as LoginPayload

  const resolvedToken = data.data?.token ?? data.token
  const resolvedDoctorId = data.data?.doctorId ?? data.doctorId ?? data.doctorID ?? undefined

  if (resolvedToken && typeof resolvedToken === 'string') {
    if (!resolvedDoctorId || typeof resolvedDoctorId !== 'string') {
      throw new Error('登录响应缺少医生ID')
    }
    return {
      token: resolvedToken,
      doctorId: resolvedDoctorId,
    }
  }

  if (data.code === 200 && data.data) {
    return data.data
  }

  throw new Error(data.msg || '登录失败')
}

/**
 * 获取当前医生的排班信息（仅返回当前医生的排班）
 * GET /doctor/selfshifts
 */
export async function getSelfShifts(docId?: string): Promise<ShiftsResponse> {
  const response = await apiClient.get<ApiResponse<ShiftsResponse>>('/selfshifts', {
    params: { docId },
  })
  const data = response.data as any
  console.log('当前医生排班接口原始响应:', data)
  // 处理后端返回的嵌套结构 { code, msg, data: { shifts: [...] } }
  if (data.data && Array.isArray(data.data.shifts)) {
    console.log('当前医生排班数据(嵌套格式):', data.data.shifts)
    return data.data
  }
  // 如果已经是正确格式 { shifts: [...] }
  if (Array.isArray(data.shifts)) {
    console.log('当前医生排班数据(直接格式):', data.shifts)
    return data
  }
  console.error('当前医生排班数据格式不正确:', data)
  throw new Error('排班数据格式错误')
}

/**
 * 获取所有医生的排班信息（用于调班时查看可用班次）
 * GET /doctor/shifts
 */
export async function getShifts(docId?: string): Promise<ShiftsResponse> {
  const response = await apiClient.get<ApiResponse<ShiftsResponse>>('/shifts', {
    params: { docId },
  })
  const data = response.data as any
  console.log('所有医生排班接口原始响应:', data)
  // 处理后端返回的嵌套结构 { code, msg, data: { shifts: [...] } }
  if (data.data && Array.isArray(data.data.shifts)) {
    console.log('所有医生排班数据(嵌套格式):', data.data.shifts)
    return data.data
  }
  // 如果已经是正确格式 { shifts: [...] }
  if (Array.isArray(data.shifts)) {
    console.log('所有医生排班数据(直接格式):', data.shifts)
    return data
  }
  console.error('所有医生排班数据格式不正确:', data)
  throw new Error('排班数据格式错误')
}

/**
 * 获取患者列表
 * GET /doctor/patients
 */
export async function getPatients(docId: string): Promise<PatientsResponse> {
  const response = await apiClient.get<ApiResponse<PatientsResponse>>('/patients', {
    params: { docId },
  })
  const data = response.data as any
  // 处理后端返回的嵌套结构 { code, msg, data: { patients: [...] } }
  if (data.data && Array.isArray(data.data.patients)) {
    return data.data
  }
  // 如果已经是正确格式 { patients: [...] }
  if (Array.isArray(data.patients)) {
    return data
  }
  throw new Error('患者列表数据格式错误')
}

/**
 * 获取挂号记录详情
 * GET /doctor/register/{registerId}
 */
export async function getRegisterRecords(
  registerId: string,
  docId?: string,
): Promise<RegisterRecordsResponse> {
  const response = await apiClient.get<ApiResponse<RegisterRecordsResponse>>(`/register/${registerId}`, {
    params: { docId },
  })
  const data = response.data as any
  // 处理后端返回的嵌套结构 { code, msg, data: { records: [...] } }
  if (data.data && Array.isArray(data.data.records)) {
    return data.data
  }
  // 如果已经是正确格式 { records: [...] }
  if (Array.isArray(data.records)) {
    return data
  }
  throw new Error('挂号记录数据格式错误')
}

/**
 * 提交加号结果
 * POST /doctor/add_number_result
 * 返回格式: { code, msg, data: { decision: "approved"/"rejected", message: "..." } }
 */
export async function submitAddNumberResult(
  request: AddNumberResultRequest,
): Promise<ApiResponse<AddNumberResultResponse>> {
  const response = await apiClient.post<ApiResponse<AddNumberResultResponse>>(
    '/add_number_result',
    request,
  )
  return response.data
}

/**
 * 获取医生个人信息
 * GET /doctor/{docID}/profile
 */
export async function getDoctorProfile(docId: string): Promise<DoctorProfileResponse> {
  const response = await apiClient.get<ApiResponse<DoctorProfileResponse>>(`/${docId}/profile`)
  const data = response.data as any
  // 处理后端返回的嵌套结构 { code, msg, data: { doctor: {...} } }
  if (data.data && data.data.doctor) {
    return data.data
  }
  // 如果已经是正确格式 { doctor: {...} }
  if (data.doctor) {
    return data
  }
  throw new Error('医生信息数据格式错误')
}

/**
 * 提交排班变更申请
 * POST /doctor/schedule_change_request
 */
export async function submitScheduleChangeRequest(
  request: ScheduleChangeRequest,
): Promise<ApiResponse<ScheduleChangeResponse>> {
  const response = await apiClient.post<ApiResponse<ScheduleChangeResponse>>(
    '/schedule_change_request',
    request,
  )
  return response.data
}

/**
 * 更新患者状态
 * POST /doctor/patient/status
 */
export async function updatePatientStatus(request: PatientStatusRequest): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>('/patient/status', request)
  return response.data
}

// ============== SSE 连接函数 ==============

/**
 * 创建 SSE 连接的通用函数
 */
function createSSEConnection<T>(
  url: string,
  eventName: string,
  onMessage: SSEMessageHandler<T>,
  onError?: SSEErrorHandler,
): EventSource {
  const token = localStorage.getItem('token')
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/doctor'

  // 构建完整 URL 并添加 token
  const fullUrl = `${baseURL}${url}${url.includes('?') ? '&' : '?'}token=${token}`

  const eventSource = new EventSource(fullUrl)

  // 监听自定义事件名（后端使用 .name(eventName) 发送）
  eventSource.addEventListener(eventName, (event) => {
    try {
      const result = JSON.parse(event.data) as ApiResponse<T>
      // 后端返回的是 Result 包装格式: { code, msg, data: {...} }
      // 需要提取 data 部分传给回调函数
      if (result.code === 200 && result.data) {
        onMessage(result.data)
      } else {
        console.error('SSE 消息错误:', result.msg)
        if (onError) {
          onError(new Error(result.msg || 'SSE 消息处理失败'))
        }
      }
    } catch (error) {
      console.error('SSE 消息解析错误:', error)
      if (onError) {
        onError(error as Error)
      }
    }
  })

  // 备用：监听默认 message 事件（用于调试）
  eventSource.onmessage = (event) => {
    console.log('[SSE 默认消息]', event.data)
  }

  eventSource.onopen = () => {
    console.log(`[SSE 已连接] ${eventName}`)
  }

  eventSource.onerror = (event) => {
    console.error(`[SSE 连接错误] ${eventName}:`, event)
    if (onError) {
      const emittedError = event instanceof Error ? event : new Error('SSE 连接发生错误')
      onError(emittedError)
    }
  }

  return eventSource
}

/**
 * 订阅加号申请的SSE通知
 * GET /doctor/add_number_notify_doctor
 * 后端事件名: "add-number-updated"
 */
export function subscribeAddNumberNotifications(
  docId: string | undefined,
  onMessage: SSEMessageHandler<AddNumberApplicationsResponse>,
  onError?: SSEErrorHandler,
): EventSource {
  const url = docId ? `/add_number_notify_doctor?docId=${docId}` : '/add_number_notify_doctor'
  return createSSEConnection<AddNumberApplicationsResponse>(
    url,
    'add-number-updated',
    onMessage,
    onError,
  )
}

/**
 * 订阅通知消息的SSE推送
 * GET /doctor/notifications
 * 后端事件名: "notification-updated" (假设与加号申请类似的命名)
 */
export function subscribeNotifications(
  docId: string,
  onMessage: SSEMessageHandler<NotificationsResponse>,
  onError?: SSEErrorHandler,
): EventSource {
  return createSSEConnection<NotificationsResponse>(
    `/notifications?docId=${docId}`,
    'notification-updated',
    onMessage,
    onError,
  )
}

// 导出 axios 实例供其他模块使用
export default apiClient
