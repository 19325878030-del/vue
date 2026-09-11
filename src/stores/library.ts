import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchRagCollections,
  createRagCollection as apiCreate,
  type ApiRagCollection,
} from '@/api/rag'
import { fetchAgentTools, type ApiAgentPackage } from '@/api/agent'

/**
 * 资源库状态:RAG 向量库 / AGENT 智能体 / Skill 技能三合一。
 *
 * 三个管理视图在原型里完全同构(搜索栏 + 卡片网格 + ⊕),差异只有文案和
 * 新建行为(RAG 走文件夹上传,另两个建草稿就地命名),所以共用一份
 * 数据结构与持久化。后端 /api/rag、/api/agents 等接口落地后,
 * 把 seeds() 和 localStorage 换成现拉即可,视图层不用动。
 */

export type LibraryKind = 'rag' | 'agent' | 'skill'

export interface LibraryItem {
  id: string
  /** 卡片名(可就地重命名) */
  name: string
  /** 副标题:文件数 / 工具数 / 版本等 */
  meta: string
  /** 状态胶囊文字(已向量化 / 已启用 / 草稿…) */
  status: string
  /** 完成态胶囊显示绿色 */
  done: boolean
  /** 卡片图标(emoji,与原型一致) */
  icon: string
}

const LS_KEY = 'kby.library'

/** 首次运行种子数据(原型演示卡片;接真实接口后删除) */
function seeds(): Record<LibraryKind, LibraryItem[]> {
  return {
    rag: [
      { id: 'rag-1', icon: '📚', name: '毕业论文文献库', meta: '128 个文档 · 24.6 MB', status: '已向量化', done: true },
      { id: 'rag-2', icon: '📁', name: '课堂讲义', meta: '36 个文件 · 本地文件夹', status: '已向量化', done: true },
      { id: 'rag-3', icon: '🌐', name: 'RAG 综述资料', meta: '知识下载 · 来自 Web', status: '已向量化', done: true },
    ],
    agent: [
      { id: 'agent-1', icon: '🤖', name: '论文进度管家', meta: '12 个工具 · 自动排期提醒', status: '已启用', done: true },
      { id: 'agent-2', icon: '🕷️', name: '文献爬虫', meta: '6 个工具 · 每日定时抓取', status: '已启用', done: true },
      { id: 'agent-3', icon: '📊', name: '数据分析助手', meta: '9 个工具 · 实验数据清洗', status: '草稿', done: false },
    ],
    skill: [
      { id: 'skill-1', icon: '✨', name: '学术润色', meta: '文本处理 · v1.2', status: '已安装', done: true },
      { id: 'skill-2', icon: '📑', name: '论文格式检查', meta: '文档解析 · v2.0', status: '已安装', done: true },
      { id: 'skill-3', icon: '🗣️', name: '答辩模拟', meta: '语音交互 · 试用中', status: '未启用', done: false },
    ],
  }
}

/** localStorage 里的旧数据可能被手改过,逐条校验字段,不合法的直接丢弃 */
function validItem(v: unknown): v is LibraryItem {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    !!o.id &&
    typeof o.name === 'string' &&
    typeof o.meta === 'string' &&
    typeof o.status === 'string' &&
    typeof o.done === 'boolean' &&
    typeof o.icon === 'string'
  )
}

function load(): Record<LibraryKind, LibraryItem[]> {
  const base = seeds()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Record<string, unknown>
    const out = {} as Record<LibraryKind, LibraryItem[]>
    for (const k of ['rag', 'agent', 'skill'] as LibraryKind[]) {
      const v = p[k]
      // 某一类不是数组(被改坏)时回落到种子,而不是整个置空
      out[k] = Array.isArray(v) ? v.filter(validItem) : base[k]
    }
    return out
  } catch {
    return base // 解析失败 / 隐私模式 localStorage 不可用 → 用种子
  }
}

let seq = 0
const nextId = (kind: LibraryKind) => `${kind}-${Date.now().toString(36)}-${++seq}`

