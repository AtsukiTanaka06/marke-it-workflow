// Notion DB の正規化後の型定義

export type RichTextItem = {
  text: string
  annotations: {
    bold: boolean
    italic: boolean
    strikethrough: boolean
    underline: boolean
    code: boolean
  }
  href: string | null
}

export type Attachment = {
  name: string
  url: string
}

// ─── 案件一覧DB ───────────────────────────────────────────────────────────────

export type ProjectStatus = '見込み' | '進行中' | '契約' | '運用中' | '納品済み'
export type ProjectType = '個人' | '企業'

export type Project = {
  id: string                       // Notion page ID
  url: string
  name: string                     // 案件名 (title)
  status: ProjectStatus | null     // 進捗状況  (select, ID: bW^a)
  type: ProjectType | null         // 種別 (select, ID: [anH)
  industry: string[]               // 業界 (multi_select, ID: R@o~)
  deadline: string | null          // プロジェクト期限 (date, ID: stZx) ISO8601
  initialCost: number | null       // 初期費用 (number, ID: Lmsd)
  monthlyCost: number | null       // 月額費用 (number, ID: `GBV)
  totalCost: number | null         // 受注費総計 (formula, read-only, ID: ^{C])
  contractContent: RichTextItem[]  // 契約内容 (rich_text, ID: LmZa)
  notes: RichTextItem[]            // 特記 (rich_text, ID: V\:J)
  progress: string | null          // 案件進捗 (formula, read-only, ID: ]SH\)
  createdAt: string
  lastEditedAt: string
}

export type CreateProjectInput = {
  name: string
  status?: ProjectStatus
  type?: ProjectType
  industry?: string[]
  deadline?: string | null
  initialCost?: number | null
  monthlyCost?: number | null
  contractContent?: RichTextItem[]
  notes?: RichTextItem[]
}

export type UpdateProjectInput = Partial<CreateProjectInput>

// ─── 受注一覧DB ───────────────────────────────────────────────────────────────

export type OrderStatus =
  | '失注' | '未着手' | '見込み' | '商談待ち' | '商談済み'
  | '進行中（実績）' | '進行中' | '完了（実績）' | '完了'

export type OperationStatus = '運用中' | '運用終了'

export type Order = {
  id: string                          // Notion page ID
  url: string
  name: string                        // 受注項目 (title)
  projectId: string | null            // 案件名 (relation, ID: bXmW) → page ID
  projectName: string | null          // 案件名のタイトル (表示用)
  industry: string[]                  // 業界 (multi_select, ID: rVn|)
  status: OrderStatus | null          // 進捗 (status, ID: qqK\)
  operationStatus: OperationStatus | null // 運用進捗 (select, ID: teo=)
  amount: number | null               // 受注金額 (number, ID: xwvG)
  content: RichTextItem[]             // 受注内容 (rich_text, ID: mc_p)
  assigneeIds: string[]               // 担当者 (people, ID: o{;e) Notion user ID
  notes: RichTextItem[]               // 備考 (rich_text, ID: _u>H)
  attachments: Attachment[]           // 添付 (files, read-only, ID: ]}TT)
  deadline: string | null             // 期限 (date, ID: SNM>) ISO8601
  rating: string[]                    // 5段階評価 (multi_select, ID: hGS~)
  achievement: RichTextItem[]         // 実績記述欄 (rich_text, ID: }oCM)
  createdAt: string
  lastEditedAt: string
}

export type CreateOrderInput = {
  name: string
  projectId?: string | null
  industry?: string[]
  status?: OrderStatus
  operationStatus?: OperationStatus | null
  amount?: number | null
  content?: RichTextItem[]
  assigneeIds?: string[]
  notes?: RichTextItem[]
  deadline?: string | null
  rating?: string[]
  achievement?: RichTextItem[]
}

export type UpdateOrderInput = Partial<CreateOrderInput>

// ─── ページネーション ───────────────────────────────────────────────────────────

export type PaginatedResult<T> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}
