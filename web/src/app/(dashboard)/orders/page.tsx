import { OrdersView } from '@/components/orders/OrdersView'

export const metadata = { title: '受注一覧 | MArKE-IT Workflow' }

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">受注一覧</h1>
        <p className="text-sm text-muted-foreground mt-0.5">受注の検索・管理ができます</p>
      </div>
      <OrdersView />
    </div>
  )
}