/** Agent / Skill 的 ⊕ 用来建草稿;RAG 走文件夹上传,不在这张表里 */
const DRAFTS = {
  agent: { name: '未命名智能体', meta: '0 个工具 · 刚创建', status: '草稿', done: false, icon: '🤖' },
  skill: { name: '未命名技能', meta: '自定义 · 刚创建', status: '草稿', done: false, icon: '✨' },
} satisfies Record<'agent' | 'skill', Omit<LibraryItem, 'id'>>

/** 后端返回 → 前端卡片:id 用合法集合名(name),显示用 display_name */
function fromApi(c: ApiRagCollection): LibraryItem {
  return {
    id: c.name,
    name: c.display_name,
    meta: `${c.count} 块 · 已入库`,
    status: '已向量化',
    done: true,
    icon: '📁',
  }
}

/** 后端工具包 → 前端卡片:id 用包名(package),对话时传回 tool_packages */
function fromApiAgent(p: ApiAgentPackage): LibraryItem {
  return {
    id: p.package,
    name: p.display_name || p.package,
    meta: `${p.tools.length} 个工具 · v${p.version}`,
    status: '已启用',
    done: true,
    icon: '🤖',
  }
}

export const useLibraryStore = defineStore('library', () => {
  const items = ref<Record<LibraryKind, LibraryItem[]>>(load())

  function persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items.value))
    } catch {
      /* 隐私模式等写不进去,仅保留内存态 */
    }
  }

  function rename(kind: LibraryKind, id: string, name: string) {
    const it = items.value[kind].find((i) => i.id === id)
    if (it) {
      it.name = name
      persist()
    }
  }

  function remove(kind: LibraryKind, id: string) {
    items.value[kind] = items.value[kind].filter((i) => i.id !== id)
    persist()
  }

  /** Agent / Skill 的 ⊕:新建草稿插到最前,返回给视图就地命名 */
  function createDraft(kind: 'agent' | 'skill'): LibraryItem {
    const it: LibraryItem = { id: nextId(kind), ...DRAFTS[kind] }
    items.value[kind] = [it, ...items.value[kind]]
    persist()
    return it
  }

  /**
   * RAG 的 ⊕:本地文件夹上传建库。后端同步做完嵌入才返回,期间卡片显示
   * 「向量化中…」;成功后换上后端的合法集合名与入库统计,失败撤掉乐观卡片。
   */
  async function createFromFolder(folder: string, files: File[]): Promise<LibraryItem> {
    const it: LibraryItem = {
      id: nextId('rag'),
      icon: '📁',
      name: folder,
      meta: `${files.length} 个文件 · 入库中`,
      status: '向量化中…',
      done: false,
    }
    items.value.rag = [it, ...items.value.rag] // 乐观插入,请求期间显示"向量化中…"
    try {
      const res = await apiCreate(folder, files)
      it.id = res.collection // 换成后端合法集合名,刷新后与列表对得上
      it.name = res.display_name
      it.meta = `${res.total_chunks} 块 · 已入库`
      it.status = '已向量化'
      it.done = true
    } catch (err) {
      items.value.rag = items.value.rag.filter((x) => x.id !== it.id) // 失败撤掉卡片
      throw err
    }
    return it
  }

  /** 进 RAG 视图时拉一次列表;服务器是唯一真相,不再读 localStorage 的 rag 缓存 */
  let ragLoaded = false
  async function loadRag() {
    if (ragLoaded) return
    ragLoaded = true
    items.value.rag = (await fetchRagCollections()).collections.map(fromApi)
  }

  /** 进 AGENT 视图时拉一次工具包列表(manifest 扫描结果),同 RAG:服务器是唯一真相 */
  let agentLoaded = false
  async function loadAgent() {
    if (agentLoaded) return
    agentLoaded = true
    items.value.agent = (await fetchAgentTools()).tools.map(fromApiAgent)
  }

  return { items, rename, remove, createDraft, createFromFolder, loadRag, loadAgent }
})
