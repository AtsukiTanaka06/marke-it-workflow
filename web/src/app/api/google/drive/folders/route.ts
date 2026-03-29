import { createClient } from '@/lib/supabase/server'
import { listTemplateFolders } from '@/lib/google/drive'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  try {
    const folders = await listTemplateFolders()
    return Response.json({ folders })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    return new Response(message, { status: 500 })
  }
}
