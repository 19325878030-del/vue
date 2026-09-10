<script setup lang="ts">
import { onMounted, watch } from 'vue'
import IconDefs from '@/components/common/IconDefs.vue'
import AppToast from '@/components/common/AppToast.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import AuthDialog from '@/components/auth/AuthDialog.vue'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const ui = useUiStore()
const auth = useAuthStore()
const settings = useSettingsStore()

onMounted(async () => {
  ui.init()
  // 先恢复会话再拉模型:外部模型只在登录后才出现在 /api/models 里,
  // 顺序反了会先拿到一份不含外部模型的列表
  await auth.restore()
  void settings.refresh()
})

// 登录/退出都会改变模型目录(外部模型跟登录用户绑定),重新拉一次
watch(
  () => auth.loggedIn,
  () => void settings.refresh(),
)
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
  <SettingsDialog />
  <AppToast />
</template>
