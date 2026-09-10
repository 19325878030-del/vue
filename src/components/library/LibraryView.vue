<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useChatStore } from '@/stores/chat'
import { useLibraryStore, type LibraryKind, type LibraryItem } from '@/stores/library'
import { SUPPORTED_EXTS } from '@/api/rag'
import IconSvg from '@/components/common/IconSvg.vue'

/**
 * RAG / AGENT / Skill 的同构管理视图(原型 .rag-page 结构):
 * 居中搜索栏(输入即过滤)→ 统一大小卡片(点击弹「重命名 / 删除」)
 * → 网格末格 ⊕(RAG 弹本地文件夹选择器,另两个建草稿就地命名)。
 * 三页差异全部收在下方 CONFIG,由路由的 kind prop 注入。
 */

const props = defineProps<{ kind: LibraryKind }>()

const ui = useUiStore()
const chat = useChatStore()
const library = useLibraryStore()

const CONFIG: Record<
  LibraryKind,
  { label: string; searchLabel: string; addTitle: string; folderPicker: boolean; draftToast: string }
> = {
  rag: {
    label: '我的向量库',
    searchLabel: '搜索我的向量库',
    addTitle: '上传本地文件夹,生成向量库',
    folderPicker: true,
    draftToast: '',
  },
  agent: {
    label: '我的智能体',
    searchLabel: '搜索我的智能体',
    addTitle: '新建智能体',
    folderPicker: false,
    draftToast: '已创建智能体草稿,输入名称后回车确认',
  },
  skill: {
    label: '我的技能',
    searchLabel: '搜索我的技能',
    addTitle: '添加技能',
    folderPicker: false,
    draftToast: '已创建技能草稿,输入名称后回车确认',
  },
}
const cfg = computed(() => CONFIG[props.kind])

/* ── 搜索过滤(只匹配卡片名,大小写不敏感) ── */
const query = ref('')
const rootEl = ref<HTMLElement>()
const searchEl = ref<HTMLInputElement>()
const list = computed(() => {
  const q = query.value.trim().toLowerCase()
  const all = library.items[props.kind]
  return q ? all.filter((i) => i.name.toLowerCase().includes(q)) : all
})

/* ── 卡片菜单:重命名 / 删除(fixed 定位在卡片下方,放不下翻到上方) ── */
const menu = ref(false)
const menuStyle = ref({ left: '0px', top: '0px' })
const menuEl = ref<HTMLElement>()
let menuTarget: LibraryItem | null = null

function openMenu(item: LibraryItem, card: HTMLElement) {
  menuTarget = item
  menu.value = true
  void nextTick(() => {
    // 先渲染出来才量得到宽高,再决定放卡片下方还是上方
    const el = menuEl.value
    if (!el) return
    const r = card.getBoundingClientRect()
    const mw = el.offsetWidth
    const mh = el.offsetHeight
    menuStyle.value = {
      left: `${Math.max(8, Math.min(r.left, window.innerWidth - mw - 8))}px`,
      top: `${r.bottom + mh + 12 > window.innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6}px`,
    }
  })
}
function closeMenu() {
  menu.value = false
}
function onCardClick(item: LibraryItem, e: MouseEvent) {
  if (editingId.value === item.id) return // 正在就地改名
  if (props.kind === 'rag') {
    chat.ragCollection = item.id // RAG 页点卡片 = 选为对话要检索的库(卡片常驻悬浮高亮)
    return
  }
  openMenu(item, e.currentTarget as HTMLElement)
}
/** RAG 卡片右上角的 ⋯:重命名 / 删除的入口(点卡片本体是选库,不再弹菜单) */
function onMoreClick(item: LibraryItem, e: MouseEvent) {
  if (editingId.value === item.id) return
  openMenu(item, e.currentTarget as HTMLElement)
}
function onDocClick(e: MouseEvent) {
  if (!menu.value) return
  const t = e.target as HTMLElement
  if (!t.closest('.lib-menu') && !t.closest('.lib-card')) closeMenu()
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    cancelEdit()
    closeMenu()
  }
}

/* ── 就地重命名:Enter / 失焦确认(留空还原),Esc 取消 ── */
const editingId = ref<string | null>(null)
const editName = ref('')
const renameEl = ref<HTMLInputElement>()

function startEdit(item: LibraryItem) {
  editingId.value = item.id
  editName.value = item.name
  void nextTick(() => {
    renameEl.value?.focus()
    renameEl.value?.select()
  })
}
function confirmEdit(item: LibraryItem) {
  // Esc 先置空 editingId,元素卸载再触发一次 blur 时靠这里挡住
  if (editingId.value !== item.id) return
  editingId.value = null
  const v = editName.value.trim()
  if (v && v !== item.name) {
    library.rename(props.kind, item.id, v)
    ui.toast(`已重命名为「${v}」`)
  }
}
function cancelEdit() {
  editingId.value = null
}
function onEditKeydown(item: LibraryItem, e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.isComposing) confirmEdit(item)
  if (e.key === 'Escape') cancelEdit()
}

