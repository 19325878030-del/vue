import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'

/** 登录态:用户名 + 头像字母;会话由后端 Cookie 维护(credentials: 'include') */
export const useAuthStore = defineStore('auth', () => {
  const username = ref('')
  const loggedIn = ref(false)

  /** 头像字母(原型:登录成功后取用户名首字母,未登录为 Y) */
  const initial = computed(() => (username.value || 'Y')[0].toUpperCase())

  /** 从后端返回体尽力提取用户名 */
  function pickUsername(data: unknown): string {
    if (!data || typeof data !== 'object') return ''
    const o = data as Record<string, unknown>
    const candidates = [o.username, (o.user as Record<string, unknown>)?.username, (o.profile as Record<string, unknown>)?.username]
    for (const c of candidates) if (typeof c === 'string' && c) return c
    return ''
  }

  async function login(account: string, password: string) {
    const data = await authApi.login(account, password)
    username.value = pickUsername(data) || account
    loggedIn.value = true
  }

  async function register(name: string, email: string, password: string) {
    const data = await authApi.register(name, email, password)
    username.value = pickUsername(data) || name
    loggedIn.value = true
  }

  /** 刷新页面后恢复会话;后端暂无 /api/auth/me 时静默保持未登录 */
  async function restore() {
    try {
      const data = await authApi.me()
      const name = pickUsername(data)
      if (name) {
        username.value = name
        loggedIn.value = true
      }
    } catch {
      /* 404/401 均视为未登录 */
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      /* 后端暂无此接口时仅清前端态 */
    }
    username.value = ''
    loggedIn.value = false
  }

  return { username, loggedIn, initial, login, register, restore, logout }
})
