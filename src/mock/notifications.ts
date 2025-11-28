/**
 * 系统通知的Mock数据
 * 用于前端开发和测试
 */

import type { Notification, NotificationsResponse } from '@/services/types'

/**
 * 示例1: 排班变更通知
 */
export const scheduleChangeNotification: Notification = {
  id: 'NOTIF001',
  title: '排班变更通知',
  content: '您的11月20日下午班次已被调整至11月21日上午，请注意查看最新排班表。',
  createdAt: new Date().toISOString(),
}

/**
 * 示例2: 系统维护通知
 */
export const systemMaintenanceNotification: Notification = {
  id: 'NOTIF002',
  title: '系统维护通知',
  content: '系统将于本周六凌晨2:00-4:00进行例行维护，期间可能无法访问，请提前安排工作。',
  createdAt: new Date(Date.now() - 3600000).toISOString(), // 1小时前
}

/**
 * 示例3: 重要通知
 */
export const importantNotification: Notification = {
  id: 'NOTIF003',
  title: '紧急通知',
  content: '医院将于下周一举行全体医护人员培训会议，请所有医生准时参加。',
  createdAt: new Date(Date.now() - 7200000).toISOString(), // 2小时前
}

/**
 * 完整的通知列表响应示例
 */
export const mockNotificationsResponse: NotificationsResponse = {
  notifications: [
    scheduleChangeNotification,
    systemMaintenanceNotification,
    importantNotification,
  ],
}

/**
 * 获取mock通知列表
 * 可用于开发环境或测试环境
 */
export function getMockNotifications(): Notification[] {
  // 开发时返回mock数据以便测试
  return [scheduleChangeNotification, systemMaintenanceNotification, importantNotification]
}

/**
 * 根据ID获取特定的通知
 */
export function getMockNotificationById(id: string): Notification | undefined {
  const notifications = getMockNotifications()
  return notifications.find((notif) => notif.id === id)
}

/**
 * 模拟新通知到达
 * 返回一个随机生成的新通知
 */
export function generateMockNotification(): Notification {
  const titles = [
    '排班变更通知',
    '系统维护通知',
    '紧急通知',
    '会议通知',
    '培训通知',
  ]

  const contents = [
    '您的排班已被调整，请注意查看最新排班表。',
    '系统将进行维护，期间可能无法访问。',
    '请注意查收重要文件。',
    '下周将举行部门会议，请准时参加。',
    '医院将组织业务培训，请提前做好准备。',
  ]

  const randomTitle = titles[Math.floor(Math.random() * titles.length)]
  const randomContent = contents[Math.floor(Math.random() * contents.length)]

  return {
    id: `NOTIF${Date.now()}`,
    title: randomTitle || '系统通知',
    content: randomContent || '这是一条测试通知',
    createdAt: new Date().toISOString(),
  }
}
