// API 响应类型定义
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data?: T
}

// 登录
export interface LoginRequest {
  docAccount: string
  pass: string
}

export interface LoginResponse {
  token: string
  doctorId: string
}

// 排班
export interface Shift {
  scheduleId?: string
  date: string // ISO date format
  docName: string
  timePeriod: number // 时间段
  docId: string
  clinicPlace?: string // 诊室位置
}

export interface ShiftsResponse {
  shifts: Shift[]
}

// 患者
export interface Patient {
  patientName: string
  registerId: string
  gender: string
  age: number
  scheduleDate: string // ISO date format
  timePeriod: number
  patientStatus?: number // 0=已挂号, 1=就诊中, 2=已就诊
}

export interface PatientsResponse {
  patients: Patient[]
}

// 挂号记录
export interface RegisterRecord {
  registerId: string
  patientId: string
  registerTime: string // ISO datetime format
  department?: string
  scheduleDate?: string // ISO date format
}

export interface RegisterRecordsResponse {
  records: RegisterRecord[]
}

// 加号申请
export interface AddNumberApplication {
  addId: string
  patientName: string
  applyTime: string // ISO datetime format
  targetDate: string // ISO date format
  targetTimePeriod: number
  note?: string
}

export interface AddNumberApplicationsResponse {
  addApplications: AddNumberApplication[]
}

// 提交加号结果
export interface AddNumberResultRequest {
  addId: string
  approved: boolean
  note?: string
}

// 加号审核结果响应
export interface AddNumberResultResponse {
  decision: string // "approved" 或 "rejected"
  message: string // 中文友好提示
}

// 通知
export interface Notification {
  id: string
  title: string
  content: string
  createdAt: string // ISO datetime format
  accepted?: boolean // 是否已确认
}

export interface NotificationsResponse {
  notifications: Notification[]
}

// 通知确认请求
export interface NotificationAcceptedRequest {
  id: string // 消息记录ID
  docId: string // 医生ID
}

// 医生个人信息
export interface DoctorProfile {
  doctorId: string
  doctorAccount?: string
  name: string
  department: string
  title: string
  description?: string
}

export interface DoctorProfileResponse {
  doctor: DoctorProfile
}

// 排班变更申请
export interface ScheduleChangeRequest {
  docId: string
  originalTime: string // 格式: date_timePeriod, 例如: "2025-10-22_1"
  changeType: number // 0: 调到空班, 1: 请假, 2: 与某医生换班
  targetDate?: string // ISO date format (changeType=0/2时需要)
  timePeriod?: number // changeType=0/2时需要
  targetDoctorId?: string // changeType=2时需要，与某医生交换
  leaveTimeLength?: number // changeType=1时需要，请假天数
  reason?: string // 变更请求文本
}

// 排班变更申请响应
export interface ScheduleChangeResponse {
  docId: string // 本医生ID
  originalTime: string // 原班次时间，格式: "2025-10-22_1"
  changeType: number // 0=调到空班, 1=请假, 2=与某医生换班
  targetDate?: string // changeType=0/2时需要
  timePeriod?: number // changeType=0/2时需要
  targetDoctorId?: string // changeType=2时需要
  leaveTimeLength?: number // changeType=1时需要，请假天数
  reason?: string // 变更请求文本
}

// 更新患者状态
export interface PatientStatusRequest {
  doctorId: string
  registerId: string
  doctorStatus: number // 0=空闲, 1=坐诊
  patientStatus: number // 0=已挂号, 1=就诊中, 2=已就诊
}

// SSE 回调类型
export type SSEMessageHandler<T> = (data: T) => void
export type SSEErrorHandler = (error: Error) => void
