import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOAuthClient } from '@/lib/google/drive'
import { encrypt } from '@/lib/crypto'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings?google_error=${error ?? 'no_code'}`)
  }

  const redirectUri = `${origin}/api/auth/google/callback`

  try {
    const oauth2Client = await getOAuthClient(redirectUri)
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${origin}/settings?google_error=no_refresh_token`)
    }

    const encryptedToken = await encrypt(tokens.refresh_token)
    const admin = createAdminClient()
    const { error: dbError } = await admin
      .from('system_settings')
      .update({ google_oauth_refresh_token_encrypted: encryptedToken })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (dbError) {
      console.error('[google oauth] DB保存エラー:', dbError)
      return NextResponse.redirect(`${origin}/settings?google_error=db_error`)
    }

    return NextResponse.redirect(`${origin}/settings?google_authorized=1`)
  } catch (err) {
    console.error('[google oauth] callback エラー:', err)
    return NextResponse.redirect(`${origin}/settings?google_error=token_exchange_failed`)
  }
}
