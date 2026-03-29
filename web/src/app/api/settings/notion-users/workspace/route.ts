import { createClient } from '@/lib/supabase/server'
import { getNotionClient } from '@/lib/notion/client'
import { withRateLimit } from '@/lib/notion/rate-limit'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single<{ role: 'admin' | 'member' }>()
  return data?.role === 'admin' ? user : null
}

/** Notion ワークスペースメンバーを取得（設定画面での追加用） */
export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return new Response('Forbidden', { status: 403 })

  const notion = await getNotionClient()
  const members: { id: string; name: string; avatarUrl: string | null }[] = []
  let cursor: string | undefined

  do {
    const res = await withRateLimit(() =>
      notion.users.list({ page_size: 100, start_cursor: cursor })
    )
    for (const u of res.results) {
      if (u.type === 'person') {
        members.push({ id: u.id, name: u.name ?? u.id, avatarUrl: u.avatar_url ?? null })
      }
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  members.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  return Response.json({ members })
}
