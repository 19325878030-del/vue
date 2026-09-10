<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import IconSvg from '@/components/common/IconSvg.vue'

const ui = useUiStore()
const auth = useAuthStore()
// 下拉展示后端返回的真实模型(本地 Ollama + 已登录用户的外部模型),
// "设置 → 模型接入"里的开关决定其中哪些出现在这里,当前模型也是单一数据源
const settings = useSettingsStore()

const open = ref(false)

function onDocClick() {
  open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

/** pill 文案:没有选中模型时给一个可读的占位,而不是留空白 */
const pillText = computed(() => settings.currentOption?.name ?? '无可用模型')

/**
 * 空列表时说明原因:请求失败优先,其次是后端报告的本地 Ollama 不可用。
 * 后端那份异常原文很长,不适合塞进 264px 宽的下拉,只给一句人话。
 */
const emptyHint = computed(() => {
  if (settings.refreshError) return settings.refreshError
  return settings.error ? '本地 Ollama 不可用,启动后重试' : '未检测到可用模型'
})

function select(key: string) {
  // toast 用显示名,不能把 ext:7 这种内部 key 漏给用户
  const name = settings.catalog.find((m) => m.key === key)?.name ?? key
  settings.selectModel(key)
  ui.toast(`已切换到 ${name}`)
  open.value = false
}

function retry() {
  void settings.refresh()
}
</script>

<template>
  <div class="model-wrap">
    <button
      class="model-pill"
      :class="{ open, empty: !settings.current }"
      @click.stop="open = !open"
    >
      <span>{{ pillText }}</span>
      <IconSvg class="chev" name="chev" :size="18" />
    </button>
    <div class="model-menu" :class="{ open }">
      <!-- 加载中 -->
      <div v-if="settings.loading && !settings.catalog.length" class="model-note">模型加载中…</div>

      <!-- 一个模型都没有:说明原因并给出出路,不留一个空菜单 -->
      <template v-else-if="!settings.catalog.length">
        <div class="model-note">{{ emptyHint }}</div>
        <div class="model-actions">
          <button class="model-act" @click.stop="retry">重试</button>
          <button v-if="!auth.loggedIn" class="model-act" @click.stop="ui.openAuth()">
            登录后接入外部模型
          </button>
        </div>
      </template>

      <template v-else>
        <!-- 本地 Ollama 挂了但还是有外部模型:提示一句,条目照常可选 -->
        <div v-if="settings.error" class="model-note">
          <span>本地模型不可用</span>
          <button class="model-act inline" @click.stop="retry">重试</button>
        </div>
        <button
          v-for="m in settings.available"
          :key="m.key"
          class="model-opt"
          :class="{ current: m.key === settings.current }"
          @click.stop="select(m.key)"
        >
          <span><b>{{ m.name }}</b><i>{{ m.desc }}</i></span>
          <IconSvg class="check" name="check" :size="18" />
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.model-wrap { position: relative }
.model-pill {
  display: flex; align-items: center; gap: 8px;
  font-size: 17px; font-weight: 600; padding: 8px 14px; border-radius: 12px;
}
.model-pill:hover { background: var(--surface) }
.model-pill .chev { color: var(--muted); transition: transform .18s }
.model-pill.open .chev { transform: rotate(180deg) }
/* 没有可用模型时弱化显示,但仍可点击 —— 错误原因和重试/登录入口都在菜单里 */
.model-pill.empty { color: var(--muted); font-weight: 500 }

.model-menu {
  position: absolute; top: 54px; left: 0; min-width: 264px;
  background: #fff; border-radius: 18px; padding: 8px;
  box-shadow: 0 10px 34px rgba(0, 0, 0, .18);
  display: none;
}
.model-menu.open { display: block }
.model-opt {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  width: 100%; padding: 12px 14px; border-radius: 12px;
}
.model-opt:hover { background: var(--surface) }
.model-opt b { font-size: 14px; display: block }
.model-opt i { font-style: normal; font-size: 12px; color: var(--muted) }
.model-opt .check { color: var(--blue-deep); visibility: hidden; flex-shrink: 0 }
.model-opt.current .check { visibility: visible }

/* 加载中 / 空状态 / 局部错误的说明与操作 */
.model-note {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; font-size: 12px; color: var(--muted); line-height: 1.5;
}
.model-note span { flex: 1; min-width: 0 }
.model-actions { display: flex; gap: 8px; padding: 2px 8px 6px }
.model-act {
  font-size: 12px; padding: 6px 12px; border-radius: 9px;
  background: var(--surface); color: var(--blue-deep); white-space: nowrap;
}
.model-act.inline { padding: 2px 8px; margin-left: auto; flex-shrink: 0 }

@media (max-width: 900px) {
  .model-pill { font-size: 15px }
}
</style>
