'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Order, OrderStatus } from '@/types/notion'

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

function fmt(n: number | null) {
  if (n == null) return null
  return n.toLocaleString('ja-JP') + '円'
}

export const OrderCard = memo(function OrderCard({ order }: { order: Order }) {
  return (
    <Link href={`/orders/${order.id}`} className="block group">
      <Card className="h-full border border-border transition-shadow group-hover:shadow-md group-hover:border-primary/30">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {order.name || '（無題）'}
            </p>
            {order.status && (
              <Badge
                variant="outline"
                className={`shrink-0 text-[11px] px-1.5 py-0 ${STATUS_STYLES[order.status]}`}
              >
                {order.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1.5">
          {order.operationStatus && (
            <p className="text-xs text-muted-foreground">{order.operationStatus}</p>
          )}
          {order.industry.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {order.industry.map((ind) => (
                <span key={ind} className="text-[11px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                  {ind}
                </span>
              ))}
            </div>
          )}
          {order.amount != null && (
            <p className="text-xs text-muted-foreground">受注金額: {fmt(order.amount)}</p>
          )}
          {order.deadline && (
            <p className="text-xs text-muted-foreground">期限: {order.deadline}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
})
