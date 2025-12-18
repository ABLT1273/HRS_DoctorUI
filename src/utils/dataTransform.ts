/**
 * 数据转换工具函数
 * 用于将API数据格式转换为前端显示格式
 */

import type { Shift, Patient, AddNumberApplication, Notification } from '@/services/types'

/**
 * 时段映射
 */
export const TIME_PERIOD_MAP: Record<number, string> = {
  1: '上午',
  2: '下午',
}

export const TIME_PERIOD_DETAIL_MAP: Record<number, string> = {
  1: '上午 8:00-12:30',
  2: '下午 13:30-18:00',
}

/**
 * 反向映射：时段名称 -> 时段编号
 */
export const TIME_PERIOD_REVERSE_MAP: Record<string, number> = {
  上午: 1,
  下午: 2,
}

/**
 * 将ISO时间格式化为易读格式
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 前端患者数据格式
 */
export interface FrontendPatient {
  name: string
  registerId: string
  gender: string
  age: number
  department?: string
  date: string
  shift: string
  timePeriod: number
  patientStatus: number // 0=已挂号, 1=就诊中, 2=已就诊
}

export function transformPatient(apiPatient: Patient): FrontendPatient {
  return {
    name: apiPatient.patientName,
    registerId: apiPatient.registerId,
    gender: apiPatient.gender,
    age: apiPatient.age,
    department: '内科',
    date: apiPatient.scheduleDate,
    shift: TIME_PERIOD_MAP[apiPatient.timePeriod] || '未知',
    timePeriod: apiPatient.timePeriod,
    patientStatus: apiPatient.patientStatus ?? 0, // 默认为已挂号状态
  }
}

/**
 * 前端加号申请数据格式
 */
export interface FrontendAddRequest {
  addId: string
  patientName: string
  requestTime: string
  reason: string
  targetDate: string
  targetShift: string
}

export function transformAddNumberRequest(apiRequest: AddNumberApplication): FrontendAddRequest {
  return {
    addId: apiRequest.addId,
    patientName: apiRequest.patientName,
    requestTime: formatDateTime(apiRequest.applyTime),
    reason: apiRequest.note || '无',
    targetDate: apiRequest.targetDate,
    targetShift: TIME_PERIOD_MAP[apiRequest.targetTimePeriod] || '未知',
  }
}

/**
 * 前端通知数据格式
 */
export interface FrontendNotification {
  id: string
  title: string
  content: string
  time: string
  accepted: boolean // 是否已确认
}

export function transformNotification(apiNotification: Notification): FrontendNotification {
  return {
    id: apiNotification.id,
    title: apiNotification.title,
    content: apiNotification.content,
    time: formatDateTime(apiNotification.createdAt),
    accepted: apiNotification.accepted ?? false,
  }
}

/**
 * 周排班表数据结构
 */
export interface WeekScheduleRow {
  timeSlot: string
  [key: string]: string
}

export interface WeekDayColumn {
  label: string
  prop: string
  date?: string
  weekLabel?: string // 周标签，如"本周"、"下周"
  dayDate?: string // 每天的日期，如"11.18"
}

export interface ScheduleTransformResult {
  scheduleData: WeekScheduleRow[]
  weekDays: WeekDayColumn[]
  scheduleMap: Map<string, Shift>
}

function getMonday(date: Date): Date {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(date.setDate(diff))
}

/**
 * 将前端排班数据转换为周排班表格式（支持格分裂：同一时段多个医生显示在不同行）
 * 修改为从当天开始显示未来两周（14天）
 */
