/**
 * 加号申请记录的Mock数据
 * 用于前端开发和测试
 */

import type { AddNumberApplication, AddNumberApplicationsResponse } from '@/services/types'

/**
 * 示例1: 紧急加号申请
 * 患者因突发症状需要紧急就诊,申请当天下午时段加号
 */
export const urgentAddNumberApplication: AddNumberApplication = {
  addId: 'ADD001',
  patientName: '张三',
  applyTime: '2025-11-14T09:30:00',
  targetDate: '2025-11-14',
  targetTimePeriod: 2, // 下午时段
  note: '患者突发高烧39.5度,伴有咳嗽症状,急需就诊。家属已在医院等候,恳请医生加号处理。',
}

/**
 * 示例2: 常规加号申请
 * 患者因工作原因无法按原计划就诊,申请改约至明天上午
 */
export const regularAddNumberApplication: AddNumberApplication = {
  addId: 'ADD002',
  patientName: '李四',
  applyTime: '2025-11-14T10:15:00',
  targetDate: '2025-11-15',
  targetTimePeriod: 1, // 上午时段
  note: '因临时出差无法按原预约时间就诊,希望能够加号到明天上午时段。患者已提前完成相关检查。',
}

/**
 * 完整的加号申请列表响应示例
 */
export const mockAddNumberApplicationsResponse: AddNumberApplicationsResponse = {
  addApplications: [urgentAddNumberApplication, regularAddNumberApplication],
}

/**
 * 获取mock加号申请列表
 * 可用于开发环境或测试环境
 */
export function getMockAddNumberApplications(): AddNumberApplication[] {
  return [urgentAddNumberApplication, regularAddNumberApplication]
}

/**
 * 根据ID获取特定的加号申请
 */
export function getMockAddNumberApplicationById(addId: string): AddNumberApplication | undefined {
  const applications = getMockAddNumberApplications()
  return applications.find((app) => app.addId === addId)
}
