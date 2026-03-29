'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

type FormValues = {
  templateFolderId: string
  workFolderId: string
  clientId: string
  clientSecret: string
}

type Settings = {
  templateFolderId: string
  workFolderId: string
  clientId: string
  clientSecretSet: boolean
  isAuthorized: boolean
}

export function GoogleDriveSection() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const searchParams = useSearchParams()

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { templateFolderId: '', workFolderId: '', clientId: '', clientSecret: '' },
  })

  const fetchSettings = useCallback(() => {
    fetch('/api/settings/google')
      .then((r) => r.json())
      .then((d: Settings) => {
        setSettings(d)
        reset({
          templateFolderId: d.templateFolderId,
          workFolderId: d.workFolderId,
          clientId: d.clientId,
          clientSecret: '',
        })
      })
      .catch(() => toast.error('設定の取得に失敗しました'))
  }, [reset])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  // OAuth コールバック後のリダイレクト結果を検知
  useEffect(() => {
    if (searchParams.get('google_authorized') === '1') {
      toast.success('Google アカウントの認可が完了しました')
      fetchSettings()
    }
    const googleError = searchParams.get('google_error')
    if (googleError) {
      const messages: Record<string, string> = {
        no_refresh_token: 'リフレッシュトークンが取得できませんでした。再度認可してください。',
        token_exchange_failed: 'トークン交換に失敗しました。クライアント ID / シークレットを確認してください。',
        db_error: 'DB への保存に失敗しました。',
      }
      toast.error(messages[googleError] ?? `認可エラー: ${googleError}`)
    }
  }, [searchParams, fetchSettings])

  async function onSubmit(values: FormValues) {
    const body: Record<string, string> = {
      templateFolderId: values.templateFolderId,
      workFolderId: values.workFolderId,
      clientId: values.clientId,
    }
    if (values.clientSecret.trim()) body.clientSecret = values.clientSecret.trim()

    const res = await fetch('/api/settings/google', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) { toast.error(await res.text() || '保存に失敗しました'); return }

    toast.success('設定を保存しました')
    fetchSettings()
  }

  async function revokeAuth() {
    const res = await fetch('/api/settings/google', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revokeAuth: true }),
    })
    if (!res.ok) { toast.error('取り消しに失敗しました'); return }
    toast.success('Google アカウントの認可を取り消しました')
    fetchSettings()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Google Drive 連携</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          テンプレートドライブと作業ドライブのフォルダ ID、OAuth クライアント情報を設定します。
        </p>
      </div>

      {/* 認可状態 */}
      <div className="flex items-center gap-3">
        <span className="text-sm">Google アカウント認可:</span>
        {settings === null ? (
          <span className="text-sm text-muted-foreground">確認中...</span>
        ) : settings.isAuthorized ? (
          <>
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <CheckCircle2 className="size-4" /> 認可済み
            </span>
            <Button variant="outline" size="sm" onClick={revokeAuth} className="h-7 text-xs">
              取り消す
            </Button>
          </>
        ) : (
          <span className="flex items-center gap-1 text-sm text-destructive">
            <XCircle className="size-4" /> 未認可
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">

        {/* フォルダ ID */}
        <div className="space-y-1">
          <Label htmlFor="templateFolderId">テンプレートドライブ フォルダ ID</Label>
          <Input id="templateFolderId" {...register('templateFolderId')} placeholder="Google Drive フォルダ ID" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="workFolderId">作業ドライブ フォルダ ID</Label>
          <Input id="workFolderId" {...register('workFolderId')} placeholder="Google Drive フォルダ ID" />
        </div>

        <Separator />

        {/* OAuth クライアント */}
        <p className="text-xs text-muted-foreground">
          Google Cloud Console → 「認証情報」→「OAuth 2.0 クライアント ID」から取得してください。
          リダイレクト URI に <code className="bg-muted px-1 rounded">http://localhost:3000/api/auth/google/callback</code> を追加してください。
        </p>
        <div className="space-y-1">
          <Label htmlFor="clientId">クライアント ID</Label>
          <Input id="clientId" {...register('clientId')} placeholder="xxxx.apps.googleusercontent.com" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="clientSecret">
            クライアント シークレット
            {settings?.clientSecretSet && (
              <span className="ml-2 text-xs text-muted-foreground">（上書き更新）</span>
            )}
          </Label>
          <Input
            id="clientSecret"
            type="password"
            {...register('clientSecret')}
            placeholder={settings?.clientSecretSet ? '••••••••' : 'GOCSPX-...'}
            autoComplete="off"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>

          {/* 認可ボタン（クライアント ID が設定済みのとき有効） */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!settings?.clientId && !settings?.clientSecretSet}
            onClick={() => { window.location.href = '/api/auth/google' }}
            className="gap-1.5"
          >
            <ExternalLink className="size-3.5" />
            Google アカウントで認可
          </Button>
        </div>
      </form>
    </div>
  )
}
