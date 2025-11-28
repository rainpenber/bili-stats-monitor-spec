import { create } from 'zustand'

export type ItemType = 'video' | 'author'

export type ActiveItem = { type: ItemType; id: string } | null

export type SelectionMode = 'none' | 'page' | 'all'

export interface UISelectionState {
  type: ItemType
  activeItem: ActiveItem
  selection: Set<string>
  selectionMode: SelectionMode
  keyword: string
  page: number
  pageSize: number
  // actions
  setType: (t: ItemType) => void
  setActiveItem: (a: ActiveItem) => void
  toggleSelect: (id: string) => void
  clearSelection: () => void
  selectPage: (ids: string[]) => void
  selectAll: () => void
  setKeyword: (k: string) => void
  setPage: (p: number) => void
  setPageSize: (n: number) => void
}

export const useUISelection = create<UISelectionState>((set, get) => ({
  type: 'video',
  activeItem: null,
  selection: new Set<string>(),
  selectionMode: 'none',
  keyword: '',
  page: 1,
  pageSize: 8,
  setType: (t) => set({ type: t, activeItem: null, selection: new Set(), selectionMode: 'none', page: 1 }),
  setActiveItem: (a) => set({ activeItem: a }),
  toggleSelect: (id) => {
    const s = new Set(get().selection)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    set({ selection: s })
  },
  clearSelection: () => set({ selection: new Set(), selectionMode: 'none' }),
  selectPage: (ids) => set({ selection: new Set(ids), selectionMode: 'page' }),
  selectAll: () => set({ selectionMode: 'all' }),
  setKeyword: (k) => set({ keyword: k, page: 1 }),
  setPage: (p) => set({ page: Math.max(1, p) }),
  setPageSize: (n) => set({ pageSize: Math.max(1, n), page: 1 }),
}))
