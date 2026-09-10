import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError } from '@/api/http'
import { fetchModels, type ApiProvider } from '@/api/settings'
import { useUiStore } from './ui'

/**
 * 设置面板(侧边栏齿轮 → 账户设置 / 模型接入)+ 顶栏模型下拉的单一数据源。
 *
 * 模型目录来自后端 `GET /api/models`(本地 Ollama + 当前登录用户的外部模型配置),
 * **不持久化** —— 每次都是现拉,否则会留下已卸载/已新增的陈旧模型。
 * 本地只持久化"选中了谁"和"关掉了谁"这类偏好。
 */

export type ModelKind = 'local' | 'provider'

export interface ModelOption {
  /** 身份标识:本地是模型名,外部是 `ext:<provider_id>`(与后端约定一致) */
  key: string
  /** 下拉 / 列表里的显示名 */
  name: string
  /** 副标题,标明来源;重名时靠它区分 */
  desc: string
  kind: ModelKind
  /** 真正发给后端的模型标识:本地即模型名,外部是远端 model id */
  modelName: string
  providerId?: number
}

interface PersistState {
  /** 被用户在"模型接入"里关掉的模型 key(存黑名单,新出现的模型才能默认可见) */
  disabled: string[]
  /** 当前选中的模型 key */
  current: string
  apiKey: string
  endpoint: string
}

const LS_KEY = 'kby.settings'

function defaults(): PersistState {
  return {
    disabled: [],
    current: '',
    apiKey: 'sk-kby-demo-0000-0000',
    endpoint: 'https://api.kby.ai/v1',
  }
}

/**
 * 只读持久化的原始值,**不碰模型目录** —— 目录是异步拉来的,
 * 在这里做任何"这个模型还在不在"的校验都会在首次渲染时误判。
 * 合法性收敛统一放在 refresh() 之后的 reconcile() 里。
 */
function loadPersist(): PersistState {
  const d = defaults()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return d
    const p = JSON.parse(raw) as Partial<PersistState>
    return {
      disabled: Array.isArray(p.disabled) ? p.disabled.filter((k) => typeof k === 'string') : d.disabled,
      current: typeof p.current === 'string' ? p.current : d.current,
      apiKey: typeof p.apiKey === 'string' ? p.apiKey : d.apiKey,
      endpoint: typeof p.endpoint === 'string' ? p.endpoint : d.endpoint,
    }
  } catch {
    return d // 解析失败 / 隐私模式 localStorage 不可用 → 用默认值
  }
}

/** 把后端两类模型统一成前端的一份目录(本地在前,外部在后) */
function toCatalog(models: string[], providers: ApiProvider[]): ModelOption[] {
  const locals: ModelOption[] = models.map((name) => ({
    key: name,
    name,
    desc: '本地 · Ollama',
    kind: 'local',
    modelName: name,
  }))
  const externals: ModelOption[] = providers
    // id 必须是数字才能拼进 provider_id;后端理论上给 int,这里防御一次
    .filter((p) => Number.isInteger(p?.id))
    .map((p) => ({
      key: `ext:${p.id}`,
      // 后端在没填名称时会拿模型名顶上,此时不重复显示
      name: p.name && p.name !== p.model ? `${p.name}（${p.model}）` : p.model,
      desc: `外部 · ${p.model}`,
      kind: 'provider' as const,
      modelName: p.model,
      providerId: Number(p.id),
    }))
  return [...locals, ...externals]
}

