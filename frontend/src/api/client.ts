// frontend/src/api/client.ts
import axios from 'axios';

// 创建 Axios 实例
export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 5000,
});

// 1. 请求拦截器 (Request Interceptor)
// 作用：每次发请求出去之前，都会先经过这里
api.interceptors.request.use((config) => {
  // 从本地抓取 Token
  const token = localStorage.getItem('flowcore_admin_token');
  if (token) {
    // 如果有 Token，就塞进 Headers 里的 Authorization 字段，带上 Bearer 前缀
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. 响应拦截器 (Response Interceptor)
// 作用：每次收到后端的回复后，先经过这里检查一下
api.interceptors.response.use(
  (response) => response, // 成功的话直接放行
  (error) => {
    // 如果后端返回 401 Unauthorized (我们刚刚在 Rust 里写的拦截状态码)
    if (error.response?.status === 401) {
      // 说明 Token 被篡改或者过期了，直接清空并强制踢回登录页
      localStorage.removeItem('flowcore_admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);