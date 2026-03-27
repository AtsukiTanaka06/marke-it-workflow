'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
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
import type { Order, OrderStatus, OperationStatus, Project } from '@/types/notion'

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

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  )

  function handleClose() {
    setOpen(false)
    reset()
    setProjectSearch('')
  }

  async function onSubmit(values: FormValues) {
    const body = {
      name:            values.name,
      projectId:       values.projectId,
      status:          (values.status as OrderStatus) || undefined,
      operationStatus: (values.operationStatus as OperationStatus) || undefined,
      amount:          values.amount ? Number(values.amount) : null,
      deadline:        values.deadline || null,
      content:         values.content ? toRichText(values.content) : undefined,
      notes:           values.notes   ? toRichText(values.notes)   : undefined,
    }

    const res = await fetch('/api/notion/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) { toast.error('作成に失敗しました'); return }

    const order: Order = await res.json()
    toast.success('受注を作成しました')
    onCreated(order)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
      <DialogTrigger render={<Button size="sm" className="h-8 gap-1" />}>
        <Plus className="size-4" />
        新規作成
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>受注を新規作成</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">

          {/* 受注項目名 */}
          <div className="space-y-1">
            <Label htmlFor="name">受注項目名 <span className="text-destructive">*</span></Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* 案件（必須） */}
          <div className="space-y-1">
            <Label>案件 <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <Input
                placeholder="絞り込み..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="h-9 w-36 shrink-0 text-sm"
              />
              <Select onValueChange={(v) => setValue('projectId', v as string, { shouldValidate: true })}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder={projects.length === 0 ? '読み込み中...' : '案件を選択...'} />
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
            </div>
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

          <div className="flex justify-end gap-2 pt-2">
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
