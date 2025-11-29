import { create } from 'zustand'

export interface AuthorVideoItem {
  id: string
  bv: string
  title: string
  coverUrl: string
  published_at: string
}

export interface SelectVideosState {
  open: boolean
  authorUid: string | null
  list: AuthorVideoItem[]
  page: number
  pageSize: number
  hasMore: boolean
  selected: Set<string>
  openForAuthor: (uid: string) => void
  close: () => void
  toggle: (bv: string) => void
  selectTopN: (n: number) => void
  append: (items: AuthorVideoItem[], hasMore: boolean) => void
  reset: () => void
}

export const useSelectVideos = create<SelectVideosState>((set, get) => ({
  open: false,
  authorUid: null,
  list: [],
  page: 1,
  pageSize: 10,
  hasMore: true,
  selected: new Set<string>(),
  openForAuthor: (uid) => set({ open: true, authorUid: uid, list: [], selected: new Set(), page: 1, hasMore: true }),
  close: () => set({ open: false }),
  toggle: (bv) => {
    const s = new Set(get().selected)
    if (s.has(bv)) s.delete(bv); else s.add(bv)
    set({ selected: s })
  },
  selectTopN: (n) => {
    const s = new Set<string>()
    const arr = get().list.slice(0, n)
    arr.forEach(v => s.add(v.bv))
    set({ selected: s })
  },
  append: (items, hasMore) => set(({ list, page }) => ({ list: [...list, ...items], page: page + 1, hasMore })),
  reset: () => set({ list: [], page: 1, hasMore: true, selected: new Set() }),
}))

