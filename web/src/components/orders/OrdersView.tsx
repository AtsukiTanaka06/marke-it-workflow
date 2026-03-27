'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrderFilter } from '@/store/orderFilterStore'
import { OrderCard } from './OrderCard'
import { OrderFilters } from './OrderFilters'
import { PaginationUI } from '@/components/projects/Pagination'
import { OrderCreateModal } from './OrderCreateModal'
import type { Order, PaginatedResult } from '@/types/notion'

export function OrdersView() {
  const { search, status, operationStatus, cursorStack, currentPage, goNext, goPrev } = useOrderFilter()
  const [result, setResult] = useState<PaginatedResult<Order> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cursor = cursorStack[currentPage] ?? undefined

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search)          params.set('search', search)
      if (status)          params.set('status', status)
      if (operationStatus) params.set('operationStatus', operationStatus)
      if (cursor)          params.set('cursor', cursor)

      const res = await fetch(`/api/notion/orders?${params}`)
      if (!res.ok) throw new Error('fetch failed')
      setResult(await res.json())
    } catch {
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [search, status, operationStatus, cursor])

  useEffect(() => { fetch_() }, [fetch_])

  function handleCreated(order: Order) {
    setResult((prev) =>
      prev ? { ...prev, items: [order, ...prev.items] } : { items: [order], nextCursor: null, hasMore: false }
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <OrderFilters />
        <OrderCreateModal onCreated={handleCreated} />
      </div>

      {/* コンテンツ */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && result && (
        <>
          {result.items.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
              該当する受注がありません
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.items.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <PaginationUI
              hasMore={result.hasMore}
              nextCursor={result.nextCursor}
              currentPage={currentPage}
              goNext={goNext}
              goPrev={goPrev}
            />
          </div>
        </>
      )}
    </div>
  )
}
