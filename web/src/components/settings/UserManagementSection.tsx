'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserPlus } from 'lucide-react'
import type { Profile } from '@/types/supabase'

type UserWithEmail = Profile & { email: string | null }

const inviteSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
})

export function UserManagementSection({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{ email: string }>({
    resolver: zodResolver(inviteSchema),
  })

  useEffect(() => {
    fetch('/api/settings/users')
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => toast.error('ユーザー一覧の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  async function onInvite(values: { email: string }) {
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) { toast.error('招待に失敗しました'); return }
    toast.success(`${values.email} に招待メールを送信しました`)
    setInviteOpen(false)
    reset()
  }

  async function changeRole(id: string, role: 'admin' | 'member') {
    setUpdatingId(id)
    const res = await fetch(`/api/settings/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) { toast.error('ロール変更に失敗しました'); setUpdatingId(null); return }
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u))
    toast.success('ロールを変更しました')
    setUpdatingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">ユーザー管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">メンバーの招待とロール変更ができます</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger render={<Button size="sm" className="h-8 gap-1" />}>
            <UserPlus className="size-4" />
            招待
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>ユーザーを招待</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onInvite)} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label htmlFor="email">メールアドレス</Label>
                <Input id="email" type="email" {...register('email')} placeholder="user@example.com" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? '送信中...' : '招待メールを送信'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.display_name ?? '（未設定）'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <Badge variant="outline" className={`text-xs shrink-0 ${user.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                {user.role === 'admin' ? '管理者' : 'メンバー'}
              </Badge>
              {user.id !== currentUserId && (
                <Select
                  key={`role-${user.id}-${user.role}`}
                  defaultValue={user.role}
                  onValueChange={(v) => changeRole(user.id, v as 'admin' | 'member')}
                >
                  <SelectTrigger className="h-7 w-28 text-xs" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理者に変更</SelectItem>
                    <SelectItem value="member">メンバーに変更</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {user.id === currentUserId && (
                <span className="text-xs text-muted-foreground w-28 text-center">（自分）</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
