'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { UserManagementSection } from '@/components/settings/UserManagementSection'
import { NotionSettingsSection } from '@/components/settings/NotionSettingsSection'
import { AISettingsSection } from '@/components/settings/AISettingsSection'
import type { Profile } from '@/types/supabase'

type Tab = 'profile' | 'users' | 'notion' | 'ai'

type Props = {
  profile: Profile
  email: string | null
}

const TABS: { id: Tab; label: string; adminOnly?: boolean }[] = [
  { id: 'profile', label: 'プロフィール' },
  { id: 'users',   label: 'ユーザー管理', adminOnly: true },
  { id: 'notion',  label: 'Notion 連携',  adminOnly: true },
  { id: 'ai',      label: 'AI 設定',      adminOnly: true },
]

export function SettingsView({ profile, email }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const isAdmin = profile.role === 'admin'

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)

  return (
    <div className="flex gap-8">
      {/* サイドナビ */}
      <nav className="w-40 shrink-0">
        <ul className="space-y-0.5">
          {visibleTabs.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <Separator orientation="vertical" className="h-auto" />

      {/* コンテンツ */}
      <div className="flex-1 min-w-0">
        {activeTab === 'profile' && (
          <ProfileSection profile={profile} email={email} />
        )}
        {activeTab === 'users' && isAdmin && (
          <UserManagementSection currentUserId={profile.id} />
        )}
        {activeTab === 'notion' && isAdmin && (
          <NotionSettingsSection />
        )}
        {activeTab === 'ai' && isAdmin && (
          <AISettingsSection />
        )}
      </div>
    </div>
  )
}
