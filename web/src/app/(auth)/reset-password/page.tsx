'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const resetSchema = z
  .object({
    password: z.string()
      .min(8, '8文字以上入力してください')
      .regex(/[A-Z]/, '大文字（A-Z）を1文字以上含めてください')
      .regex(/[a-z]/, '小文字（a-z）を1文字以上含めてください')
      .regex(/[0-9]/, '数字を1文字以上含めてください'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  })

type ResetForm = z.infer<typeof resetSchema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(true)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (!tokenHash || type !== 'recovery') {
      setServerError('パスワードリセットリンクが正しくありません')
      setVerifying(false)
      return
    }

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      .then(({ error }) => {
        if (error) setServerError('リンクが無効または期限切れです。再度お試しください。')
        setVerifying(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(data: ResetForm) {
    setServerError(null)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      setServerError('パスワードのリセットに失敗しました')
      return
    }
    router.push('/projects')
    router.refresh()
  }

  if (verifying) {
    return <p className="text-muted-foreground text-sm">確認中...</p>
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>新しいパスワードの設定</CardTitle>
        <CardDescription>新しいパスワードを入力してください</CardDescription>
      </CardHeader>
      <CardContent>
        {serverError ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">{serverError}</p>
            <Link href="/forgot-password">
              <Button variant="outline" className="w-full">再度リセットメールを送信する</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">新しいパスワード</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                className="h-9 bg-white"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                8文字以上・大文字・小文字・数字を含む
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="h-9 bg-white"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full h-9" disabled={isSubmitting}>
              {isSubmitting ? '設定中...' : 'パスワードを設定する'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">読み込み中...</p>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
