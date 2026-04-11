import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrder, updateOrder } from '@/lib/notion/orders'
import type { UpdateOrderInput } from '@/types/notion'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const order = await getOrder(id)

  // DEBUG: 実際のプロパティIDを確認するための一時コード
  const { getNotionClient } = await import('@/lib/notion/client')
  const notion = await getNotionClient()
  const page = await notion.pages.retrieve({ page_id: id }) as import('@notionhq/client/build/src/api-endpoints').PageObjectResponse
  const propIds = Object.entries(page.properties).map(([name, p]) => ({ name, id: p.id, type: p.type }))

  return Response.json({ order, _debug_propIds: propIds })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const body = await request.json() as UpdateOrderInput
  const order = await updateOrder(id, body)
  return Response.json(order)
}
