import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'

/** 登录态:用户名 + 头像字母;会话由后端 Cookie 维护(credentials: 'include') */
export const useAuthStore = defineStore('auth', () => {
  const username = ref('')
  const email = ref('')
  const loggedIn = ref(false)

  /** 头像字母(原型:登录成功后取用户名首字母,未登录为 Y) */
  const initial = computed(() => (username.value || 'Y')[0].toUpperCase())

  /** 从后端返回体尽力提取字段(顶层 / user / profile 三级都找) */
  function pickField(data: unknown, keys: string[]): string {
    if (!data || typeof data !== 'object') return ''
    const o = data as Record<string, unknown>
    const roots = [o, o.user as Record<string, unknown>, o.profile as Record<string, unknown>]
    for (const r of roots) {
      if (!r || typeof r !== 'object') continue
      for (const k of keys) {
        const v = (r as Record<string, unknown>)[k]
        if (typeof v === 'string' && v) return v
      }
    }
    return ''
  }
  const pickUsername = (data: unknown) => pickField(data, ['username', 'name'])
  const pickEmail = (data: unknown) => pickField(data, ['email'])

  async function login(account: string, password: string) {
    const data = await authApi.login(account, password)
    username.value = pickUsername(data) || account
    email.value = pickEmail(data)
    loggedIn.value = true
  }

  async function register(name: string, mail: string, password: string) {
    const data = await authApi.register(name, mail, password)
    username.value = pickUsername(data) || name
    email.value = pickEmail(data) || mail
    loggedIn.value = true
  }

  /** 刷新页面后恢复会话;后端暂无 /api/auth/me 时静默保持未登录 */
  async function restore() {
    try {
      const data = await authApi.me()
      const name = pickUsername(data)
      if (name) {
        username.value = name
        email.value = pickEmail(data)
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
    email.value = ''
    loggedIn.value = false
  }

  return { username, email, loggedIn, initial, login, register, restore, logout }
})
