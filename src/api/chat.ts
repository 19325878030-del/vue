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

/** 前端 RAG×Agent 组合走独立端点 /api/chat/parallel,该端点的请求体不含 mode ——
 *  所以它是"第 4 种发送方式"而非第 4 个 ChatMode 值,不能直接塞进 ChatParams.mode */
export type SendMode = ChatMode | 'agent_rag'

/** 执行过程里的一步。普通工具调用只有 tool/parameters/result */
export interface ChatTraceItem {
  tool?: string
  /** 'rag' = 知识库检索步骤(仅并行模式);普通工具调用没有这个字段 */
  type?: string
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
  /** agent 模式(以及并行端点的并行模式)用:启用的工具包包名列表
   *  (来自 /api/agent/tools 的 package 字段);
   *  不传 / null / 空数组 = 后端启用全部工具包 */
  tool_packages?: string[] | null
}

/** 发送一条消息并等待完整回复 */
export function sendChat(params: ChatParams) {
  return api<ChatPayload>('/api/chat', { method: 'POST', body: params })
}

/* ── 并行模式 /api/chat/parallel ──────────────────────────────────────────
   与 /api/chat 的区别只在编排,不在模型选择。后端把知识库检索当成一种
   特殊步骤混进 trace(type='rag'),另外单独返回 knowledge 概括本次全部检索。 */

/** 一次知识库检索的概况 */
export interface ChatKnowledgeRetrieval {
  /** 'prefetch' = 请求入口就开线程预取 / 'ondemand' = Agent 中途按需补检索 */
  phase?: string
  query?: string
  /** 实际命中的库名 */
  collection?: string | null
  found?: boolean
  chunks?: number
  elapsed_ms?: number
}

export interface ChatKnowledge {
  /** 本次实际查过的库;未指定 collection_name 时是扫过的全部库 */
  collections?: string[]
  /** 含未被 Agent 用上的预取 —— 预取本就是"先算好、可能用不上" */
  retrievals?: ChatKnowledgeRetrieval[]
  /** 知识库不可用时后端会降级为纯 Agent,降级原因写在这里 */
  error?: string | null
}

export interface ChatParallelPayload extends ChatPayload {
  knowledge?: ChatKnowledge
}

/** 并行端点参数:与 /api/chat 同构但去掉 mode(端点本身即模式),
 *  collection_name 改为可选 —— 不传 = 跨本机全部知识库检索 */
export type ChatParallelParams = Omit<ChatParams, 'mode' | 'collection_name'> & {
  collection_name?: string | null
}

/** 发送一条消息并等待完整的"Agent 边思考边查知识库"回复 */
export function sendChatParallel(params: ChatParallelParams) {
  return api<ChatParallelPayload>('/api/chat/parallel', { method: 'POST', body: params })
}
