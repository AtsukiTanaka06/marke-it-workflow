'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import type { Project, ProjectStatus, ProjectType } from '@/types/notion'

const schema = z.object({
  name: z.string().min(1, '案件名は必須です'),
  status: z.string().optional(),
  type: z.string().optional(),
  deadline: z.string().optional(),
  initialCost: z.string().optional(),
  monthlyCost: z.string().optional(),
  notes: z.string().optional(),
  contractContent: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const STATUSES: ProjectStatus[] = ['見込み', '進行中', '契約', '運用中', '納品済み']
const TYPES: ProjectType[] = ['個人', '企業']

function richToPlain(items: { text: string }[]): string {
  return items.map((i) => i.text).join('')
}

export function ProjectEditForm({ project }: { project: Project }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project.name,
      status: project.status ?? '',
      type: project.type ?? '',
      deadline: project.deadline ?? '',
      initialCost: project.initialCost != null ? String(project.initialCost) : '',
      monthlyCost: project.monthlyCost != null ? String(project.monthlyCost) : '',
      notes: richToPlain(project.notes),
      contractContent: richToPlain(project.contractContent),
    },
  })

  async function onSubmit(values: FormValues) {
    setSaving(true)
    try {
      const body = {
        name: values.name,
        status: (values.status as ProjectStatus) || undefined,
        type: (values.type as ProjectType) || undefined,
        deadline: values.deadline || null,
        initialCost: values.initialCost ? Number(values.initialCost) : null,
        monthlyCost: values.monthlyCost ? Number(values.monthlyCost) : null,
        notes: values.notes
          ? [{ text: values.notes, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false }, href: null }]
          : [],
        contractContent: values.contractContent
          ? [{ text: values.contractContent, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false }, href: null }]
          : [],
      }

      const res = await fetch(`/api/notion/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('update failed')
      toast.success('保存しました')
      router.refresh()
    } catch {
      toast.error('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1">
        <Label htmlFor="name">案件名 <span className="text-destructive">*</span></Label>
        <Input id="name" {...register('name')} className="text-base font-medium" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <Separator />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>進捗状況</Label>
          <Select
            key={`status-${project.id}`}
            defaultValue={project.status ?? undefined}
            onValueChange={(v) => setValue('status', (v as string) ?? '')}
          >
            <SelectTrigger>
              <SelectValue placeholder="選択..." />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>種別</Label>
          <Select
            key={`type-${project.id}`}
            defaultValue={project.type ?? undefined}
            onValueChange={(v) => setValue('type', (v as string) ?? '')}
          >
            <SelectTrigger>
              <SelectValue placeholder="選択..." />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="initialCost">初期費用</Label>
          <Input id="initialCost" type="number" min="0" {...register('initialCost')} placeholder="0" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="monthlyCost">月額費用</Label>
          <Input id="monthlyCost" type="number" min="0" {...register('monthlyCost')} placeholder="0" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="deadline">期限</Label>
          <Input id="deadline" type="date" {...register('deadline')} />
        </div>
      </div>

      <Separator />

      <div className="space-y-1">
        <Label htmlFor="contractContent">契約内容</Label>
        <Textarea id="contractContent" rows={4} {...register('contractContent')} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">特記</Label>
        <Textarea id="notes" rows={3} {...register('notes')} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          戻る
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>
    </form>
  )
}
