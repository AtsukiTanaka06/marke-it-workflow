import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listOrders, createOrder, updateOrder } from '@/lib/notion/orders'
import { getProject } from '@/lib/notion/projects'
import type { ListOrdersOptions } from '@/lib/notion/orders'
import type { OrderStatus, OperationStatus, CreateOrderInput } from '@/types/notion'
import { listActiveTemplates } from '@/lib/notion/task-templates'
import { createProgressTasksFromTemplates, updateProgressTaskDocumentLink } from '@/lib/notion/progress-tasks'
import { copyTemplateFolder, listFilesInFolder } from '@/lib/google/drive'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = request.nextUrl
  const options: ListOrdersOptions = {
    search:          searchParams.get('search')          ?? undefined,
    status:          (searchParams.get('status')          ?? undefined) as OrderStatus | undefined,
    operationStatus: (searchParams.get('operationStatus') ?? undefined) as OperationStatus | undefined,
    industry:        searchParams.get('industry')         ?? undefined,
    cursor:          searchParams.get('cursor')           ?? undefined,
    pageSize:        Number(searchParams.get('pageSize')  ?? '20'),
  }

  const result = await listOrders(options)
  return Response.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { createWorkflow, driveFolderId, driveFolderName, docReplacements, ...orderBody } =
    await request.json() as CreateOrderInput & {
      createWorkflow?: boolean
      driveFolderId?: string
      driveFolderName?: string
      docReplacements?: Record<string, string>
    }

  const order = await createOrder(orderBody)

  // ワークフロー作成（失敗しても受注作成自体は成功とする）
  let createdTasks: Awaited<ReturnType<typeof createProgressTasksFromTemplates>> = []
  if (createWorkflow !== false) {
    try {
      const templates = await listActiveTemplates()
      createdTasks = await createProgressTasksFromTemplates(order.id, templates, orderBody.assigneeIds ?? [])
    } catch (err) {
      console.error('[workflow] 進行タスク作成エラー:', err)
    }
  }

  // Google Drive フォルダコピー → 受注の GoogleドライブURL プロパティに書き込み
  // → さらにドキュメント名が一致するファイルのリンクを進行タスクに書き込む
  if (createWorkflow !== false && driveFolderId && driveFolderName) {
    try {
      const projectName = orderBody.projectId
        ? (await getProject(orderBody.projectId).catch(() => null))?.name ?? orderBody.name
        : orderBody.name
      const newFolderId = await copyTemplateFolder(driveFolderId, driveFolderName, projectName, docReplacements)
      const driveUrl = `https://drive.google.com/drive/folders/${newFolderId}`
      console.log('[drive] updating order', order.id, 'with driveUrl:', driveUrl)
      await updateOrder(order.id, { googleDriveUrl: driveUrl })
      console.log('[drive] order updated successfully')

      // ドキュメントリンクを進行タスクに書き込む
      const tasksWithDoc = createdTasks.filter((t) => t.documentName)
      if (tasksWithDoc.length > 0) {
        const files = await listFilesInFolder(newFolderId)
        await Promise.allSettled(
          tasksWithDoc.map((task) => {
            const matched = files.find((f) =>
              f.name.includes(task.documentName!)
            )
            if (!matched) {
              console.warn('[drive] ドキュメントが見つかりません:', task.documentName)
              return Promise.resolve()
            }
            console.log('[drive] linking doc:', task.documentName, '→', matched.webViewLink)
            return updateProgressTaskDocumentLink(task.pageId, matched.webViewLink)
          })
        )
      }
    } catch (err) {
      console.error('[drive] フォルダコピー または Notion 更新エラー:', err)
    }
  }

  return Response.json(order, { status: 201 })
}
