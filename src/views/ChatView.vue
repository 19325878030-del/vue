<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useChatStore, type UiMode } from '@/stores/chat'
import IconSvg from '@/components/common/IconSvg.vue'

const ui = useUiStore()
const auth = useAuthStore()
const chat = useChatStore()

/* ── 模式组合(原型规则:RAG×AGENT 可并行,Skill 独占) ──
   状态在 chat store 里 —— 模式唯一的用途就是决定这条消息怎么发出去 */
const MODES: Record<UiMode, { chip: string; sub: string; dot: string }> = {
  rag: { chip: 'RAG 知识检索', sub: 'RAG · 检索你的知识库,答案有据可查', dot: '#1b6ef3' },
  agent: { chip: 'AGENT 智能体', sub: 'AGENT · 拆解任务、调用工具、自动执行', dot: '#a142f4' },
  skill: { chip: 'Skill 技能', sub: 'Skill · 加载预置技能,按流程完成工作', dot: '#f76c05' },
}
const CHIPS: { mode: UiMode; label: string; icon: string }[] = [
  { mode: 'agent', label: 'Agent 模式', icon: 'robot' },
  { mode: 'rag', label: 'RAG 检索', icon: 'library' },
  { mode: 'skill', label: 'Skill 技能', icon: 'bolt' },
]
const SUB_DEFAULT = '我是 kby —— 今天想从哪里开始?'
const SUB_COMBO = 'AGENT × RAG · 智能体自动执行,遇到未知知识优先检索你的知识库'

const dotStyle = computed(() => {
  const colors = chat.activeModes.map((k) => MODES[k].dot)
  if (!colors.length) return {}
  return { background: colors.length > 1 ? `linear-gradient(90deg,${colors.join(',')})` : colors[0] }
})
const subtitle = computed(() => {
  const on = chat.activeModes
  return on.includes('agent') && on.includes('rag') ? SUB_COMBO : on.length ? MODES[on[0]].sub : SUB_DEFAULT
})
const greetName = computed(() => (auth.loggedIn ? auth.username : 'yushe'))

/* ── 输入框:自适应高度 + Enter 发送 ── */
const input = ref('')
const inputEl = ref<HTMLTextAreaElement>()

