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
            <h2>欢迎，{{ username }}！</h2>
            <p>这里是您的工作台</p>
          </div>

          <!-- 排班表 -->
          <div class="schedule-section">
            <h3>排班表</h3>
            <el-table
              :data="scheduleData"
              border
              style="width: 100%; margin-top: 20px"
              highlight-current-row
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
                :label="day.label"
              />
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
                :cell-class-name="getCellClassName"
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
                <el-table-column label="操作" width="100">
                  <template #default="scope">
                    <el-button size="small" type="primary" @click="handleDiagnosis(scope.$index)"
                      >接诊</el-button
                    >
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 通知栏和加号申请 -->
            <div class="notification-section">
              <el-tabs v-model="activeNotificationTab">
                <el-tab-pane label="系统通知" name="notification">
                  <div class="notification-list">
                    <div
                      v-for="(item, index) in notifications"
                      :key="index"
                      class="notification-item"
                    >
                      <div class="notification-title">{{ item.title }}</div>
                      <div class="notification-content">{{ item.content }}</div>
                      <div class="notification-time">{{ item.time }}</div>
                    </div>
                  </div>
                </el-tab-pane>
                <el-tab-pane label="加号申请" name="request">
                  <div class="request-list">
                    <div v-for="(item, index) in requests" :key="index" class="request-item">
                      <div class="request-info">
                        <span class="request-name">{{ item.patientName }}</span>
                        <span class="request-time">{{ item.requestTime }}</span>
                      </div>
                      <div class="request-reason">{{ item.reason }}</div>
                      <div class="request-action">
                        <el-button size="small" type="success" @click="approveRequest(index)"
                          >同意</el-button
                        >
                        <el-button size="small" type="danger" @click="rejectRequest(index)"
                          >拒绝</el-button
                        >
                      </div>
                    </div>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>
        </div>
        <div v-if="activeTab === 'personal'" class="tab-content">
          <div class="personal-info">
            <h2>个人信息</h2>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="姓名">{{ username }}</el-descriptions-item>
              <el-descriptions-item label="ID">123456</el-descriptions-item>
              <el-descriptions-item label="科室">内科</el-descriptions-item>
              <el-descriptions-item label="职称">主治医师</el-descriptions-item>
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
            <div v-if="scheduleAdjustForm.selectedShift" class="selected-shift-info">
              已选择：{{ scheduleAdjustForm.selectedShift }}
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const username = ref('')
const activeTab = ref('duty')
const activeNotificationTab = ref('notification')

// 排班表数据
const weekDays = [
  { label: '第一周周一', prop: 'week1_mon' },
  { label: '第一周周二', prop: 'week1_tue' },
  { label: '第一周周三', prop: 'week1_wed' },
  { label: '第一周周四', prop: 'week1_thu' },
  { label: '第一周周五', prop: 'week1_fri' },
  { label: '第二周周一', prop: 'week2_mon' },
  { label: '第二周周二', prop: 'week2_tue' },
  { label: '第二周周三', prop: 'week2_wed' },
  { label: '第二周周四', prop: 'week2_thu' },
  { label: '第二周周五', prop: 'week2_fri' },
  { label: '第三周周一', prop: 'week3_mon' },
  { label: '第三周周二', prop: 'week3_tue' },
  { label: '第三周周三', prop: 'week3_wed' },
  { label: '第三周周四', prop: 'week3_thu' },
  { label: '第三周周五', prop: 'week3_fri' },
  { label: '第三周周六', prop: 'week3_sat' },
  { label: '第三周周日', prop: 'week3_sun' },
]
const scheduleData = [
  {
    timeSlot: '上午 8:00-12:00',
    week1_mon: '李医生',
    week1_tue: '张艺',
    week1_wed: '',
    week1_thu: '张艺',
    week1_fri: '',
    week2_mon: '张艺',
    week2_tue: '王医生',
    week2_wed: '',
    week2_thu: '张艺',
    week2_fri: '',
    week3_mon: '张艺',
    week3_tue: '',
    week3_wed: '张艺',
    week3_thu: '',
    week3_fri: '张艺',
    week3_sat: '张艺',
    week3_sun: '',
  },
  {
    timeSlot: '下午 14:00-18:00',
    week1_mon: '',
    week1_tue: '张艺',
    week1_wed: '',
    week1_thu: '张艺',
    week1_fri: '',
    week2_mon: '张艺',
    week2_tue: '',
    week2_wed: '张艺',
    week2_thu: '',
    week2_fri: '张艺',
    week3_mon: '',
    week3_tue: '张艺',
    week3_wed: '',
    week3_thu: '张艺',
    week3_fri: '',
    week3_sat: '',
    week3_sun: '张艺',
  },
  {
    timeSlot: '晚上 19:00-21:00',
    week1_mon: '张艺',
    week1_tue: '',
    week1_wed: '',
    week1_thu: '',
    week1_fri: '张艺',
    week2_mon: '',
    week2_tue: '',
    week2_wed: '',
    week2_thu: '张艺',
    week2_fri: '',
    week3_mon: '',
    week3_tue: '',
    week3_wed: '张艺',
    week3_thu: '',
    week3_fri: '',
    week3_sat: '',
    week3_sun: '',
  },
]

