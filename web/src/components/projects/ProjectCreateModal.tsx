'use client'

import { useState } from 'react'
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
import type { Project, ProjectStatus, ProjectType } from '@/types/notion'

const schema = z.object({
  name: z.string().min(1, '案件名は必須です'),
  status: z.string().optional(),
  type: z.string().optional(),
  deadline: z.string().optional(),
  initialCost: z.string().optional(),
  monthlyCost: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const STATUSES: ProjectStatus[] = ['見込み', '進行中', '契約', '運用中', '納品済み']
const TYPES: ProjectType[] = ['個人', '企業']

type Props = {
  onCreated: (project: Project) => void
}

export function ProjectCreateModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    const body = {
      name: values.name,
      status: (values.status as ProjectStatus) || undefined,
      type: (values.type as ProjectType) || undefined,
      deadline: values.deadline || null,
      initialCost: values.initialCost ? Number(values.initialCost) : null,
      monthlyCost: values.monthlyCost ? Number(values.monthlyCost) : null,
      notes: values.notes
        ? [{ text: values.notes, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false }, href: null }]
        : undefined,
    }

    const res = await fetch('/api/notion/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      toast.error('作成に失敗しました')
      return
    }

    const project: Project = await res.json()
    toast.success('案件を作成しました')
    onCreated(project)
    setOpen(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* base-ui の DialogTrigger は render prop でカスタム要素を指定する */}
      <DialogTrigger render={<Button size="sm" className="h-8 gap-1" />}>
        <Plus className="size-4" />
        新規作成
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>案件を新規作成</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
        <div className="space-y-4 pt-2 overflow-y-auto flex-1 pr-1">
          <div className="space-y-1">
            <Label htmlFor="name">案件名 <span className="text-destructive">*</span></Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>進捗状況</Label>
              <Select onValueChange={(v) => setValue('status', v as string)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="選択..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>種別</Label>
              <Select onValueChange={(v) => setValue('type', v as string)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="選択..." />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="initialCost">初期費用</Label>
              <Input id="initialCost" type="number" min="0" {...register('initialCost')} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="monthlyCost">月額費用</Label>
              <Input id="monthlyCost" type="number" min="0" {...register('monthlyCost')} placeholder="0" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="deadline">期限</Label>
            <Input id="deadline" type="date" {...register('deadline')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">特記</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>

          </div>{/* end scrollable area */}
          <div className="flex justify-end gap-2 pt-3 shrink-0 border-t mt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => { setOpen(false); reset() }}>
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
