'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { User } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

type NotionUser = {
  id: string
  name: string
  avatarUrl: string | null
}

type Props = {
  label?: string
  value: string[]
  onChange: (ids: string[]) => void
}

export function NotionUserPicker({ label = '担当者', value, onChange }: Props) {
  const [users, setUsers] = useState<NotionUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notion/users')
      .then((r) => r.json())
      .then((d: { users: NotionUser[] }) => setUsers(d.users))
      .catch(() => toast.error('ユーザー一覧の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
    )
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {loading ? (
        <p className="text-xs text-muted-foreground">読み込み中...</p>
      ) : users.length === 0 ? (
        <p className="text-xs text-muted-foreground">ユーザーが見つかりません</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border px-3 py-2">
          {users.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <Checkbox
                checked={value.includes(u.id)}
                onCheckedChange={() => toggle(u.id)}
              />
              {u.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.avatarUrl}
                  alt={u.name}
                  className="size-5 rounded-full object-cover"
                />
              ) : (
                <User className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm">{u.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
