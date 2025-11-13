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
  3: '晚上',
}

export const TIME_PERIOD_DETAIL_MAP: Record<number, string> = {
  1: '上午 8:00-12:00',
  2: '下午 14:00-18:00',
  3: '晚上 19:00-21:00',
}

/**
 * 反向映射：时段名称 -> 时段编号
 */
export const TIME_PERIOD_REVERSE_MAP: Record<string, number> = {
  上午: 1,
  下午: 2,
  晚上: 3,
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
}

export function transformNotification(apiNotification: Notification): FrontendNotification {
  return {
    id: apiNotification.id,
    title: apiNotification.title,
    content: apiNotification.content,
    time: formatDateTime(apiNotification.createdAt),
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
 * 将前端排班数据转换为周排班表格式
 */
export function transformScheduleToWeekTable(shifts: Shift[]): ScheduleTransformResult {
  console.log('转换排班数据，接收到的shifts:', shifts)
  const scheduleData: WeekScheduleRow[] = [
    { timeSlot: TIME_PERIOD_DETAIL_MAP[1] || '上午 8:00-12:00' },
    { timeSlot: TIME_PERIOD_DETAIL_MAP[2] || '下午 14:00-18:00' },
    { timeSlot: TIME_PERIOD_DETAIL_MAP[3] || '晚上 19:00-21:00' },
  ]

  const weekDays: WeekDayColumn[] = []
  const today = new Date()
  const startMonday = getMonday(new Date(today))
  console.log('排班表起始周一:', startMonday.toISOString().split('T')[0])

  for (let week = 0; week < 2; week++) {
    const daysInWeek = 7

    for (let day = 0; day < daysInWeek; day++) {
      const currentDate = new Date(startMonday)
      currentDate.setDate(startMonday.getDate() + week * 7 + day)

      const weekLabel = week === 0 ? '本周' : week === 1 ? '下周' : '第三周'
      const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      const dayLabel = dayNames[day]

      // 计算每一天的日期，用于显示"月.日"
      const dayMonth = currentDate.getMonth() + 1
      const dayDay = currentDate.getDate()
      const dayDate = `${dayMonth}.${dayDay}`

      const dayProps = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      const prop = `week${week + 1}_${dayProps[day]}`
      const dateStr = currentDate.toISOString().split('T')[0]

      weekDays.push({
        label: `${weekLabel}${dayLabel}`,
        prop,
        date: dateStr,
        weekLabel,
        dayDate,
      })

      scheduleData[0]![prop] = ''
      scheduleData[1]![prop] = ''
      scheduleData[2]![prop] = ''
    }
  }

  const scheduleMap = new Map<string, Shift>()
  for (const shift of shifts) {
    const mapKey = `${shift.date}-${shift.timePeriod}`
    scheduleMap.set(mapKey, shift)

    const column = weekDays.find((col) => col.date === shift.date)
    console.log(`处理排班: ${shift.date} ${shift.docName}, 找到列:`, column?.label)
    if (column) {
      const rowIndex = shift.timePeriod - 1
      if (rowIndex >= 0 && rowIndex < 3) {
        // 构建单元格内容：医生名 + 诊室位置
        let cellContent = shift.docName
        if (shift.clinicPlace) {
          cellContent += `\n${shift.clinicPlace}`
        }
        console.log(`  -> 填充到 [${rowIndex}][${column.prop}] = ${cellContent}`)
        scheduleData[rowIndex]![column.prop] = cellContent
      }
    }
  }

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
