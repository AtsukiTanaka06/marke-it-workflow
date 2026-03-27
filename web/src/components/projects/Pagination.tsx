'use client'

import { Button } from '@/components/ui/button'
import { useProjectFilter } from '@/store/filterStore'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  hasMore: boolean
  nextCursor: string | null
}

export function Pagination({ hasMore, nextCursor }: Props) {
  const { currentPage, goNext, goPrev } = useProjectFilter()

  return (
    <PaginationUI
      hasMore={hasMore}
      nextCursor={nextCursor}
      currentPage={currentPage}
      goNext={goNext}
      goPrev={goPrev}
    />
  )
}

// ─── 汎用ページネーション UI（受注でも再利用） ───────────────────────────────

export type PaginationUIProps = {
  hasMore: boolean
  nextCursor: string | null
  currentPage: number
  goNext: (cursor: string) => void
  goPrev: () => void
}

export function PaginationUI({ hasMore, nextCursor, currentPage, goNext, goPrev }: PaginationUIProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        disabled={currentPage === 0}
        onClick={goPrev}
      >
        <ChevronLeft className="size-4" />
        前へ
      </Button>
      <span className="text-xs text-muted-foreground px-1">{currentPage + 1} ページ</span>
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        disabled={!hasMore || !nextCursor}
        onClick={() => nextCursor && goNext(nextCursor)}
      >
        次へ
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
