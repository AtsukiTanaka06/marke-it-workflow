'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, FolderOpen } from 'lucide-react' // FolderOpen: Drive フォルダ選択 UI で使用
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import type { Order, OrderStatus, OperationStatus, Project } from '@/types/notion'
import { NotionUserPicker } from '@/components/notion/NotionUserPicker'
import { IndustryPicker } from '@/components/orders/IndustryPicker'

type DriveFolder = { id: string; name: string }

const schema = z.object({
  name:            z.string().min(1, '受注項目名は必須です'),
  projectId:       z.string().min(1, '案件を選択してください'),
  status:          z.string().optional(),
  operationStatus: z.string().optional(),
  amount:          z.string().optional(),
  deadline:        z.string().optional(),
  content:         z.string().optional(),
  notes:           z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const ORDER_STATUSES: OrderStatus[] = [
  '未着手', '見込み', '商談待ち', '商談済み',
  '進行中', '進行中（実績）', '完了', '完了（実績）', '失注',
]
const OPERATION_STATUSES: OperationStatus[] = ['運用中', '運用終了']

function toRichText(text: string) {
  return [{ text, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false }, href: null }]
}

type Props = {
  onCreated: (order: Order) => void
}

export function OrderCreateModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectSearch, setProjectSearch] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [createWorkflow, setCreateWorkflow] = useState(true)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([])
  const [driveFoldersLoading, setDriveFoldersLoading] = useState(false)
  const [driveFoldersError, setDriveFoldersError] = useState<string | null>(null)
  const [selectedDriveFolderId, setSelectedDriveFolderId] = useState('')
  const [docCustomerName, setDocCustomerName] = useState('')
  const [docLStepFee, setDocLStepFee] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // モーダルを開いたとき案件一覧を取得
  useEffect(() => {
    if (!open) return
    fetch('/api/notion/projects?pageSize=100')
      .then((r) => r.json())
      .then((d) => setProjects(d.items ?? []))
      .catch(() => toast.error('案件一覧の取得に失敗しました'))
  }, [open])

  // ワークフロー作成チェック時にドライブフォルダ一覧を取得
  useEffect(() => {
    if (!open || !createWorkflow) return
    if (driveFolders.length > 0) return
    setDriveFoldersLoading(true)
    fetch('/api/google/drive/folders')
      .then((r) => {
        if (!r.ok) return r.text().then((t) => { throw new Error(t) })
        return r.json()
      })
      .then((d: { folders: DriveFolder[] }) => setDriveFolders(d.folders))
      .catch((err: Error) => {
        setDriveFoldersError(err.message)
        console.warn('[drive] フォルダ一覧取得失敗:', err.message)
      })
      .finally(() => setDriveFoldersLoading(false))
  }, [open, createWorkflow, driveFolders.length])

  // 検索で絞り込みつつ、選択中の案件は常にリストに含める
  const baseFiltered = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  )
  const filteredProjects =
    selectedProjectId && !baseFiltered.some((p) => p.id === selectedProjectId)
      ? [projects.find((p) => p.id === selectedProjectId)!, ...baseFiltered].filter(Boolean)
      : baseFiltered

  function handleClose() {
    if (progressTimer.current) clearInterval(progressTimer.current)
    setOpen(false)
    reset()
    setProjectSearch('')
    setSelectedProjectId('')
    setCreateWorkflow(true)
    setSelectedDriveFolderId('')
    setDriveFolders([])
    setDriveFoldersError(null)
    setAssigneeIds([])
    setSelectedIndustries([])
    setDocCustomerName('')
    setDocLStepFee('')
    setProgress(0)
    setProgressLabel('')
  }

  async function onSubmit(values: FormValues) {
    const selectedFolder = driveFolders.find((f) => f.id === selectedDriveFolderId)
    const hasDrive = !!selectedFolder
    const hasWorkflow = createWorkflow

    // プログレスバー開始
    const steps = [
      { target: 35, label: '受注をNotionに登録中...' },
      ...(hasWorkflow ? [{ target: 65, label: 'ワークフローを準備中...' }] : []),
      ...(hasDrive    ? [{ target: 90, label: 'Google Driveにコピー中...' }] : []),
    ]
    let stepIndex = 0
    let current = 0
    setProgress(0)
    setProgressLabel(steps[0].label)

    progressTimer.current = setInterval(() => {
      const ceiling = steps[stepIndex]?.target ?? 90
      if (current < ceiling) {
        current = Math.min(current + 2, ceiling)
        setProgress(current)
      } else if (stepIndex < steps.length - 1) {
        stepIndex++
        setProgressLabel(steps[stepIndex].label)
      }
    }, 80)

    try {
      const body = {
        name:            values.name,
        projectId:       values.projectId,
        status:          (values.status as OrderStatus) || undefined,
        operationStatus: (values.operationStatus as OperationStatus) || undefined,
        amount:          values.amount ? Number(values.amount) : null,
        deadline:        values.deadline || null,
        content:         values.content ? toRichText(values.content) : undefined,
        notes:           values.notes   ? toRichText(values.notes)   : undefined,
        industry:        selectedIndustries.length > 0 ? selectedIndustries : undefined,
        assigneeIds:     assigneeIds.length > 0 ? assigneeIds : undefined,
        createWorkflow,
        // Drive フォルダ選択時はサーバー側でコピー → GoogleドライブURL に書き込み
        ...(selectedFolder ? {
          driveFolderId:   selectedFolder.id,
          driveFolderName: selectedFolder.name,
          docReplacements: {
            ...(docCustomerName ? { '{{顧客名}}': docCustomerName } : {}),
            ...(docLStepFee     ? { '{{LStep構築費用}}': docLStepFee } : {}),
          },
        } : {}),
      }

      const res = await fetch('/api/notion/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (progressTimer.current) clearInterval(progressTimer.current)

      if (!res.ok) {
        setProgress(0)
        setProgressLabel('')
        toast.error('作成に失敗しました')
        return
      }

      setProgress(100)
      setProgressLabel('完了！')

      const order: Order = await res.json()
      toast.success('受注を作成しました')
      onCreated(order)
      setTimeout(handleClose, 400)
    } catch {
      if (progressTimer.current) clearInterval(progressTimer.current)
      setProgress(0)
      setProgressLabel('')
      toast.error('作成に失敗しました')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
      <DialogTrigger render={<Button size="sm" className="h-8 gap-1" />}>
        <Plus className="size-4" />
        新規作成
      </DialogTrigger>
      <DialogContent className="w-[90vw] sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>受注を新規作成</DialogTitle>
          {progress > 0 && (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progressLabel}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 relative">
          {isSubmitting && (
            <div className="absolute inset-0 z-10 bg-background/60 rounded-md" />
          )}
        <div className="space-y-4 pt-2 overflow-y-auto flex-1 pr-1">

          {/* 受注項目名 */}
          <div className="space-y-1">
            <Label htmlFor="name">受注項目名 <span className="text-destructive">*</span></Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* 案件（必須） */}
          <div className="space-y-1">
            <Label>案件 <span className="text-destructive">*</span></Label>
            <Input
              placeholder="絞り込み..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="h-9 text-sm"
            />
            <Select
              value={selectedProjectId}
              onValueChange={(v) => {
                const id = v as string
                setSelectedProjectId(id)
                setValue('projectId', id, { shouldValidate: true })
                const project = projects.find((p) => p.id === id)
                if (project) setDocCustomerName(project.name)
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(v: unknown) => {
                    const id = v as string
                    if (!id) return projects.length === 0 ? '読み込み中...' : '案件を選択...'
                    return projects.find((p) => p.id === id)?.name ?? id
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {filteredProjects.length === 0 && (
                  <div className="py-2 px-3 text-xs text-muted-foreground">
                    {projects.length === 0 ? '読み込み中...' : '一致する案件がありません'}
                  </div>
                )}
                {filteredProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.projectId && <p className="text-xs text-destructive">{errors.projectId.message}</p>}
          </div>

          {/* 進捗・運用進捗 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>進捗</Label>
              <Select onValueChange={(v) => setValue('status', v as string)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="選択..." />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>運用進捗</Label>
              <Select onValueChange={(v) => setValue('operationStatus', v as string)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="選択..." />
                </SelectTrigger>
                <SelectContent>
                  {OPERATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 金額・期限 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount">受注金額</Label>
              <Input id="amount" type="number" min="0" {...register('amount')} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deadline">期限</Label>
              <Input id="deadline" type="date" {...register('deadline')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="content">受注内容</Label>
            <Textarea id="content" rows={3} {...register('content')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">備考</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          <IndustryPicker value={selectedIndustries} onChange={setSelectedIndustries} />

          <NotionUserPicker value={assigneeIds} onChange={setAssigneeIds} />

          <Separator />

          {/* ワークフロー作成オプション */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="createWorkflow"
              checked={createWorkflow}
              onCheckedChange={(v: boolean | 'indeterminate') => setCreateWorkflow(v === true)}
            />
            <Label htmlFor="createWorkflow" className="cursor-pointer font-normal">
              ワークフローを作成する（タスクテンプレから進行タスクを登録）
            </Label>
          </div>

          {/* Drive フォルダ選択（ワークフロー作成時のみ表示） */}
          {createWorkflow && (
            <div className="space-y-1 pl-6">
              <Label className="flex items-center gap-1.5">
                <FolderOpen className="size-3.5" />
                テンプレートフォルダ（任意）
              </Label>
              {driveFoldersLoading ? (
                <p className="text-xs text-muted-foreground">フォルダ一覧を読み込み中...</p>
              ) : driveFoldersError ? (
                <p className="text-xs text-destructive">
                  エラー: {driveFoldersError}
                </p>
              ) : driveFolders.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  フォルダが見つかりませんでした（テンプレートドライブが空か、アクセス権がない可能性があります）
                </p>
              ) : (
                <Select
                  value={selectedDriveFolderId}
                  onValueChange={(v) => setSelectedDriveFolderId(v as string)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue>
                      {(v: unknown) => {
                        const id = v as string
                        if (!id) return 'フォルダを選択（省略可）'
                        return driveFolders.find((f) => f.id === id)?.name ?? id
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {driveFolders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                選択したフォルダが作業ドライブにコピーされます
              </p>
            </div>
          )}

          {/* ドキュメント差し込みフィールド（フォルダ選択時のみ） */}
          {createWorkflow && selectedDriveFolderId && (
            <div className="pl-6 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                ドキュメント内の差し込み内容
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="docCustomerName" className="text-xs">
                    {'{{顧客名}}'}
                  </Label>
                  <Input
                    id="docCustomerName"
                    value={docCustomerName}
                    onChange={(e) => setDocCustomerName(e.target.value)}
                    placeholder="案件名が自動入力されます"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="docLStepFee" className="text-xs">
                    {'{{LStep構築費用}}'}
                  </Label>
                  <Input
                    id="docLStepFee"
                    value={docLStepFee}
                    onChange={(e) => setDocLStepFee(e.target.value)}
                    placeholder="例: 100,000円"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Google ドキュメント内の該当プレースホルダーを上記の値に置き換えます
              </p>
            </div>
          )}

          </div>{/* end scrollable area */}
          <div className="flex justify-end gap-2 pt-3 shrink-0 border-t mt-3">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              キャンセル
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? '作成中...' : '作成'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
