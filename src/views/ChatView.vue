<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import IconSvg from '@/components/common/IconSvg.vue'

const ui = useUiStore()
const auth = useAuthStore()

/* ── 模式组合(原型规则:RAG×AGENT 可并行,Skill 独占) ──
   TODO 第 3 步:抽到 stores/modes.ts,发送时随 POST /api/chat 传给后端 */
type Mode = 'rag' | 'agent' | 'skill'
const MODES: Record<Mode, { chip: string; sub: string; dot: string }> = {
  rag: { chip: 'RAG 知识检索', sub: 'RAG · 检索你的知识库,答案有据可查', dot: '#1b6ef3' },
  agent: { chip: 'AGENT 智能体', sub: 'AGENT · 拆解任务、调用工具、自动执行', dot: '#a142f4' },
  skill: { chip: 'Skill 技能', sub: 'Skill · 加载预置技能,按流程完成工作', dot: '#f76c05' },
}
const CHIPS: { mode: Mode; label: string; icon: string }[] = [
  { mode: 'agent', label: 'Agent 模式', icon: 'robot' },
  { mode: 'rag', label: 'RAG 检索', icon: 'library' },
  { mode: 'skill', label: 'Skill 技能', icon: 'bolt' },
]
const SUB_DEFAULT = '我是 kby —— 今天想从哪里开始?'
const SUB_COMBO = 'AGENT × RAG · 智能体自动执行,遇到未知知识优先检索你的知识库'

const modes = ref<Record<Mode, boolean>>({ rag: false, agent: false, skill: false })
const activeModes = computed(() => (Object.keys(modes.value) as Mode[]).filter((k) => modes.value[k]))

function toggleMode(m: Mode) {
  if (m === 'skill') {
    modes.value = { rag: false, agent: false, skill: !modes.value.skill } // Skill 独占
  } else {
    modes.value = { ...modes.value, skill: false, [m]: !modes.value[m] } // RAG/AGENT 与 Skill 互斥,二者可并行
  }
}
function clearModes() {
  modes.value = { rag: false, agent: false, skill: false }
}

const dotStyle = computed(() => {
  const colors = activeModes.value.map((k) => MODES[k].dot)
  if (!colors.length) return {}
  return { background: colors.length > 1 ? `linear-gradient(90deg,${colors.join(',')})` : colors[0] }
})
const subtitle = computed(() => {
  const on = activeModes.value
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
    send()
  }
}
function send() {
  if (!input.value.trim()) return
  // TODO 第 3 步:接 POST /api/chat(消息流 + Markdown 渲染 + 会话懒创建 + 侧栏最近列表)
  ui.toast('对话链路将在第 3 步接入真实 /api/chat')
}
</script>

<template>
  <div class="chat-page">
    <div class="scroll-area">
      <!-- 欢迎页(对话开始后隐藏,消息流第 3 步接入) -->
      <section class="welcome">
        <h1 class="greet"><span class="grad">你好,{{ greetName }}</span></h1>
        <p class="sub">{{ subtitle }}</p>
      </section>
    </div>

    <div class="composer-wrap">
      <!-- 已开启模式胶囊(组合时圆点为渐变) -->
      <div v-if="activeModes.length" class="mode-chip">
        <span class="dot" :style="dotStyle"></span>
        <span>{{ activeModes.map((k) => MODES[k].chip).join(' + ') }}</span>
        <button title="退出该模式" @click="clearModes"><IconSvg name="x" :size="14" /></button>
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
              :class="{ active: modes[c.mode] }"
              @click="toggleMode(c.mode)"
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
            <button class="send" title="发送" :disabled="!input.trim()" @click="send">
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
</style>
