import { createClient } from '@/lib/supabase/server'
import { getNotionClient } from '@/lib/notion/client'

const ORDERS_DATA_SOURCE_ID = '1a49707a-4e5d-81ef-acaa-000b9e67f97c'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const notion = await getNotionClient()
  const ds = await notion.dataSources.retrieve({ data_source_id: ORDERS_DATA_SOURCE_ID })

  const industryProp = ds.properties['業界']

  if (!industryProp || industryProp.type !== 'multi_select') {
    return Response.json({ options: [] })
  }

  const options = industryProp.multi_select.options.map((o) => o.name)
  return Response.json({ options })
}
