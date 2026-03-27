'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Profile } from '@/types/supabase'

const schema = z.object({
  display_name: z.string().min(1, '表示名は必須です'),
  avatar_url: z.string().url('有効なURLを入力してください').or(z.literal('')).optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  profile: Profile
  email: string | null
}

export function ProfileSection({ profile: initialProfile, email }: Props) {
  const [profile, setProfile] = useState(initialProfile)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name: profile.display_name ?? '',
      avatar_url: profile.avatar_url ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
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
    </div>
  )
}
