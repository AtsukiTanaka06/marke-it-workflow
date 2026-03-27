import { create } from 'zustand'
import type { ProjectStatus, ProjectType } from '@/types/notion'

type ProjectFilterState = {
  search: string
  status: ProjectStatus | ''
  type: ProjectType | ''
  industry: string
  cursorStack: (string | null)[]   // index 0 = first page (null), i+1 = cursor for page i+1
  currentPage: number
  setSearch: (v: string) => void
  setStatus: (v: ProjectStatus | '') => void
  setType: (v: ProjectType | '') => void
  setIndustry: (v: string) => void
  goNext: (nextCursor: string) => void
  goPrev: () => void
  reset: () => void
}

export const useProjectFilter = create<ProjectFilterState>((set) => ({
  search: '',
  status: '',
  type: '',
  industry: '',
  cursorStack: [null],
  currentPage: 0,

  setSearch: (search) => set({ search, cursorStack: [null], currentPage: 0 }),
  setStatus: (status) => set({ status, cursorStack: [null], currentPage: 0 }),
  setType: (type) => set({ type, cursorStack: [null], currentPage: 0 }),
  setIndustry: (industry) => set({ industry, cursorStack: [null], currentPage: 0 }),

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

  reset: () => set({ search: '', status: '', type: '', industry: '', cursorStack: [null], currentPage: 0 }),
}))
