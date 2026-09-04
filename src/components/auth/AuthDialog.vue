<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/api/http'
import IconSvg from '@/components/common/IconSvg.vue'

const ui = useUiStore()
const auth = useAuthStore()

const tab = ref<'login' | 'register'>('login')
const loading = ref(false)

/* 登录表单 */
const loginAccount = ref('')
const loginPwd = ref('')
const loginPwdVisible = ref(false)
/* 注册表单 */
const regName = ref('')
const regEmail = ref('')
const regPwd = ref('')
const regPwdVisible = ref(false)

const loginAccountEl = ref<HTMLInputElement>()

watch(
  () => ui.authDialogOpen,
  async (open) => {
    if (open) {
      tab.value = 'login'
      await nextTick()
      loginAccountEl.value?.focus()
    }
  },
)

function close() {
  ui.closeAuth()
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && ui.authDialogOpen) close()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

/** 失败提示:优先展示后端返回的错误信息 */
function errText(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : fallback
}

async function doLogin() {
  const account = loginAccount.value.trim()
  if (!account || !loginPwd.value) {
    ui.toast('请填写邮箱/用户名和密码')
    return
  }
  loading.value = true
  try {
    await auth.login(account, loginPwd.value)
    close()
    ui.toast('登录成功,欢迎回来')
  } catch (e) {
    ui.toast(errText(e, '登录失败,请稍后重试'))
  } finally {
    loading.value = false
  }
}

async function doRegister() {
  const name = regName.value.trim()
  const email = regEmail.value.trim()
  const pwd = regPwd.value
  if (!name || !email || !pwd) {
    ui.toast('请完整填写注册信息')
    return
  }
  if (pwd.length < 6) {
    ui.toast('密码至少 6 位')
    return
  }
  loading.value = true
  try {
    await auth.register(name, email, pwd)
    close()
    ui.toast('注册成功并已登录')
  } catch (e) {
    ui.toast(errText(e, '注册失败,请稍后重试'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <template v-if="ui.authDialogOpen">
      <div class="st-backdrop show" @click="close"></div>
      <div class="settings acc-dialog show" role="dialog" aria-modal="true" aria-label="账号登录或注册">
        <div class="st-head">
          <h2>{{ tab === 'login' ? '登录 kby' : '注册 kby' }}</h2>
          <button class="icon-btn" title="关闭" aria-label="关闭账号弹窗" @click="close">
            <IconSvg name="x" :size="20" />
          </button>
        </div>

        <div class="st-tabs">
          <button class="st-tab" :class="{ active: tab === 'login' }" @click="tab = 'login'">登录</button>
          <button class="st-tab" :class="{ active: tab === 'register' }" @click="tab = 'register'">注册</button>
        </div>

        <div class="st-body">
          <!-- 登录 -->
          <section class="st-pane" v-show="tab === 'login'">
            <div class="st-field">
              <label for="loginAccount">邮箱 / 用户名</label>
              <input
                id="loginAccount"
                ref="loginAccountEl"
                v-model="loginAccount"
                type="text"
                placeholder="you@example.com"
                @keydown.enter="!$event.isComposing && doLogin()"
              />
            </div>
            <div class="st-field">
              <label for="loginPwd">密码</label>
              <div class="st-key">
                <input
                  id="loginPwd"
                  v-model="loginPwd"
                  :type="loginPwdVisible ? 'text' : 'password'"
                  placeholder="请输入密码"
                  @keydown.enter="!$event.isComposing && doLogin()"
                />
                <button class="icon-btn" title="显示 / 隐藏密码" @click="loginPwdVisible = !loginPwdVisible">
                  <IconSvg name="eye" :size="20" />
                </button>
              </div>
            </div>
            <button class="acc-primary" :disabled="loading" @click="doLogin">
              {{ loading ? '登录中…' : '登录' }}
            </button>
            <p class="acc-switch">还没有账号?<a @click="tab = 'register'">立即注册</a></p>
          </section>

          <!-- 注册 -->
          <section class="st-pane" v-show="tab === 'register'">
            <div class="st-field">
              <label for="regName">用户名</label>
              <input
                id="regName"
                v-model="regName"
                type="text"
                placeholder="你的名字"
                @keydown.enter="!$event.isComposing && doRegister()"
              />
            </div>
            <div class="st-field">
              <label for="regEmail">邮箱</label>
              <input
                id="regEmail"
                v-model="regEmail"
                type="text"
                placeholder="you@example.com"
                @keydown.enter="!$event.isComposing && doRegister()"
              />
            </div>
            <div class="st-field">
              <label for="regPwd">设置密码</label>
              <div class="st-key">
                <input
                  id="regPwd"
                  v-model="regPwd"
                  :type="regPwdVisible ? 'text' : 'password'"
                  placeholder="至少 6 位"
                  @keydown.enter="!$event.isComposing && doRegister()"
                />
                <button class="icon-btn" title="显示 / 隐藏密码" @click="regPwdVisible = !regPwdVisible">
                  <IconSvg name="eye" :size="20" />
                </button>
              </div>
            </div>
            <button class="acc-primary" :disabled="loading" @click="doRegister">
              {{ loading ? '注册中…' : '注册并登录' }}
            </button>
            <p class="acc-switch">已有账号?<a @click="tab = 'login'">立即登录</a></p>
          </section>
        </div>
      </div>
    </template>
  </Teleport>
</template>