function doRename() {
  const t = menuTarget
  closeMenu()
  if (t) startEdit(t)
}
function doDelete() {
  closeMenu()
  const t = menuTarget
  menuTarget = null
  if (!t) return
  // 删的是当前选中的库时,选中态一并清掉,免得 RAG 对话还往已删的库里查
  if (props.kind === 'rag' && chat.ragCollection === t.id) chat.ragCollection = ''
  library.remove(props.kind, t.id)
  ui.toast(`已删除「${t.name}」`)
}

/* ── ⊕:RAG 弹本地文件夹选择器;Agent / Skill 建草稿并就地命名 ── */
const folderInput = ref<HTMLInputElement>()

function onAdd() {
  query.value = '' // 新卡片要立刻可见,不被当前过滤条件藏掉
  if (cfg.value.folderPicker) {
    folderInput.value?.click()
    return
  }
  const draft = library.createDraft(props.kind as 'agent' | 'skill')
  startEdit(draft)
  ui.toast(cfg.value.draftToast)
}

async function onFolderChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  // webkitRelativePath 形如「文件夹名/xx.pdf」,取第一段做向量库名
  const rel = input.files[0].webkitRelativePath || input.files[0].name
  const folder = rel.includes('/') ? rel.split('/')[0] : '未命名向量库'
  // 后端是白名单整批拒绝(app.py 1457 行),文件夹里的非文档文件必须先滤掉
  const files = Array.from(input.files).filter((f) => {
    const dot = f.name.lastIndexOf('.')
    return dot >= 0 && SUPPORTED_EXTS.includes(f.name.slice(dot).toLowerCase())
  })
  input.value = '' // 允许再次选择同一个文件夹
  if (!files.length) {
    ui.toast('该文件夹没有可入库的文件(仅支持 txt / md / pdf / docx)')
    return
  }
  ui.toast(`正在为「${folder}」生成向量库,嵌入计算需要一些时间…`)
  try {
    const it = await library.createFromFolder(folder, files)
    chat.ragCollection = it.id // 新库建好即选为当前库,省得再点一次
    ui.toast(`「${it.name}」已生成并选为当前向量库`)
  } catch (err) {
    ui.toast(`入库失败:${err instanceof Error ? err.message : err}`)
  }
}


/* ── 挂载 / 视图间切换(RAG ↔ AGENT ↔ Skill 复用同一组件实例) ── */
onMounted(() => {
  // webkitdirectory 是非标准属性,直接写模板 vue-tsc 不认,运行时手动补上
  folderInput.value?.setAttribute('webkitdirectory', '')
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
  // 注意:这里不能清对话模式 —— 聊天页点 RAG chip 会跳来这里选库,模式要保持开启
  if (props.kind === 'rag') {
    void library.loadRag().catch((e: Error) => ui.toast(e.message))
  }

  searchEl.value?.focus()
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
// 三个路由共用本组件,切换 kind 不会重新挂载,需要手动复位交互态
watch(
  () => props.kind,
  async () => {
    query.value = ''
    editingId.value = null
    closeMenu()
    rootEl.value?.scrollTo(0, 0)
    // 从 /agent、/skill 切过来时 onMounted 不会再跑,这里补拉(store 内有防重)
    if (props.kind === 'rag') {
      void library.loadRag().catch((e: Error) => ui.toast(e.message))
    }
    await nextTick()
    searchEl.value?.focus()
  },
)
</script>

<template>
  <div ref="rootEl" class="scroll-area lib-root" @scroll="closeMenu">
    <section class="lib-page">
      <!-- 顶部搜索栏(居中,输入即过滤) -->
      <div class="lib-search">
        <IconSvg name="search" :size="20" />
        <input ref="searchEl" v-model="query" type="text" :aria-label="cfg.searchLabel" :placeholder="cfg.searchLabel" />
      </div>

      <div class="lib-label">{{ cfg.label }}</div>

      <div class="lib-grid">
        <div
          v-for="item in list"
          :key="item.id"
          class="lib-card"
          :class="{ sel: kind === 'rag' && item.id === chat.ragCollection }"
          @click="onCardClick(item, $event)"
        >
          <!-- RAG 卡片:悬浮才出现的 ⋯,重命名/删除入口 -->
          <button
            v-if="kind === 'rag'"
            class="lib-more"
            title="重命名 / 删除"
            aria-label="重命名或删除"
            @click.stop="onMoreClick(item, $event)"
          >
            ⋯
          </button>
          <span class="lib-item-ic">{{ item.icon }}</span>
          <!-- 就地重命名:名字换成输入框 -->
          <input
            v-if="editingId === item.id"
            ref="renameEl"
            v-model="editName"
            class="lib-rename"
            @blur="confirmEdit(item)"
            @keydown="onEditKeydown(item, $event)"
            @click.stop
          />
          <span v-else class="lib-card-name">{{ item.name }}</span>
          <span class="lib-card-meta">{{ item.meta }}</span>
          <span class="lib-item-st" :class="{ done: item.done }">{{ item.status }}</span>
        </div>

        <!-- ⊕:网格末格,与卡片统一大小 -->
        <button class="lib-add" :title="cfg.addTitle" :aria-label="cfg.addTitle" @click="onAdd">
          <span class="lib-plus"><IconSvg name="plus" :size="22" /></span>
        </button>
      </div>

      <!-- RAG 专用:本地文件夹选择器(webkitdirectory 在 onMounted 里补) -->
      <input v-if="cfg.folderPicker" ref="folderInput" type="file" multiple hidden @change="onFolderChange" />
    </section>

    <!-- 卡片菜单:重命名 / 删除 -->
    <div v-if="menu" ref="menuEl" class="lib-menu" :style="menuStyle">
      <button @click="doRename"><IconSvg name="edit" :size="17" />重命名</button>
      <button class="danger" @click="doDelete"><IconSvg name="x" :size="17" />删除</button>
    </div>
  </div>
</template>

<style scoped>
.lib-root { min-height: 0 }

/* 页面:全宽左对齐,不被搜索栏宽度框住(原型行为) */
.lib-page { width: 100%; padding: 26px 28px 40px; display: flex; flex-direction: column; gap: 14px }

.lib-search {
  display: flex; align-items: center; gap: 10px; margin: 6px auto 0;
  width: 100%; max-width: 760px;
  background: var(--surface); border-radius: 999px; padding: 6px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08);
}
.lib-search:focus-within { box-shadow: 0 2px 10px rgba(11, 87, 208, .16) }
.lib-search > svg { color: var(--muted); flex-shrink: 0 }
.lib-search input {
  flex: 1; min-width: 0; border: none; background: transparent; outline: none;
  font: inherit; font-size: 15px; padding: 11px 0; color: var(--text);
}

.lib-label { font-size: 12px; font-weight: 600; color: var(--muted) }

/* auto-rows 等高:⊕ 独占末行时也能和卡片统一大小 */
.lib-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-auto-rows: 1fr; gap: 12px; margin-top: 2px;
}

