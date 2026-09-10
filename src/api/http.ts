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
 * 拆信封。后端所有 JSON 接口统一返回 { code, msg, data },code === 0 为成功,
 * 调用方真正想要的是里面的 data —— 在这里一次性剥掉,免得每个 api/*.ts 各拆一遍。
 *
 * 非信封结构(数组、纯字符串、没有 code 的对象)原样透传,兼容非标准响应。
 */
function unwrapEnvelope(raw: unknown): { data: unknown; bizError: string | null } {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    if (typeof o.code === 'number' && 'data' in o) {
      return {
        data: o.data,
        bizError: o.code === 0 ? null : String(o.msg ?? `业务错误(code ${o.code})`),
      }
    }
  }
  return { data: raw, bizError: null }
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
          // FormData 交给浏览器拼 Content-Type(含 boundary),不能手写也不能序列化
          ...(opts.body !== undefined && !(opts.body instanceof FormData)
            ? { 'Content-Type': 'application/json' }
            : {}),
        },
        body:
          opts.body instanceof FormData
            ? opts.body
            : opts.body !== undefined
              ? JSON.stringify(opts.body)
              : undefined,
      })

  } catch {
    throw new ApiError(0, '网络请求失败:无法连接后端,请检查 API 地址或隧道是否过期')
  }

  const text = await res.text()
  let raw: unknown = null
  if (text) {
    try {
      raw = JSON.parse(text)
    } catch {
      raw = text
    }
  }

  const body = unwrapEnvelope(raw)

  if (!res.ok) {
    if (res.status === 401) useUiStore().openAuth()
    // 载荷传原始 body:调试时要能看到完整信封而不只是 data
    throw new ApiError(res.status, extractMessage(raw) ?? `请求失败(HTTP ${res.status})`, raw)
  }
  // HTTP 2xx 但业务码非 0。后端目前不会产生这种情况(错误一律带非 2xx 状态码),
  // 归一化后顺手覆盖,避免以后出现"请求成功却没有数据"的静默失败
  if (body.bizError) {
    throw new ApiError(res.status, extractMessage(raw) ?? body.bizError, raw)
  }
  return body.data as T
}
