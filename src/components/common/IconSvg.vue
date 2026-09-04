<script setup lang="ts">
// 引用 IconDefs 中的 <symbol>:name 不带 i- 前缀,如 <IconSvg name="spark" :size="20"/>
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
</script>

<template>
  <svg :width="size" :height="size" aria-hidden="true"><use :href="`#i-${name}`" /></svg>
</template>
