// frontend/src/api/client.ts
import axios from 'axios';

/**
 * 将后端返回的相对上传路径（如 /uploads/server_covers/xxx.png）
 * 转换为可在浏览器中访问的完整 URL。
 *
 * - 若 VITE_API_BASE_URL 是绝对地址（如 https://api.example.com/api），
 *   则取其 origin 拼接路径。
 * - 若 baseURL 是相对路径（如 /api，即同域 Nginx 反代模式），
 *   则直接返回相对路径，让浏览器使用当前域名访问。
 */
export function getUploadUrl(path: string): string {
  if (!path) return '';
  // 已经是完整 URL（外部链接 / blob / data URI），直接返回
  if (/^(https?:\/\/|blob:|data:)/i.test(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseURL = (import.meta as any).env?.VITE_API_BASE_URL ?? '/api';

  if (/^https?:\/\//i.test(baseURL)) {
    // 绝对地址模式：取 origin 部分（去掉 /api 路径前缀）
    try {
      return `${new URL(baseURL).origin}${normalizedPath}`;
    } catch {
      // URL 解析失败，回退到相对路径
    }
  }
  // 同域反代模式：直接使用相对路径
  return normalizedPath;
}

// 创建 Axios 实例
export const api = axios.create({
  // 默认走同域 /api，方便 Docker/Nginx 反代；本地开发也可通过 VITE_API_BASE_URL 覆盖
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL ?? '/api',
  timeout: 5000,
});

// 1. 请求拦截器 (Request Interceptor)
// 作用：每次发请求出去之前，都会先经过这里
api.interceptors.request.use((config) => {
  // 公共 API Key（用于公开展示页等公共接口）
  const publicApiKey = (import.meta as any).env?.VITE_PUBLIC_API_KEY as string | undefined;
  if (publicApiKey) {
    config.headers['X-API-Key'] = publicApiKey;
  }

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
    const url = (error.config?.url as string | undefined) ?? '';
    const isAdminApi = url.includes('/admin/');
    if (error.response?.status === 401 && isAdminApi) {
      // 说明 Token 被篡改或者过期了，直接清空并强制踢回登录页
      localStorage.removeItem('flowcore_admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);