import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useUiStore } from './ui'

/** 设置面板(侧边栏齿轮 → 账户设置 / 模型接入)+ 顶栏模型下拉的单一数据源 */

export interface ModelDef {
  name: string
  desc: string
}

/** 可用模型目录(展示顺序即设置面板 / 顶栏下拉顺序)。接入后端后可由 GET /api/models 返回替换 */
export const MODEL_CATALOG: ModelDef[] = [
  { name: 'kby 2.5 Pro', desc: '最强推理 · 适合复杂任务' },
  { name: 'kby 2.5 Flash', desc: '快速响应 · 日常首选' },
  { name: 'kby 2.5 Flash-Lite', desc: '轻量高速 · 简单问题' },
]

interface PersistState {
  enabled: string[] // 已接入(开关打开)的模型
  current: string // 顶栏当前使用的模型
  apiKey: string
  endpoint: string
}

const LS_KEY = 'kby.settings'

function defaults(): PersistState {
  return {
    enabled: ['kby 2.5 Pro', 'kby 2.5 Flash'], // Flash-Lite 默认关闭(与原型一致)
    current: 'kby 2.5 Pro',
    apiKey: 'sk-kby-demo-0000-0000',
    endpoint: 'https://api.kby.ai/v1',
  }
}

/** 从 localStorage 读取上次保存,合并默认值并做合法性过滤(模型必须存在于目录且至少开一个) */
function loadPersist(): PersistState {
  const d = defaults()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return d
    const p = { ...d, ...(JSON.parse(raw) as Partial<PersistState>) }
    const names = MODEL_CATALOG.map((m) => m.name)
    p.enabled = p.enabled.filter((n) => names.includes(n))
    if (!p.enabled.length) p.enabled = [names[0]]
    if (!names.includes(p.current) || !p.enabled.includes(p.current)) p.current = p.enabled[0]
    return p
  } catch {
    return d // 解析失败 / 隐私模式 localStorage 不可用 → 用默认值
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const init = loadPersist()
  const enabled = ref<string[]>(init.enabled)
  const current = ref<string>(init.current)
  const apiKey = ref(init.apiKey)
  const endpoint = ref(init.endpoint)

  /** 顶栏下拉只展示开启的模型(与设置面板开关实时联动) */
  const available = computed(() => MODEL_CATALOG.filter((m) => enabled.value.includes(m.name)))
  const modelOn = (name: string) => enabled.value.includes(name)

  function selectModel(name: string) {
    if (modelOn(name)) current.value = name
  }

  function toggleModel(name: string) {
    const on = modelOn(name)
    if (on && enabled.value.length === 1) {
      useUiStore().toast('至少保留一个可用模型') // 不允许全部关闭(原型行为)
      return
    }
    enabled.value = on ? enabled.value.filter((n) => n !== name) : [...enabled.value, name]
    if (!enabled.value.includes(current.value)) current.value = enabled.value[0] // 当前模型被关 → 自动切换
  }

  /**
   * 保存:先写本地(刷新后仍在)。接口之后再调试:
   * TODO 第 5 步:改为 PUT /api/settings,body = { apiKey, endpoint, models: enabled, current },失败时提示后端错误
   */
  function save() {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          enabled: enabled.value,
          current: current.value,
          apiKey: apiKey.value,
          endpoint: endpoint.value,
        } satisfies PersistState),
      )
    } catch {
      /* 隐私模式等写不进去,仅保留内存态 */
    }
    useUiStore().toast('设置已保存')
  }

  return { enabled, current, apiKey, endpoint, available, modelOn, selectModel, toggleModel, save }
})
