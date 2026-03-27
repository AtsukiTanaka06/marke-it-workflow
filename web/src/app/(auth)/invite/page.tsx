'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const inviteSchema = z
  .object({
    password: z.string().min(8, 'パスワードは8文字以上入力してください'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  })

type InviteForm = z.infer<typeof inviteSchema>

function InviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(true)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  })

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (!tokenHash || type !== 'invite') {
      setServerError('招待リンクが正しくありません')
      setVerifying(false)
      return
    }

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'invite' })
      .then(({ error }) => {
        if (error) setServerError('招待リンクが無効または期限切れです')
        setVerifying(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(data: InviteForm) {
    setServerError(null)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      setServerError('パスワードの設定に失敗しました')
      return
    }
    router.push('/projects')
    router.refresh()
  }

  if (verifying) {
    return <p className="text-muted-foreground text-sm">招待を確認中...</p>
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>パスワード設定</CardTitle>
        <CardDescription>新しいパスワードを設定してください</CardDescription>
      </CardHeader>
      <CardContent>
        {serverError ? (
          <p className="text-sm text-destructive">{serverError}</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">パスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? '設定中...' : 'パスワードを設定する'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">読み込み中...</p>}>
      <InviteForm />
    </Suspense>
  )
}
