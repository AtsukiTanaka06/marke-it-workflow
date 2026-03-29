import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const newPasswordSchema = z.string()
  .min(8, '8文字以上入力してください')
  .regex(/[A-Z]/, '大文字（A-Z）を1文字以上含めてください')
  .regex(/[a-z]/, '小文字（a-z）を1文字以上含めてください')
  .regex(/[0-9]/, '数字を1文字以上含めてください')

const bodySchema = z.object({
  newPassword: newPasswordSchema,
})

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const result = bodySchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { error } = await supabase.auth.updateUser({ password: result.data.newPassword })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
