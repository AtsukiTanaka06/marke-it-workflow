'use client'

import { useState, useEffect } from 'react'
import { useOrderFilter } from '@/store/orderFilterStore'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { OrderStatus, OperationStatus } from '@/types/notion'

const ORDER_STATUSES: OrderStatus[] = [
  '未着手', '見込み', '商談待ち', '商談済み',
  '進行中', '進行中（実績）', '完了', '完了（実績）', '失注',
]
const OPERATION_STATUSES: OperationStatus[] = ['運用中', '運用終了']

export function OrderFilters() {
  const { search, status, operationStatus, setSearch, setStatus, setOperationStatus, reset } = useOrderFilter()
  const [inputValue, setInputValue] = useState(search)

  // ストアがリセットされたときローカル入力値を同期
  useEffect(() => { setInputValue(search) }, [search])

  // 入力から 300ms 後にストアを更新（デバウンス）
  useEffect(() => {
    const id = setTimeout(() => setSearch(inputValue), 300)
    return () => clearTimeout(id)
  }, [inputValue, setSearch])

  const isDirty = search !== '' || status !== '' || operationStatus !== ''

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="受注項目名で検索..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="h-8 w-52 text-sm"
      />

      <Select
        key={`status-${status}`}
        defaultValue={status || undefined}
        onValueChange={(v) => setStatus((v as OrderStatus) || '')}
      >
        <SelectTrigger className="h-8 w-36 text-sm">
          <SelectValue placeholder="進捗" />
        </SelectTrigger>
        <SelectContent>
          {ORDER_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        key={`op-${operationStatus}`}
        defaultValue={operationStatus || undefined}
        onValueChange={(v) => setOperationStatus((v as OperationStatus) || '')}
      >
        <SelectTrigger className="h-8 w-28 text-sm">
          <SelectValue placeholder="運用進捗" />
        </SelectTrigger>
        <SelectContent>
          {OPERATION_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isDirty && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={reset}>
          クリア
        </Button>
      )}
    </div>
  )
}
