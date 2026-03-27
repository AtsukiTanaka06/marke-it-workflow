import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listOrders, createOrder } from '@/lib/notion/orders'
import type { ListOrdersOptions } from '@/lib/notion/orders'
import type { OrderStatus, OperationStatus, CreateOrderInput } from '@/types/notion'
import { listActiveTemplates } from '@/lib/notion/task-templates'
import { createProgressTasksFromTemplates } from '@/lib/notion/progress-tasks'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = request.nextUrl
  const options: ListOrdersOptions = {
    search:          searchParams.get('search')          ?? undefined,
    status:          (searchParams.get('status')          ?? undefined) as OrderStatus | undefined,
    operationStatus: (searchParams.get('operationStatus') ?? undefined) as OperationStatus | undefined,
    industry:        searchParams.get('industry')         ?? undefined,
    cursor:          searchParams.get('cursor')           ?? undefined,
    pageSize:        Number(searchParams.get('pageSize')  ?? '20'),
  }

  const result = await listOrders(options)
  return Response.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { createWorkflow, ...orderBody } =
    await request.json() as CreateOrderInput & { createWorkflow?: boolean }

  const order = await createOrder(orderBody)

  // ワークフロー作成（失敗しても受注作成自体は成功とする）
  if (createWorkflow !== false) {
    try {
      const templates = await listActiveTemplates()
      await createProgressTasksFromTemplates(order.id, templates)
    } catch (err) {
      console.error('[workflow] 進行タスク作成エラー:', err)
    }
  }

  return Response.json(order, { status: 201 })
}