.lib-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  background: #f8fafd; border: 1px solid #e3e9f1; border-radius: 18px;
  padding: 16px; cursor: pointer; position: relative;
  transition: border-color .15s, box-shadow .15s;
}
/* 选中的向量库卡片 = 鼠标悬浮同款效果(蓝边 + 投影),松开鼠标也常驻 */
.lib-card:hover,
.lib-card.sel { border-color: #b9cdf0; box-shadow: 0 2px 10px rgba(11, 87, 208, .10) }

/* RAG 卡片右上角 ⋯:默认隐形,悬浮卡片时浮现 */
.lib-more {
  position: absolute; top: 8px; right: 8px;
  width: 28px; height: 28px; border-radius: 8px;
  display: grid; place-items: center;
  color: var(--muted); font-size: 16px; font-weight: 700; line-height: 1;
  opacity: 0; transition: opacity .15s, background .15s, color .15s;
}
.lib-card:hover .lib-more,
.lib-more:focus-visible { opacity: 1 }
.lib-more:hover { background: #fff; color: var(--text); box-shadow: 0 1px 4px rgba(0, 0, 0, .12) }
.lib-item-ic {
  width: 38px; height: 38px; border-radius: 10px; background: #fff;
  display: grid; place-items: center; font-size: 18px; flex-shrink: 0;
}
.lib-card-name {
  font-size: 14px; font-weight: 600; line-height: 1.4; max-width: 100%;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; word-break: break-all;
}
.lib-card-meta {
  font-size: 12px; color: var(--muted); max-width: 100%;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lib-item-st {
  margin-top: auto; font-size: 12px; color: var(--muted);
  background: #fff; padding: 5px 12px; border-radius: 999px; flex-shrink: 0;
}
.lib-item-st.done { background: #e6f4ea; color: #137333 }

/* 就地重命名输入框 */
.lib-rename {
  width: 100%; font: inherit; font-size: 14px; font-weight: 600;
  border: 1.5px solid var(--blue); border-radius: 8px; padding: 3px 8px;
  outline: none; background: #fff; color: var(--text);
}

/* 卡片菜单:重命名 / 删除 */
.lib-menu {
  position: fixed; z-index: 70; min-width: 150px;
  background: #fff; border-radius: 14px; padding: 6px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, .18);
  display: flex; flex-direction: column;
}
.lib-menu button {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px; font-size: 13.5px;
}
.lib-menu button:hover { background: var(--surface) }
.lib-menu button.danger { color: #d93025 }
.lib-menu button.danger:hover { background: #fce8e6 }

/* ⊕:带小圈加号的圆润矩形,置于网格末格 */
.lib-add {
  display: flex; align-items: center; justify-content: center;
  background: #f8fafd; border: 1.5px dashed #b7c4d6; border-radius: 18px;
  cursor: pointer;
  transition: border-color .15s, box-shadow .15s;
}
.lib-add:hover { border-color: var(--blue); box-shadow: 0 2px 10px rgba(11, 87, 208, .14) }
.lib-plus {
  width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  background: var(--surface-3); color: var(--blue-deep);
  display: grid; place-items: center;
}

@media (max-width: 900px) {
  .lib-page { padding: 18px 16px 32px }
}
</style>
