'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/supabase'

const profileSchema = z.object({
  display_name: z.string().min(1, '表示名は必須です'),
  avatar_url: z.string().url('有効なURLを入力してください').or(z.literal('')).optional(),
})

const pwSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: z.string()
    .min(8, '8文字以上入力してください')
    .regex(/[A-Z]/, '大文字（A-Z）を1文字以上含めてください')
    .regex(/[a-z]/, '小文字（a-z）を1文字以上含めてください')
    .regex(/[0-9]/, '数字を1文字以上含めてください'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
})

type ProfileForm = z.infer<typeof profileSchema>
type PwForm = z.infer<typeof pwSchema>

type Props = {
  profile: Profile
  email: string | null
}

export function ProfileSection({ profile: initialProfile, email }: Props) {
  const [profile, setProfile] = useState(initialProfile)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile.display_name ?? '',
      avatar_url: profile.avatar_url ?? '',
    },
  })

  const {
    register: pwRegister,
    handleSubmit: pwHandleSubmit,
    reset: pwReset,
    formState: { errors: pwErrors, isSubmitting: pwSubmitting },
  } = useForm<PwForm>({ resolver: zodResolver(pwSchema) })

  async function onSubmit(values: ProfileForm) {
    const res = await fetch('/api/settings/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) { toast.error('更新に失敗しました'); return }
    const updated = await res.json()
    setProfile(updated)
    toast.success('プロフィールを更新しました')
  }

  async function onPasswordChange(values: PwForm) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email!,
      password: values.currentPassword,
    })
    if (signInError) {
      toast.error('現在のパスワードが正しくありません')
      return
    }
    const res = await fetch('/api/settings/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: values.newPassword }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'パスワード変更に失敗しました')
      return
    }
    toast.success('パスワードを変更しました')
    pwReset()
  }

  const initials = (profile.display_name ?? email ?? '?').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">プロフィール</h2>
        <p className="text-sm text-muted-foreground mt-0.5">表示名とアバターを変更できます</p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="text-sm">
          <p className="font-medium">{profile.display_name ?? '（未設定）'}</p>
          <p className="text-muted-foreground">{email}</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            役割: {profile.role === 'admin' ? '管理者' : 'メンバー'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="space-y-1">
          <Label htmlFor="display_name">表示名</Label>
          <Input id="display_name" {...register('display_name')} />
          {errors.display_name && (
            <p className="text-xs text-destructive">{errors.display_name.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="avatar_url">アバター URL</Label>
          <Input id="avatar_url" {...register('avatar_url')} placeholder="https://..." />
          {errors.avatar_url && (
            <p className="text-xs text-destructive">{errors.avatar_url.message}</p>
          )}
        </div>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : '保存'}
        </Button>
      </form>

      <Separator />

      <div>
        <h2 className="text-base font-semibold">パスワード変更</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          パスワードポリシー: 8文字以上・大文字・小文字・数字をそれぞれ1文字以上含めてください
        </p>
      </div>

      <form onSubmit={pwHandleSubmit(onPasswordChange)} className="space-y-4 max-w-md">
        <div className="space-y-1">
          <Label htmlFor="currentPassword">現在のパスワード</Label>
          <Input id="currentPassword" type="password" autoComplete="current-password" {...pwRegister('currentPassword')} />
          {pwErrors.currentPassword && (
            <p className="text-xs text-destructive">{pwErrors.currentPassword.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="newPassword">新しいパスワード</Label>
          <Input id="newPassword" type="password" autoComplete="new-password" {...pwRegister('newPassword')} />
          {pwErrors.newPassword && (
            <p className="text-xs text-destructive">{pwErrors.newPassword.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...pwRegister('confirmPassword')} />
          {pwErrors.confirmPassword && (
            <p className="text-xs text-destructive">{pwErrors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" size="sm" disabled={pwSubmitting}>
          {pwSubmitting ? '変更中...' : 'パスワードを変更'}
        </Button>
      </form>
    </div>
  )
}
