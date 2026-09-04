import { useUiStore } from '@/stores/ui'

/**
 * 后端地址:
 *  - .env 配了 VITE_API_BASE → 浏览器直连(需后端开 CORS + Allow-Credentials)
 *  - 留空 → 同源 /api,开发期由 vite server.proxy 转发(见 vite.config.ts)
 */
const BASE: string = import.meta.env.VITE_API_BASE ?? ''

/** 后端返回非 2xx(或网络失败)时抛出的统一错误 */
export class ApiError extends Error {
  constructor(
    public status: number, // 网络失败时为 0
    message: string,
    public payload?: unknown, // 后端原始返回(可能是 JSON / 纯文本)
  ) {
    super(message)
  }
}

/** 从后端返回体里尽力提取人话错误信息 */
function extractMessage(data: unknown): string | null {
  if (typeof data === 'string' && data.trim()) return data.slice(0, 120)
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    for (const key of ['message', 'error', 'msg']) {
      const v = o[key]
      if (typeof v === 'string' && v) return v
    }
  }
  return null
}

/**
 * fetch 封装:Cookie 会话(credentials)、JSON 序列化、错误归一化。
 * 401 时自动弹出登录框(原型:右上角头像 → 登录/注册弹窗)。
 */
export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers: {
        // pinggy 免费隧道要求此头,否则被警告页拦截;普通后端无影响
        'X-Pinggy-No-Screen': '1',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, '网络请求失败:无法连接后端,请检查 API 地址或隧道是否过期')
  }

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    if (res.status === 401) useUiStore().openAuth()
    throw new ApiError(res.status, extractMessage(data) ?? `请求失败(HTTP ${res.status})`, data)
  }
  return data as T
}
