'use client'

import { useState, useEffect } from 'react'
import { useProjectFilter } from '@/store/filterStore'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { ProjectStatus, ProjectType } from '@/types/notion'

const STATUSES: ProjectStatus[] = ['見込み', '進行中', '契約', '運用中', '納品済み']
const TYPES: ProjectType[] = ['個人', '企業']

export function ProjectFilters() {
  const { search, status, type, setSearch, setStatus, setType, reset } = useProjectFilter()
  const [inputValue, setInputValue] = useState(search)

  // ストアがリセットされたときローカル入力値を同期
  useEffect(() => { setInputValue(search) }, [search])

  // 入力から 300ms 後にストアを更新（デバウンス）
  useEffect(() => {
    const id = setTimeout(() => setSearch(inputValue), 300)
    return () => clearTimeout(id)
  }, [inputValue, setSearch])

  const isDirty = search !== '' || status !== '' || type !== ''

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="案件名で検索..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="h-8 w-52 text-sm"
      />

      {/* key で reset 時に再マウント */}
      <Select
        key={`status-${status}`}
        defaultValue={status || undefined}
        onValueChange={(v) => setStatus((v as ProjectStatus) || '')}
      >
        <SelectTrigger className="h-8 w-32 text-sm">
          <SelectValue placeholder="進捗状況" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        key={`type-${type}`}
        defaultValue={type || undefined}
        onValueChange={(v) => setType((v as ProjectType) || '')}
      >
        <SelectTrigger className="h-8 w-24 text-sm">
          <SelectValue placeholder="種別" />
        </SelectTrigger>
        <SelectContent>
          {TYPES.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
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