// 患者列表数据 - 从10/23开始的两周测试数据
const patientList = ref([
  // 10月23日患者 (周三)
  {
    name: '张三',
    gender: '男',
    age: 35,
    department: '内科',
    date: '2025-10-23',
    shift: '上午',
  },
  {
    name: '李四',
    gender: '女',
    age: 28,
    department: '内科',
    date: '2025-10-23',
    shift: '下午',
  },
  // 10月24日患者 (周四)
  {
    name: '王五',
    gender: '男',
    age: 42,
    department: '内科',
    date: '2025-10-24',
    shift: '上午',
  },
  {
    name: '赵六',
    gender: '女',
    age: 31,
    department: '外科',
    date: '2025-10-24',
    shift: '下午',
  },
  // 10月25日患者 (周五)
  {
    name: '钱七',
    gender: '男',
    age: 55,
    department: '内科',
    date: '2025-10-25',
    shift: '上午',
  },
  {
    name: '孙八',
    gender: '女',
    age: 40,
    department: '内科',
    date: '2025-10-25',
    shift: '晚上',
  },
  // 10月26日患者 (周六)
  {
    name: '周九',
    gender: '男',
    age: 33,
    department: '内科',
    date: '2025-10-26',
    shift: '上午',
  },
  // 10月27日患者 (周日)
  {
    name: '吴十',
    gender: '女',
    age: 45,
    department: '外科',
    date: '2025-10-27',
    shift: '下午',
  },
  // 10月28日患者 (周一)
  {
    name: '郑十一',
    gender: '男',
    age: 38,
    department: '内科',
    date: '2025-10-28',
    shift: '上午',
  },
  {
    name: '王十二',
    gender: '女',
    age: 29,
    department: '内科',
    date: '2025-10-28',
    shift: '晚上',
  },
  // 10月29日患者 (周二)
  {
    name: '李十三',
    gender: '男',
    age: 52,
    department: '内科',
    date: '2025-10-29',
    shift: '下午',
  },
  // 10月30日患者 (周三)
  {
    name: '陈十四',
    gender: '女',
    age: 36,
    department: '内科',
    date: '2025-10-30',
    shift: '上午',
  },
  {
    name: '刘十五',
    gender: '男',
    age: 48,
    department: '外科',
    date: '2025-10-30',
    shift: '下午',
  },
  // 10月31日患者 (周四)
  {
    name: '杨十六',
    gender: '女',
    age: 27,
    department: '内科',
    date: '2025-10-31',
    shift: '上午',
  },
  {
    name: '黄十七',
    gender: '男',
    age: 62,
    department: '内科',
    date: '2025-10-31',
    shift: '下午',
  },
  // 11月1日患者 (周五)
  {
    name: '朱十八',
    gender: '女',
    age: 34,
    department: '内科',
    date: '2025-11-01',
    shift: '上午',
  },
  {
    name: '林十九',
    gender: '男',
    age: 41,
    department: '内科',
    date: '2025-11-01',
    shift: '晚上',
  },
  // 11月2日患者 (周六)
  {
    name: '胡二十',
    gender: '女',
    age: 50,
    department: '内科',
    date: '2025-11-02',
    shift: '上午',
  },
  // 11月3日患者 (周日)
  {
    name: '徐二一',
    gender: '男',
    age: 39,
    department: '外科',
    date: '2025-11-03',
    shift: '下午',
  },
  // 11月4日患者 (周一)
  {
    name: '何二二',
    gender: '女',
    age: 44,
    department: '内科',
    date: '2025-11-04',
    shift: '上午',
  },
])

// 当前排班状态和搜索相关变量
const showCurrentShift = ref(false)
const searchName = ref('')
const filteredPatientList = ref([...patientList.value]) // 初始为全部患者
const currentShiftDisplay = ref('') // 显示当前筛选的班次信息

