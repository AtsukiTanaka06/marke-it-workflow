import { getNotionClient } from './client'
import { withRateLimit } from './rate-limit'
import type { TaskTemplate } from './task-templates'

const PROGRESS_TASKS_DB_ID = 'e5d9707a-4e5d-83d6-9ccf-015b8e0e96ed'

// ─── プロパティキー ───────────────────────────────────────────────────────────
// ID(%60%5CSG) は特殊文字を含みエンコード解釈が不安定なため、プロパティ名で指定
const PROP = {
  NAME:  'title',    // タスク内容 (title)
  ORDER: '受注一覧',  // relation → 受注一覧DB
  PHASE: 'lGMd',    // フェーズ (select)
} as const

// ─── テンプレートから進行タスクを一括作成し受注に紐づける ──────────────────────

export async function createProgressTasksFromTemplates(
  orderId:   string,
  templates: TaskTemplate[]
): Promise<void> {
  if (templates.length === 0) return

  const notion = await getNotionClient()

  await Promise.all(
    templates.map((tpl) =>
      withRateLimit(() =>
        notion.pages.create({
          parent: { database_id: PROGRESS_TASKS_DB_ID },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          properties: {
            [PROP.NAME]:  { title: [{ type: 'text', text: { content: tpl.name } }] },
            [PROP.ORDER]: { relation: [{ id: orderId }] },
            ...(tpl.phase ? { [PROP.PHASE]: { select: { name: tpl.phase } } } : {}),
          } as Parameters<typeof notion.pages.create>[0]['properties'],
        })
      )
    )
  )
}
