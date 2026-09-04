/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端完整地址;留空表示同源(/api 走 vite 代理) */
  readonly VITE_API_BASE?: string
  /** dev server 代理目标(VITE_API_BASE 为空时生效) */
  readonly VITE_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
