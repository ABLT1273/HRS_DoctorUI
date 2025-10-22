import { createRouter, createWebHistory } from 'vue-router'
import DoctorLogin from '../views/DoctorLogin.vue'

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: DoctorLogin,
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 导航守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token')

  if (to.meta.requiresAuth && !isAuthenticated) {
    // 需要认证但未登录，重定向到登录页面
    next({ path: '/login' })
  } else if (to.path === '/login' && isAuthenticated) {
    // 已登录但访问登录页，重定向到主页
    next({ path: '/home' })
  } else {
    // 其他情况正常导航
    next()
  }
})

export default router
