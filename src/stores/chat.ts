import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError } from '@/api/http'
import { sendChat, type ChatMode, type ChatTraceItem } from '@/api/chat'
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
  /** Agent 模式的工具调用轨迹 */
  trace?: ChatTraceItem[]
  /** 请求失败时的错误原文(与 content 互斥) */
  error?: string
  /** 请求进行中,UI 据此显示 loading */
  pending?: boolean
  createdAt: number
}

let seq = 0
const nextId = () => `m${++seq}`

/**
 * 前端三模式 → 后端三模式的降级映射。
 *
 * 后端只认 agent / rag / llm,且没有并行编排(app.py 注释里写明"后续要加的并行模式再统一编排")。
 * 因此:
 *   - Skill 后端完全没有对应概念 → 返回 null,由调用方提示"未接入"且不发送
 *   - RAG + AGENT 并行 → 降级成 agent(后端单次请求只能选一种)
 */
export function resolveMode(modes: UiMode[]): ChatMode | null {
  if (modes.includes('skill')) return null
  if (modes.includes('rag') && !modes.includes('agent')) return 'rag'
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
    // RAG 必须带上库才能发;库在 /rag 界面的卡片上点选
    if (mode === 'rag' && !ragCollection.value) {
      ui.toast('请先到 RAG 界面选择向量库')
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
      const res = await sendChat({
        message: content,
        mode,
        temperature: 0.7, // 暂无温度控件,与后端默认值保持一致
        model: sp.model,
        provider_id: sp.provider_id,
        // RAG 模式传选中库的合法集合名(slug 后的 name,不是给人看的 display_name)
        collection_name: mode === 'rag' ? ragCollection.value : null,
      })
      reply.content = res?.reply ?? ''
      // trace 只有 agent 模式有,且可能缺失或不是数组
      reply.trace = Array.isArray(res?.trace) ? res.trace : []
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
    toggleMode,
    clearModes,
    clear,
    send,
  }
})
