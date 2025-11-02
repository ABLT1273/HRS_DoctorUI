import 'axios'

declare module 'axios' {
  interface AxiosRequestConfig {
    isLogin?: boolean
  }

  interface InternalAxiosRequestConfig {
    isLogin?: boolean
  }
}
