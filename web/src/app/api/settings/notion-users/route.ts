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

/** 登録済みユーザー一覧 */
export async function GET() {
  const user = await requireAdmin()
  if (!user) return new Response('Forbidden', { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('notion_users')
    .select('*')
    .order('name')

  if (error) return new Response(error.message, { status: 500 })
  return Response.json({ users: data ?? [] })
}

/** ユーザーを追加 */
export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin()
  if (!adminUser) return new Response('Forbidden', { status: 403 })

  const { notionUserId, name, avatarUrl } = await request.json() as {
    notionUserId: string
    name: string
    avatarUrl: string | null
  }
  if (!notionUserId?.trim() || !name?.trim()) {
    return new Response('notionUserId and name are required', { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('notion_users')
    .upsert({ notion_user_id: notionUserId.trim(), name: name.trim(), avatar_url: avatarUrl ?? null },
             { onConflict: 'notion_user_id' })
    .select()
    .single()

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data, { status: 201 })
}