// 选中的排班班次（用于申请调整排班）
const selectedScheduleShift = ref(null)

// 调整排班弹窗相关
const scheduleAdjustDialogVisible = ref(false)
const scheduleAdjustForm = ref({
  type: 'leave', // 'leave' 或 'shift'
  leaveDays: 1,
  leaveReason: '',
  selectedShift: '',
  selectedShiftData: null,
  shiftReason: '',
})

// 微型排班表数据（用于调班选择）
const miniWeekDays = [
  { label: '周一', prop: 'mon' },
  { label: '周二', prop: 'tue' },
  { label: '周三', prop: 'wed' },
  { label: '周四', prop: 'thu' },
  { label: '周五', prop: 'fri' },
  { label: '周六', prop: 'sat' },
  { label: '周日', prop: 'sun' },
]

const miniScheduleData = [
  {
    timeSlot: '上午',
    mon: '李医生',
    tue: '张艺',
    wed: '',
    thu: '张艺',
    fri: '',
    sat: '张艺',
    sun: '',
  },
  {
    timeSlot: '下午',
    mon: '',
    tue: '张艺',
    wed: '',
    thu: '张艺',
    fri: '',
    sat: '',
    sun: '张艺',
  },
  {
    timeSlot: '晚上',
    mon: '张艺',
    tue: '',
    wed: '',
    thu: '',
    fri: '张艺',
    sat: '',
    sun: '',
  },
]

// 获取医生当前或最近的班次信息
const getDoctorShiftInfo = () => {
  const now = new Date()
  const hour = now.getHours()
  const today = now.toISOString().split('T')[0]

  // 判断当前时间段
  let currentPeriod = ''
  if (hour >= 8 && hour < 14) {
    currentPeriod = '上午'
  } else if (hour >= 14 && hour < 19) {
    currentPeriod = '下午'
  } else if (hour >= 19 && hour < 21) {
    currentPeriod = '晚上'
  }

  // 获取当前医生姓名
  const currentDoctorName = '张艺'

  // 检查当前是否在值班
  let onDutyNow = false
  let targetDate = today
  let targetShift = currentPeriod

  // 根据排班表检查当前时段是否值班
  // 这里使用简化的逻辑，实际应该查询排班表数据库
  const todayPatients = patientList.value.filter((p) => p.date === today && p.shift === currentPeriod)

  if (todayPatients.length > 0 && currentPeriod) {
    onDutyNow = true
  }

  // 如果当前不在值班，查找最近的未完成班次
  if (!onDutyNow) {
    // 查找所有未来的班次
    const allShifts = patientList.value
      .map((p) => ({ date: p.date, shift: p.shift }))
      .filter((item, index, self) => index === self.findIndex((t) => t.date === item.date && t.shift === item.shift))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        const shiftOrder = { 上午: 1, 下午: 2, 晚上: 3 }
        return shiftOrder[a.shift] - shiftOrder[b.shift]
      })

    // 找到第一个未来的或当前的班次
    for (const shift of allShifts) {
      if (shift.date > today || (shift.date === today && !currentPeriod)) {
        targetDate = shift.date
        targetShift = shift.shift
        break
      }
    }
  }

  return { onDutyNow, targetDate, targetShift }
}

// 切换当前排班显示
const toggleCurrentShift = () => {
  showCurrentShift.value = !showCurrentShift.value
  filterPatients()
}

// 搜索患者
const searchPatient = () => {
  filterPatients()
}

// 过滤患者列表
const filterPatients = () => {
  let result = [...patientList.value]

  // 如果启用了当前排班筛选
  if (showCurrentShift.value) {
    const shiftInfo = getDoctorShiftInfo()
    const { onDutyNow, targetDate, targetShift } = shiftInfo

    // 筛选对应班次的患者
    result = result.filter((patient) => patient.date === targetDate && patient.shift === targetShift)

    // 更新显示的班次信息
    if (onDutyNow) {
      currentShiftDisplay.value = `当前班次：${targetDate} ${targetShift}`
    } else {
      currentShiftDisplay.value = `最近班次：${targetDate} ${targetShift}`
    }
  } else {
    // 未点击当前排班按钮，显示所有未就诊患者
    currentShiftDisplay.value = '全部未就诊患者'
  }

  // 如果有搜索关键词，按姓名筛选
  if (searchName.value.trim()) {
    result = result.filter((patient) =>
      patient.name.toLowerCase().includes(searchName.value.toLowerCase()),
    )
  }

  filteredPatientList.value = result
}

