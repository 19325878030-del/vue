<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// AGI 实现过程五步(原型文案)
const STEPS = [
  { title: '大规模预训练', desc: '从海量语料中学习语言与世界知识' },
  { title: '多模态对齐', desc: '图像 / 语音 / 视频统一表征' },
  { title: '推理与规划', desc: '思维链、任务分解、工具调用' },
  { title: '记忆与持续学习', desc: '长程记忆、自我反思与迭代' },
  { title: '自主目标与对齐', desc: '价值对齐、安全可控' },
]

const shown = ref(STEPS.map(() => false))
let timers: number[] = []

onMounted(() => {
  document.body.classList.add('agi') // 整界面置灰(base.css: body.agi)
  timers = STEPS.map((_, i) => window.setTimeout(() => (shown.value[i] = true), 350 + i * 550))
})
onBeforeUnmount(() => {
  document.body.classList.remove('agi')
  timers.forEach(clearTimeout)
})
</script>

<template>
  <div class="agi-root">
    <div class="scroll-area">
      <section class="agi-page">
        <h1 class="greet"><span class="grad">AGI 实现过程</span></h1>
        <ol class="agi-steps">
          <li v-for="(s, i) in STEPS" :key="s.title" class="agi-step" :class="{ show: shown[i] }">
            <span class="agi-num">{{ i + 1 }}</span>
            <span><b>{{ s.title }}</b> · {{ s.desc }}</span>
          </li>
        </ol>
      </section>
    </div>

    <!-- 只读对话框(原型:AGI 模式下输入暂不可用) -->
    <div class="composer-wrap">
      <div class="composer">
        <textarea rows="1" placeholder="AGI 实现中 · 输入暂不可用" disabled></textarea>
      </div>
      <p class="disclaimer">kby 可能会犯错,请核查重要信息。</p>
    </div>
  </div>
</template>

<style scoped>
.agi-root { flex: 1; min-height: 0; display: flex; flex-direction: column }

.agi-page {
  margin: auto; padding: 8vh 24px 12px;
  display: flex; flex-direction: column; align-items: center; gap: 24px;
  max-width: 720px; width: 100%;
}
.agi-steps { list-style: none; display: flex; flex-direction: column; gap: 12px; width: 100% }
.agi-step {
  display: flex; gap: 14px; align-items: center; padding: 13px 18px; border-radius: 16px;
  background: var(--surface); font-size: 14px; color: var(--text-2);
  opacity: 0; transform: translateY(8px); transition: opacity .5s, transform .5s;
}
.agi-step.show { opacity: 1; transform: none }
.agi-num {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: var(--surface-3); color: var(--blue-deep);
  display: grid; place-items: center; font-size: 13px; font-weight: 700;
}
</style>
