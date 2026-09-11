import { api } from './http'

/**
 * Agent 工具包接口,对应后端 app.py:
 *   GET /api/agent/tools → {tools: [{package, display_name, version, tools}]}
 * 后端扫描 data/agent_tools 下各工具包的 manifest.json 得来,只读元数据、不需要登录。
 * 聊天时把选中的 package 名放进 POST /api/chat 的 tool_packages 字段。
 */

/** GET 返回的一个工具包(manifest.json 概览) */
export interface ApiAgentPackage {
  /** 包名(manifest 的 package 字段)——当 id 用,对话时也传它 */
  package: string
  /** 用户可见名 —— 卡片上显示它 */
  display_name: string
  version: string
  /** 包内的具体工具列表 */
  tools: { name: string; description: string }[]
}

export function fetchAgentTools() {
  return api<{ tools: ApiAgentPackage[]; error?: string | null }>('/api/agent/tools')
}
