import { create } from 'zustand'
import type { OrderStatus, OperationStatus } from '@/types/notion'

type OrderFilterState = {
  search: string
  status: OrderStatus | ''
  operationStatus: OperationStatus | ''
  cursorStack: (string | null)[]
  currentPage: number
  setSearch: (v: string) => void
  setStatus: (v: OrderStatus | '') => void
  setOperationStatus: (v: OperationStatus | '') => void
  goNext: (nextCursor: string) => void
  goPrev: () => void
  reset: () => void
}

export const useOrderFilter = create<OrderFilterState>((set) => ({
  search: '',
  status: '',
  operationStatus: '',
  cursorStack: [null],
  currentPage: 0,

  setSearch: (search) => set({ search, cursorStack: [null], currentPage: 0 }),
  setStatus: (status) => set({ status, cursorStack: [null], currentPage: 0 }),
  setOperationStatus: (operationStatus) => set({ operationStatus, cursorStack: [null], currentPage: 0 }),

  goNext: (nextCursor) =>
    set((s) => ({
      cursorStack: [...s.cursorStack, nextCursor],
      currentPage: s.currentPage + 1,
    })),

  goPrev: () =>
    set((s) => ({
      cursorStack: s.cursorStack.slice(0, -1),
      currentPage: Math.max(0, s.currentPage - 1),
    })),

  reset: () => set({ search: '', status: '', operationStatus: '', cursorStack: [null], currentPage: 0 }),
}))
