'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

type Props = {
  label?: string
  value: string[]
  onChange: (industries: string[]) => void
}

export function IndustryPicker({ label = '業界', value, onChange }: Props) {
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notion/orders/industry-options')
      .then((r) => r.json())
      .then((d: { options: string[] }) => setOptions(d.options))
      .catch(() => toast.error('業界一覧の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  function toggle(name: string) {
    onChange(
      value.includes(name) ? value.filter((v) => v !== name) : [...value, name]
    )
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {loading ? (
        <p className="text-xs text-muted-foreground">読み込み中...</p>
      ) : options.length === 0 ? (
        <p className="text-xs text-muted-foreground">業界オプションが見つかりません</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border px-3 py-2">
          {options.map((name) => (
            <label
              key={name}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <Checkbox
                checked={value.includes(name)}
                onCheckedChange={() => toggle(name)}
              />
              <span className="text-sm">{name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
