'use client'

import { useState, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
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
  achievement:     z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const ORDER_STATUSES: OrderStatus[] = [
  '未着手', '見込み', '商談待ち', '商談済み',
  '進行中', '進行中（実績）', '完了', '完了（実績）', '失注',
]
const OPERATION_STATUSES: OperationStatus[] = ['運用中', '運用終了']

function richToPlain(items: { text: string }[]): string {
  return items.map((i) => i.text).join('')
}

function toRichText(text: string) {
  return [{ text, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false }, href: null }]
}

export function OrderEditForm({ order }: { order: Order }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectSearch, setProjectSearch] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState(order.projectId ?? '')

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:            order.name,
      projectId:       order.projectId ?? '',
      status:          order.status ?? '',
      operationStatus: order.operationStatus ?? '',
      amount:          order.amount != null ? String(order.amount) : '',
      deadline:        order.deadline ?? '',
      content:         richToPlain(order.content),
      notes:           richToPlain(order.notes),
      achievement:     richToPlain(order.achievement),
    },
  })

  useEffect(() => {
    fetch('/api/notion/projects?pageSize=100')
      .then((r) => r.json())
      .then((d) => setProjects(d.items ?? []))
      .catch(() => toast.error('案件一覧の取得に失敗しました'))
  }, [])

  // 検索で絞り込みつつ、選択中の案件は常にリストに含める
  const baseFiltered = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  )
  const filteredProjects =
    selectedProjectId && !baseFiltered.some((p) => p.id === selectedProjectId)
      ? [projects.find((p) => p.id === selectedProjectId)!, ...baseFiltered].filter(Boolean)
      : baseFiltered

  async function onSubmit(values: FormValues) {
    setSaving(true)
    try {
      const body = {
        name:            values.name,
        projectId:       values.projectId || null,
        status:          (values.status as OrderStatus) || undefined,
        operationStatus: (values.operationStatus as OperationStatus) || undefined,
        amount:          values.amount ? Number(values.amount) : null,
        deadline:        values.deadline || null,
        content:         values.content     ? toRichText(values.content)     : [],
        notes:           values.notes       ? toRichText(values.notes)       : [],
        achievement:     values.achievement ? toRichText(values.achievement) : [],
      }

      const res = await fetch(`/api/notion/orders/${order.id}`, {
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

      {/* 受注項目名 */}
      <div className="space-y-1">
        <Label htmlFor="name">受注項目名 <span className="text-destructive">*</span></Label>
        <Input id="name" {...register('name')} className="text-base font-medium" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <Separator />

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
          }}
        >
          <SelectTrigger className="w-full">
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
        {errors.projectId && <p className="text-xs text-destructive">{errors.projectId.message}</p>}
      </div>

      <Separator />

      {/* ステータス・運用進捗・金額・期限 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>進捗</Label>
          <Select
            key={`status-${order.id}`}
            defaultValue={order.status ?? undefined}
            onValueChange={(v) => setValue('status', (v as string) ?? '')}
          >
            <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>運用進捗</Label>
          <Select
            key={`op-${order.id}`}
            defaultValue={order.operationStatus ?? undefined}
            onValueChange={(v) => setValue('operationStatus', (v as string) ?? '')}
          >
            <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
            <SelectContent>
              {OPERATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="amount">受注金額</Label>
          <Input id="amount" type="number" min="0" {...register('amount')} placeholder="0" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="deadline">期限</Label>
          <Input id="deadline" type="date" {...register('deadline')} />
        </div>
      </div>

      <Separator />

      <div className="space-y-1">
        <Label htmlFor="content">受注内容</Label>
        <Textarea id="content" rows={4} {...register('content')} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="achievement">実績記述</Label>
        <Textarea id="achievement" rows={4} {...register('achievement')} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">備考</Label>
        <Textarea id="notes" rows={3} {...register('notes')} />
      </div>

      {/* 読み取り専用フィールド */}
      {order.rating.length > 0 && (
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">5段階評価（読み取り専用）</Label>
          <div className="flex flex-wrap gap-1">
            {order.rating.map((r) => (
              <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
            ))}
          </div>
        </div>
      )}

      {order.attachments.length > 0 && (
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">添付ファイル（読み取り専用）</Label>
          <ul className="space-y-1">
            {order.attachments.map((att) => (
              <li key={att.url}>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline underline-offset-2 hover:opacity-80"
                >
                  {att.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

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
