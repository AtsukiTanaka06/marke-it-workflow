'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Provider = 'openai' | 'anthropic' | 'google'

const PROVIDERS: { value: Provider; label: string; placeholder: string }[] = [
  { value: 'openai',    label: 'OpenAI',    placeholder: 'sk-...' },
  { value: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { value: 'google',    label: 'Google',    placeholder: 'AIza...' },
]

type State = {
  activeProvider: Provider | null
  keyStatus: Record<Provider, boolean>
}

export function AISettingsSection() {
  const [state, setState] = useState<State | null>(null)
  const [keyInputs, setKeyInputs] = useState<Partial<Record<Provider, string>>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/ai')
      .then((r) => r.json())
      .then(setState)
      .catch(() => toast.error('設定の取得に失敗しました'))
  }, [])

  async function saveProvider(provider: Provider | null) {
    const res = await fetch('/api/settings/ai', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeProvider: provider }),
    })
    if (!res.ok) { toast.error('保存に失敗しました'); return }
    setState((prev) => prev ? { ...prev, activeProvider: provider } : prev)
    toast.success('アクティブプロバイダーを変更しました')
  }

  async function saveKey(provider: Provider) {
    const apiKey = keyInputs[provider]?.trim()
    if (!apiKey) return
    setSaving(provider)
    const res = await fetch('/api/settings/ai', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey }),
    })
    setSaving(null)
    if (!res.ok) { toast.error('保存に失敗しました'); return }
    setState((prev) => prev ? { ...prev, keyStatus: { ...prev.keyStatus, [provider]: true } } : prev)
    setKeyInputs((prev) => ({ ...prev, [provider]: '' }))
    toast.success(`${provider} のAPIキーを保存しました`)
  }

  if (!state) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="h-24 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">AI 設定</h2>
        <p className="text-sm text-muted-foreground mt-0.5">使用する AI プロバイダーと API キーを設定します</p>
      </div>

      {/* アクティブプロバイダー */}
      <div className="space-y-2 max-w-md">
        <Label>アクティブプロバイダー</Label>
        <Select
          key={`active-${state.activeProvider}`}
          defaultValue={state.activeProvider ?? undefined}
          onValueChange={(v) => saveProvider(v as Provider)}
        >
          <SelectTrigger>
            <SelectValue placeholder="プロバイダーを選択..." />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 各プロバイダーのAPIキー */}
      <div className="space-y-4 max-w-md">
        <Label>API キー</Label>
        {PROVIDERS.map((p) => (
          <div key={p.value} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{p.label}</span>
              {state.keyStatus[p.value] && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="size-3" /> 設定済み
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={keyInputs[p.value] ?? ''}
                onChange={(e) => setKeyInputs((prev) => ({ ...prev, [p.value]: e.target.value }))}
                placeholder={state.keyStatus[p.value] ? '（上書き更新）' : p.placeholder}
                autoComplete="off"
                className="text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!keyInputs[p.value]?.trim() || saving === p.value}
                onClick={() => saveKey(p.value)}
              >
                {saving === p.value ? '...' : '保存'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
