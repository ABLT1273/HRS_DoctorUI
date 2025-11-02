<template>
  <div class="login-container">
    <div class="login-box">
      <h2>医生登录系统</h2>
      <el-form
        :model="loginForm"
        :rules="loginRules"
        ref="loginFormRef"
        label-width="0px"
        class="login-form"
      >
        <el-form-item prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" :prefix-icon="User" />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            type="password"
            v-model="loginForm.password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item class="btns">
          <el-button type="primary" @click="handleLogin" :loading="loading">登录</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isAxiosError } from 'axios'
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { login } from '@/services/api'
import type { FormInstance } from 'element-plus'

const router = useRouter()

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: '',
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入医生账号', trigger: 'blur' },
    { min: 3, max: 15, message: '长度在 3 到 15 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 40, message: '长度在 6 到 40 个字符', trigger: 'blur' },
  ],
}

// 表单引用
const loginFormRef = ref<FormInstance>()

// 控制按钮加载状态
const loading = ref(false)

// 登录处理函数
const handleLogin = () => {
  loginFormRef.value?.validate(async (valid) => {
    if (!valid) return

    loading.value = true

    try {
      const response = await login({
        docAccount: loginForm.username,
        pass: loginForm.password,
      })

      // 登录成功处理
      localStorage.setItem('token', response.token)
      localStorage.setItem('doctorId', response.doctorId)
      localStorage.setItem('doctorAccount', loginForm.username) // 修复：应该是 doctorAccount

      ElMessage.success('登录成功')
      router.push('/home')
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        ElMessage.error('用户名或密码错误')
      } else if (error instanceof Error) {
        ElMessage.error(error.message || '登录失败')
      } else {
        ElMessage.error('登录失败')
      }
      console.error('Login Error:', error)
    } finally {
      loading.value = false
    }
  })
}

// 重置表单
const resetForm = () => {
  loginFormRef.value?.resetFields()
}
</script>

<style scoped>
.login-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('../assets/loginBackground.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-box {
  width: 400px;
  padding: 30px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  z-index: 10;
}

.login-box h2 {
  text-align: center;
  color: #409eff;
  margin-bottom: 30px;
  font-size: 24px;
}

.login-form {
  padding: 0 10px;
}

.btns {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.btns .el-button {
  width: 120px;
}
</style>
