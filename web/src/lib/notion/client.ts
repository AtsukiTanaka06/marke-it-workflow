import { Client } from '@notionhq/client'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'

// Notion Token は Supabase system_settings に暗号化保存されている
// Admin Client で取得し復号する（cookiesが不要なのでunstable_cacheと相性が良い）
const getNotionToken = unstable_cache(
  async (): Promise<string> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('system_settings')
      .select('notion_token_encrypted')
      .single<{ notion_token_encrypted: string | null }>()

    if (!data?.notion_token_encrypted) {
      throw new Error('NOTION_TOKEN_NOT_SET')
    }

    return decrypt(data.notion_token_encrypted)
  },
  ['notion-token'],
  { tags: ['notion-token'], revalidate: 3600 }
)

export async function getNotionClient(): Promise<Client> {
  const token = await getNotionToken()
  return new Client({ auth: token })
}
