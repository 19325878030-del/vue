import { api } from './http'

/**
 * 模型目录接口。
 *
 * 后端 `GET /api/models` 是公开接口(不需要登录),一次返回两类可选模型:
 *  - models:    本机 Ollama 已装且可用于对话的模型名(嵌入模型已被后端过滤掉)
 *  - providers: 当前登录用户在 /api/llm 下保存的外部模型配置;未登录时恒为空数组
 *
 * 响应字段按宽松解析:后端契约尚未冻结,少字段/多字段都不应让前端崩。
 */

/** 一条外部模型配置(后端 llm_providers 表;api_key 已脱敏,仅用于展示) */
export interface ApiProvider {
  id: number
  name: string
  base_url: string
  api_key: string
  model: string
  created_at?: string
  [k: string]: unknown
}

export interface ModelsPayload {
  /** 本地 Ollama 模型名列表 */
  models?: string[]
  /** 后端当前使用的模型名(全局状态,仅作首次运行的种子值,不能当真相来源) */
  current?: string
  providers?: ApiProvider[]
  /** Ollama 不可用时的错误描述;为 null 表示本地模型拉取正常 */
  error?: string | null
  [k: string]: unknown
}

/** 拉取可选模型目录(本地 Ollama + 当前用户的外部模型配置) */
export function fetchModels() {
  return api<ModelsPayload>('/api/models')
}