export function transformScheduleToWeekTable(shifts: Shift[]): ScheduleTransformResult {
  console.log('转换排班数据，接收到的shifts:', shifts)

  const weekDays: WeekDayColumn[] = []
  const today = new Date()
  // 设置为今天凌晨，确保日期计算准确
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const formatDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  console.log('排班表起始日期 (今天):', formatDate(startDate))

  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  // 生成未来14天的日期列
  for (let i = 0; i < 14; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + i)

    const dayName = dayNames[currentDate.getDay()]
    const dayMonth = currentDate.getMonth() + 1
    const dayDay = currentDate.getDate()
    const dayDate = `${dayMonth}.${dayDay}`

    // 使用 week1/week2 前缀区分前后七天，保持与 Home.vue 逻辑兼容
    const weekNum = i < 7 ? 1 : 2
    const prop = `week${weekNum}_day${i}`
    const dateStr = formatDate(currentDate)

    weekDays.push({
      label: i === 0 ? '今天' : dayName,
      prop,
      date: dateStr,
      dayDate,
    })
  }

  // 按日期和时段分组所有班次
  const shiftsByDateAndPeriod = new Map<string, Shift[]>()
  for (const shift of shifts) {
    const key = `${shift.date}-${shift.timePeriod}`
    if (!shiftsByDateAndPeriod.has(key)) {
      shiftsByDateAndPeriod.set(key, [])
    }
    shiftsByDateAndPeriod.get(key)!.push(shift)
  }

  // 计算每个时段的最大医生数
  const maxDoctorsPerPeriod: Record<number, number> = { 1: 1, 2: 1 }
  weekDays.forEach((dayCol) => {
    for (const timePeriod of [1, 2]) {
      const key = `${dayCol.date}-${timePeriod}`
      const shiftsInCell = shiftsByDateAndPeriod.get(key) || []
      maxDoctorsPerPeriod[timePeriod] = Math.max(
        maxDoctorsPerPeriod[timePeriod]!,
        shiftsInCell.length,
      )
    }
  })

  console.log('每个时段的最大医生数:', maxDoctorsPerPeriod)

  // 创建行数据：为每个时段创建足够的行
  const scheduleData: WeekScheduleRow[] = []
  for (const timePeriod of [1, 2]) {
    const periodLabel = TIME_PERIOD_DETAIL_MAP[timePeriod] || ''
    const maxDoctors = maxDoctorsPerPeriod[timePeriod]!

    for (let doctorIndex = 0; doctorIndex < maxDoctors; doctorIndex++) {
      const row: WeekScheduleRow = {
        timeSlot: maxDoctors > 1 ? `${periodLabel}-${doctorIndex + 1}` : periodLabel,
      }
      // 初始化所有列为空
      weekDays.forEach((dayCol) => {
        row[dayCol.prop] = ''
      })
      scheduleData.push(row)
    }
  }

  // 填充数据
  const scheduleMap = new Map<string, Shift>()
  weekDays.forEach((dayCol) => {
    for (const timePeriod of [1, 2]) {
      const key = `${dayCol.date}-${timePeriod}`
      const shiftsInCell = shiftsByDateAndPeriod.get(key) || []

      shiftsInCell.forEach((shift, index) => {
        // 将每个医生的排班信息存入map，使用索引区分同一时段的不同医生
        const mapKey = `${shift.date}-${shift.timePeriod}-${index}`
        scheduleMap.set(mapKey, shift)

        // 计算当前医生应该在哪一行
        let rowOffset = 0
        for (let p = 1; p < timePeriod; p++) {
          rowOffset += maxDoctorsPerPeriod[p]!
        }
        const rowIndex = rowOffset + index

        if (rowIndex < scheduleData.length) {
          // 显示诊室位置或医生名
          const cellContent = shift.clinicPlace || shift.docName || ''
          scheduleData[rowIndex]![dayCol.prop] = cellContent
        }
      })
    }
  })

  console.log('转换后的排班数据:', scheduleData)
  return { scheduleData, weekDays, scheduleMap }
}

/**
 * 根据星期几和周偏移量获取日期字符串
 */
export function getDateFromWeekday(weekday: string, weekOffset: number = 0): string {
  const dayMap: Record<string, number> = {
    周一: 0,
    周二: 1,
    周三: 2,
    周四: 3,
    周五: 4,
    周六: 5,
    周日: 6,
  }

  const dayOffset = dayMap[weekday]
  if (dayOffset === undefined) {
    throw new Error(`无效的星期: ${weekday}`)
  }

  const today = new Date()
  const monday = getMonday(new Date(today))
  const targetDate = new Date(monday)
  targetDate.setDate(monday.getDate() + weekOffset * 7 + dayOffset)

  return targetDate.toISOString().split('T')[0] || ''
}
