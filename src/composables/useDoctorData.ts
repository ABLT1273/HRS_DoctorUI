import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  getSelfShifts,
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

  // 本地患者状态缓存 (registerId -> patientStatus)
  const patientStatusCache = new Map<string, number>()

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

  // 加载当前医生的排班列表（用于初始化主排班表）
  async function loadShifts() {
    if (!doctorId.value) return
    try {
      loading.value = true
      const response = await getSelfShifts(doctorId.value)
      shifts.value = response.shifts
    } catch (err: any) {
      error.value = err.message || '加载排班数据失败'
      console.error('加载排班数据失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 加载所有医生的排班列表（用于调班时查看可用班次）
  async function loadAllShifts(docId?: string): Promise<Shift[]> {
    try {
      const response = await getShifts(docId)
      return response.shifts
    } catch (err: any) {
      error.value = err.message || '加载所有排班数据失败'
      console.error('加载所有排班数据失败:', err)
      return []
    }
  }

  // 加载患者列表
  async function loadPatients() {
    if (!doctorId.value) return

    try {
      loading.value = true
      const response = await getPatients(doctorId.value)

      // 合并本地状态缓存到新加载的患者数据
      patients.value = response.patients.map((patient) => {
        const cachedStatus = patientStatusCache.get(patient.registerId)
        if (cachedStatus !== undefined) {
          return { ...patient, patientStatus: cachedStatus }
        }
        return patient
      })
    } catch (err: any) {
      error.value = err.message || '加载患者列表失败'
      console.error('加载患者列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 更新患者状态（同时更新缓存）
  function updatePatientStatusLocal(registerId: string, status: number) {
    patientStatusCache.set(registerId, status)

    const patientIndex = patients.value.findIndex((p) => p.registerId === registerId)
    if (patientIndex !== -1) {
      patients.value[patientIndex] = {
        ...patients.value[patientIndex]!,
        patientStatus: status,
      }
    }
  }

  // 清除患者状态缓存（当患者完成就诊后可选择性清除）
  function clearPatientStatus(registerId: string) {
    patientStatusCache.delete(registerId)
  }

  // 订阅加号申请通知 (SSE)
  function subscribeAddNumberRequests() {
    if (!doctorId.value) return

    // 开发环境下先加载Mock数据,便于前端开发和测试
    if (import.meta.env.DEV) {
      import('@/mock/addNumberApplications').then((module) => {
        addNumberRequests.value = module.getMockAddNumberApplications()
        console.log('已加载加号申请Mock数据:', addNumberRequests.value)
      })
    }

    addNumberEventSource = subscribeAddNumberNotifications(
      doctorId.value,
      (data) => {
        console.log('[useDoctorData] SSE 回调收到 data:', data)
        console.log('[useDoctorData] addApplications:', data.addApplications)
        addNumberRequests.value = data.addApplications
        console.log('[useDoctorData] 已更新 addNumberRequests.value:', addNumberRequests.value)
      },
      (error) => {
        console.error('[useDoctorData] 加号申请SSE错误:', error)
      },
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
      },
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
    loadAllShifts,
    loadPatients,
    updatePatientStatusLocal,
    clearPatientStatus,
    initialize,
    cleanup,
  }
}
