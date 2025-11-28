<template>
  <div v-if="hasNotifications" class="notification-bar">
    <div class="notification-bar-container">
      <div class="notification-icon">
        <el-icon><Bell /></el-icon>
        <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount }}</span>
      </div>
      <div class="notification-content">
        <div class="notification-title">{{ latestNotification?.title }}</div>
        <div class="notification-text">{{ latestNotification?.content }}</div>
      </div>
      <div class="notification-actions">
        <el-button size="small" @click="viewAllNotifications">查看全部</el-button>
        <el-button size="small" type="info" @click="dismissNotification">关闭</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Bell } from '@element-plus/icons-vue'
import { ElNotification } from 'element-plus'
import type { Notification } from '@/services/types'

interface Props {
  notifications: Notification[]
}

interface Emits {
  (e: 'viewAll'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dismissed = ref(false)
const lastNotificationId = ref<string>('')

const hasNotifications = computed(() => {
  return props.notifications.length > 0 && !dismissed.value
})

const latestNotification = computed(() => {
  if (props.notifications.length === 0) return null
  return props.notifications[0]
})

const unreadCount = computed(() => {
  return props.notifications.length
})

// 监听新通知
watch(
  () => props.notifications,
  (newNotifications, oldNotifications) => {
    if (newNotifications.length > 0) {
      const latest = newNotifications[0]

      // 检查是否是新通知
      if (latest && latest.id !== lastNotificationId.value) {
        lastNotificationId.value = latest.id
        dismissed.value = false

        // 弹出通知提示
        ElNotification({
          title: latest.title,
          message: latest.content,
          type: 'info',
          duration: 5000,
          position: 'top-right',
        })
      }
    }
  },
  { deep: true }
)

const viewAllNotifications = () => {
  emit('viewAll')
  dismissed.value = true
}

const dismissNotification = () => {
  dismissed.value = true
}
</script>

<style scoped>
.notification-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.notification-bar-container {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  max-width: 1400px;
  margin: 0 auto;
  gap: 15px;
}

.notification-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  font-size: 20px;
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #f56c6c;
  color: white;
  font-size: 12px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.notification-content {
  flex: 1;
  color: white;
  overflow: hidden;
}

.notification-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-text {
  font-size: 14px;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-actions {
  display: flex;
  gap: 10px;
}
</style>
