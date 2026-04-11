import type {
  PageObjectResponse,
  DatabaseObjectResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { getNotionClient } from './client'
import { withRateLimit } from './rate-limit'

const TASK_TEMPLATE_DB_ID = '4f39707a-4e5d-82f6-b56f-810bcfa8d05f'

// ─── フィルター・ソート用プロパティID（確認済み・動作中） ──────────────────────
const FILTER_PROP = {
  VALID: 'XTSP',  // 有効 (checkbox)
} as const

// ─── 値読み取り用プロパティ名（名前ベースアクセス） ───────────────────────────
const READ_PROP = {
  PHASE:          'フェーズ',          // select
  ORDER:          '順序',              // number
  DOCUMENT_NAME:  'ドキュメント名',    // rich_text
  DOCUMENT_LINK:  'ドキュメントリンク', // url
  DETAIL:         '詳細',              // rich_text
  PARENT_ITEM:    '親アイテム',         // relation (sub-item の親ページID)
} as const

export type TaskTemplate = {
  id:               string        // テンプレートページID（親子照合用）
  name:             string
  phase:            string | null
  order:            number | null
  documentName:     string | null
  documentLink:     string | null // テンプレートに設定済みのドキュメントリンク
  detail:           string | null // 詳細 (rich_text)
  parentTemplateId: string | null // null = 親タスク、string = 子タスクの親テンプレートID
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

// ─── 有効なテンプレートを順序順で取得（サブアイテム含む） ──────────────────────

export async function listActiveTemplates(): Promise<TaskTemplate[]> {
  const notion       = await getNotionClient()
  const dataSourceId = await getDataSourceId()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await withRateLimit(() =>
    notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: FILTER_PROP.VALID, checkbox: { equals: true } },
      sorts:  [{ property: READ_PROP.ORDER, direction: 'ascending' }],
    } as Parameters<typeof notion.dataSources.query>[0])
  )

  return response.results
    .filter((r): r is PageObjectResponse => r.object === 'page' && 'properties' in r)
    .map((page) => {
      const props = page.properties

      const titleProp      = Object.values(props).find((p) => p.type === 'title')
      const phaseProp      = props[READ_PROP.PHASE]
      const orderProp      = props[READ_PROP.ORDER]
      const docNameProp    = props[READ_PROP.DOCUMENT_NAME]
      const docLinkProp    = props[READ_PROP.DOCUMENT_LINK]
      const detailProp     = props[READ_PROP.DETAIL]
      const parentItemProp = props[READ_PROP.PARENT_ITEM]

      return {
        id:   page.id,
        name: titleProp?.type === 'title'
          ? titleProp.title.map((t) => t.plain_text).join('')
          : '',
        phase: phaseProp?.type === 'select'
          ? phaseProp.select?.name ?? null
          : null,
        order: orderProp?.type === 'number'
          ? orderProp.number
          : null,
        documentName: docNameProp?.type === 'rich_text'
          ? docNameProp.rich_text.map((t) => t.plain_text).join('').trim() || null
          : null,
        documentLink: docLinkProp?.type === 'url'
          ? docLinkProp.url ?? null
          : null,
        detail: detailProp?.type === 'rich_text'
          ? detailProp.rich_text.map((t) => t.plain_text).join('').trim() || null
          : null,
        parentTemplateId: parentItemProp?.type === 'relation' && parentItemProp.relation.length > 0
          ? parentItemProp.relation[0].id
          : null,
      }
    })
    .filter((t) => t.name)
}