// 通知数据
const notifications = ref([
  {
    title: '系统维护通知',
    content: '系统将于今晚22:00-24:00进行维护，请提前保存工作数据',
    time: '2025-10-01 08:00',
  },
  { title: '新功能上线', content: '电子病历系统新增模板功能，欢迎使用', time: '2025-09-30 16:30' },
  {
    title: '会议通知',
    content: '本周五下午14:00召开科室会议，请准时参加',
    time: '2025-09-29 10:15',
  },
])

// 加号申请数据
const requests = ref([
  { patientName: '周八', requestTime: '2025-10-01 12:30', reason: '急性腹痛，急需就诊' },
  { patientName: '吴九', requestTime: '2025-10-01 13:15', reason: '从外地赶来，希望今天能看病' },
])

onMounted(() => {
  // 这里可以从后端获取用户信息，或从本地存储中获取
  username.value = '张艺' // 演示身份：张艺

  // 初始化显示的班次信息
  currentShiftDisplay.value = '全部未就诊患者'

  // 实际项目中，这里应该从API获取数据
})

const logout = () => {
  // 清除token
  localStorage.removeItem('token')
  ElMessage.success('已成功退出登录')
  // 跳转到登录页
  router.push('/login')
}

const handleTabSelect = (index) => {
  activeTab.value = index
}

// 接诊处理
const handleDiagnosis = (index) => {
  ElMessage.success(`已开始接诊 ${patientList.value[index].name}`)
  // 实际项目中应该跳转到诊疗页面
}

// 同意加号申请
const approveRequest = (index) => {
  ElMessage.success(`已同意 ${requests.value[index].patientName} 的加号申请`)
  requests.value.splice(index, 1)
  // 实际项目中应该调用API更新数据
}

// 拒绝加号申请
const rejectRequest = (index) => {
  ElMessage.info(`已拒绝 ${requests.value[index].patientName} 的加号申请`)
  requests.value.splice(index, 1)
  // 实际项目中应该调用API更新数据
}

// 表格单元格样式
const getCellClassName = ({ row, column, rowIndex, columnIndex }) => {
  // 获取当前医生的姓名
  const currentDoctorName = '张艺' // 实际项目中应该从用户信息中获取

  // 获取当前列的属性名和值
  const prop = column.property
  const cellValue = row[prop]

  // 如果是时间段列，不应用任何样式
  if (prop === 'timeSlot') {
    return ''
  }

  // 检查是否是选中的单元格
  if (
    selectedScheduleShift.value &&
    selectedScheduleShift.value.rowIndex === rowIndex &&
    selectedScheduleShift.value.columnProp === prop
  ) {
    return 'selected-main-schedule-cell'
  }

  // 检查是否是当前医生的值班
  if (cellValue && cellValue.trim() === currentDoctorName) {
    return 'doctor-duty-cell'
  }

  // 如果不是当前医生但有其他医生值班，返回普通值班样式
  if (cellValue && cellValue.trim()) {
    return 'other-duty-cell'
  }

  return ''
}

// 鼠标悬停处理
const handleCellEnter = (row, column, cell, event) => {
  if (cell.classList.contains('doctor-duty-cell')) {
    cell.style.cursor = 'pointer'
  }
}

const handleCellLeave = (row, column, cell, event) => {
  cell.style.cursor = 'default'
}

// 处理主排班表单元格点击
const handleMainScheduleCellClick = (row, column, cell, event) => {
  // 如果点击的是时间段列，不处理
  if (column.property === 'timeSlot') return

  const currentDoctorName = '张艺'
  const cellValue = row[column.property]

  // 只有点击本人的班次才能选中
  if (cellValue && cellValue.trim() === currentDoctorName) {
    // 构造选中的班次信息
    const shiftInfo = {
      rowIndex: scheduleData.findIndex((item) => item === row),
      columnProp: column.property,
      timeSlot: row.timeSlot,
      dayLabel: weekDays.find((d) => d.prop === column.property)?.label,
    }

    // 如果点击的是已选中的班次，取消选中；否则选中新班次
    if (
      selectedScheduleShift.value &&
      selectedScheduleShift.value.rowIndex === shiftInfo.rowIndex &&
      selectedScheduleShift.value.columnProp === shiftInfo.columnProp
    ) {
      selectedScheduleShift.value = null
      ElMessage.info('已取消选择班次')
    } else {
      selectedScheduleShift.value = shiftInfo
      ElMessage.success(`已选择：${shiftInfo.dayLabel} ${shiftInfo.timeSlot}`)
    }
  }
}

