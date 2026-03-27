'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  token: z.string().min(1, 'Notion トークンを入力してください'),
})

export function NotionSettingsSection() {
  const [isSet, setIsSet] = useState<boolean | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ token: string }>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    fetch('/api/settings/notion')
      .then((r) => r.json())
      .then((d) => setIsSet(d.isSet))
      .catch(() => toast.error('設定の取得に失敗しました'))
  }, [])

  async function onSubmit(values: { token: string }) {
    const res = await fetch('/api/settings/notion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: values.token }),
    })
    if (!res.ok) { toast.error('保存に失敗しました'); return }
    toast.success('Notion トークンを保存しました')
    setIsSet(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Notion 連携</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Notion Integration トークンを設定します。Notion の「設定 → 連携機能」から取得できます。
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm">現在の状態:</span>
        {isSet === null ? (
          <span className="text-sm text-muted-foreground">確認中...</span>
        ) : isSet ? (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle2 className="size-4" /> 設定済み
          </span>
        ) : (
          <span className="flex items-center gap-1 text-sm text-destructive">
            <XCircle className="size-4" /> 未設定
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="space-y-1">
          <Label htmlFor="token">
            Notion Integration トークン
            {isSet && <span className="ml-2 text-xs text-muted-foreground">（上書き更新）</span>}
          </Label>
          <Input
            id="token"
            type="password"
            {...register('token')}
            placeholder="secret_..."
            autoComplete="off"
          />
          {errors.token && <p className="text-xs text-destructive">{errors.token.message}</p>}
        </div>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : '保存'}
        </Button>
      </form>
    </div>
  )
}
