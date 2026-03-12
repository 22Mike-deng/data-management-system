/**
 * Axios 请求封装
 * 创建者：dzh
 * 创建时间：2026-03-11
 * 更新时间：2026-03-11
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ApiResponse } from '@/types'

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 可在此添加token等认证信息
    return config
  },
  (error) => {
    console.error('请求错误：', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data
    if (res.code !== 0 && res.code !== 200) {
      console.error('接口错误：', res.message)
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return response
  },
  (error) => {
    // 输出详细错误信息
    if (error.response) {
      console.error('响应错误：', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      })
    } else if (error.request) {
      console.error('无响应：', error.request)
    } else {
      console.error('请求错误：', error.message)
    }
    return Promise.reject(error)
  }
)

// 封装请求方法
const request = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return service.get(url, config).then((res) => res.data)
  },

  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return service.post(url, data, config).then((res) => res.data)
  },

  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return service.put(url, data, config).then((res) => res.data)
  },

  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return service.delete(url, config).then((res) => res.data)
  },
}

export default request
