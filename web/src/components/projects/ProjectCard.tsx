'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Project, ProjectStatus } from '@/types/notion'

const STATUS_STYLES: Record<ProjectStatus, string> = {
  '見込み':   'bg-blue-100 text-blue-700 border-blue-200',
  '進行中':   'bg-amber-100 text-amber-700 border-amber-200',
  '契約':     'bg-emerald-100 text-emerald-700 border-emerald-200',
  '運用中':   'bg-teal-100 text-teal-700 border-teal-200',
  '納品済み': 'bg-slate-100 text-slate-600 border-slate-200',
}

function fmt(n: number | null) {
  if (n == null) return null
  return n.toLocaleString('ja-JP') + '円'
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <Card className="h-full border border-border transition-shadow group-hover:shadow-md group-hover:border-primary/30">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {project.name || '（無題）'}
            </p>
            {project.status && (
              <Badge
                variant="outline"
                className={`shrink-0 text-[11px] px-1.5 py-0 ${STATUS_STYLES[project.status]}`}
              >
                {project.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1.5">
          {project.type && (
            <p className="text-xs text-muted-foreground">{project.type}</p>
          )}
          {project.industry.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.industry.map((ind) => (
                <span key={ind} className="text-[11px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                  {ind}
                </span>
              ))}
            </div>
          )}
          {(project.initialCost != null || project.monthlyCost != null) && (
            <div className="text-xs text-muted-foreground space-x-3">
              {project.initialCost != null && (
                <span>初期: {fmt(project.initialCost)}</span>
              )}
              {project.monthlyCost != null && (
                <span>月額: {fmt(project.monthlyCost)}</span>
              )}
            </div>
          )}
          {project.deadline && (
            <p className="text-xs text-muted-foreground">
              期限: {project.deadline}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
