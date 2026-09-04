<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div class="toast" :class="{ show: ui.toastMsg }">{{ ui.toastMsg }}</div>
</template>
