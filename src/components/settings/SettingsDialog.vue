<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import IconSvg from '@/components/common/IconSvg.vue'
import { ApiError } from '@/api/http'
import { addProvider, deleteProvider, listProviders, testProvider, type ApiProvider } from '@/api/settings'


const ui = useUiStore()
const auth = useAuthStore()
const settings = useSettingsStore()

const tab = ref<'account' | 'model'>('account')
const keyVisible = ref(false)

// 打开时回到账户页、收起密钥可见性(与原型默认一致)
watch(
  () => ui.settingsOpen,
  async (open) => {
    if (open) {
      tab.value = 'account'
      keyVisible.value = false
      await nextTick()
    }
  },
)

// 切到"模型接入"页时保证目录是新的(比如 Ollama 是打开面板之后才启动的)
watch([() => ui.settingsOpen, tab], ([open, t]) => {
  if (open && t === 'model' && !settings.loaded) void settings.refresh()
 if (open && t === 'model') void loadProviders() // 打开"模型接入"页时拉已存配置
})

/** 模型列表为空时的说明:请求失败优先,其次是后端报告的 Ollama 不可用 */
const modelEmptyHint = computed(() => {
  if (settings.refreshError) return settings.refreshError
  return settings.error ? '本地 Ollama 不可用,启动后重试' : '未检测到可用模型'
})

  /* ── 添加外部模型(真实接口,配置存登录账号下;key 不进 localStorage) ── */
const baseUrl = ref('') // → base_url
const modelName = ref('') // → model(之前缺的就是它)
const apiKeyInput = ref('') // → api_key
const providers = ref<ApiProvider[]>([])
const providerBusy = ref(false)

async function loadProviders() {
  if (!auth.loggedIn) {
    providers.value = []
    return
  }
  try {
    const r = await listProviders()
    providers.value = Array.isArray(r?.providers) ? r.providers : []
  } catch {
    providers.value = [] // 401/网络失败都按"没有配置"处理
  }
}

function formOk() {
  return !!(baseUrl.value && modelName.value && apiKeyInput.value)
}

async function testConn() {
  if (!formOk()) {
    ui.toast('地址、模型名称、API Key 都要填')
    return
  }
  providerBusy.value = true
  try {
    const r = await testProvider({
      base_url: baseUrl.value.trim(),
      model: modelName.value.trim(),
      api_key: apiKeyInput.value.trim(),
    })
    // 后端约定:失败也是 200,看 data.ok 而不是 code
    ui.toast(`${r.ok ? '✅' : '❌'} ${r.message || (r.ok ? '连接正常' : '连接失败')}`)
  } catch (e) {
    ui.toast(e instanceof ApiError ? e.message : '请求失败')
  } finally {
    providerBusy.value = false
  }
}

async function saveProvider() {
  if (!formOk()) {
    ui.toast('地址、模型名称、API Key 都要填')
    return
  }
  providerBusy.value = true
  try {
    await addProvider({
      base_url: baseUrl.value.trim(),
      model: modelName.value.trim(),
      api_key: apiKeyInput.value.trim(),
    })
    ui.toast('已保存')
    baseUrl.value = modelName.value = apiKeyInput.value = '' // key 不留输入框
    // 双刷新:列表更新 + 顶栏下拉马上出现新模型(目录来自 /api/models)
    await Promise.all([loadProviders(), settings.refresh()])
  } catch (e) {
    ui.toast(e instanceof ApiError ? e.message : '保存失败')
  } finally {
    providerBusy.value = false
  }
}

async function removeProvider(p: ApiProvider) {
  if (!window.confirm(`删除「${p.model}」？删除后顶栏下拉同步消失`)) return
  try {
    await deleteProvider(p.id)
    await Promise.all([loadProviders(), settings.refresh()])
  } catch (e) {
    ui.toast(e instanceof ApiError ? e.message : '删除失败')
  }
}


function close() {
  ui.closeSettings()
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && ui.settingsOpen) close()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

/** 保存:本地持久化;真实 PUT /api/settings 见 settings store(接口之后再调试) */
function save() {
  settings.save()
  close()
}

/* ── 账户设置(未登录时展示本地演示 persona,与欢迎页一致) ── */
const accountName = computed(() => (auth.loggedIn ? auth.username : 'yushe'))
const accountSub = computed(() =>
  auth.loggedIn ? auth.email || 'Cookie 会话已登录' : '本地演示 · 点击头像可登录',
)
function goLogin() {
  close()
  ui.openAuth()
}
async function doLogout() {
  await auth.logout()
  ui.toast('已退出登录')
}
function doDelete() {
  if (!window.confirm('注销后账号与所有数据将被清除,确定继续?')) return
  // TODO 第 5 步:接 DELETE /api/auth/account(password 确认),成功后清空登录态
  ui.toast('原型演示:账号注销接口待接入')
}
</script>

