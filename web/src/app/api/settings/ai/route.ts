import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt, decrypt } from '@/lib/crypto'

type Provider = 'openai' | 'anthropic' | 'google'

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
  const [settingsResult, keysResult] = await Promise.all([
    admin.from('system_settings').select('active_ai_provider').single(),
    admin.from('ai_api_keys').select('provider, api_key_encrypted'),
  ])

  const keyStatus: Record<Provider, boolean> = { openai: false, anthropic: false, google: false }
  for (const key of keysResult.data ?? []) {
    keyStatus[key.provider as Provider] = !!key.api_key_encrypted
  }

  return Response.json({
    activeProvider: settingsResult.data?.active_ai_provider ?? null,
    keyStatus,
  })
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) return new Response('Forbidden', { status: 403 })

  const body = await request.json() as {
    activeProvider?: Provider | null
    provider?: Provider
    apiKey?: string
  }

  const admin = createAdminClient()

  if ('activeProvider' in body) {
    await admin
      .from('system_settings')
      .update({ active_ai_provider: body.activeProvider ?? null })
      .neq('id', '00000000-0000-0000-0000-000000000000')
  }

  if (body.provider && body.apiKey?.trim()) {
    const encrypted = await encrypt(body.apiKey.trim())
    await admin
      .from('ai_api_keys')
      .upsert({ provider: body.provider, api_key_encrypted: encrypted }, { onConflict: 'provider' })
  }

  return Response.json({ ok: true })
}

// 復号して返す（将来の AI 機能連携用）
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return new Response('Forbidden', { status: 403 })

  const { provider } = await request.json() as { provider: Provider }
  const admin = createAdminClient()

  const { data } = await admin
    .from('ai_api_keys')
    .select('api_key_encrypted')
    .eq('provider', provider)
    .single()

  if (!data?.api_key_encrypted) return new Response('Not found', { status: 404 })

  const key = await decrypt(data.api_key_encrypted)
  return Response.json({ key })
}
