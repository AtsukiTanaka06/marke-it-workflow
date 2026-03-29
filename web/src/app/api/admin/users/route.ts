import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const bodySchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1).optional(),
})

function generatePassword(length = 12): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const symbols = '!@#$%^&*'
  const all = upper + lower + digits + symbols

  function pick(chars: string): string {
    return chars[randomBytes(4).readUInt32BE(0) % chars.length]
  }

  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  const rest = Array.from({ length: length - 4 }, () => pick(all))
  const chars = [...required, ...rest]
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(4).readUInt32BE(0) % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: 'admin' | 'member' }>()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const result = bodySchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const password = generatePassword()
  const admin = createAdminClient()

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email: result.data.email,
    password,
    email_confirm: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (result.data.display_name && newUser.user) {
    await admin.from('profiles').update({ display_name: result.data.display_name }).eq('id', newUser.user.id)
  }

  return NextResponse.json({ email: result.data.email, password })
}
