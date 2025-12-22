import { create } from 'zustand'

export type ItemType = 'video' | 'author'
export type ActiveItem = { type: ItemType; id: string } | null
export type SelectionMode = 'none' | 'page' | 'all'
export type ThemePreset = 'default' | 'green' | 'blue' | 'purple' | 'orange'
export type Scheme = 'system' | 'light' | 'dark'

export interface UISelectionState {
  // theme & scheme
  theme: ThemePreset
  setTheme: (t: ThemePreset) => void
  scheme: Scheme
  setScheme: (s: Scheme) => void

  // listing & selection
  type: ItemType
  activeItem: ActiveItem
  activeMeta?: any
  selection: Set<string>
  selectionMode: SelectionMode
  selecting: boolean
  keyword: string
  page: number
  pageSize: number

  // modals
  editingTask: { type: ItemType; id: string } | null
  setEditingTask: (p: { type: ItemType; id: string } | null) => void
  accountBindOpen: boolean
  setAccountBindOpen: (open: boolean) => void
  addTaskOpen: boolean
  setAddTaskOpen: (open: boolean) => void
  setAddTaskType: (t: ItemType) => void

  // actions
  setType: (t: ItemType) => void
  setActiveItem: (a: ActiveItem, meta?: any) => void
  toggleSelect: (id: string) => void
  clearSelection: () => void
  selectPage: (ids: string[]) => void
  selectAll: () => void
  setKeyword: (k: string) => void
  setPage: (p: number) => void
  setPageSize: (n: number) => void
  setSelecting: (v: boolean) => void
}

export const useUISelection = create<UISelectionState>((set, get) => ({
  theme: 'default',
  setTheme: (t) => set({ theme: t }),
  scheme: 'system',
  setScheme: (s) => set({ scheme: s }),

  type: 'video',
  activeItem: null,
  activeMeta: undefined,
  selection: new Set<string>(),
  selectionMode: 'none',
  selecting: false,
  keyword: '',
  page: 1,
  pageSize: 8,

  editingTask: null,
  setEditingTask: (p) => set({ editingTask: p }),
  accountBindOpen: false,
  setAccountBindOpen: (open) => set({ accountBindOpen: open }),
  addTaskOpen: false,
  setAddTaskOpen: (open) => set({ addTaskOpen: open }),
  setAddTaskType: (t) => set({ type: t, addTaskOpen: true }),

  setType: (t) => set({ type: t, activeItem: null, selection: new Set(), selectionMode: 'none', selecting: false, page: 1 }),
  setActiveItem: (a, meta) => set({ activeItem: a, activeMeta: meta }),
  toggleSelect: (id) => {
    const s = new Set(get().selection)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    set({ selection: s, selecting: true })
  },
  clearSelection: () => set({ selection: new Set(), selectionMode: 'none', selecting: false }),
  selectPage: (ids) => set({ selection: new Set(ids), selectionMode: 'page', selecting: true }),
  selectAll: () => set({ selectionMode: 'all', selecting: true }),
  setKeyword: (k) => set({ keyword: k, page: 1 }),
  setPage: (p) => set({ page: Math.max(1, p) }),
  setPageSize: (n) => set({ pageSize: Math.max(1, n), page: 1 }),
  setSelecting: (v) => set({ selecting: v, ...(v ? {} : { selection: new Set(), selectionMode: 'none' }) }),
}))
