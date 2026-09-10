<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import IconSvg from '@/components/common/IconSvg.vue'

const ui = useUiStore()
const route = useRoute()
const router = useRouter()

// 原型占位数据:第 3 步接会话列表接口(GET /api/conversations)后删除
const recentChats = [
  '毕业论文大纲讨论',
  '向量数据库选型对比',
  '文献综述摘要润色',
  '爬虫代码 Review',
  '答辩 PPT 美化建议',
]

// 视图入口(AGENT → Skill → RAG → AGI,顺序与原型一致)
interface ViewLink {
  path: string
  label: string
  icon: string
  title: string
  badge?: boolean
}
const viewLinks: ViewLink[] = [
  { path: '/agent', label: 'AGENT', icon: 'robot', title: 'AGENT 智能体(创建 / 管理)' },
  { path: '/skill', label: 'Skill', icon: 'bolt', title: 'Skill 技能(添加 / 管理)', badge: true },
  { path: '/rag', label: 'RAG', icon: 'library', title: 'RAG 知识库(下载知识 / 生成向量库)' },
  { path: '/agi', label: 'AGI 模式', icon: 'spark', title: 'AGI 模式(实现过程)' },
]

/** 原型行为:已打开的视图再点一次入口 → 返回对话 */
function toggleView(path: string) {
  router.push(route.path === path ? '/chat' : path)
}
</script>

<template>
  <aside class="sidebar" :class="{ 'sb-open': ui.sidebarOpen }">
    <div class="sb-head">
      <button class="icon-btn" title="收起侧边栏" aria-label="收起侧边栏" @click="ui.toggleSidebar()">
        <IconSvg name="menu" :size="22" />
      </button>
      <span class="brand">
        <IconSvg name="workbench" :size="24" />
        <span class="brand-name">kby</span>
      </span>
    </div>

    <div class="sb-scroll">
      <RouterLink class="nav-item nav-newchat" to="/chat" active-class="active">
        <span class="nav-ic"><IconSvg name="edit" :size="21" /></span>
        <span>新对话</span>
      </RouterLink>
      <button
        v-for="v in viewLinks"
        :key="v.path"
        class="nav-item"
        :class="{ active: route.path === v.path }"
        :title="v.title"
        @click="toggleView(v.path)"
      >
        <span class="nav-ic"><IconSvg :name="v.icon" :size="21" /></span>
        <span>{{ v.label }}</span>
        <span v-if="v.badge" class="nav-badge">新</span>
      </button>

      <div class="sb-label">最近</div>
      <button
        v-for="chat in recentChats"
        :key="chat"
        class="chat-item"
        @click="ui.toast('历史对话将在第 3 步接入会话列表接口')"
      >
        {{ chat }}
      </button>
    </div>

    <div class="sb-foot">
      <div class="sb-foot-row">
        <button class="icon-btn" title="设置(账户设置 / 模型接入)" aria-label="打开设置" @click="ui.openSettings()">
          <IconSvg name="gear" :size="21" />
        </button>
        <button class="icon-btn" title="帮助" aria-label="帮助" @click="ui.toast('帮助中心未接入')">
          <IconSvg name="help" :size="21" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sb-w); flex-shrink: 0; background: var(--surface);
  display: flex; flex-direction: column;
  transition: margin-left .28s ease;
}
.sidebar:not(.sb-open) { margin-left: calc(var(--sb-w) * -1) }

.sb-head { display: flex; align-items: center; gap: 6px; padding: 12px 12px 8px }
.brand { display: flex; align-items: center; gap: 10px; padding: 8px 12px 8px 6px; border-radius: 12px }
.brand-name { font-size: 21px; font-weight: 600; letter-spacing: .3px }

.sb-scroll { flex: 1; overflow-y: auto; padding: 4px 12px 12px; display: flex; flex-direction: column; gap: 2px }
.sb-scroll::-webkit-scrollbar { width: 8px }
.sb-scroll::-webkit-scrollbar-thumb { background: #c4ccd7; border-radius: 8px }
.sb-scroll::-webkit-scrollbar-thumb:hover { background: #aab4c2 }

.nav-item {
  display: flex; align-items: center; gap: 14px; width: 100%;
  padding: 10px 14px; border-radius: 999px; font-size: 14px; color: var(--text-2);
  position: relative; text-decoration: none;
}
.nav-item:hover { background: var(--surface-2) }
.nav-item.active { background: var(--surface-3); color: var(--ink-on-blue); font-weight: 600 }
.nav-item.active :deep(.nav-ic) { color: var(--blue-deep) }
.nav-ic { width: 22px; height: 22px; display: grid; place-items: center; flex-shrink: 0 }
.nav-newchat { margin-bottom: 6px; font-weight: 500 }
.nav-badge {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  font-size: 10px; line-height: 1; background: #f76c05; color: #fff;
  border-radius: 999px; padding: 3px 7px; font-weight: 600;
}

.sb-label { font-size: 12px; font-weight: 600; color: var(--muted); padding: 14px 14px 6px }
.chat-item {
  display: block; width: 100%; padding: 9px 14px; border-radius: 999px;
  font-size: 13.5px; color: var(--text-2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.chat-item:hover { background: var(--surface-2) }

.sb-foot { padding: 8px 14px 16px }
.sb-foot-row { display: flex; gap: 4px }

/* 窄屏:侧栏变抽屉 */
@media (max-width: 900px) {
  .sidebar {
    position: fixed; left: 0; top: 0; bottom: 0; z-index: 60;
    transform: translateX(-105%); transition: transform .28s ease;
    box-shadow: 0 0 40px rgba(0, 0, 0, .25);
  }
  .sidebar:not(.sb-open) { margin-left: 0 }
  .sidebar.sb-open { transform: translateX(0) }
}
</style>
