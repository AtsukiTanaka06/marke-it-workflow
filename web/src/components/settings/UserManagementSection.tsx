'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Copy, Check, UserPlus } from 'lucide-react'
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
import type { Profile } from '@/types/supabase'

type UserWithEmail = Profile & { email: string | null }

const createSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  display_name: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>

export function UserManagementSection({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const loadUsers = useCallback(() => {
    setLoading(true)
    fetch('/api/settings/users')
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => toast.error('ユーザー一覧の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  function handleDialogOpenChange(open: boolean) {
    if (open) {
      setCreatedInfo(null)
      setCopied(false)
      reset()
    }
    setDialogOpen(open)
  }

  async function onCreateUser(values: CreateForm) {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'ユーザーの作成に失敗しました')
      return
    }
    const data = await res.json()
    setCreatedInfo(data)
    loadUsers()
  }

  async function copyPassword() {
    if (!createdInfo) return
    await navigator.clipboard.writeText(createdInfo.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <p className="text-sm text-muted-foreground mt-0.5">メンバーの追加とロール変更ができます</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger render={<Button size="sm" className="h-8 gap-1" />}>
            <UserPlus className="size-4" />
            ユーザーを追加
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {createdInfo ? 'ユーザーを作成しました' : 'ユーザーを追加'}
              </DialogTitle>
            </DialogHeader>

            {!createdInfo ? (
              <form onSubmit={handleSubmit(onCreateUser)} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="email">
                    メールアドレス <span className="text-destructive">*</span>
                  </Label>
                  <Input id="email" type="email" placeholder="user@example.com" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="display_name">表示名</Label>
                  <Input id="display_name" placeholder="山田 太郎" {...register('display_name')} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? '作成中...' : '作成'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{createdInfo.email}</span>{' '}
                  のアカウントを作成しました。以下の初期パスワードをユーザーに共有してください。
                </p>
                <div className="space-y-1.5">
                  <Label>初期パスワード</Label>
                  <div className="flex gap-2">
                    <Input value={createdInfo.password} readOnly className="font-mono text-sm" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 w-9 px-0"
                      onClick={copyPassword}
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  このパスワードは再表示できません。必ずコピーしてから閉じてください。
                </p>
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setDialogOpen(false)}>閉じる</Button>
                </div>
              </div>
            )}
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