// 打开调整排班弹窗
const openScheduleAdjustDialog = () => {
  scheduleAdjustDialogVisible.value = true
}

// 关闭调整排班弹窗
const closeScheduleAdjustDialog = () => {
  scheduleAdjustDialogVisible.value = false
  // 重置表单
  scheduleAdjustForm.value = {
    type: 'leave',
    leaveDays: 1,
    leaveReason: '',
    selectedShift: '',
    selectedShiftData: null,
    shiftReason: '',
  }
}

// 处理排班表格单元格点击
const handleScheduleCellClick = (row, column, cell, event) => {
  // 如果点击的是时间段列，不处理
  if (column.property === 'timeSlot') return

  const dayLabel = miniWeekDays.find((d) => d.prop === column.property)?.label
  const timeSlot = row.timeSlot

  if (dayLabel && timeSlot) {
    scheduleAdjustForm.value.selectedShift = `${dayLabel} ${timeSlot}`
    scheduleAdjustForm.value.selectedShiftData = {
      day: column.property,
      timeSlot: timeSlot,
    }
  }
}

// 获取微型排班表单元格样式
const getMiniScheduleCellClass = ({ row, column }) => {
  const currentDoctorName = '张艺'
  const prop = column.property

  if (prop === 'timeSlot') {
    return ''
  }

  const cellValue = row[prop]

  // 检查是否是已选择的单元格
  if (
    scheduleAdjustForm.value.selectedShiftData &&
    scheduleAdjustForm.value.selectedShiftData.day === prop &&
    scheduleAdjustForm.value.selectedShiftData.timeSlot === row.timeSlot
  ) {
    return 'selected-schedule-cell'
  }

  // 检查是否是当前医生的值班
  if (cellValue && cellValue.trim() === currentDoctorName) {
    return 'doctor-duty-cell'
  }

  // 如果不是当前医生但有其他医生值班
  if (cellValue && cellValue.trim()) {
    return 'other-duty-cell'
  }

  // 空闲时段，可点击
  return 'available-schedule-cell'
}

// 提交调整排班申请
const submitScheduleAdjust = () => {
  if (scheduleAdjustForm.value.type === 'leave') {
    // 验证请假表单
    if (!scheduleAdjustForm.value.leaveDays || scheduleAdjustForm.value.leaveDays < 1) {
      ElMessage.warning('请输入有效的请假天数')
      return
    }
    if (!scheduleAdjustForm.value.leaveReason.trim()) {
      ElMessage.warning('请填写请假原因')
      return
    }

    ElMessage.success(
      `请假申请已提交：${scheduleAdjustForm.value.leaveDays}天，原因：${scheduleAdjustForm.value.leaveReason}`,
    )
  } else if (scheduleAdjustForm.value.type === 'shift') {
    // 验证调班表单
    if (!scheduleAdjustForm.value.selectedShift) {
      ElMessage.warning('请选择目标班次')
      return
    }
    if (!scheduleAdjustForm.value.shiftReason.trim()) {
      ElMessage.warning('请填写调班申请原因')
      return
    }

    ElMessage.success(
      `调班申请已提交：目标班次 ${scheduleAdjustForm.value.selectedShift}，原因：${scheduleAdjustForm.value.shiftReason}`,
    )
  }

  // 实际项目中应该调用API提交申请
  closeScheduleAdjustDialog()
}
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

/* 医生自己值班的单元格样式 */
:deep(.doctor-duty-cell) {
  background-color: rgba(64, 158, 255, 0.2) !important;
  font-weight: bold;
  color: #409eff;
  cursor: pointer;
}

/* 其他医生值班的单元格样式 */
:deep(.other-duty-cell) {
  background-color: rgba(103, 194, 58, 0.1) !important;
}

/* 主排班表选中的单元格样式 */
:deep(.selected-main-schedule-cell) {
  background-color: #409eff !important;
  color: white !important;
  font-weight: bold;
  border: 2px solid #1890ff !important;
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.5) !important;
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

/* 已选择的排班单元格 */
:deep(.selected-schedule-cell) {
  background-color: #1890ff !important;
  color: white !important;
  font-weight: bold;
}

/* 可用的排班单元格 */
:deep(.available-schedule-cell) {
  background-color: #f0f9ff !important;
  cursor: pointer;
}

:deep(.available-schedule-cell:hover) {
  background-color: #bae7ff !important;
}
</style>
