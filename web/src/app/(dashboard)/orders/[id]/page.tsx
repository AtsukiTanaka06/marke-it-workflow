import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getOrder } from '@/lib/notion/orders'
import { OrderEditForm } from './OrderEditForm'
import type { OrderStatus } from '@/types/notion'

const STATUS_STYLES: Record<OrderStatus, string> = {
  '失注':          'bg-red-100 text-red-700 border-red-200',
  '未着手':        'bg-slate-100 text-slate-600 border-slate-200',
  '見込み':        'bg-blue-100 text-blue-700 border-blue-200',
  '商談待ち':      'bg-indigo-100 text-indigo-700 border-indigo-200',
  '商談済み':      'bg-violet-100 text-violet-700 border-violet-200',
  '進行中（実績）': 'bg-orange-100 text-orange-700 border-orange-200',
  '進行中':        'bg-amber-100 text-amber-700 border-amber-200',
  '完了（実績）':  'bg-teal-100 text-teal-700 border-teal-200',
  '完了':          'bg-emerald-100 text-emerald-700 border-emerald-200',
}

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  try {
    const order = await getOrder(id)
    return { title: `${order.name} | MArKE-IT Workflow` }
  } catch {
    return { title: '受注詳細 | MArKE-IT Workflow' }
  }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params

  let order
  try {
    order = await getOrder(id)
  } catch {
    notFound()
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* パンくず */}
      <div className="flex items-center gap-2">
        <Link
          href="/orders"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          受注一覧
        </Link>
        {order.url && (
          <a
            href={order.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="size-3" />
            Notionで開く
          </a>
        )}
      </div>

      {/* ヘッダー */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">{order.name || '（無題）'}</h1>
          {order.operationStatus && (
            <p className="text-sm text-muted-foreground mt-0.5">{order.operationStatus}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {order.status && (
            <Badge variant="outline" className={`text-xs ${STATUS_STYLES[order.status]}`}>
              {order.status}
            </Badge>
          )}
        </div>
      </div>

      {/* 編集フォーム */}
      <div className="rounded-lg border bg-card p-6">
        <OrderEditForm order={order} />
      </div>
    </div>
  )
}
