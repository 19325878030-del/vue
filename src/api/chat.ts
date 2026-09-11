import { api } from './http'

/**
 * 聊天接口。
 *
 * 后端 `POST /api/chat` 一次性返回完整回复(非流式)。模型选择的两种形态:
 *  - 本地 Ollama:传 `model`(模型名)
 *  - 外部大模型:传 `provider_id`,此时 `model` 可以留 null —— 后端 provider 分支优先
 *
 * 注意:`model` 传 null 且不带 `provider_id` 时,后端会静默回落到它硬编码的默认模型,
 * 所以调用方必须显式给出模型,不能靠"不传"来省事。
 */

export type ChatMode = 'agent' | 'rag' | 'llm'

/** Agent 模式下的一步工具调用记录;只有 mode === 'agent' 时后端才会返回 trace */
export interface ChatTraceItem {
  tool?: string
  parameters?: unknown
  result?: unknown
  [k: string]: unknown
}

export interface ChatPayload {
  reply?: string
  /** 工具调用轨迹;仅 agent 模式有,且可能缺失或非数组,读取时需防御 */
  trace?: ChatTraceItem[]
  [k: string]: unknown
}

export interface ChatParams {
  message: string
  mode: ChatMode
  temperature?: number
  model?: string | null
  provider_id?: number | null
  /** 仅 rag 模式需要,且必须非空,否则后端返回 400 */
  collection_name?: string | null
  /** 仅 agent 模式用:启用的工具包包名列表(来自 /api/agent/tools 的 package 字段);
   *  不传 / null / 空数组 = 后端启用全部工具包 */
  tool_packages?: string[] | null
}

/** 发送一条消息并等待完整回复 */
export function sendChat(params: ChatParams) {
  return api<ChatPayload>('/api/chat', { method: 'POST', body: params })
}
