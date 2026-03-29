import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/crypto'

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
    .select('google_drive_template_folder_id, google_drive_work_folder_id, google_oauth_client_id, google_oauth_client_secret_encrypted, google_oauth_refresh_token_encrypted')
    .single()

  return Response.json({
    templateFolderId:   data?.google_drive_template_folder_id ?? '',
    workFolderId:       data?.google_drive_work_folder_id ?? '',
    clientId:           data?.google_oauth_client_id ?? '',
    clientSecretSet:    !!data?.google_oauth_client_secret_encrypted,
    isAuthorized:       !!data?.google_oauth_refresh_token_encrypted,
  })
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) return new Response('Forbidden', { status: 403 })

  const body = await request.json() as {
    templateFolderId?: string
    workFolderId?: string
    clientId?: string
    clientSecret?: string
    revokeAuth?: boolean
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}

  if (body.templateFolderId !== undefined) {
    updates['google_drive_template_folder_id'] = body.templateFolderId.trim() || null
  }
  if (body.workFolderId !== undefined) {
    updates['google_drive_work_folder_id'] = body.workFolderId.trim() || null
  }
  if (body.clientId !== undefined) {
    updates['google_oauth_client_id'] = body.clientId.trim() || null
  }
  if (body.clientSecret?.trim()) {
    updates['google_oauth_client_secret_encrypted'] = await encrypt(body.clientSecret.trim())
  }
  if (body.revokeAuth) {
    updates['google_oauth_refresh_token_encrypted'] = null
  }

  if (Object.keys(updates).length === 0) {
    return new Response('更新するフィールドがありません', { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('system_settings')
    .update(updates)
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) return new Response(error.message, { status: 500 })

  return Response.json({ ok: true })
}
