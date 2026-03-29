'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Order } from '@/types/notion'
import { OrderEditForm } from './OrderEditForm'

type Tab = '受注情報' | 'コンテンツ作成'

const TABS: Tab[] = ['受注情報', 'コンテンツ作成']

type Props = {
  order: Order
}

export function OrderDetailTabs({ order }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('受注情報')

  return (
    <div className="flex flex-col gap-4">
      {/* タブナビ */}
      <div className="flex border-b">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      {activeTab === '受注情報' && (
        <div className="rounded-lg border bg-card p-6">
          <OrderEditForm order={order} />
        </div>
      )}

      {activeTab === 'コンテンツ作成' && (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          コンテンツ作成機能は今後実装予定です。
        </div>
      )}
    </div>
  )
}
