import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: 'admin' | 'member' }>()

  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const { id } = await params
  if (id === user.id) return new Response('自分自身は削除できません', { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return new Response(error.message, { status: 500 })

  return new Response(null, { status: 204 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: 'admin' | 'member' }>()

  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const { id } = await params
  const body = await request.json() as { role: 'admin' | 'member' }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: body.role })
    .eq('id', id)
    .select()
    .single()

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data)
}
