import { getNotionClient } from './client'
import { withRateLimit } from './rate-limit'
import type { TaskTemplate } from './task-templates'

const PROGRESS_TASKS_DB_ID = 'e5d9707a-4e5d-83d6-9ccf-015b8e0e96ed'

// ─── プロパティキー ───────────────────────────────────────────────────────────
const PROP = {
  NAME:          'title',            // タスク内容 (title)
  ORDER:         '受注一覧',          // relation → 受注一覧DB
  PHASE:         'フェーズ',           // select — プロパティ名で指定
  SEQ:           '順序',              // number — プロパティ名で指定
  DOCUMENT_LINK: 'ドキュメントリンク',  // url — プロパティ名で指定
  DETAIL:        '詳細',              // rich_text — プロパティ名で指定
  ASSIGNEE:      '担当者',            // people — プロパティ名で指定
  PARENT_ITEM:   '親アイテム',         // relation (sub-item)
} as const

export type CreatedProgressTask = {
  pageId:       string
  documentName: string | null
}

// ─── テンプレートから進行タスクを一括作成し受注に紐づける ──────────────────────

export async function createProgressTasksFromTemplates(
  orderId:     string,
  templates:   TaskTemplate[],
  assigneeIds: string[] = []
): Promise<CreatedProgressTask[]> {
  if (templates.length === 0) return []

  const notion = await getNotionClient()

  const parents  = templates.filter((t) => t.parentTemplateId === null)
  const children = templates.filter((t) => t.parentTemplateId !== null)

  // ── 1. 親タスクを作成し templateId → 進行タスクpageId のマップを作る ──────
  const parentResults = await Promise.all(
    parents.map((tpl) =>
      withRateLimit(() =>
        notion.pages.create({
          parent: { database_id: PROGRESS_TASKS_DB_ID },
          properties: buildProps(tpl, orderId, assigneeIds),
        })
      ).then((page) => ({
        templateId:   tpl.id,
        pageId:       page.id,
        documentName: tpl.documentName,
      }))
    )
  )

  // templateId → 進行タスクpageId
  const parentIdMap = new Map(parentResults.map((r) => [r.templateId, r.pageId]))

  // ── 2. 子タスクを作成（親アイテム に対応する進行タスクIDをセット） ────────
  const childResults = await Promise.all(
    children.map((tpl) => {
      const parentProgressId = tpl.parentTemplateId
        ? parentIdMap.get(tpl.parentTemplateId)
        : undefined

      if (!parentProgressId) {
        console.warn('[workflow] 親タスクが見つかりません:', tpl.name, tpl.parentTemplateId)
        return Promise.resolve(null)
      }

      return withRateLimit(() =>
        notion.pages.create({
          parent: { database_id: PROGRESS_TASKS_DB_ID },
          properties: buildProps(tpl, orderId, assigneeIds, parentProgressId),
        })
      ).then((page) => ({
        templateId:   tpl.id,
        pageId:       page.id,
        documentName: tpl.documentName,
      }))
    })
  )

  return [
    ...parentResults,
    ...childResults.filter((r): r is NonNullable<typeof r> => r !== null),
  ]
}

// ─── プロパティビルダー ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProps(
  tpl:            TaskTemplate,
  orderId:        string,
  assigneeIds:    string[],
  parentPageId?:  string
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {
    [PROP.NAME]:  { title: [{ type: 'text', text: { content: tpl.name } }] },
    [PROP.ORDER]: { relation: [{ id: orderId }] },
  }
  if (tpl.phase)        props[PROP.PHASE]          = { select: { name: tpl.phase } }
  if (tpl.order != null) props[PROP.SEQ]            = { number: tpl.order }
  if (tpl.documentLink) props[PROP.DOCUMENT_LINK]  = { url: tpl.documentLink }
  if (tpl.detail)       props[PROP.DETAIL]          = { rich_text: [{ type: 'text', text: { content: tpl.detail } }] }
  if (assigneeIds.length > 0)
                        props[PROP.ASSIGNEE]       = { people: assigneeIds.map((id) => ({ id })) }
  if (parentPageId)     props[PROP.PARENT_ITEM]    = { relation: [{ id: parentPageId }] }

  return props
}

// ─── ドキュメントリンクを更新 ─────────────────────────────────────────────────

export async function updateProgressTaskDocumentLink(
  pageId: string,
  url:    string
): Promise<void> {
  const notion = await getNotionClient()
  console.log('[progress-tasks] updateDocumentLink pageId:', pageId, 'url:', url, 'prop:', PROP.DOCUMENT_LINK)
  try {
    await withRateLimit(() =>
      notion.pages.update({
        page_id: pageId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        properties: {
          [PROP.DOCUMENT_LINK]: { url },
        } as Parameters<typeof notion.pages.update>[0]['properties'],
      })
    )
    console.log('[progress-tasks] updateDocumentLink success:', pageId)
  } catch (err) {
    console.error('[progress-tasks] updateDocumentLink FAILED:', pageId, err)
    throw err
  }
}
