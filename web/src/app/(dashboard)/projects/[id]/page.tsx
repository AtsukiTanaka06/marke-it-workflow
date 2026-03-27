import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getProject } from '@/lib/notion/projects'
import { ProjectEditForm } from './ProjectEditForm'
import type { ProjectStatus } from '@/types/notion'

const STATUS_STYLES: Record<ProjectStatus, string> = {
  '見込み':   'bg-blue-100 text-blue-700 border-blue-200',
  '進行中':   'bg-amber-100 text-amber-700 border-amber-200',
  '契約':     'bg-emerald-100 text-emerald-700 border-emerald-200',
  '運用中':   'bg-teal-100 text-teal-700 border-teal-200',
  '納品済み': 'bg-slate-100 text-slate-600 border-slate-200',
}

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  try {
    const project = await getProject(id)
    return { title: `${project.name} | MArKE-IT Workflow` }
  } catch {
    return { title: '案件詳細 | MArKE-IT Workflow' }
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params

  let project
  try {
    project = await getProject(id)
  } catch {
    notFound()
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* パンくず */}
      <div className="flex items-center gap-2">
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          案件一覧
        </Link>
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="size-3" />
            Notionで開く
          </a>
        )}
      </div>

      {/* ヘッダー */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">{project.name || '（無題）'}</h1>
          {project.progress && (
            <p className="text-sm text-muted-foreground mt-0.5">{project.progress}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {project.status && (
            <Badge variant="outline" className={`text-xs ${STATUS_STYLES[project.status]}`}>
              {project.status}
            </Badge>
          )}
          {project.type && (
            <Badge variant="outline" className="text-xs">
              {project.type}
            </Badge>
          )}
        </div>
      </div>

      {/* 編集フォーム */}
      <div className="rounded-lg border bg-card p-6">
        <ProjectEditForm project={project} />
      </div>
    </div>
  )
}
