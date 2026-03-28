import type {
  BlockObjectResponse,
  BlockObjectRequest,
} from '@notionhq/client/build/src/api-endpoints'
import { getNotionClient } from './client'
import { withRateLimit } from './rate-limit'

// ページとして再作成できないブロック種別をスキップ
const SKIP_TYPES = new Set([
  'child_page',
  'child_database',
  'unsupported',
  'template',      // テンプレートボタン自体はコピーしない
  'breadcrumb',
  'column_list',
  'column',
])

/**
 * データソースのデフォルトテンプレートのブロックを取得し、
 * 指定ページに追記する。
 * テンプレートが存在しない・エラーの場合は何もしない。
 */
export async function applyDefaultTemplate(
  pageId:       string,
  dataSourceId: string
): Promise<void> {
  const notion = await getNotionClient()

  // デフォルトテンプレートを取得
  const { templates } = await withRateLimit(() =>
    notion.dataSources.listTemplates({ data_source_id: dataSourceId })
  )
  const defaultTemplate = templates.find((t) => t.is_default)
  if (!defaultTemplate) return

  // テンプレートページのブロック一覧を取得
  const { results } = await withRateLimit(() =>
    notion.blocks.children.list({ block_id: defaultTemplate.id, page_size: 100 })
  )

  const children = results.filter(
    (b): b is BlockObjectResponse =>
      'type' in b && !SKIP_TYPES.has((b as BlockObjectResponse).type)
  )
  if (children.length === 0) return

  // Notion API はリクエスト時に id / created_time 等のメタフィールドを無視するため
  // BlockObjectResponse をそのまま children として渡せる
  await withRateLimit(() =>
    notion.blocks.children.append({
      block_id: pageId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: children as unknown as BlockObjectRequest[],
    })
  )
}
