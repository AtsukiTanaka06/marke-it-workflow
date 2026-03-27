import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listProjects, createProject } from '@/lib/notion/projects'
import type { ListProjectsOptions } from '@/lib/notion/projects'
import type { ProjectStatus, ProjectType, CreateProjectInput } from '@/types/notion'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = request.nextUrl
  const options: ListProjectsOptions = {
    search: searchParams.get('search') ?? undefined,
    status: (searchParams.get('status') ?? undefined) as ProjectStatus | undefined,
    type: (searchParams.get('type') ?? undefined) as ProjectType | undefined,
    industry: searchParams.get('industry') ?? undefined,
    cursor: searchParams.get('cursor') ?? undefined,
    pageSize: Number(searchParams.get('pageSize') ?? '20'),
  }

  const result = await listProjects(options)
  return Response.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await request.json() as CreateProjectInput
  const project = await createProject(body)
  return Response.json(project, { status: 201 })
}