export const useSettingsStore = defineStore('settings', () => {
  const init = loadPersist()
  const current = ref<string>(init.current)
  const disabled = ref<string[]>(init.disabled)
  // 下面两项是"模型接入"面板里的输入框,目前仅存本机浏览器、未接通后端(见面板内提示)
  const apiKey = ref(init.apiKey)
  const endpoint = ref(init.endpoint)

  /* ── 模型目录(现拉,不持久化) ── */
  const catalog = ref<ModelOption[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  /** 后端报告本地 Ollama 不可用时的原文(请求本身是成功的) */
  const error = ref<string | null>(null)
  /** 请求本身失败(网络 / 隧道过期 / 后端 5xx) */
  const refreshError = ref<string | null>(null)

  let inflight: Promise<void> | null = null

  const hasModels = computed(() => catalog.value.length > 0)

  /** 当前选中的模型。查表解析 —— 不拆 `ext:` 前缀,避免和同名的本地模型混淆 */
  const currentOption = computed(() => catalog.value.find((m) => m.key === current.value))

  /** 发给 /api/chat 的模型参数:本地传模型名,外部传 provider_id */
  const sendParams = computed<{ model: string | null; provider_id: number | null }>(() => {
    const o = currentOption.value
    if (!o) return { model: null, provider_id: null }
    return o.kind === 'provider'
      ? { model: null, provider_id: o.providerId ?? null }
      : { model: o.modelName, provider_id: null }
  })

  /**
   * 顶栏下拉的候选项 = 没被关掉的 + 当前选中项。
   * 并上当前项是为了让一个"已被关掉或后端已删除"的选择仍能渲染在 pill 上,
   * 否则用户会看到一个空白切换器却不知道发生了什么。
   */
  const available = computed(() =>
    catalog.value.filter((m) => !disabled.value.includes(m.key) || m.key === current.value),
  )

  const modelOn = (key: string) => !disabled.value.includes(key)

  function persist() {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          disabled: disabled.value,
          current: current.value,
          apiKey: apiKey.value,
          endpoint: endpoint.value,
        } satisfies PersistState),
      )
    } catch {
      /* 隐私模式等写不进去,仅保留内存态 */
    }
  }

  /**
   * 目录变化后收敛本地偏好:清掉已消失模型的残留,并给选中项做回退。
   * seed 是后端报告的当前模型,只作为首次运行的种子(它是全局状态,不是真相来源)。
   */
  function reconcile(seed: string) {
    const opts = catalog.value
    const keys = new Set(opts.map((m) => m.key))

    disabled.value = disabled.value.filter((k) => keys.has(k))

    // 选中项回退阶梯:持久化选择 → 后端种子 → 第一个本地模型 → 第一个外部模型 → 空
    if (current.value && keys.has(current.value)) return
    const bySeed = opts.find((m) => m.kind === 'local' && m.modelName === seed)
    const fallback = bySeed ?? opts.find((m) => m.kind === 'local') ?? opts[0]
    current.value = fallback?.key ?? ''
  }

  function selectModel(key: string) {
    if (loading.value) return
    // 以"在目录里"为准,而不是"有没有被关掉":否则被关掉的 key 永远选不回来
    if (!catalog.value.some((m) => m.key === key)) return
    current.value = key
    persist()
  }

  function toggleModel(key: string) {
    if (loading.value) return
    if (!catalog.value.some((m) => m.key === key)) return

    if (modelOn(key)) {
      // 关掉:至少保留一个可用模型(与原型行为一致)
      const onCount = catalog.value.filter((m) => modelOn(m.key)).length
      if (onCount <= 1) {
        useUiStore().toast('至少保留一个可用模型')
        return
      }
      disabled.value = [...disabled.value, key]
      // 关掉的正好是当前模型 → 自动切到第一个还开着的
      if (current.value === key) {
        const next = catalog.value.find((m) => modelOn(m.key))
        if (next) current.value = next.key
      }
    } else {
      disabled.value = disabled.value.filter((k) => k !== key)
    }
    persist()
  }

  async function doRefresh() {
    loading.value = true
    refreshError.value = null
    try {
      const res = await fetchModels()
      catalog.value = toCatalog(
        Array.isArray(res?.models) ? res.models : [],
        Array.isArray(res?.providers) ? res.providers : [],
      )
      // 后端把 Ollama 的连接异常原文透传了过来(很长),UI 只显示一句人话,
      // 原文留在控制台供排查
      error.value = typeof res?.error === 'string' && res.error ? res.error : null
      if (error.value) console.warn('[models] 本地 Ollama 不可用:', error.value)
      loaded.value = true
      reconcile(typeof res?.current === 'string' ? res.current : '')
      persist()
    } catch (e) {
      // 拉取失败时保留上一次的目录(可能仍有外部模型可用),只记录错误给 UI 显示
      refreshError.value = e instanceof ApiError ? e.message : '获取模型列表失败'
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /**
   * 拉取模型目录。调用点会有多个(App 挂载、登录态变化、打开设置面板),
   * 用 inflight 去重,避免同一时刻打多次 /api/models。
   */
  async function refresh(): Promise<void> {
    if (inflight) return inflight
    const p = doRefresh()
    inflight = p
    try {
      await p
    } finally {
      inflight = null
    }
  }

  /** 保存:目前只在本地持久化;apiKey / endpoint 不发送到服务端 */
  function save() {
    persist()
    useUiStore().toast('设置已保存')
  }

  return {
    current,
    apiKey,
    endpoint,
    catalog,
    available,
    currentOption,
    sendParams,
    hasModels,
    loading,
    loaded,
    error,
    refreshError,
    modelOn,
    selectModel,
    toggleModel,
    refresh,
    save,
  }
})
