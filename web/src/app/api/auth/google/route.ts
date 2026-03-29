import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOAuthClient } from '@/lib/google/drive'

export async function GET(request: NextRequest) {
  // admin のみ許可
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: 'admin' | 'member' }>()
  if (data?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const { origin } = new URL(request.url)
  const redirectUri = `${origin}/api/auth/google/callback`

  try {
    const oauth2Client = await getOAuthClient(redirectUri)
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // refresh_token を毎回取得するため強制
      scope: ['https://www.googleapis.com/auth/drive'],
    })
    return NextResponse.redirect(authUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    return new Response(message, { status: 500 })
  }
}
