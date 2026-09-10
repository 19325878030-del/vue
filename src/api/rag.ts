import { api } from './http'

/**
 * RAG 知识库接口,对应后端 app.py:
 *   GET  /api/rag/collections  → {collections: [{name, display_name, count}]}
 *   POST /api/rag/collections  → multipart(collection_name + files),同步入库
 * 两个接口都不需要登录;POST 期间后端在做嵌入计算,耗时长是正常的。
 */

/** GET 返回的一条知识库 */
export interface ApiRagCollection {
  /** 合法集合名(中文库名被 slug 化的结果)——当 id 用,对话时也传它 */
  name: string
  /** 用户可见库名(原始中文名)——卡片上显示它 */
  display_name: string
  /** 已入库的块数 */
  count: number
}

/** POST 成功返回的入库统计 */
export interface IngestResult {
  collection: string
  display_name: string
  total_chunks: number
  files: { file: string; chunks: number; ok: boolean; error: string | null }[]
}

/** 后端白名单(rag_ingest.py LOADER_MAP);混入其它扩展名整批 400 */
export const SUPPORTED_EXTS = ['.txt', '.md', '.pdf', '.docx']

export function fetchRagCollections() {
  return api<{ collections: ApiRagCollection[]; error?: string | null }>('/api/rag/collections')
}

export function createRagCollection(name: string, files: File[]) {
  const fd = new FormData()
  fd.append('collection_name', name) // 字段名与后端 app.py request.form.get 对齐
  for (const f of files) fd.append('files', f)
  return api<IngestResult>('/api/rag/collections', { method: 'POST', body: fd })
}
