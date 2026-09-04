<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import ModelSwitcher from '@/components/layout/ModelSwitcher.vue'
import IconSvg from '@/components/common/IconSvg.vue'

const ui = useUiStore()
const auth = useAuthStore()
</script>

<template>
  <header class="topbar">
    <div class="top-left">
      <!-- 左上角工作台图标:打开 / 收起侧边栏 -->
      <button class="brand-btn" title="打开/收起侧边栏" aria-label="打开侧边栏" @click="ui.toggleSidebar()">
        <IconSvg name="workbench" :size="26" />
      </button>
      <span class="top-sep"></span>
      <!-- 模型切换:第 5 步接 models store 后与设置面板开关联动 -->
      <ModelSwitcher />
    </div>

    <!-- 右上角:仅保留头像(点击弹出登录 / 注册) -->
    <div class="top-right">
      <button
        class="avatar"
        :title="auth.loggedIn ? `账号:${auth.username}` : '账号(登录 / 注册)'"
        @click="ui.openAuth()"
      >
        {{ auth.initial }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: 64px; display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px 10px 12px; position: relative; z-index: 30;
}
.top-left { display: flex; align-items: center; gap: 2px }
.brand-btn {
  display: flex; align-items: center; gap: 9px;
  padding: 7px 12px; border-radius: 12px;
}
.brand-btn:hover { background: var(--surface) }
.top-sep { width: 1px; height: 22px; background: #e0e3e8; margin: 0 8px; flex-shrink: 0 }
.top-right { display: flex; align-items: center; gap: 4px }

@media (max-width: 900px) {
  .brand-btn { padding: 7px 10px }
}
</style>
