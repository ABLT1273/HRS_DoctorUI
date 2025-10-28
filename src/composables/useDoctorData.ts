import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  getShifts,
  getPatients,
  getDoctorProfile,
  subscribeAddNumberNotifications,
  subscribeNotifications,
} from '@/services/api'
import type {
  Shift,
  Patient,
  AddNumberApplication,
  Notification,
  DoctorProfile,
} from '@/services/types'

export function useDoctorData() {
  const doctorId = ref<string>('')
  const doctorProfile = ref<DoctorProfile | null>(null)
  const shifts = ref<Shift[]>([])
  const patients = ref<Patient[]>([])
  const addNumberRequests = ref<AddNumberApplication[]>([])
  const notifications = ref<Notification[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // SSE 连接
  let addNumberEventSource: EventSource | null = null
  let notificationEventSource: EventSource | null = null

  // 加载医生个人信息
  async function loadDoctorProfile() {
    if (!doctorId.value) return

    try {
      loading.value = true
      const response = await getDoctorProfile(doctorId.value)
      doctorProfile.value = response.doctor
    } catch (err: any) {
      error.value = err.message || '加载医生信息失败'
      console.error('加载医生信息失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 加载排班列表
  async function loadShifts() {
    try {
      loading.value = true
      const response = await getShifts(doctorId.value)
      shifts.value = response.shifts
    } catch (err: any) {
      error.value = err.message || '加载排班数据失败'
      console.error('加载排班数据失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 加载患者列表
  async function loadPatients() {
    if (!doctorId.value) return

    try {
      loading.value = true
      const response = await getPatients(doctorId.value)
      patients.value = response.patients
    } catch (err: any) {
      error.value = err.message || '加载患者列表失败'
      console.error('加载患者列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 订阅加号申请通知 (SSE)
  function subscribeAddNumberRequests() {
    if (!doctorId.value) return

    addNumberEventSource = subscribeAddNumberNotifications(
      doctorId.value,
      (data) => {
        addNumberRequests.value = data.addApplications
      },
      (error) => {
        console.error('加号申请SSE错误:', error)
      }
    )
  }

  // 订阅系统通知 (SSE)
  function subscribeSystemNotifications() {
    if (!doctorId.value) return

    notificationEventSource = subscribeNotifications(
      doctorId.value,
      (data) => {
        notifications.value = data.notifications
      },
      (error) => {
        console.error('系统通知SSE错误:', error)
      }
    )
  }

  // 初始化数据
  async function initialize(docId: string) {
    doctorId.value = docId
    await loadDoctorProfile()
    await loadShifts()
    await loadPatients()
    subscribeAddNumberRequests()
    subscribeSystemNotifications()
  }

  // 清理 SSE 连接
  function cleanup() {
    if (addNumberEventSource) {
      addNumberEventSource.close()
      addNumberEventSource = null
    }
    if (notificationEventSource) {
      notificationEventSource.close()
      notificationEventSource = null
    }
  }

  // 组件挂载时初始化
  onMounted(() => {
    const storedDoctorId = localStorage.getItem('doctorId')
    if (storedDoctorId) {
      initialize(storedDoctorId)
    }
  })

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    doctorId,
    doctorProfile,
    shifts,
    patients,
    addNumberRequests,
    notifications,
    loading,
    error,
    loadDoctorProfile,
    loadShifts,
    loadPatients,
    initialize,
    cleanup,
  }
}