<template>
  <Teleport to="body">
    <template v-if="ui.settingsOpen">
      <div class="st-backdrop show" @click="close"></div>
      <div class="settings show" role="dialog" aria-modal="true" aria-label="设置">
        <div class="st-head">
          <h2>设置</h2>
          <button class="icon-btn" title="关闭" aria-label="关闭设置" @click="close">
            <IconSvg name="x" :size="20" />
          </button>
        </div>

        <div class="st-tabs">
          <button class="st-tab" :class="{ active: tab === 'account' }" @click="tab = 'account'">账户设置</button>
          <button class="st-tab" :class="{ active: tab === 'model' }" @click="tab = 'model'">模型接入</button>
        </div>

        <div class="st-body">
          <!-- 账户设置 -->
          <section class="st-pane" v-show="tab === 'account'">
            <div class="st-profile">
              <div class="avatar big">{{ auth.initial }}</div>
              <span><b>{{ accountName }}</b><i>{{ accountSub }}</i></span>
              <button v-if="auth.loggedIn" class="st-link" @click="ui.toast('资料编辑接口待接入')">编辑资料</button>
              <button v-else class="st-link" @click="goLogin">去登录</button>
            </div>
            <div class="st-row">
              <span><b>主题</b><i>界面外观</i></span>
              <span class="st-value">浅色</span>
            </div>
            <div class="st-row">
              <span><b>语言</b><i>界面显示语言</i></span>
              <span class="st-value">简体中文</span>
            </div>
            <div class="st-row">
              <span><b>对话保留时长</b><i>到期后历史记录自动删除</i></span>
              <span class="st-value">永久</span>
            </div>
            <button v-if="auth.loggedIn" class="st-row" @click="doLogout">
              <span><b>退出登录</b><i>清除本地会话,回到未登录状态</i></span>
            </button>
            <button class="st-row st-danger" @click="doDelete">
              <span><b>删除账号</b><i>注销后所有数据将被清除</i></span>
            </button>
          </section>

          <!-- 模型接入 -->
          <section class="st-pane" v-show="tab === 'model'">
            <!-- 未登录:这些接口全部要登录,先明说而不是等 401 -->
            <div v-if="!auth.loggedIn" class="st-empty">
              添加外部模型需要先登录(配置保存在你的账号下)。
              <button class="st-link" @click="goLogin">去登录</button>
            </div>

            <template v-else>
              <div class="st-field">
                <label for="setEndpoint">接入地址 (base_url)</label>
                <input id="setEndpoint" v-model="baseUrl" type="text" placeholder="https://api.deepseek.com" />
              </div>
              <div class="st-field">
                <label for="setModel">模型名称 (model)</label>
                <input id="setModel" v-model="modelName" type="text" placeholder="deepseek-chat" />
              </div>
              <div class="st-field">
                <label for="setApiKey">API 密钥 (api_key)</label>
                <div class="st-key">
                  <input id="setApiKey" v-model="apiKeyInput" :type="keyVisible ? 'text' : 'password'" placeholder="sk-…" />
                  <button class="icon-btn" title="显示 / 隐藏密钥" @click="keyVisible = !keyVisible">
                    <IconSvg name="eye" :size="20" />
                  </button>
                </div>
                <div class="st-empty-actions">
                  <button class="st-link" :disabled="providerBusy" @click="testConn">测试连接</button>
                  <button class="st-link" :disabled="providerBusy" @click="saveProvider">保存</button>
                </div>
              </div>

              <div class="st-label2">已保存的外部模型</div>
              <div v-if="!providers.length" class="st-empty">还没有保存的配置</div>
              <div v-for="p in providers" :key="p.id" class="st-row">
                <span><b>{{ p.model }}</b><i>{{ p.base_url }} · {{ p.api_key }}</i></span>
                <button class="st-link" @click="removeProvider(p)">删除</button>
              </div>
            </template>


            <div class="st-label2">
              可用模型
              <button class="st-refresh" title="重新拉取模型列表" @click="settings.refresh()">
                刷新
              </button>
            </div>

            <!-- 加载中 / 空目录 / 正常列表三态,与顶栏下拉保持一致 -->
            <div v-if="settings.loading && !settings.catalog.length" class="st-empty">模型加载中…</div>

            <template v-else-if="!settings.catalog.length">
              <div class="st-empty">{{ modelEmptyHint }}</div>
              <div class="st-empty-actions">
                <button class="st-link" @click="settings.refresh()">重试</button>
                <button v-if="!auth.loggedIn" class="st-link" @click="goLogin">
                  登录后接入外部模型
                </button>
              </div>
            </template>

            <template v-else>
              <!-- 本地 Ollama 挂了但外部模型还在:提示一句,列表照常可用 -->
              <div v-if="settings.error" class="st-empty">本地模型不可用,启动 Ollama 后刷新</div>
              <!-- 开关与顶栏模型下拉实时联动(数据都在 settings store) -->
              <div v-for="m in settings.catalog" :key="m.key" class="st-row">
                <span><b>{{ m.name }}</b><i>{{ m.desc }}</i></span>
                <button
                  class="switch"
                  :class="{ on: settings.modelOn(m.key) }"
                  role="switch"
                  :aria-checked="settings.modelOn(m.key)"
                  :aria-label="m.name"
                  @click="settings.toggleModel(m.key)"
                ></button>
              </div>
            </template>
          </section>
        </div>

        <div class="st-foot">
          <button class="st-btn" @click="close">取消</button>
          <button class="st-btn primary" @click="save">保存</button>
        </div>
      </div>
    </template>
  </Teleport>
</template>
