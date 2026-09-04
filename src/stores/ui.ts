import { ref } from 'vue'
import { defineStore } from 'pinia'

/** 界面全局状态:侧栏开合 / 账号弹窗 / Toast */
export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(true)
  const authDialogOpen = ref(false)
  const toastMsg = ref('')
  let toastTimer: number | undefined

  /** 应用启动时调用:窄屏默认收起侧栏(原型行为) */
  function init() {
    if (window.innerWidth < 900) sidebarOpen.value = false
  }
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }
  function openAuth() {
    authDialogOpen.value = true
  }
  function closeAuth() {
    authDialogOpen.value = false
  }
  function toast(msg: string) {
    toastMsg.value = msg
    clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => (toastMsg.value = ''), 1800)
  }

  return { sidebarOpen, authDialogOpen, toastMsg, init, toggleSidebar, openAuth, closeAuth, toast }
})
