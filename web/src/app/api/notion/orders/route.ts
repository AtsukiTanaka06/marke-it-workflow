import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listOrders, createOrder } from '@/lib/notion/orders'
import type { ListOrdersOptions } from '@/lib/notion/orders'
import type { OrderStatus, OperationStatus, CreateOrderInput } from '@/types/notion'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = request.nextUrl
  const options: ListOrdersOptions = {
    search: searchParams.get('search') ?? undefined,
    status: (searchParams.get('status') ?? undefined) as OrderStatus | undefined,
    operationStatus: (searchParams.get('operationStatus') ?? undefined) as OperationStatus | undefined,
    industry: searchParams.get('industry') ?? undefined,
    cursor: searchParams.get('cursor') ?? undefined,
    pageSize: Number(searchParams.get('pageSize') ?? '20'),
  }

  const result = await listOrders(options)
  return Response.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await request.json() as CreateOrderInput
  const order = await createOrder(body)
  return Response.json(order, { status: 201 })
}
