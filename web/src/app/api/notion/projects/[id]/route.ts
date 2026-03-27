import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProject, updateProject } from '@/lib/notion/projects'
import type { UpdateProjectInput } from '@/types/notion'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const project = await getProject(id)
  return Response.json(project)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const body = await request.json() as UpdateProjectInput
  const project = await updateProject(id, body)
  return Response.json(project)
}
