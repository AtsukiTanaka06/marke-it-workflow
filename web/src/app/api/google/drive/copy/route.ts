import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { copyTemplateFolder } from '@/lib/google/drive'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { sourceFolderId, sourceFolderName, projectName } = await request.json() as {
    sourceFolderId: string
    sourceFolderName: string
    projectName: string
  }

  if (!sourceFolderId || !sourceFolderName || !projectName) {
    return new Response('sourceFolderId, sourceFolderName, projectName は必須です', { status: 400 })
  }

  try {
    const newFolderId = await copyTemplateFolder(sourceFolderId, sourceFolderName, projectName)
    return Response.json({ folderId: newFolderId })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    return new Response(message, { status: 500 })
  }
}
