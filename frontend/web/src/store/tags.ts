import { create } from 'zustand'

export interface TagsState {
  all: string[]
  addTag: (t: string) => void
  removeTag: (t: string) => void
}

const initial = ['剪辑', '测评', 'VLOG', '学习', '旅行', '主频道', '副频道', '合作']

export const useTags = create<TagsState>((set, get) => ({
  all: initial,
  addTag: (t) => set(({ all }) => ({ all: all.includes(t) ? all : [...all, t] })),
  removeTag: (t) => set(({ all }) => ({ all: all.filter(x => x !== t) })),
}))

