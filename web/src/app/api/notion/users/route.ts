import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('notion_users')
    .select('notion_user_id, name, avatar_url')
    .order('name')

  if (error) return new Response(error.message, { status: 500 })

  const users = (data ?? []).map((u) => ({
    id: u.notion_user_id,
    name: u.name,
    avatarUrl: u.avatar_url,
  }))

  return Response.json({ users })
}
