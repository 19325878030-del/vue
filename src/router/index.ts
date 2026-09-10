import { createRouter, createWebHistory } from 'vue-router'
import ChatView from '@/views/ChatView.vue'
import AgiView from '@/views/AgiView.vue'
import LibraryView from '@/components/library/LibraryView.vue'

// 视图与原型一一对应:对话(默认) / RAG / AGENT / Skill / AGI
// RAG / AGENT / Skill 三页同构,共用泛型 LibraryView,差异由 kind 配置注入
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/chat' },
    {
      path: '/chat/:conversationId?',
      name: 'chat',
      component: ChatView,
    },
    { path: '/rag', component: LibraryView, props: { kind: 'rag' } },
    { path: '/agent', component: LibraryView, props: { kind: 'agent' } },
    { path: '/skill', component: LibraryView, props: { kind: 'skill' } },
    { path: '/agi', component: AgiView },
    { path: '/:pathMatch(.*)*', redirect: '/chat' },
  ],
})

export default router
