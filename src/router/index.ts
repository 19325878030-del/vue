import { createRouter, createWebHistory } from 'vue-router'
import ChatView from '@/views/ChatView.vue'
import AgiView from '@/views/AgiView.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'

// 视图与原型一一对应:对话(默认) / RAG / AGENT / Skill / AGI
// RAG / AGENT / Skill 第 4 步换成泛型 LibraryView,此处只留占位
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/chat' },
    {
      path: '/chat/:conversationId?',
      name: 'chat',
      component: ChatView,
    },
    {
      path: '/rag',
      component: PlaceholderView,
      props: { title: 'RAG 知识库', desc: '向量库卡片管理将在第 4 步接入(LibraryView 泛型组件)' },
    },
    {
      path: '/agent',
      component: PlaceholderView,
      props: { title: 'AGENT 智能体', desc: '智能体卡片管理将在第 4 步接入(LibraryView 泛型组件)' },
    },
    {
      path: '/skill',
      component: PlaceholderView,
      props: { title: 'Skill 技能', desc: '技能卡片管理将在第 4 步接入(LibraryView 泛型组件)' },
    },
    { path: '/agi', component: AgiView },
    { path: '/:pathMatch(.*)*', redirect: '/chat' },
  ],
})

export default router
