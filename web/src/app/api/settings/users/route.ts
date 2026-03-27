import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/types/supabase'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: 'admin' | 'member' }>()

  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at')

  const adminClient = createAdminClient()
  const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 100 })
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? null]))

  const result = (profiles as Profile[] ?? []).map((p) => ({
    ...p,
    email: emailMap.get(p.id) ?? null,
  }))

  return Response.json(result)
}
