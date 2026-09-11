import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import router from '@/router'
import { ApiError } from '@/api/http'
import {
  sendChat,
  sendChatParallel,
  type ChatKnowledge,
  type ChatTraceItem,
  type SendMode,
} from '@/api/chat'
import { useSettingsStore } from './settings'
import { useUiStore } from './ui'

/**
 * 对话状态:消息流 + 模式选择。
 *
 * 模式和消息放在同一个 store,是因为模式唯一的用途就是决定这条消息怎么发出去 ——
 * 拆成两个 store 只会让 resolveMode() 和它的唯一消费者分居两地。
 */

/** 前端暴露给用户的三种模式(与后端模式不是一一对应,见 resolveMode) */
export type UiMode = 'rag' | 'agent' | 'skill'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** 执行过程:Agent 工具调用轨迹(并行模式下还会混入知识库检索步骤) */
  trace?: ChatTraceItem[]
  /** 仅并行模式:本次全部知识库检索的概况(含没被用上的预取) */
  knowledge?: ChatKnowledge
  /** 请求失败时的错误原文(与 content 互斥) */
  error?: string
  /** 请求进行中,UI 据此显示 loading */
  pending?: boolean
  createdAt: number
}

let seq = 0
const nextId = () => `m${++seq}`

/**
 * 前端三模式 → 后端发送方式的映射。
 *
 *   - Skill 后端完全没有对应概念 → 返回 null,由调用方提示"未接入"且不发送
 *   - RAG + AGENT 组合 → 'agent_rag',走独立的 /api/chat/parallel(真并行,不再降级)
 *
 * 注意 'agent_rag' 只是前端内部的发送方式标记,不是后端 /api/chat 的 mode 值 ——
 * 并行端点的请求体里根本没有 mode 字段,由 send() 分流到另一个请求函数。
 */
export function resolveMode(modes: UiMode[]): SendMode | null {
  if (modes.includes('skill')) return null
  if (modes.includes('agent') && modes.includes('rag')) return 'agent_rag'
  if (modes.includes('rag')) return 'rag'
  if (modes.includes('agent')) return 'agent'
  return 'llm'
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const sending = ref(false)
  const modes = ref<Record<UiMode, boolean>>({ rag: false, agent: false, skill: false })

  /**
   * RAG 模式使用的向量库(后端合法集合名)。在 /rag 界面点卡片选择,
   * 聊天页不再展示选择器 —— 库的增删选都在那边完成。
   */
  const ragCollection = ref('')

  /**
   * Agent 模式启用的工具包(后端 package 名,可多选)。在 /agent 界面点卡片增删,
   * 发送时作为 tool_packages 传给后端 —— 后端不传=全部启用,传了就只用这些。
   * 一个都没选时不能发(见 send),否则后端会静默启用全部,与用户所见不符。
   */
  const agentPackages = ref<string[]>([])

  const activeModes = computed(() => (Object.keys(modes.value) as UiMode[]).filter((k) => modes.value[k]))
  const hasMessages = computed(() => messages.value.length > 0)

  /** 原型规则:Skill 独占,RAG × AGENT 可并行 */
  function toggleMode(m: UiMode) {
    modes.value =
      m === 'skill'
        ? { rag: false, agent: false, skill: !modes.value.skill }
        : { ...modes.value, skill: false, [m]: !modes.value[m] }
  }

  function clearModes() {
    modes.value = { rag: false, agent: false, skill: false }
  }

  function clear() {
    messages.value = []
  }

  /**
   * 发送一条消息。
   * @returns 是否真的发出去了 —— 返回 false 时调用方应保留用户已输入的文字。
   */
  async function send(text: string): Promise<boolean> {
    const content = text.trim()
    if (!content || sending.value) return false

    const settings = useSettingsStore()
    const ui = useUiStore()

    // 没有选中模型时不能发:后端对 `model: null` 会静默回落到它硬编码的默认模型,
    // 那会变成"回复成功但用的是用户从没选过的模型",比直接报错更难排查
    if (!settings.current) {
      ui.toast('暂无可用模型,请检查 Ollama 或登录后接入外部模型')
      return false
    }

    const mode = resolveMode(activeModes.value)
    if (mode === null) {
      ui.toast('Skill 模式后端暂未实现,本次未发送')
      return false
    }
    // RAG 与并行模式都必须带上库才能发(库在 /rag 界面的卡片上点选)。
    // 并行模式后端虽然允许不传(= 跨全部库检索),但"查了哪几个库"会直接
    // 影响答案且用户看不见,不如统一要求显式选一个。
    if ((mode === 'rag' || mode === 'agent_rag') && !ragCollection.value) {
      ui.toast('请先到 RAG 界面选择向量库')
      return false
    }
    // Agent 与并行模式至少要选中一个工具包才能发(后端不传=全部启用,静默用全部更难排查);
    // 没选就直接跳去 /agent 界面点卡片选,用户选完回来再发
    if ((mode === 'agent' || mode === 'agent_rag') && agentPackages.value.length === 0) {
      ui.toast('请先选择工具包')
      void router.push('/agent')
      return false
    }

    messages.value.push({ id: nextId(), role: 'user', content, createdAt: Date.now() })
    const reply: ChatMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      pending: true,
      createdAt: Date.now(),
    }
    messages.value.push(reply)

    sending.value = true
    try {
      const sp = settings.sendParams
      // 两个端点共用的部分(模型选择与编排无关)
      const base = {
        message: content,
        temperature: 0.7, // 暂无温度控件,与后端默认值保持一致
        model: sp.model,
        provider_id: sp.provider_id,
      }
      // 并行模式是独立端点且请求体不含 mode,所以在这里分流而不是给 sendChat 多传一个值
      const res =
        mode === 'agent_rag'
          ? await sendChatParallel({
              ...base,
              // 传选中库的合法集合名(slug 后的 name,不是给人看的 display_name)
              collection_name: ragCollection.value,
              // 后端不传/空 = 启用全部工具包,与用户所见不符,所以显式带上勾选结果
              tool_packages: agentPackages.value,
            })
          : await sendChat({
              ...base,
              mode,
              // RAG 模式传选中库的合法集合名
              collection_name: mode === 'rag' ? ragCollection.value : null,
              // Agent 模式传 /agent 界面选中的工具包(可能多个;后端不传=全部)
              tool_packages: mode === 'agent' ? agentPackages.value : null,
            })
      reply.content = res?.reply ?? ''
      // trace 只有 agent / 并行模式有,且可能缺失或不是数组
      reply.trace = Array.isArray(res?.trace) ? res.trace : []
      // knowledge 只有并行模式返回;缺失时为 undefined,界面据此不渲染检索概况
      reply.knowledge = res?.knowledge && typeof res.knowledge === 'object' ? res.knowledge : undefined
    } catch (e) {
      // 401(未登录却选外部模型)已由 http.ts 自动弹出登录框,这里只负责显示原因
      reply.error = e instanceof ApiError ? e.message : '请求失败'
    } finally {
      reply.pending = false
      sending.value = false
    }
    return true
  }

  return {
    messages,
    sending,
    modes,
    activeModes,
    hasMessages,
    ragCollection,
    agentPackages,
    toggleMode,
    clearModes,
    clear,
    send,
  }
})
