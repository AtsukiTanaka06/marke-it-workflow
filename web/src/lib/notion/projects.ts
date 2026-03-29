import type {
  PageObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { getNotionClient } from './client'
import { withRateLimit } from './rate-limit'

import type {
  Project,
  ProjectStatus,
  ProjectType,
  RichTextItem,
  CreateProjectInput,
  UpdateProjectInput,
  PaginatedResult,
} from '@/types/notion'

// ─── プロパティID定数（名前変更に強い） ──────────────────────────────────────────
const PROP = {
  NAME:             'title',   // 案件名
  STATUS:           'bW^a',    // 進捗状況 (末尾スペースあり)
  TYPE:             '[anH',    // 種別
  INDUSTRY:         'R@o~',    // 業界
  DEADLINE:         'stZx',    // プロジェクト期限
  INITIAL_COST:     'Lmsd',    // 初期費用
  MONTHLY_COST:     '`GBV',    // 月額費用
  TOTAL_COST:       '^{C]',    // 受注費総計 (formula, read-only)
  CONTRACT_CONTENT: 'LmZa',    // 契約内容
  NOTES:            'V\\:J',   // 特記
  PROGRESS:         ']SH\\',   // 案件進捗 (formula, read-only)
  ASSIGNEE:         '担当者',   // 担当者 (people) — プロパティ名で指定
} as const

export const PROJECTS_DB_ID = '19d9707a-4e5d-800d-a40f-dec078f895df'
// Notion SDK v5 では dataSources.query に data_source_id を渡す
const PROJECTS_DATA_SOURCE_ID = '19d9707a-4e5d-81f1-9897-000b9e734139'

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

// ─── Notion レスポンス → Project 正規化 ────────────────────────────────────────

function toProject(page: PageObjectResponse): Project {
  const props = page.properties

  const nameProp = prop(props, PROP.NAME)
  const statusProp = prop(props, PROP.STATUS)
  const typeProp = prop(props, PROP.TYPE)
  const industryProp = prop(props, PROP.INDUSTRY)
  const deadlineProp = prop(props, PROP.DEADLINE)
  const initialCostProp = prop(props, PROP.INITIAL_COST)
  const monthlyCostProp = prop(props, PROP.MONTHLY_COST)
  const totalCostProp = prop(props, PROP.TOTAL_COST)
  const contractProp = prop(props, PROP.CONTRACT_CONTENT)
  const notesProp = prop(props, PROP.NOTES)
  const progressProp = prop(props, PROP.PROGRESS)
  // 担当者はプロパティ名でキー参照（IDが不明なため）
  const assigneeProp = props[PROP.ASSIGNEE]

  return {
    id: page.id,
    url: page.url,
    name:
      nameProp?.type === 'title'
        ? nameProp.title.map((t) => t.plain_text).join('')
        : '',
    status:
      statusProp?.type === 'select'
        ? (statusProp.select?.name as ProjectStatus) ?? null
        : null,
    type:
      typeProp?.type === 'select'
        ? (typeProp.select?.name as ProjectType) ?? null
        : null,
    industry:
      industryProp?.type === 'multi_select'
        ? industryProp.multi_select.map((o) => o.name)
        : [],
    deadline:
      deadlineProp?.type === 'date' ? deadlineProp.date?.start ?? null : null,
    initialCost:
      initialCostProp?.type === 'number' ? initialCostProp.number : null,
    monthlyCost:
      monthlyCostProp?.type === 'number' ? monthlyCostProp.number : null,
    totalCost:
      totalCostProp?.type === 'formula' && totalCostProp.formula.type === 'number'
        ? totalCostProp.formula.number
        : null,
    contractContent:
      contractProp?.type === 'rich_text'
        ? extractRichText(contractProp.rich_text)
        : [],
    notes:
      notesProp?.type === 'rich_text'
        ? extractRichText(notesProp.rich_text)
        : [],
    progress:
      progressProp?.type === 'formula' && progressProp.formula.type === 'string'
        ? progressProp.formula.string
        : null,
    assigneeIds:
      assigneeProp?.type === 'people'
        ? assigneeProp.people.map((u) => u.id)
        : [],
    createdAt: page.created_time,
    lastEditedAt: page.last_edited_time,
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export type ListProjectsOptions = {
  search?: string
  status?: ProjectStatus
  type?: ProjectType
  industry?: string
  cursor?: string
  pageSize?: number
}

export async function listProjects(
  options: ListProjectsOptions = {}
): Promise<PaginatedResult<Project>> {
  const notion = await getNotionClient()
  const { search, status, type, industry, cursor, pageSize = 20 } = options

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andFilters: any[] = []

  if (search) {
    andFilters.push({ property: PROP.NAME, title: { contains: search } })
  }
  if (status) {
    andFilters.push({ property: PROP.STATUS, select: { equals: status } })
  }
  if (type) {
    andFilters.push({ property: PROP.TYPE, select: { equals: type } })
  }
  if (industry) {
    andFilters.push({ property: PROP.INDUSTRY, multi_select: { contains: industry } })
  }

  const response = await withRateLimit(() =>
    notion.dataSources.query({
      data_source_id: PROJECTS_DATA_SOURCE_ID,
      filter: andFilters.length > 0 ? { and: andFilters } : undefined,
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      page_size: pageSize,
      start_cursor: cursor,
    })
  )

  return {
    items: response.results
      .filter((r): r is PageObjectResponse => r.object === 'page' && 'properties' in r)
      .map(toProject),
    nextCursor: response.next_cursor,
    hasMore: response.has_more,
  }
}

export async function getProject(id: string): Promise<Project> {
  const notion = await getNotionClient()
  const page = await withRateLimit(() => notion.pages.retrieve({ page_id: id }))
  return toProject(page as PageObjectResponse)
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  const notion = await getNotionClient()

  const page = await withRateLimit(() =>
    notion.pages.create({
      parent: { database_id: PROJECTS_DB_ID },
      properties: buildProjectProperties(data),
    })
  )

  const project = toProject(page as PageObjectResponse)

  return project
}

export async function updateProject(
  id: string,
  data: UpdateProjectInput
): Promise<Project> {
  const notion = await getNotionClient()

  const page = await withRateLimit(() =>
    notion.pages.update({
      page_id: id,
      properties: buildProjectProperties(data),
    })
  )

  return toProject(page as PageObjectResponse)
}

// ─── プロパティビルダー ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProjectProperties(data: UpdateProjectInput): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {}

  if (data.name !== undefined) {
    props[PROP.NAME] = { title: [{ type: 'text', text: { content: data.name } }] }
  }
  if (data.status !== undefined) {
    props[PROP.STATUS] = data.status ? { select: { name: data.status } } : { select: null }
  }
  if (data.type !== undefined) {
    props[PROP.TYPE] = data.type ? { select: { name: data.type } } : { select: null }
  }
  if (data.industry !== undefined) {
    props[PROP.INDUSTRY] = { multi_select: data.industry.map((name) => ({ name })) }
  }
  if (data.deadline !== undefined) {
    props[PROP.DEADLINE] = data.deadline ? { date: { start: data.deadline } } : { date: null }
  }
  if (data.initialCost !== undefined) {
    props[PROP.INITIAL_COST] = { number: data.initialCost }
  }
  if (data.monthlyCost !== undefined) {
    props[PROP.MONTHLY_COST] = { number: data.monthlyCost }
  }
  if (data.contractContent !== undefined) {
    props[PROP.CONTRACT_CONTENT] = { rich_text: toRichTextParam(data.contractContent) }
  }
  if (data.notes !== undefined) {
    props[PROP.NOTES] = { rich_text: toRichTextParam(data.notes) }
  }
  if (data.assigneeIds !== undefined) {
    props[PROP.ASSIGNEE] = { people: data.assigneeIds.map((id) => ({ id })) }
  }

  return props
}
