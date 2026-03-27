import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/crypto'
import { revalidateTag } from 'next/cache'

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: 'admin' | 'member' }>()

  return data?.role === 'admin'
}

export async function GET() {
  if (!(await requireAdmin())) return new Response('Forbidden', { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('system_settings')
    .select('notion_token_encrypted')
    .single()

  return Response.json({ isSet: !!data?.notion_token_encrypted })
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) return new Response('Forbidden', { status: 403 })

  const { token } = await request.json() as { token: string }
  if (!token?.trim()) return new Response('Token is required', { status: 400 })

  const encrypted = await encrypt(token.trim())

  const admin = createAdminClient()
  const { error } = await admin
    .from('system_settings')
    .update({ notion_token_encrypted: encrypted })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) return new Response(error.message, { status: 500 })

  // Next.js 16: revalidateTag requires (tag, profile) — pass empty profile to just invalidate
  revalidateTag('notion-token', {})
  return Response.json({ ok: true })
}
