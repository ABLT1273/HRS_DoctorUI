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
  NotificationsResponse,
  DoctorProfileResponse,
  ScheduleChangeRequest,
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
      switch (error.response.status) {
        case 401:
          {
            // 清除本地存储
            localStorage.removeItem('token')
            localStorage.removeItem('doctorAccount')
            // 判断是否是登录请求
            const isLoginRequest = (error.config as any)?.isLogin
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
          ElMessage.error('服务器错误')
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
  const response = await apiClient.post<ApiResponse<LoginResponse>>('/login', credentials)
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  throw new Error(response.data.msg || '登录失败')
}

/**
 * 获取排班信息
 * GET /doctor/shifts
 */
export async function getShifts(docId?: string): Promise<ShiftsResponse> {
  const response = await apiClient.get<ShiftsResponse>('/shifts', {
    params: { docId },
  })
  return response.data
}

/**
 * 获取患者列表
 * GET /doctor/patients
 */
export async function getPatients(docId: string): Promise<PatientsResponse> {
  const response = await apiClient.get<PatientsResponse>('/patients', {
    params: { docId },
  })
  return response.data
}

/**
 * 获取挂号记录详情
 * GET /doctor/register/{registerId}
 */
export async function getRegisterRecords(
  registerId: string,
  docId?: string,
): Promise<RegisterRecordsResponse> {
  const response = await apiClient.get<RegisterRecordsResponse>(`/register/${registerId}`, {
    params: { docId },
  })
  return response.data
}

/**
 * 提交加号结果
 * POST /doctor/add_number_result
 */
export async function submitAddNumberResult(request: AddNumberResultRequest): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>('/add_number_result', request)
  return response.data
}

/**
 * 获取医生个人信息
 * GET /doctor/{docID}/profile
 */
export async function getDoctorProfile(docId: string): Promise<DoctorProfileResponse> {
  const response = await apiClient.get<DoctorProfileResponse>(`/${docId}/profile`)
  return response.data
}

/**
 * 提交排班变更申请
 * POST /doctor/schedule_change_request
 */
export async function submitScheduleChangeRequest(
  request: ScheduleChangeRequest,
): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>('/schedule_change_request', request)
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
  onMessage: SSEMessageHandler<T>,
  onError?: SSEErrorHandler,
): EventSource {
  const token = localStorage.getItem('token')
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/doctor'

  // 构建完整 URL 并添加 token
  const fullUrl = `${baseURL}${url}${url.includes('?') ? '&' : '?'}token=${token}`

  const eventSource = new EventSource(fullUrl)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onMessage(data)
    } catch (error) {
      console.error('SSE 消息解析错误:', error)
      if (onError) {
        onError(error as Error)
      }
    }
  }

  eventSource.onerror = (error) => {
    console.error('SSE 连接错误:', error)
    if (onError) {
      onError(error as Error)
    }
  }

  return eventSource
}

/**
 * 订阅加号申请的SSE通知
 * GET /doctor/add_number_notify_doctor
 */
export function subscribeAddNumberNotifications(
  docId: string | undefined,
  onMessage: SSEMessageHandler<AddNumberApplicationsResponse>,
  onError?: SSEErrorHandler,
): EventSource {
  const url = docId ? `/add_number_notify_doctor?docId=${docId}` : '/add_number_notify_doctor'
  return createSSEConnection<AddNumberApplicationsResponse>(url, onMessage, onError)
}

/**
 * 订阅通知消息的SSE推送
 * GET /doctor/notifications
 */
export function subscribeNotifications(
  docId: string,
  onMessage: SSEMessageHandler<NotificationsResponse>,
  onError?: SSEErrorHandler,
): EventSource {
  return createSSEConnection<NotificationsResponse>(
    `/notifications?docId=${docId}`,
    onMessage,
    onError,
  )
}

// 导出 axios 实例供其他模块使用
export default apiClient
