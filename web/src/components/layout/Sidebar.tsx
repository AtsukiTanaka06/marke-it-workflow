'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/projects', label: '案件一覧', icon: Briefcase },
  { href: '/orders', label: '受注一覧', icon: ShoppingCart },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="h-11 flex items-center px-5 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">MArKE-IT</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground px-3 pt-1 pb-2">
          メニュー
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <div key={href} className="relative">
              {isActive && (
                <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-sm bg-sidebar-primary" />
              )}
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon size={15} className="shrink-0" />
                {label}
              </Link>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
