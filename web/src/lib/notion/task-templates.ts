import type {
  PageObjectResponse,
  DatabaseObjectResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { getNotionClient } from './client'
import { withRateLimit } from './rate-limit'

const TASK_TEMPLATE_DB_ID = '4f39707a-4e5d-82f6-b56f-810bcfa8d05f'

// ─── プロパティID定数 ─────────────────────────────────────────────────────────
const PROP = {
  NAME:  'title',  // タスク名
  VALID: 'XTSP',  // 有効 (checkbox)
  PHASE: ':W<j',  // フェーズ (select) — URL-decoded from %3AW%3Cj
  ORDER: 'pFqQ',  // 順番 (number, for sorting)
} as const

export type TaskTemplate = {
  name:  string
  phase: string | null
}

// data_source_id を databases.retrieve から動的取得してキャッシュ
let _cachedDataSourceId: string | null = null

async function getDataSourceId(): Promise<string> {
  if (_cachedDataSourceId) return _cachedDataSourceId

  const notion = await getNotionClient()
  const db = await withRateLimit(() =>
    notion.databases.retrieve({ database_id: TASK_TEMPLATE_DB_ID })
  )
  const sources = (db as DatabaseObjectResponse).data_sources
  if (!sources || sources.length === 0) {
    throw new Error('タスクテンプレDB の data_source が見つかりません')
  }
  _cachedDataSourceId = sources[0].id
  return _cachedDataSourceId
}

// ─── 有効なテンプレートを順番順で取得 ──────────────────────────────────────────

export async function listActiveTemplates(): Promise<TaskTemplate[]> {
  const notion      = await getNotionClient()
  const dataSourceId = await getDataSourceId()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await withRateLimit(() =>
    notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: PROP.VALID, checkbox: { equals: true } },
      sorts:  [{ property: PROP.ORDER, direction: 'ascending' }],
    } as Parameters<typeof notion.dataSources.query>[0])
  )

  return response.results
    .filter((r): r is PageObjectResponse => r.object === 'page' && 'properties' in r)
    .map((page) => {
      const props    = page.properties
      const nameProp  = Object.values(props).find((p) => p.id === PROP.NAME)
      const phaseProp = Object.values(props).find((p) => p.id === PROP.PHASE)

      return {
        name:  nameProp?.type  === 'title'  ? nameProp.title.map((t) => t.plain_text).join('') : '',
        phase: phaseProp?.type === 'select' ? phaseProp.select?.name ?? null : null,
      }
    })
    .filter((t) => t.name)
}
