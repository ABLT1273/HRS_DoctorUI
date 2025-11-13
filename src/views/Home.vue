<template>
  <div class="home-container">
    <el-container>
      <el-header>
        <div class="header-top">
          <h1>医院挂号系统 - 医生端</h1>
          <el-button type="primary" @click="logout">退出登录</el-button>
        </div>
        <div class="header-nav">
          <el-menu
            :default-active="activeTab"
            mode="horizontal"
            class="nav-menu"
            @select="handleTabSelect"
          >
            <el-menu-item index="duty">值班信息</el-menu-item>
            <el-menu-item index="personal">个人信息</el-menu-item>
          </el-menu>
        </div>
      </el-header>
      <el-main>
        <div v-if="activeTab === 'duty'" class="tab-content">
          <div class="welcome-message">
            <h2>欢迎，{{ displayName }}！</h2>
            <p>这里是您的工作台</p>
          </div>

          <!-- 排班表 -->
          <div class="schedule-section">
            <h3>排班表</h3>
            <el-table
              :data="scheduleData"
              border
              style="width: 100%; margin-top: 20px"
              @cell-click="handleMainScheduleCellClick"
              @cell-mouse-enter="handleCellEnter"
              @cell-mouse-leave="handleCellLeave"
              :cell-class-name="getCellClassName"
            >
              <el-table-column prop="timeSlot" label="时间段" width="160" fixed />

              <el-table-column
                v-for="(day, index) in weekDays"
                :key="index"
                :prop="day.prop"
              >
                <template #header>
                  <div class="custom-header">
                    <div class="week-label">{{ day.label }}</div>
                    <div class="week-date">{{ day.dayDate }}</div>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            <div class="schedule-action-area">
              <el-button
                type="success"
                :disabled="!selectedScheduleShift"
                @click="openScheduleAdjustDialog"
              >
                申请调整排班
              </el-button>
            </div>
          </div>

          <!-- 下部分内容区 -->
          <div class="bottom-section">
            <!-- 患者列表 -->
            <div class="patient-list">
              <div class="patient-list-header">
                <h3>患者列表</h3>
                <div v-if="currentShiftDisplay" class="shift-display">
                  {{ currentShiftDisplay }}
                </div>
              </div>
              <div class="patient-list-controls">
                <div class="left-controls">
                  <el-button
                    type="primary"
                    :class="{ 'active-button': showCurrentShift }"
                    @click="toggleCurrentShift"
                  >
                    当前排班
                  </el-button>
                </div>
                <div class="right-controls">
                  <el-input
                    v-model="searchName"
                    placeholder="请输入患者姓名"
                    style="width: 200px; margin-right: 10px"
                    @keyup.enter="searchPatient"
                  />
                  <el-button type="primary" @click="searchPatient">查询</el-button>
                </div>
              </div>
              <el-table
                :data="filteredPatientList"
                border
                style="width: 100%; margin-top: 10px"
                @cell-mouse-enter="handleCellEnter"
                @cell-mouse-leave="handleCellLeave"
              >
                <el-table-column prop="name" label="姓名" width="120" />
                <el-table-column prop="gender" label="性别" width="80" />
                <el-table-column prop="age" label="年龄" width="80" />
                <el-table-column prop="department" label="科室" width="120" />
                <el-table-column label="预约时段">
                  <template #default="scope"> {{ scope.row.date }} {{ scope.row.shift }} </template>
                </el-table-column>
                <el-table-column label="信息" width="100">
                  <template #default="scope">
                    <el-button size="small" @click="handleViewPatientInfo(scope.$index)">
                      查看
                    </el-button>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100">
                  <template #default="scope">
                    <el-button
                      v-if="(scope.row.patientStatus ?? 0) === 0"
                      size="small"
                      type="primary"
                      :disabled="!canDiagnosePatient(scope.row.timePeriod, scope.row.date)"
                      @click="handleDiagnosis(scope.$index)"
                    >
                      接诊
                    </el-button>
                    <el-button
                      v-else-if="(scope.row.patientStatus ?? 0) === 1"
                      size="small"
                      type="success"
                      @click="handleComplete(scope.$index)"
                    >
                      完成
                    </el-button>
                    <el-button
                      v-else-if="(scope.row.patientStatus ?? 0) === 2"
                      size="small"
                      type="info"
                      disabled
                    >
                      已结束
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 通知栏和加号申请 -->
            <div class="notification-section">
              <el-tabs v-model="activeNotificationTab">
                <el-tab-pane label="系统通知" name="notification">
                  <div v-if="notificationList.length" class="notification-list">
                    <div v-for="item in notificationList" :key="item.id" class="notification-item">
                      <div class="notification-title">{{ item.title }}</div>
                      <div class="notification-content">{{ item.content }}</div>
                      <div class="notification-time">{{ item.time }}</div>
                    </div>
                  </div>
                  <el-empty v-else description="暂无系统通知" />
                </el-tab-pane>
                <el-tab-pane label="加号申请" name="request">
                  <div v-if="requestEntries.length" class="request-list">
                    <div
                      v-for="request in requestEntries"
                      :key="request.raw.addId"
                      class="request-item"
                    >
                      <div class="request-info">
                        <span class="request-name">{{ request.display.patientName }}</span>
                        <span class="request-time">{{ request.display.requestTime }}</span>
                      </div>
                      <div class="request-reason">
                        目标班次：{{ request.display.targetDate }} {{ request.display.targetShift
                        }}<br />
                        原因：{{ request.display.reason }}
                      </div>
                      <div class="request-action">
                        <el-button
                          size="small"
                          type="success"
                          @click="decideAddNumber(request.raw, true)"
                        >
                          同意
                        </el-button>
                        <el-button
                          size="small"
                          type="danger"
                          @click="decideAddNumber(request.raw, false)"
                        >
                          拒绝
                        </el-button>
                      </div>
                    </div>
                  </div>
                  <el-empty v-else description="暂无加号申请" />
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>
        </div>
        <div v-if="activeTab === 'personal'" class="tab-content">
          <div class="personal-info">
            <h2>个人信息</h2>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="医生ID">{{ doctorIdDisplay }}</el-descriptions-item>
              <el-descriptions-item label="账号">{{ doctorAccountDisplay }}</el-descriptions-item>
              <el-descriptions-item label="姓名">{{ displayName }}</el-descriptions-item>
              <el-descriptions-item label="科室">{{ doctorDepartment }}</el-descriptions-item>
              <el-descriptions-item label="职称">{{ doctorTitle }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </el-main>
    </el-container>

    <!-- 申请调整排班弹窗 -->
    <el-dialog
      v-model="scheduleAdjustDialogVisible"
      title="申请调整排班"
      width="900px"
      @close="closeScheduleAdjustDialog"
    >
      <el-form :model="scheduleAdjustForm" label-width="100px">
        <el-form-item label="调整类型">
          <el-radio-group v-model="scheduleAdjustForm.type">
            <el-radio value="leave">请假</el-radio>
            <el-radio value="shift">调班</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 请假模式 -->
        <template v-if="scheduleAdjustForm.type === 'leave'">
          <el-form-item label="请假时长">
            <el-input-number
              v-model="scheduleAdjustForm.leaveDays"
              :min="1"
              :max="30"
              placeholder="请输入请假天数"
            />
            <span style="margin-left: 10px">天</span>
          </el-form-item>
          <el-form-item label="请假原因">
            <el-input
              v-model="scheduleAdjustForm.leaveReason"
              type="textarea"
              :rows="4"
              placeholder="请输入请假原因"
            />
          </el-form-item>
        </template>

        <!-- 调班模式 -->
        <template v-if="scheduleAdjustForm.type === 'shift'">
          <el-form-item label="选择班次">
            <div class="mini-schedule">
              <el-table
                :data="miniScheduleData"
                border
                style="width: 100%"
                highlight-current-row
                @cell-click="handleScheduleCellClick"
                :cell-class-name="getMiniScheduleCellClass"
              >
                <el-table-column prop="timeSlot" label="时间段" width="120" />
                <el-table-column
                  v-for="(day, index) in miniWeekDays"
                  :key="index"
                  :prop="day.prop"
                  :label="day.label"
                  width="80"
                />
              </el-table>
            </div>
            <div v-if="scheduleAdjustForm.selectedShiftLabel" class="selected-shift-info">
              <template v-if="scheduleAdjustForm.selectedShiftData?.doctorName">
                已选择与 <strong>{{ scheduleAdjustForm.selectedShiftData.doctorName }}</strong> 调班：{{ scheduleAdjustForm.selectedShiftLabel }}
              </template>
              <template v-else>
                已选择调到空闲时间：{{ scheduleAdjustForm.selectedShiftLabel }}
              </template>
            </div>
          </el-form-item>
          <el-form-item label="申请原因">
            <el-input
              v-model="scheduleAdjustForm.shiftReason"
              type="textarea"
              :rows="4"
              placeholder="请输入调班申请原因"
            />
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="closeScheduleAdjustDialog">取消</el-button>
        <el-button type="primary" @click="submitScheduleAdjust">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="patientInfoDialogVisible"
      :title="`患者病历单 - ${currentPatientInfo.name || ''}`"
      width="800px"
      @close="closePatientInfoDialog"
    >
      <div v-loading="patientInfoLoading" class="patient-info-container">
        <!-- 基本信息区域 -->
        <div class="basic-info-section">
          <h4>基本信息</h4>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="姓名">{{ currentPatientInfo.name }}</el-descriptions-item>
            <el-descriptions-item label="性别">{{ currentPatientInfo.gender }}</el-descriptions-item>
            <el-descriptions-item label="年龄">{{ currentPatientInfo.age }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 就诊记录区域 -->
        <div class="records-section">
          <h4>就诊记录</h4>
          <template v-if="registerRecords.length">
            <el-table :data="registerRecords" style="width: 100%" border>
              <el-table-column prop="registerId" label="挂号号" width="160" />
              <el-table-column prop="registerTime" label="挂号时间">
                <template #default="{ row }">
                  {{ formatRecordTime(row.registerTime) }}
                </template>
              </el-table-column>
              <el-table-column prop="department" label="科室" width="120">
                <template #default="{ row }">{{ row.department || '—' }}</template>
              </el-table-column>
              <el-table-column prop="scheduleDate" label="就诊日期" width="140">
                <template #default="{ row }">{{ row.scheduleDate || '—' }}</template>
              </el-table-column>
            </el-table>
          </template>
          <template v-else>
            <el-empty v-if="!patientInfoLoading" description="暂无就诊记录" />
          </template>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  transformScheduleToWeekTable,
  transformPatient,
  transformAddNumberRequest,
  transformNotification,
  formatDateTime,
  TIME_PERIOD_MAP,
  TIME_PERIOD_DETAIL_MAP,
  TIME_PERIOD_REVERSE_MAP,
  type FrontendPatient,
  type FrontendAddRequest,
  type FrontendNotification,
  type WeekScheduleRow,
} from '@/utils/dataTransform'
import {
  submitScheduleChangeRequest,
  submitAddNumberResult,
  updatePatientStatus,
  getRegisterRecords,
} from '@/services/api'
import { useDoctorData } from '@/composables/useDoctorData'
import type {
  AddNumberApplication,
  Patient,
  RegisterRecord,
  ScheduleChangeRequest,
  Shift,
} from '@/services/types'

interface PatientEntry {
  display: FrontendPatient
  raw: Patient
}

interface RequestEntry {
  display: FrontendAddRequest
  raw: AddNumberApplication
}

interface SelectedScheduleShift {
  rowIndex: number
  columnProp: string
  timeSlot: string
  dayLabel: string
  date: string
  timePeriod: number
  shift?: Shift
}

type MiniScheduleRow = {
  timeSlot: string
  [key: string]: string
}

defineOptions({ name: 'DoctorHome' })

const router = useRouter()
const activeTab = ref<'duty' | 'personal'>('duty')
const activeNotificationTab = ref<'notification' | 'request'>('notification')

const {
  doctorId,
  doctorProfile,
  shifts,
  patients,
  addNumberRequests,
  notifications,
  loading,
  error,
  loadPatients,
  loadShifts,
  loadAllShifts,
  cleanup,
} = useDoctorData()

const storedDoctorAccount = ref(localStorage.getItem('doctorAccount') ?? '')

// 用于调班时显示所有医生的排班
const allShifts = ref<Shift[]>([])

const displayName = computed(() => doctorProfile.value?.name || storedDoctorAccount.value || '医生')
const doctorIdDisplay = computed(() => doctorProfile.value?.doctorId || doctorId.value || '—')
const doctorAccountDisplay = computed(() => storedDoctorAccount.value || '—')
const doctorDepartment = computed(() => doctorProfile.value?.department || '—')
const doctorTitle = computed(() => doctorProfile.value?.title || '—')

const scheduleTransform = computed(() => transformScheduleToWeekTable(shifts.value || []))
const scheduleData = computed(() => scheduleTransform.value.scheduleData)
const weekDays = computed(() => scheduleTransform.value.weekDays)
const scheduleMap = computed(() => scheduleTransform.value.scheduleMap)
const currentDoctorName = computed(
  () => doctorProfile.value?.name?.trim() || storedDoctorAccount.value,
)

const patientEntries = computed<PatientEntry[]>(() =>
  patients.value.map((patient) => {
    try {
      return {
        display: transformPatient(patient),
        raw: patient,
      }
    } catch (error) {
      console.error('患者数据转换错误:', error, patient)
      // 返回一个安全的默认值
      return {
        display: {
          name: patient.patientName || '未知',
          registerId: patient.registerId || '',
          gender: patient.gender || '未知',
          age: patient.age || 0,
          department: '内科',
          date: patient.scheduleDate || '',
          shift: '未知',
          timePeriod: patient.timePeriod || 0,
          patientStatus: 0,
        },
        raw: patient,
      }
    }
  }),
)

const requestEntries = computed<RequestEntry[]>(() =>
  addNumberRequests.value.map((request) => ({
    display: transformAddNumberRequest(request),
    raw: request,
  })),
)

const notificationList = computed<FrontendNotification[]>(() =>
  notifications.value.map(transformNotification),
)

const showCurrentShift = ref(false)
const searchName = ref('')

/**
 * 获取当前时间所在的时段
 * @returns 时段编号 (1=上午, 2=下午, 3=晚上) 或 null (不在任何时段内)
 */
function getCurrentTimePeriod(): number | null {
  const now = new Date()
  const hour = now.getHours()

  if (hour >= 8 && hour < 14) return 1 // 上午 8:00-14:00
  if (hour >= 14 && hour < 19) return 2 // 下午 14:00-19:00
  if (hour >= 19 && hour < 22) return 3 // 晚上 19:00-22:00

  return null // 不在任何就诊时段内
}

/**
 * 检查是否可以接诊指定时段的患者
 * @param patientTimePeriod 患者预约的时段
 * @param patientDate 患者预约的日期
 * @returns true 表示可以接诊，false 表示不可接诊
 */
function canDiagnosePatient(patientTimePeriod: number, patientDate: string): boolean {
  const currentPeriod = getCurrentTimePeriod()
  if (currentPeriod === null) {
    return false // 不在任何就诊时段内
  }

  // 检查日期是否为今天
  const today = new Date().toISOString().split('T')[0]
  if (patientDate !== today) {
    return false // 不是今天的患者
  }

  // 检查时段是否匹配
  return currentPeriod === patientTimePeriod
}

function getShiftStartDateTime(date: string, timePeriod: number): Date {
  const [yearStr, monthStr, dayStr] = date.split('-')
  const parsedYear = Number.parseInt(yearStr ?? '', 10)
  const parsedMonth = Number.parseInt(monthStr ?? '', 10)
  const parsedDay = Number.parseInt(dayStr ?? '', 10)
  const now = new Date()
  const base = new Date(
    Number.isNaN(parsedYear) ? now.getFullYear() : parsedYear,
    Number.isNaN(parsedMonth) ? 0 : parsedMonth - 1,
    Number.isNaN(parsedDay) ? 1 : parsedDay,
  )
  const timeMap: Record<number, number> = { 1: 8, 2: 14, 3: 19 }
  const hour = timeMap[timePeriod] ?? 0
  base.setHours(hour, 0, 0, 0)
  return base
}

const shiftInfo = computed(() => {
  if (!patientEntries.value.length) return null

  const now = new Date()
  const currentDateStr = now.toISOString().split('T')[0]
  const hour = now.getHours()
  let currentPeriod: number | null = null

  if (hour >= 8 && hour < 14) currentPeriod = 1
  else if (hour >= 14 && hour < 19) currentPeriod = 2
  else if (hour >= 19 && hour < 22) currentPeriod = 3

  const sorted = [...patientEntries.value].sort(
    (a, b) =>
      getShiftStartDateTime(a.display.date, a.display.timePeriod).getTime() -
      getShiftStartDateTime(b.display.date, b.display.timePeriod).getTime(),
  )

  if (currentPeriod) {
    const currentEntry = sorted.find(
      (entry) =>
        entry.display.date === currentDateStr && entry.display.timePeriod === currentPeriod,
    )
    if (currentEntry) {
      return {
        onDutyNow: true,
        targetDate: currentEntry.display.date,
        timePeriod: currentEntry.display.timePeriod,
        shiftLabel: currentEntry.display.shift,
      }
    }
  }

  const upcoming = sorted.find(
    (entry) => getShiftStartDateTime(entry.display.date, entry.display.timePeriod) >= now,
  )
  if (upcoming) {
    return {
      onDutyNow: false,
      targetDate: upcoming.display.date,
      timePeriod: upcoming.display.timePeriod,
      shiftLabel: upcoming.display.shift,
    }
  }

  const last = sorted[sorted.length - 1]
  if (last) {
    return {
      onDutyNow: false,
      targetDate: last.display.date,
      timePeriod: last.display.timePeriod,
      shiftLabel: last.display.shift,
    }
  }

  return null
})

const filteredPatientEntries = computed(() => {
  let result = patientEntries.value

  if (showCurrentShift.value && shiftInfo.value) {
    result = result.filter(
      (entry) =>
        entry.display.date === shiftInfo.value!.targetDate &&
        entry.display.timePeriod === shiftInfo.value!.timePeriod,
    )
  }

  if (searchName.value.trim()) {
    const keyword = searchName.value.trim().toLowerCase()
    result = result.filter((entry) => entry.display.name.toLowerCase().includes(keyword))
  }

  // 按患者状态排序：已挂号(0) > 就诊中(1) > 已就诊(2)
  result = result.sort((a, b) => {
    const statusA = a.display.patientStatus ?? 0
    const statusB = b.display.patientStatus ?? 0
    return statusA - statusB
  })

  return result
})

const filteredPatientList = computed<FrontendPatient[]>(() =>
  filteredPatientEntries.value.map((entry) => entry.display),
)

const currentShiftDisplay = computed(() => {
  if (!showCurrentShift.value) {
    return '全部未就诊患者'
  }
  if (!shiftInfo.value) {
    return '暂无排班信息'
  }
  const prefix = shiftInfo.value.onDutyNow ? '当前班次' : '最近班次'
  return `${prefix}：${shiftInfo.value.targetDate} ${shiftInfo.value.shiftLabel}`
})

const selectedScheduleShift = ref<SelectedScheduleShift | null>(null)
const scheduleAdjustDialogVisible = ref(false)
const scheduleAdjustForm = reactive({
  type: 'leave' as 'leave' | 'shift',
  leaveDays: 1,
  leaveReason: '',
  selectedShiftLabel: '',
  selectedShiftData: null as { date: string; timePeriod: number; doctorId?: string; doctorName?: string } | null,
  shiftReason: '',
})

const miniWeekDays = computed(() => weekDays.value.slice(0, Math.min(7, weekDays.value.length)))

// 为调班对话框创建单独的排班数据转换
const allScheduleTransform = computed(() => transformScheduleToWeekTable(allShifts.value || []))
const allScheduleMap = computed(() => allScheduleTransform.value.scheduleMap)

const miniScheduleData = computed<MiniScheduleRow[]>(() =>
  [1, 2, 3].map((timePeriod) => {
    const row: MiniScheduleRow = {
      timeSlot: TIME_PERIOD_MAP[timePeriod] ?? '',
    }
    miniWeekDays.value.forEach(({ prop, date }) => {
      const key = `${date}-${timePeriod}`
      const shift = allScheduleMap.value.get(key)
      row[prop] = shift?.docName ?? ''
    })
    return row
  }),
)

function getTimePeriodFromDetailSlot(slot: string): number | null {
  const found = Object.entries(TIME_PERIOD_DETAIL_MAP).find(([, value]) => value === slot)
  return found ? Number(found[0]) : null
}

function getTimePeriodFromSimpleSlot(slot: string): number | null {
  return TIME_PERIOD_REVERSE_MAP[slot] ?? null
}

const getCellClassName = ({
  row,
  column,
}: {
  row: WeekScheduleRow
  column: { property: string | undefined } | undefined
}): string => {
  if (!column) {
    return ''
  }
  const columnProp = column.property
  if (!columnProp || columnProp === 'timeSlot') {
    return ''
  }

  if (
    selectedScheduleShift.value &&
    selectedScheduleShift.value.columnProp === columnProp &&
    selectedScheduleShift.value.timeSlot === row.timeSlot
  ) {
    return 'selected-main-schedule-cell'
  }

  const cellValue = row[columnProp]?.trim() ?? ''

  // 所有有内容的格子都应用班次样式
  if (cellValue) {
    return 'shift-cell'
  }

  return ''
}

const handleCellEnter = (_row: unknown, _column: unknown, cell: HTMLElement) => {
  if (cell.classList.contains('shift-cell')) {
    cell.style.cursor = 'pointer'
  }
}

const handleCellLeave = (_row: unknown, _column: unknown, cell: HTMLElement) => {
  cell.style.cursor = 'default'
}

const handleMainScheduleCellClick = (
  row: WeekScheduleRow,
  column: { property: string | undefined } | undefined,
) => {
  if (!column) return
  const columnProp = column.property
  if (!columnProp || columnProp === 'timeSlot') return

  const columnInfo = weekDays.value.find((day) => day.prop === columnProp)
  if (!columnInfo?.date) return

  const timePeriod = getTimePeriodFromDetailSlot(row.timeSlot)
  if (!timePeriod) return

  const mapKey = `${columnInfo.date}-${timePeriod}`
  const shift = scheduleMap.value.get(mapKey)
  const cellValue = row[columnProp]?.trim() ?? ''

  // 只要格子里有文字，就可以选中
  if (!cellValue) {
    ElMessage.warning('该班次暂无排班')
    return
  }

  const isSameSelection =
    selectedScheduleShift.value &&
    selectedScheduleShift.value.columnProp === columnProp &&
    selectedScheduleShift.value.timeSlot === row.timeSlot

  if (isSameSelection) {
    selectedScheduleShift.value = null
    ElMessage.info('已取消选择班次')
    return
  }

  selectedScheduleShift.value = {
    rowIndex: scheduleData.value.findIndex((item) => item === row),
    columnProp,
    timeSlot: row.timeSlot,
    dayLabel: columnInfo.label,
    date: columnInfo.date,
    timePeriod,
    shift,
  }

  scheduleAdjustForm.selectedShiftLabel = `${columnInfo.label} ${row.timeSlot}`
  ElMessage.success(`已选择：${columnInfo.label} ${row.timeSlot}`)
}

const handleScheduleCellClick = (
  row: MiniScheduleRow,
  column: { property: string | undefined } | undefined,
) => {
  if (!column) return
  const columnProp = column.property
  if (!columnProp || columnProp === 'timeSlot') return

  const columnInfo = miniWeekDays.value.find((day) => day.prop === columnProp)
  if (!columnInfo?.date) return

  const timePeriod = getTimePeriodFromSimpleSlot(row.timeSlot)
  if (!timePeriod) return

  // 获取点击格子中的医生信息
  const mapKey = `${columnInfo.date}-${timePeriod}`
  const shift = allScheduleMap.value.get(mapKey)
  const cellValue = row[columnProp]?.trim() ?? ''

  scheduleAdjustForm.selectedShiftLabel = `${columnInfo.label} ${row.timeSlot}`
  scheduleAdjustForm.selectedShiftData = {
    date: columnInfo.date,
    timePeriod,
    doctorId: shift?.docId,
    doctorName: cellValue || undefined,
  }

  // 显示选择信息
  if (cellValue) {
    ElMessage.success(`已选择与 ${cellValue} 调班：${columnInfo.label} ${row.timeSlot}`)
  } else {
    ElMessage.success(`已选择调到空闲时间：${columnInfo.label} ${row.timeSlot}`)
  }
}

const getMiniScheduleCellClass = ({
  row,
  column,
}: {
  row: MiniScheduleRow
  column: { property: string | undefined } | undefined
}): string => {
  if (!column) {
    return ''
  }
  const columnProp = column.property
  if (!columnProp || columnProp === 'timeSlot') {
    return ''
  }

  const columnInfo = miniWeekDays.value.find((day) => day.prop === columnProp)
  if (!columnInfo?.date) return ''

  const timePeriod = getTimePeriodFromSimpleSlot(row.timeSlot)
  if (!timePeriod) return ''

  if (
    scheduleAdjustForm.selectedShiftData &&
    scheduleAdjustForm.selectedShiftData.date === columnInfo.date &&
    scheduleAdjustForm.selectedShiftData.timePeriod === timePeriod
  ) {
    return 'selected-schedule-cell'
  }

  const cellValue = row[columnProp]?.trim() ?? ''

  if (cellValue) {
    if (currentDoctorName.value && cellValue === currentDoctorName.value) {
      return 'doctor-duty-cell'
    }
    return 'other-duty-cell'
  }

  return 'available-schedule-cell'
}

const resetScheduleAdjustForm = () => {
  scheduleAdjustForm.type = 'leave'
  scheduleAdjustForm.leaveDays = 1
  scheduleAdjustForm.leaveReason = ''
  scheduleAdjustForm.shiftReason = ''
  scheduleAdjustForm.selectedShiftData = null
  scheduleAdjustForm.selectedShiftLabel = selectedScheduleShift.value
    ? `${selectedScheduleShift.value.dayLabel} ${selectedScheduleShift.value.timeSlot}`
    : ''
}

const openScheduleAdjustDialog = async () => {
  if (!selectedScheduleShift.value) {
    ElMessage.warning('请先在排班表中选择班次')
    return
  }
  if (!selectedScheduleShift.value.shift) {
    ElMessage.warning('无法获取该班次的详细信息')
    return
  }
  resetScheduleAdjustForm()
  // 加载所有医生的排班用于调班选择
  allShifts.value = await loadAllShifts(doctorId.value)
  scheduleAdjustDialogVisible.value = true
}

const closeScheduleAdjustDialog = () => {
  scheduleAdjustDialogVisible.value = false
  resetScheduleAdjustForm()
}

const submitScheduleAdjust = async () => {
  if (!doctorId.value) {
    ElMessage.error('医生信息已失效，请重新登录')
    router.push('/login')
    return
  }

  if (!selectedScheduleShift.value || !selectedScheduleShift.value.shift) {
    ElMessage.warning('请先选择需要调整的班次')
    return
  }

  if (scheduleAdjustForm.type === 'leave') {
    if (!scheduleAdjustForm.leaveDays || scheduleAdjustForm.leaveDays < 1) {
      ElMessage.warning('请输入有效的请假天数')
      return
    }
    if (!scheduleAdjustForm.leaveReason.trim()) {
      ElMessage.warning('请填写请假原因')
      return
    }
  } else {
    if (!scheduleAdjustForm.selectedShiftData) {
      ElMessage.warning('请选择目标班次')
      return
    }
    if (!scheduleAdjustForm.shiftReason.trim()) {
      ElMessage.warning('请填写调班申请原因')
      return
    }
  }

  const originalShift = selectedScheduleShift.value.shift

  // 确定 changeType
  let changeType = 0
  if (scheduleAdjustForm.type === 'leave') {
    changeType = 1 // 请假
  } else if (scheduleAdjustForm.type === 'shift' && scheduleAdjustForm.selectedShiftData) {
    // 调班模式：如果点击的格子里有医生，则为医生间调班(changeType=2)，否则为调到空闲时间(changeType=0)
    changeType = scheduleAdjustForm.selectedShiftData.doctorId ? 2 : 0
  }

  const payload: ScheduleChangeRequest = {
    docId: doctorId.value,
    originalTime: `${originalShift.date}_${originalShift.timePeriod}`,
    changeType,
    leaveTimeLength: scheduleAdjustForm.type === 'leave' ? scheduleAdjustForm.leaveDays : 0,
    reason:
      scheduleAdjustForm.type === 'leave'
        ? scheduleAdjustForm.leaveReason.trim()
        : scheduleAdjustForm.shiftReason.trim(),
  }

  if (scheduleAdjustForm.type === 'shift' && scheduleAdjustForm.selectedShiftData) {
    payload.targetDate = scheduleAdjustForm.selectedShiftData.date
    payload.timePeriod = scheduleAdjustForm.selectedShiftData.timePeriod
    // 如果是医生间调班(changeType=2)，需要包含目标医生ID
    if (scheduleAdjustForm.selectedShiftData.doctorId) {
      payload.targetDoctorId = scheduleAdjustForm.selectedShiftData.doctorId
    }
  }

  try {
    const response = await submitScheduleChangeRequest(payload)
    if (response.code !== 200) {
      throw new Error(response.msg || '排班申请提交失败')
    }
    ElMessage.success('排班申请已提交')
    scheduleAdjustDialogVisible.value = false
    await loadShifts()
    resetScheduleAdjustForm()
    selectedScheduleShift.value = null
  } catch (err) {
    if (err instanceof Error) {
      ElMessage.error(err.message)
    } else {
      ElMessage.error('排班申请提交失败')
    }
  }
}

const decideAddNumber = async (request: AddNumberApplication, approved: boolean) => {
  try {
    const response = await submitAddNumberResult({
      addId: request.addId,
      approved,
    })
    if (response.code !== 200) {
      throw new Error(response.msg || '操作失败')
    }
    ElMessage.success(
      approved
        ? `已同意 ${request.patientName} 的加号申请`
        : `已拒绝 ${request.patientName} 的加号申请`,
    )
  } catch (err) {
    if (err instanceof Error) {
      ElMessage.error(err.message)
    } else {
      ElMessage.error('加号申请处理失败')
    }
  }
}

const patientInfoDialogVisible = ref(false)
const patientInfoLoading = ref(false)
const registerRecords = ref<RegisterRecord[]>([])
const currentPatientInfo = ref({
  name: '',
  gender: '',
  age: 0,
})

const handleViewPatientInfo = async (index: number) => {
  const entry = filteredPatientEntries.value[index]
  if (!entry) {
    ElMessage.warning('未找到患者信息')
    return
  }

  patientInfoDialogVisible.value = true
  patientInfoLoading.value = true
  registerRecords.value = []

  // 设置基本信息
  currentPatientInfo.value = {
    name: entry.display.name,
    gender: entry.display.gender,
    age: entry.display.age,
  }

  try {
    const response = await getRegisterRecords(entry.display.registerId, doctorId.value ?? undefined)
    registerRecords.value = response.records ?? []
  } catch (err) {
    if (err instanceof Error) {
      ElMessage.error(err.message)
    } else {
      ElMessage.error('获取就诊记录失败')
    }
  } finally {
    patientInfoLoading.value = false
  }
}

const closePatientInfoDialog = () => {
  patientInfoDialogVisible.value = false
  registerRecords.value = []
  currentPatientInfo.value = {
    name: '',
    gender: '',
    age: 0,
  }
}

const formatRecordTime = (value?: string) => (value ? formatDateTime(value) : '—')

const handleDiagnosis = async (index: number) => {
  if (!doctorId.value) {
    ElMessage.error('医生信息已失效，请重新登录')
    router.push('/login')
    return
  }

  const entry = filteredPatientEntries.value[index]
  if (!entry) {
    ElMessage.warning('未找到患者信息')
    return
  }

  // 检查是否在就诊时间内
  if (!canDiagnosePatient(entry.display.timePeriod, entry.display.date)) {
    ElMessage.warning('当前不在就诊时间')
    return
  }

  try {
    console.log('发送接诊请求:', {
      doctorId: doctorId.value,
      registerId: entry.display.registerId,
      doctorStatus: 1,
      patientStatus: 1,
    })
    const response = await updatePatientStatus({
      doctorId: doctorId.value,
      registerId: entry.display.registerId,
      doctorStatus: 1,
      patientStatus: 1,
    })
    console.log('接诊响应:', response)
    if (response.code !== 200) {
      throw new Error(response.msg || '更新患者状态失败')
    }

    // 立即更新本地患者状态，确保UI即时响应
    const patientIndex = patients.value.findIndex(
      (p) => p.registerId === entry.display.registerId,
    )
    if (patientIndex !== -1) {
      patients.value[patientIndex]!.patientStatus = 1
    }

    ElMessage.success(`已开始接诊 ${entry.display.name}`)
    // 重新加载患者列表以确保数据同步
    await loadPatients()
  } catch (err) {
    console.error('接诊失败:', err)
    if (err instanceof Error) {
      ElMessage.error(err.message)
    } else {
      ElMessage.error('接诊失败')
    }
  }
}

const handleComplete = async (index: number) => {
  if (!doctorId.value) {
    ElMessage.error('医生信息已失效，请重新登录')
    router.push('/login')
    return
  }

  const entry = filteredPatientEntries.value[index]
  if (!entry) {
    ElMessage.warning('未找到患者信息')
    return
  }

  try {
    console.log('发送完成请求:', {
      doctorId: doctorId.value,
      registerId: entry.display.registerId,
      doctorStatus: 0,
      patientStatus: 2,
    })
    const response = await updatePatientStatus({
      doctorId: doctorId.value,
      registerId: entry.display.registerId,
      doctorStatus: 0,
      patientStatus: 2,
    })
    console.log('完成响应:', response)
    if (response.code !== 200) {
      throw new Error(response.msg || '更新患者状态失败')
    }

    // 立即更新本地患者状态，确保UI即时响应
    const patientIndex = patients.value.findIndex(
      (p) => p.registerId === entry.display.registerId,
    )
    if (patientIndex !== -1) {
      patients.value[patientIndex]!.patientStatus = 2
    }

    ElMessage.success(`${entry.display.name} 已完成就诊`)
    // 重新加载患者列表以确保数据同步
    await loadPatients()
  } catch (err) {
    console.error('完成就诊失败:', err)
    if (err instanceof Error) {
      ElMessage.error(err.message)
    } else {
      ElMessage.error('完成就诊失败')
    }
  }
}

const toggleCurrentShift = () => {
  showCurrentShift.value = !showCurrentShift.value
}

const searchPatient = () => {
  // 计算属性会自动完成过滤，这里保留方法供输入框回车调用。
}

const logout = () => {
  cleanup()
  localStorage.removeItem('token')
  localStorage.removeItem('doctorAccount')
  localStorage.removeItem('doctorId')
  ElMessage.success('已成功退出登录')
  router.push('/login')
}

const handleTabSelect = (index: string) => {
  activeTab.value = index as 'duty' | 'personal'
}

watch(error, (message) => {
  if (message) {
    ElMessage.error(message)
    error.value = null
  }
})

watch(
  doctorProfile,
  (profile) => {
    if (profile?.doctorAccount) {
      storedDoctorAccount.value = profile.doctorAccount
    }
  },
  { immediate: true },
)

onMounted(() => {
  const storedToken = localStorage.getItem('token')
  const storedDoctorId = localStorage.getItem('doctorId')

  if (!storedToken || !storedDoctorId) {
    router.push('/login')
  }
})
</script>

<style scoped>
.home-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-image: url('../assets/loginBackground.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* 班次单元格样式 - 统一的背景色突出显示 */
:deep(.el-table__body .shift-cell) {
  background-color: rgba(64, 158, 255, 0.25) !important;
  cursor: pointer !important;
}

:deep(.el-table__body .shift-cell .cell) {
  font-weight: bold !important;
  color: #409eff !important;
}

/* 主排班表选中的单元格样式 */
:deep(.el-table__body .selected-main-schedule-cell) {
  background-color: #409eff !important;
  border: 2px solid #1890ff !important;
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.5) !important;
}

:deep(.el-table__body .selected-main-schedule-cell .cell) {
  color: white !important;
  font-weight: bold !important;
}

.el-container {
  height: 100%;
  width: 100%;
}

.el-header {
  background-color: rgba(64, 158, 255, 0.85);
  color: white;
  padding: 0;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(5px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  height: auto;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
}

.header-top h1 {
  margin: 0;
  font-size: 24px;
}

.header-nav {
  width: 100%;
}

.nav-menu {
  width: 100%;
  border-bottom: none;
}

.el-menu--horizontal {
  border: none;
}

.el-menu--horizontal > .el-menu-item {
  border-bottom: 2px solid transparent;
  color: rgba(33, 137, 241, 0.85);
}

.el-menu--horizontal > .el-menu-item.is-active {
  border-color: rgba(33, 137, 241, 0.85);
  background-color: rgba(75, 181, 234, 0.1);
}

.el-menu--horizontal > .el-menu-item:hover {
  background-color: rgba(75, 181, 234, 0.1);
}

.el-main {
  padding: 20px;
  background-color: rgba(245, 247, 250, 0.85);
  overflow: hidden;
  flex: 1;
  backdrop-filter: blur(5px);
}

.tab-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-right: 10px;
}

.welcome-message {
  text-align: center;
  margin: 100px 0;
}

.welcome-message h2 {
  font-size: 28px;
  color: #303133;
  margin-bottom: 20px;
}

.welcome-message p {
  font-size: 18px;
  color: #606266;
}

.personal-info {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
}

.personal-info h2 {
  margin: 20px 0;
  color: #303133;
}

/* 工作台样式 */
.welcome-message {
  text-align: center;
  margin-bottom: 20px;
}

.welcome-message h2 {
  font-size: 28px;
  color: #303133;
  margin-bottom: 20px;
}

.welcome-message p {
  font-size: 18px;
  color: #606266;
}

/* 排班表样式 */
.schedule-section {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  position: relative;
}

.schedule-section h3 {
  margin-top: 0;
  color: #303133;
  font-size: 20px;
}

.schedule-action-area {
  display: flex;
  justify-content: flex-end;
  margin-top: 15px;
}

/* 下部分区域布局 */
.bottom-section {
  display: flex;
  gap: 20px;
  height: 500px;
}

/* 患者列表样式 */
.patient-list {
  flex: 3;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.patient-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.patient-list-header h3 {
  margin: 0;
  color: #303133;
  font-size: 20px;
}

.shift-display {
  padding: 8px 16px;
  background-color: #ecf5ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  color: #409eff;
  font-size: 14px;
  font-weight: 500;
}

/* 患者列表控制按钮区域样式 */
.patient-list-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 15px 0;
}

.left-controls {
  display: flex;
  align-items: center;
}

.right-controls {
  display: flex;
  align-items: center;
}

.active-button {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #fff !important;
}

/* 通知栏和加号申请样式 */
.notification-section {
  flex: 2;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.notification-list {
  height: 420px;
  overflow-y: auto;
}

.notification-item {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.notification-title {
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.notification-content {
  color: #606266;
  margin-bottom: 5px;
  font-size: 14px;
}

.notification-time {
  color: #909399;
  font-size: 12px;
}

/* 加号申请列表样式 */
.request-list {
  height: 420px;
  overflow-y: auto;
}

.request-item {
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 10px;
}

.request-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.request-name {
  font-weight: bold;
  color: #303133;
}

.request-time {
  color: #909399;
  font-size: 12px;
}

.request-reason {
  color: #606266;
  margin-bottom: 10px;
  font-size: 14px;
}

.request-action {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.register-loading {
  text-align: center;
  padding: 20px 0;
  color: #909399;
}

/* 1. 高亮行（与 el-table 默认的 current-row 样式叠加） */
:deep(.is-hover-row) {
  /* 为鼠标悬停的行设置背景色 */
  background-color: #f5f7fa !important;
}

/* 2. 高亮列（高亮同一列的所有单元格） */
:deep(.el-table__body-wrapper .el-table__body td.is-hover-column) {
  /* 为鼠标悬停的列设置较浅的背景色或边框 */
  background-color: #e6f7ff !important; /* 浅蓝色背景 */
  position: relative;
}
:deep(.el-table__header-wrapper .el-table__header th.is-hover-column) {
  background-color: #cce9ff !important; /* 表头颜色略有不同 */
  color: #1890ff;
}

/* 3. 高亮单元格（高亮当前悬停的单元格本身） */
:deep(.is-hover-cell) {
  /* 为鼠标悬停的单元格设置最醒目的背景色或阴影 */
  background-color: #bae7ff !important; /* 蓝色加深 */
  font-weight: bold;
  color: #1890ff;
  border: 1px solid #91d5ff !important;
}

/* 确保表头在列高亮时也生效 */
/* 表头单元格的 class 是 el-table__cell is-leaf */
:deep(.el-table th.el-table__cell.is-hover-column) {
  background-color: #cce9ff !important; /* 表头颜色略有不同 */
  color: #1890ff;
}

/* 调整排班弹窗样式 */
.mini-schedule {
  margin-bottom: 15px;
}

.mini-schedule :deep(.el-table__cell) {
  padding: 8px 0;
  text-align: center;
  cursor: pointer;
}

.selected-shift-info {
  margin-top: 10px;
  padding: 10px;
  background-color: #f0f9ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  color: #1890ff;
  font-size: 14px;
}

/* 调班对话框 - 医生自己值班的单元格样式 */
:deep(.el-table__body .doctor-duty-cell) {
  background-color: rgba(64, 158, 255, 0.2) !important;
  cursor: pointer !important;
}

:deep(.el-table__body .doctor-duty-cell .cell) {
  font-weight: bold !important;
  color: #409eff !important;
}

/* 调班对话框 - 其他医生值班的单元格样式 */
:deep(.el-table__body .other-duty-cell) {
  background-color: rgba(103, 194, 58, 0.1) !important;
}

/* 调班对话框 - 已选择的排班单元格 */
:deep(.el-table__body .selected-schedule-cell) {
  background-color: #1890ff !important;
  border: 2px solid #0d5eaf !important;
}

:deep(.el-table__body .selected-schedule-cell .cell) {
  color: white !important;
  font-weight: bold !important;
}

/* 调班对话框 - 可用的排班单元格 */
:deep(.el-table__body .available-schedule-cell) {
  background-color: transparent !important;
  cursor: pointer !important;
}

:deep(.el-table__body .available-schedule-cell:hover) {
  background-color: rgba(186, 231, 255, 0.3) !important;
}

/* 自定义表头样式 */
.custom-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  line-height: 1.4;
}

.week-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.week-date {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

/* 病历单对话框样式 */
.patient-info-container {
  max-height: 600px;
  overflow-y: auto;
}

.basic-info-section {
  margin-bottom: 30px;
}

.basic-info-section h4 {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #409eff;
  color: #303133;
  font-size: 16px;
  font-weight: bold;
}

.records-section h4 {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #409eff;
  color: #303133;
  font-size: 16px;
  font-weight: bold;
}

.records-section {
  margin-top: 20px;
}
</style>
