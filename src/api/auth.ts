import { api } from './http'

/**
 * 后端返回结构尚未与后端同学最终对齐,这里做宽容解析:
 * 登录/注册成功后用户名按 username / user.username / profile.username 顺序取,
 * 取不到就回退为用户输入的账号名(auth store 兜底)。
 */
export interface AuthPayload {
  username?: string
  email?: string
  [key: string]: unknown
}

/** 登录:POST /api/auth/login {username, password} → 设置会话 Cookie */
export function login(account: string, password: string) {
  return api<AuthPayload>('/api/auth/login', {
    method: 'POST',
    body: { username: account, password },
  })
}

/** 注册:POST /api/auth/register {username, email, password} */
export function register(username: string, email: string, password: string) {
  return api<AuthPayload>('/api/auth/register', {
    method: 'POST',
    body: { username, email, password },
  })
}

/** 查询当前会话(后端若暂无此接口则 404,调用方需容忍失败) */
export function me() {
  return api<AuthPayload>('/api/auth/me')
}

/** 退出登录(后端若暂无此接口,忽略失败) */
export function logout() {
  return api<AuthPayload>('/api/auth/logout', { method: 'POST' })
}
