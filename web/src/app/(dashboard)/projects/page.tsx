import { ProjectsView } from '@/components/projects/ProjectsView'

export const metadata = { title: '案件一覧 | MArKE-IT Workflow' }

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">案件一覧</h1>
        <p className="text-sm text-muted-foreground mt-0.5">案件の検索・管理ができます</p>
      </div>
      <ProjectsView />
    </div>
  )
}
