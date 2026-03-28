import type {
  PageObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { getNotionClient } from './client'
import { withRateLimit } from './rate-limit'
import { applyDefaultTemplate } from './template-blocks'
import type {
  Order,
  OrderStatus,
  OperationStatus,
  RichTextItem,
  Attachment,
  CreateOrderInput,
  UpdateOrderInput,
  PaginatedResult,
} from '@/types/notion'

// ─── プロパティID定数 ─────────────────────────────────────────────────────────
const PROP = {
  NAME:             'title',   // 受注項目
  PROJECT:          'bXmW',    // 案件名 (relation → 案件一覧DB)
  INDUSTRY:         'rVn|',    // 業界
  STATUS:           'qqK\\',   // 進捗 (status型)
  OPERATION_STATUS: 'teo=',    // 運用進捗
  AMOUNT:           'xwvG',    // 受注金額
  CONTENT:          'mc_p',    // 受注内容
  ASSIGNEE:         'o{;e',    // 担当者 (people)
  NOTES:            '_u>H',    // 備考
  ATTACHMENTS:      ']}TT',    // 添付 (read-only)
  DEADLINE:         'SNM>',    // 期限
  RATING:           'hGS~',    // 5段階評価
  ACHIEVEMENT:      '}oCM',    // 実績記述欄
} as const

export const ORDERS_DB_ID = '1a49707a-4e5d-80b0-89b5-e9960da11e2f'
const ORDERS_DATA_SOURCE_ID = '1a49707a-4e5d-81ef-acaa-000b9e67f97c'

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

type Props = PageObjectResponse['properties']

function prop(props: Props, id: string) {
  return Object.values(props).find((p) => p.id === id)
}

function extractRichText(items: RichTextItemResponse[]): RichTextItem[] {
  return items.map((item) => ({
    text: item.plain_text,
    annotations: {
      bold: item.annotations.bold,
      italic: item.annotations.italic,
      strikethrough: item.annotations.strikethrough,
      underline: item.annotations.underline,
      code: item.annotations.code,
    },
    href: item.href,
  }))
}

function toRichTextParam(items: RichTextItem[]) {
  return items.map((item) => ({
    type: 'text' as const,
    text: { content: item.text, link: item.href ? { url: item.href } : null },
    annotations: item.annotations,
  }))
}

// ─── Notion レスポンス → Order 正規化 ─────────────────────────────────────────

function toOrder(page: PageObjectResponse): Order {
  const props = page.properties

  const nameProp        = prop(props, PROP.NAME)
  const projectProp     = prop(props, PROP.PROJECT)
  const industryProp    = prop(props, PROP.INDUSTRY)
  const statusProp      = prop(props, PROP.STATUS)
  const opStatusProp    = prop(props, PROP.OPERATION_STATUS)
  const amountProp      = prop(props, PROP.AMOUNT)
  const contentProp     = prop(props, PROP.CONTENT)
  const assigneeProp    = prop(props, PROP.ASSIGNEE)
  const notesProp       = prop(props, PROP.NOTES)
  const attachmentsProp = prop(props, PROP.ATTACHMENTS)
  const deadlineProp    = prop(props, PROP.DEADLINE)
  const ratingProp      = prop(props, PROP.RATING)
  const achieveProp     = prop(props, PROP.ACHIEVEMENT)

  // 関連する案件名（relation には title が含まれる場合がある）
  let projectId: string | null = null
  let projectName: string | null = null
  if (projectProp?.type === 'relation' && projectProp.relation.length > 0) {
    projectId = projectProp.relation[0].id
  }

  // 添付ファイル
  const attachments: Attachment[] = []
  if (attachmentsProp?.type === 'files') {
    for (const f of attachmentsProp.files) {
      if (f.type === 'external') {
        attachments.push({ name: f.name, url: f.external.url })
      } else if (f.type === 'file') {
        attachments.push({ name: f.name, url: f.file.url })
      }
    }
  }

  return {
    id: page.id,
    url: page.url,
    name:
      nameProp?.type === 'title'
        ? nameProp.title.map((t) => t.plain_text).join('')
        : '',
    projectId,
    projectName,
    industry:
      industryProp?.type === 'multi_select'
        ? industryProp.multi_select.map((o) => o.name)
        : [],
    status:
      statusProp?.type === 'status'
        ? (statusProp.status?.name as OrderStatus) ?? null
        : null,
    operationStatus:
      opStatusProp?.type === 'select'
        ? (opStatusProp.select?.name as OperationStatus) ?? null
        : null,
    amount:
      amountProp?.type === 'number' ? amountProp.number : null,
    content:
      contentProp?.type === 'rich_text'
        ? extractRichText(contentProp.rich_text)
        : [],
    assigneeIds:
      assigneeProp?.type === 'people'
        ? assigneeProp.people.map((u) => u.id)
        : [],
    notes:
      notesProp?.type === 'rich_text'
        ? extractRichText(notesProp.rich_text)
        : [],
    attachments,
    deadline:
      deadlineProp?.type === 'date' ? deadlineProp.date?.start ?? null : null,
    rating:
      ratingProp?.type === 'multi_select'
        ? ratingProp.multi_select.map((o) => o.name)
        : [],
    achievement:
      achieveProp?.type === 'rich_text'
        ? extractRichText(achieveProp.rich_text)
        : [],
    createdAt: page.created_time,
    lastEditedAt: page.last_edited_time,
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export type ListOrdersOptions = {
  search?: string
  status?: OrderStatus
  operationStatus?: OperationStatus
  industry?: string
  cursor?: string
  pageSize?: number
}

export async function listOrders(
  options: ListOrdersOptions = {}
): Promise<PaginatedResult<Order>> {
  const notion = await getNotionClient()
  const { search, status, operationStatus, industry, cursor, pageSize = 20 } = options

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andFilters: any[] = []

  if (search) {
    andFilters.push({ property: PROP.NAME, title: { contains: search } })
  }
  if (status) {
    andFilters.push({ property: PROP.STATUS, status: { equals: status } })
  }
  if (operationStatus) {
    andFilters.push({ property: PROP.OPERATION_STATUS, select: { equals: operationStatus } })
  }
  if (industry) {
    andFilters.push({ property: PROP.INDUSTRY, multi_select: { contains: industry } })
  }

  const response = await withRateLimit(() =>
    notion.dataSources.query({
      data_source_id: ORDERS_DATA_SOURCE_ID,
      filter: andFilters.length > 0 ? { and: andFilters } : undefined,
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      page_size: pageSize,
      start_cursor: cursor,
    })
  )

  return {
    items: response.results
      .filter((r): r is PageObjectResponse => r.object === 'page' && 'properties' in r)
      .map(toOrder),
    nextCursor: response.next_cursor,
    hasMore: response.has_more,
  }
}

export async function getOrder(id: string): Promise<Order> {
  const notion = await getNotionClient()
  const page = await withRateLimit(() => notion.pages.retrieve({ page_id: id }))
  return toOrder(page as PageObjectResponse)
}

export async function createOrder(data: CreateOrderInput): Promise<Order> {
  const notion = await getNotionClient()

  const page = await withRateLimit(() =>
    notion.pages.create({
      parent: { database_id: ORDERS_DB_ID },
      properties: buildOrderProperties(data),
    })
  )

  const order = toOrder(page as PageObjectResponse)

  // デフォルトテンプレートのブロックを追記（失敗しても作成自体は成功とする）
  try {
    await applyDefaultTemplate(order.id, ORDERS_DATA_SOURCE_ID)
  } catch (err) {
    console.error('[template] 受注テンプレート適用エラー:', err)
  }

  return order
}

export async function updateOrder(id: string, data: UpdateOrderInput): Promise<Order> {
  const notion = await getNotionClient()

  const page = await withRateLimit(() =>
    notion.pages.update({
      page_id: id,
      properties: buildOrderProperties(data),
    })
  )

  return toOrder(page as PageObjectResponse)
}

// ─── プロパティビルダー ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildOrderProperties(data: UpdateOrderInput): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {}

  if (data.name !== undefined) {
    props[PROP.NAME] = { title: [{ type: 'text', text: { content: data.name } }] }
  }
  if (data.projectId !== undefined) {
    props[PROP.PROJECT] = data.projectId
      ? { relation: [{ id: data.projectId }] }
      : { relation: [] }
  }
  if (data.industry !== undefined) {
    props[PROP.INDUSTRY] = { multi_select: data.industry.map((name) => ({ name })) }
  }
  if (data.status !== undefined) {
    props[PROP.STATUS] = data.status ? { status: { name: data.status } } : { status: null }
  }
  if (data.operationStatus !== undefined) {
    props[PROP.OPERATION_STATUS] = data.operationStatus
      ? { select: { name: data.operationStatus } }
      : { select: null }
  }
  if (data.amount !== undefined) {
    props[PROP.AMOUNT] = { number: data.amount }
  }
  if (data.content !== undefined) {
    props[PROP.CONTENT] = { rich_text: toRichTextParam(data.content) }
  }
  if (data.assigneeIds !== undefined) {
    props[PROP.ASSIGNEE] = { people: data.assigneeIds.map((id) => ({ id })) }
  }
  if (data.notes !== undefined) {
    props[PROP.NOTES] = { rich_text: toRichTextParam(data.notes) }
  }
  if (data.deadline !== undefined) {
    props[PROP.DEADLINE] = data.deadline ? { date: { start: data.deadline } } : { date: null }
  }
  if (data.rating !== undefined) {
    props[PROP.RATING] = { multi_select: data.rating.map((name) => ({ name })) }
  }
  if (data.achievement !== undefined) {
    props[PROP.ACHIEVEMENT] = { rich_text: toRichTextParam(data.achievement) }
  }

  return props
}
