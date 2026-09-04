<script setup lang="ts">
// RAG / AGENT / Skill 的占位视图:第 4 步由泛型 LibraryView(搜索栏 + 卡片网格 + ⊕)替换
defineProps<{ title?: string; desc?: string }>()
</script>

<template>
  <div class="scroll-area">
    <section class="page">
      <h1 class="greet"><span class="grad">{{ title }}</span></h1>
      <p class="sub">{{ desc }}</p>
    </section>
  </div>
</template>

<style scoped>
.page {
  margin: auto; padding: 8vh 24px 12px;
  display: flex; flex-direction: column; align-items: center; gap: 18px;
  width: 100%; max-width: 720px;
}
</style>