function autosize() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 180)}px`
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    void send()
  }
}
async function send() {
  if (!input.value.trim() || chat.sending) return
  const text = input.value
  // 被拒绝(没选模型 / Skill 未接入)时不发也不清空,保留用户已输入的文字
  if (!(await chat.send(text))) return
  input.value = ''
  await nextTick()
  autosize()
}

/* ── 消息流 ── */
const scrollArea = ref<HTMLElement>()
const lastMsg = computed(() => chat.messages[chat.messages.length - 1])

// 新消息、回复到达、错误落地时都滚到底部
watch(
  () => [chat.messages.length, lastMsg.value?.content, lastMsg.value?.pending, lastMsg.value?.error],
  async () => {
    await nextTick()
    const el = scrollArea.value
    if (el) el.scrollTop = el.scrollHeight
  },
)

/** 工具调用轨迹里的参数/结果可能很大,截断后再展示 */
const TRACE_LIMIT = 500
function brief(value: unknown): string {
  let s: string
  try {
    s = typeof value === 'string' ? value : (JSON.stringify(value, null, 2) ?? String(value))
  } catch {
    s = String(value)
  }
  return s.length > TRACE_LIMIT ? `${s.slice(0, TRACE_LIMIT)} …` : s
}
</script>

<template>
  <div class="chat-page">
    <div ref="scrollArea" class="scroll-area">
      <!-- 欢迎页(对话开始后隐藏) -->
      <section v-if="!chat.hasMessages" class="welcome">
        <h1 class="greet"><span class="grad">你好,{{ greetName }}</span></h1>
        <p class="sub">{{ subtitle }}</p>
      </section>

      <!-- 消息流 -->
      <div v-else class="msg-list">
        <div v-for="m in chat.messages" :key="m.id" class="msg" :class="m.role">
          <div class="bubble" :class="{ error: !!m.error }">
            <span v-if="m.pending" class="typing"><i></i><i></i><i></i></span>
            <template v-else-if="m.error">{{ m.error }}</template>
            <template v-else>
              <!-- Agent 模式的工具调用轨迹;默认折叠,需要时再展开 -->
              <details v-if="m.trace && m.trace.length" class="trace">
                <summary>工具调用 {{ m.trace.length }} 次</summary>
                <div v-for="(t, i) in m.trace" :key="i" class="trace-item">
                  <b>{{ t.tool || '未知工具' }}</b>
                  <pre>{{ brief(t.parameters) }}</pre>
                  <pre>{{ brief(t.result) }}</pre>
                </div>
              </details>
              <span class="text">{{ m.content }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="composer-wrap">
      <!-- 已开启模式胶囊(组合时圆点为渐变) -->
      <div v-if="chat.activeModes.length" class="mode-chip">
        <span class="dot" :style="dotStyle"></span>
        <span>{{ chat.activeModes.map((k) => MODES[k].chip).join(' + ') }}</span>
        <button title="退出该模式" @click="chat.clearModes()"><IconSvg name="x" :size="14" /></button>
      </div>

      <div class="composer">
        <textarea
          ref="inputEl"
          v-model="input"
          rows="1"
          placeholder="询问 kby"
          @input="autosize"
          @keydown="onKeydown"
        ></textarea>
        <div class="comp-row">
          <div class="comp-left">
            <button
              class="icon-btn"
              title="添加文件"
              style="width: 36px; height: 36px"
              @click="ui.toast('附件上传未接入')"
            >
              <IconSvg name="plus" :size="20" />
            </button>
            <button
              v-for="c in CHIPS"
              :key="c.mode"
              class="chip"
              :class="{ active: chat.modes[c.mode] }"
              @click="chat.toggleMode(c.mode)"
            >
              <IconSvg :name="c.icon" :size="16" />
              {{ c.label }}
            </button>
          </div>
          <div class="comp-right">
            <button
              class="icon-btn"
              title="使用麦克风"
              style="width: 36px; height: 36px"
              @click="ui.toast('语音输入未接入')"
            >
              <IconSvg name="mic" :size="19" />
            </button>
            <button class="send" title="发送" :disabled="!input.trim() || chat.sending" @click="send">
              <IconSvg name="send" :size="20" />
            </button>
          </div>
        </div>
      </div>
      <p class="disclaimer">kby 可能会犯错,请核查重要信息。</p>
    </div>
  </div>
</template>

<style scoped>
.chat-page { flex: 1; min-height: 0; display: flex; flex-direction: column }

/* 欢迎页(Gemini 式问候 + 顶部光晕) */
.welcome {
  margin: auto; padding: 9vh 24px 12px;
  display: flex; flex-direction: column; align-items: center; gap: 26px;
  position: relative; width: 100%; max-width: 860px;
}
.welcome::before {
  content: ''; position: absolute; left: 0; right: 0; top: -40px; height: 360px; z-index: -1;
  background: radial-gradient(58% 100% at 50% 0%, rgba(27, 110, 243, .10), rgba(161, 66, 244, .06) 55%, transparent 78%);
  pointer-events: none;
}

/* ── 消息流 ── */
.msg-list {
  width: 100%; max-width: 840px; margin: 0 auto;
  padding: 24px 20px 8px;
  display: flex; flex-direction: column; gap: 14px;
}
.msg { display: flex }
.msg.user { justify-content: flex-end }
.msg.assistant { justify-content: flex-start }

.bubble {
  max-width: 78%; padding: 12px 16px; border-radius: 16px;
  font-size: 14.5px; line-height: 1.65; word-break: break-word;
}
.msg.user .bubble { background: var(--blue); color: #fff; border-bottom-right-radius: 6px }
.msg.assistant .bubble { background: var(--surface); border-bottom-left-radius: 6px }
/* 回复里的空行/缩进要保留,但又不能用 v-html 渲染(模型输出不可信) */
.bubble .text { white-space: pre-wrap }
.bubble.error { background: #fdecec; color: #b3261e }

/* 等待回复的三点动画 */
.typing { display: inline-flex; gap: 4px; align-items: center; padding: 2px 0 }
.typing i {
  width: 6px; height: 6px; border-radius: 50%; background: var(--muted);
  animation: blink 1.2s infinite ease-in-out;
}
.typing i:nth-child(2) { animation-delay: .18s }
.typing i:nth-child(3) { animation-delay: .36s }
@keyframes blink { 0%, 80%, 100% { opacity: .3 } 40% { opacity: 1 } }

/* Agent 工具调用轨迹 */
.trace {
  margin-bottom: 8px; padding: 8px 10px; border-radius: 10px;
  background: #fff; border: 1px dashed var(--border);
  font-size: 12px; color: var(--muted);
}
.trace summary { cursor: pointer; font-weight: 600; color: var(--blue-deep) }
.trace-item { margin-top: 8px }
.trace-item b { font-size: 12px; color: var(--text-2) }
.trace-item pre {
  margin: 4px 0 0; padding: 6px 8px; border-radius: 8px; background: var(--surface);
  font-size: 11.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-all;
  max-height: 160px; overflow: auto;
}
</style>
