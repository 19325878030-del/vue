# kby · 前端(Go_AGI_vue)

以 [产品设计原型](../产品设计/index.html)(Gemini 风格的 kby AI 工作台)为蓝本搭建的 Vue 3 前端,对接 Go 后端(`/api/auth/*`、`/api/chat` 等,Cookie 会话)。

## 技术栈

Vue 3 + TypeScript + Vite 7 · Pinia · Vue Router · 纯手写样式(设计令牌在 `src/assets/base.css`,从原型移植)

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
```

### 指向后端(二选一)

复制 `.env.example` 为 `.env.development` 后配置:

| 方式 | 配置 | 说明 |
| --- | --- | --- |
| A · 开发代理(推荐) | `VITE_PROXY_TARGET=http://localhost:8080` | dev server 转发 `/api/*` 到后端,无跨域问题 |
| B · 直连 | `VITE_API_BASE=https://xxxx.run.pinggy-free.link` | 浏览器跨域调用,需后端配 CORS(`Access-Control-Allow-Credentials: true` + 允许你的来源) |

## 当前进度(对照架构方案的六步)

- [x] **第 1 步** 脚手架 + 设计令牌/图标库 + 布局骨架(侧栏/顶栏/路由/AGI 页/模式 chips)
- [x] **第 2 步** 登录/注册弹窗接真实 `/api/auth/*`(Cookie 会话、401 自动弹登录、刷新尽力恢复会话)
- [ ] 第 3 步 对话主链路接 `/api/chat`(流式抽象、Markdown 渲染、会话列表)
- [x] **第 4 步** LibraryView 泛型组件(RAG/AGENT/Skill 三页配置化:搜索过滤 + 卡片重命名/删除 + ⊕ 新建;数据在 `stores/library`,localStorage 持久化 + 原型种子,待接真实接口)
- [x] 第 5 步-a 设置面板(侧栏齿轮 → 账户设置/模型接入;模型开关与顶栏下拉实时联动,本地持久化,待接真实接口)
- [ ] 第 5 步-b RAG 文件夹上传与向量化进度(前端假进度已就位,待接真实上传接口)
- [ ] 第 6 步 暗色主题、移动端打磨

## 目录结构

```
src/
├─ api/          # 后端接口层:http.ts 为 fetch 封装(Cookie 会话 + 错误归一化 + 401 处理)
├─ stores/       # Pinia:auth(登录态) / settings(模型开关+密钥,顶栏下拉数据源) / library(RAG/AGENT/Skill 资源库) / ui(侧栏、弹窗、Toast)
├─ router/       # /chat /rag /agent /skill /agi 五视图路由
├─ views/        # ChatView(欢迎页+输入区) / AgiView
├─ components/
│  ├─ layout/    # AppSidebar / AppTopbar / ModelSwitcher
│  ├─ library/   # LibraryView(RAG/AGENT/Skill 同构管理视图,kind 配置化)
│  ├─ auth/      # AuthDialog(登录/注册弹窗)
│  ├─ settings/  # SettingsDialog(账户设置/模型接入弹窗)
│  └─ common/    # IconDefs+IconSvg(原型图标库) / AppToast
└─ assets/       # base.css:设计令牌(:root 变量)+ 全局样式,预留暗色主题覆写
```

## 其他脚本

```bash
npm run build       # 类型检查 + 产物构建 → dist/
npm run type-check  # 仅类型检查
npm run preview     # 本地预览构建产物
```
