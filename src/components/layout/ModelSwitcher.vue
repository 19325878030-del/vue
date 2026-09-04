<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useUiStore } from '@/stores/ui'
import IconSvg from '@/components/common/IconSvg.vue'

const ui = useUiStore()

// 静态选项:第 5 步接「设置 → 模型接入」开关联动(models store 单一数据源)
const MODELS = [
  { name: 'kby 2.5 Pro', desc: '最强推理 · 适合复杂任务' },
  { name: 'kby 2.5 Flash', desc: '快速响应 · 日常首选' },
  { name: 'kby 2.5 Flash-Lite', desc: '轻量高速 · 简单问题' },
]
const current = ref(MODELS[0].name)
const open = ref(false)

function onDocClick() {
  open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

function select(name: string) {
  current.value = name
  ui.toast(`已切换到 ${name}`)
}
</script>

<template>
  <div class="model-wrap">
    <button class="model-pill" :class="{ open }" @click.stop="open = !open">
      <span>{{ current }}</span>
      <IconSvg class="chev" name="chev" :size="18" />
    </button>
    <div class="model-menu" :class="{ open }">
      <button
        v-for="m in MODELS"
        :key="m.name"
        class="model-opt"
        :class="{ current: m.name === current }"
        @click.stop="select(m.name); open = false"
      >
        <span><b>{{ m.name }}</b><i>{{ m.desc }}</i></span>
        <IconSvg class="check" name="check" :size="18" />
      </button>
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

@media (max-width: 900px) {
  .model-pill { font-size: 15px }
}
</style>
