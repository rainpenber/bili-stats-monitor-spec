import { create } from 'zustand'
import type { PendingAction } from '@/types/auth'
import type { User } from '@/types/auth'

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
  loginModalOpen: boolean
  setLoginModalOpen: (open: boolean) => void
  pendingAction: PendingAction | null
  setPendingAction: (action: PendingAction | null) => void

  // auth state (global)
  user: User | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  setUser: (user: User | null) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
  setIsAuthLoading: (isLoading: boolean) => void

  // selected account (for "My Account" page)
  selectedAccountId: string | null
  setSelectedAccountId: (id: string | null) => void

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

// 从localStorage读取主题设置
const getInitialTheme = (): ThemePreset => {
  if (typeof window === 'undefined') return 'default'
  const stored = localStorage.getItem('theme_color') as ThemePreset | null
  return stored && ['default', 'green', 'blue', 'purple', 'orange'].includes(stored) ? stored : 'default'
}

const getInitialScheme = (): Scheme => {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem('color_scheme') as Scheme | null
  return stored && ['system', 'light', 'dark'].includes(stored) ? stored : 'system'
}

export const useUISelection = create<UISelectionState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (t) => {
    set({ theme: t })
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme_color', t)
    }
  },
  scheme: getInitialScheme(),
  setScheme: (s) => {
    set({ scheme: s })
    if (typeof window !== 'undefined') {
      localStorage.setItem('color_scheme', s)
    }
  },

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
  loginModalOpen: false,
  setLoginModalOpen: (open) => set({ loginModalOpen: open }),
  pendingAction: null,
  setPendingAction: (action) => set({ pendingAction: action }),

  // auth state
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

  // selected account
  selectedAccountId: null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),

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
