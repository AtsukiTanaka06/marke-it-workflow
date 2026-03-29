'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useProjectFilter } from '@/store/filterStore'
import { ProjectCard } from './ProjectCard'
import { ProjectFilters } from './ProjectFilters'
import { Pagination } from './Pagination'
import type { Project, PaginatedResult } from '@/types/notion'

const ProjectCreateModal = dynamic(
  () => import('./ProjectCreateModal').then((m) => ({ default: m.ProjectCreateModal })),
  { ssr: false }
)

export function ProjectsView() {
  const { search, status, type, cursorStack, currentPage } = useProjectFilter()
  const [result, setResult] = useState<PaginatedResult<Project> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cursor = cursorStack[currentPage] ?? undefined

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search)  params.set('search', search)
      if (status)  params.set('status', status)
      if (type)    params.set('type', type)
      if (cursor)  params.set('cursor', cursor)

      const res = await fetch(`/api/notion/projects?${params}`)
      if (!res.ok) throw new Error('fetch failed')
      setResult(await res.json())
    } catch {
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [search, status, type, cursor])

  useEffect(() => { fetch_() }, [fetch_])

  function handleCreated(project: Project) {
    setResult((prev) =>
      prev ? { ...prev, items: [project, ...prev.items] } : { items: [project], nextCursor: null, hasMore: false }
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ProjectFilters />
        <ProjectCreateModal onCreated={handleCreated} />
      </div>

      {/* コンテンツ */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && result && (
        <>
          {result.items.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
              該当する案件がありません
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.items.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <Pagination hasMore={result.hasMore} nextCursor={result.nextCursor} />
          </div>
        </>
      )}
    </div>
  )
}
