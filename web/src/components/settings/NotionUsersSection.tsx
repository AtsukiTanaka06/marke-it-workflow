'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { User, Plus, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

type RegisteredUser = {
  notion_user_id: string
  name: string
  avatar_url: string | null
}

type WorkspaceMember = {
  id: string
  name: string
  avatarUrl: string | null
}

export function NotionUsersSection() {
  const [registered, setRegistered] = useState<RegisteredUser[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersLoaded, setMembersLoaded] = useState(false)

  // ゲスト手動追加フォーム
  const [guestId, setGuestId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestAdding, setGuestAdding] = useState(false)

  useEffect(() => {
    fetchRegistered()
  }, [])

  async function fetchRegistered() {
    const res = await fetch('/api/settings/notion-users')
    if (!res.ok) { toast.error('登録済みユーザーの取得に失敗しました'); return }
    const d = await res.json() as { users: RegisteredUser[] }
    setRegistered(d.users)
  }

  async function loadWorkspaceMembers() {
    setMembersLoading(true)
    const res = await fetch('/api/settings/notion-users/workspace')
    setMembersLoading(false)
    if (!res.ok) { toast.error('ワークスペースメンバーの取得に失敗しました'); return }
    const d = await res.json() as { members: WorkspaceMember[] }
    setMembers(d.members)
    setMembersLoaded(true)
  }

  async function addMember(member: WorkspaceMember) {
    const res = await fetch('/api/settings/notion-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notionUserId: member.id, name: member.name, avatarUrl: member.avatarUrl }),
    })
    if (!res.ok) { toast.error('追加に失敗しました'); return }
    toast.success(`${member.name} を追加しました`)
    await fetchRegistered()
  }

  async function addGuest() {
    if (!guestId.trim() || !guestName.trim()) return
    setGuestAdding(true)
    const res = await fetch('/api/settings/notion-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notionUserId: guestId.trim(), name: guestName.trim(), avatarUrl: null }),
    })
    setGuestAdding(false)
    if (!res.ok) { toast.error('追加に失敗しました'); return }
    toast.success(`${guestName.trim()} を追加しました`)
    setGuestId('')
    setGuestName('')
    await fetchRegistered()
  }

  async function removeUser(notionUserId: string, name: string) {
    const res = await fetch(`/api/settings/notion-users/${encodeURIComponent(notionUserId)}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('削除に失敗しました'); return }
    toast.success(`${name} を削除しました`)
    setRegistered((prev) => prev.filter((u) => u.notion_user_id !== notionUserId))
  }

  const registeredIds = new Set(registered.map((u) => u.notion_user_id))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold">Notion ユーザー管理</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          担当者ピッカーに表示するユーザーを登録します。ゲストユーザーは手動で追加できます。
        </p>
      </div>

      {/* 登録済みユーザー */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">登録済みユーザー</h3>
        {registered.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録されていません</p>
        ) : (
          <ul className="space-y-1.5">
            {registered.map((u) => (
              <li key={u.notion_user_id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt={u.name} className="size-6 rounded-full object-cover" />
                  ) : (
                    <User className="size-4 text-muted-foreground" />
                  )}
                  <div>
                    <span className="text-sm">{u.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground font-mono">{u.notion_user_id}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeUser(u.notion_user_id, u.name)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator />

      {/* ワークスペースメンバーから追加 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">ワークスペースメンバーから追加</h3>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            onClick={loadWorkspaceMembers}
            disabled={membersLoading}
          >
            <RefreshCw className={`size-3 ${membersLoading ? 'animate-spin' : ''}`} />
            {membersLoaded ? '再読み込み' : 'メンバーを取得'}
          </Button>
        </div>
        {!membersLoaded ? (
          <p className="text-sm text-muted-foreground">
            「メンバーを取得」ボタンを押すと Notion のワークスペースメンバー一覧が表示されます。
          </p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">メンバーが見つかりませんでした</p>
        ) : (
          <ul className="space-y-1.5">
            {members.map((m) => {
              const already = registeredIds.has(m.id)
              return (
                <li key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2">
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatarUrl} alt={m.name} className="size-6 rounded-full object-cover" />
                    ) : (
                      <User className="size-4 text-muted-foreground" />
                    )}
                    <div>
                      <span className="text-sm">{m.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{m.id}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={already ? 'ghost' : 'outline'}
                    className="h-7 gap-1 text-xs"
                    disabled={already}
                    onClick={() => addMember(m)}
                  >
                    <Plus className="size-3" />
                    {already ? '登録済み' : '追加'}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Separator />

      {/* ゲストユーザーを手動追加 */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">ゲストユーザーを手動追加</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            ワークスペース外のゲストは上記リストに表示されません。Notion の共有設定から確認できるユーザー ID を入力してください。
          </p>
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end max-w-lg">
          <div className="space-y-1">
            <Label className="text-xs">Notion ユーザー ID</Label>
            <Input
              value={guestId}
              onChange={(e) => setGuestId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">表示名</Label>
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="山田 太郎"
              className="h-8 text-sm"
            />
          </div>
          <Button
            size="sm"
            className="h-8 gap-1"
            disabled={!guestId.trim() || !guestName.trim() || guestAdding}
            onClick={addGuest}
          >
            <Plus className="size-3.5" />
            追加
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          ユーザー ID は Notion の「共有」→ ゲストのメールアドレスにカーソルを当てたときの URL、
          または Notion API のレスポンス（<code className="font-mono">people</code> プロパティ）から確認できます。
        </p>
      </div>
    </div>
  )
}
