import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single<{ role: 'admin' | 'member' }>()
  return data?.role === 'admin' ? user : null
}

/** ユーザーを削除（[id] = notion_user_id） */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAdmin()
  if (!adminUser) return new Response('Forbidden', { status: 403 })

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin
    .from('notion_users')
    .delete()
    .eq('notion_user_id', decodeURIComponent(id))

  if (error) return new Response(error.message, { status: 500 })
  return new Response(null, { status: 204 })
}
