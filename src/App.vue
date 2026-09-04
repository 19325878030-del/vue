<script setup lang="ts">
import { onMounted } from 'vue'
import IconDefs from '@/components/common/IconDefs.vue'
import AppToast from '@/components/common/AppToast.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import AuthDialog from '@/components/auth/AuthDialog.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

const ui = useUiStore()
const auth = useAuthStore()

onMounted(() => {
  ui.init()
  void auth.restore() // 尽力恢复会话;后端暂无 /api/auth/me 时静默忽略
})
</script>

<template>
  <IconDefs />
  <AppSidebar />
  <!-- 窄屏抽屉遮罩,点击收起侧栏 -->
  <div class="backdrop" :class="{ show: ui.sidebarOpen }" @click="ui.sidebarOpen = false"></div>

  <main class="main">
    <AppTopbar />
    <RouterView />
  </main>

  <AuthDialog />
  <AppToast />
</template>
