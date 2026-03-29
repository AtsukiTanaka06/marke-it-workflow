// Supabase CLIで自動生成する場合: npx supabase gen types typescript --project-id bnlzclhfhvbdwycahikl > src/types/supabase.ts
// テーブル作成後に再生成すること

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          role: 'admin' | 'member'
          notion_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'member'
          notion_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'member'
          notion_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          notion_token_encrypted: string | null
          active_ai_provider: 'openai' | 'anthropic' | 'google' | null
          google_drive_template_folder_id: string | null
          google_drive_work_folder_id: string | null
          google_service_account_encrypted: string | null
          google_oauth_client_id: string | null
          google_oauth_client_secret_encrypted: string | null
          google_oauth_refresh_token_encrypted: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          notion_token_encrypted?: string | null
          active_ai_provider?: 'openai' | 'anthropic' | 'google' | null
          google_drive_template_folder_id?: string | null
          google_drive_work_folder_id?: string | null
          google_service_account_encrypted?: string | null
          google_oauth_client_id?: string | null
          google_oauth_client_secret_encrypted?: string | null
          google_oauth_refresh_token_encrypted?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          notion_token_encrypted?: string | null
          active_ai_provider?: 'openai' | 'anthropic' | 'google' | null
          google_drive_template_folder_id?: string | null
          google_drive_work_folder_id?: string | null
          google_service_account_encrypted?: string | null
          google_oauth_client_id?: string | null
          google_oauth_client_secret_encrypted?: string | null
          google_oauth_refresh_token_encrypted?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notion_users: {
        Row: {
          notion_user_id: string
          name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          notion_user_id: string
          name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          avatar_url?: string | null
        }
        Relationships: []
      }
      ai_api_keys: {
        Row: {
          id: string
          provider: 'openai' | 'anthropic' | 'google'
          api_key_encrypted: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider: 'openai' | 'anthropic' | 'google'
          api_key_encrypted: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          provider?: 'openai' | 'anthropic' | 'google'
          api_key_encrypted?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type SystemSettings = Database['public']['Tables']['system_settings']['Row']
export type AiApiKey = Database['public']['Tables']['ai_api_keys']['Row']
export type RegisteredNotionUser = Database['public']['Tables']['notion_users']['Row']
