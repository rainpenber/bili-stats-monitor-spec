export type Status = 'running' | 'stopped' | 'completed' | 'failed' | 'paused'

export type VideoItem = {
  id: string
  type: 'video'
  bv: string
  title: string
  coverUrl: string
  playCount: number
  status: Status
  tags: string[]
  lastCollectedAt: string
}

export type AuthorItem = {
  id: string
  type: 'author'
  uid: string
  nickname: string
  avatarUrl: string
  fansCount: number
  status: Status
  tags: string[]
  lastCollectedAt: string
}

const nowIso = () => new Date().toISOString()

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function genVideos(n = 16): VideoItem[] {
  const titles = [
    '如何高效剪辑：10个必备技巧',
    '周末VLOG｜城市徒步探索',
    '开箱评测：年度旗舰对比',
    '学习效率提升指南',
    '旅行记录：海边的早晨',
    '编曲日常：旋律灵感分享',
  ]
  const tags = ['剪辑', '测评', 'VLOG', '学习', '旅行']
  const arr: VideoItem[] = []
  for (let i = 0; i < n; i++) {
    const id = `v_${i + 1}`
    const bv = `BV${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 6)}`
    arr.push({
      id,
      type: 'video',
      bv,
      title: randomPick(titles),
      coverUrl: 'https://via.placeholder.com/320x180?text=Cover',
      playCount: Math.floor(Math.random() * 500000 + 10000),
      status: randomPick(['running', 'stopped', 'completed']),
      tags: [randomPick(tags)],
      lastCollectedAt: nowIso(),
    })
  }
  return arr
}

function genAuthors(n = 16): AuthorItem[] {
  const names = ['小明的数码屋', '阿杰旅行记', '小白学编程', '灵感乐坊', '城市光影']
  const tags = ['主频道', '副频道', '合作']
  const arr: AuthorItem[] = []
  for (let i = 0; i < n; i++) {
    const id = `a_${i + 1}`
    const uid = String(Math.floor(Math.random() * 900000 + 100000))
    arr.push({
      id,
      type: 'author',
      uid,
      nickname: randomPick(names),
      avatarUrl: 'https://via.placeholder.com/120x120?text=Avatar',
      fansCount: Math.floor(Math.random() * 300000 + 1000),
      status: randomPick(['running', 'stopped', 'completed']),
      tags: [randomPick(tags)],
      lastCollectedAt: nowIso(),
    })
  }
  return arr
}

export const fakeVideos: VideoItem[] = genVideos()
export const fakeAuthors: AuthorItem[] = genAuthors()

export function filterByKeyword<T extends { title?: string; nickname?: string; bv?: string; uid?: string }>(
  items: T[],
  keyword: string
): T[] {
  if (!keyword) return items
  const kw = keyword.toLowerCase()
  return items.filter((it) => {
    return (
      (it as any).title?.toLowerCase?.().includes(kw) ||
      (it as any).nickname?.toLowerCase?.().includes(kw) ||
      (it as any).bv?.toLowerCase?.().includes(kw) ||
      (it as any).uid?.toLowerCase?.().includes(kw)
    )
  })
}

export function updateStatus(
  ids: string[],
  status: Status,
  type: 'video' | 'author'
) {
  const list = type === 'video' ? fakeVideos : fakeAuthors
  for (const it of list) {
    if (ids.includes(it.id)) {
      ;(it as any).status = status
    }
  }
}

// Fake time-series
export function genVideoSeries(days = 14) {
  const series: Array<{ ts: string; play: number; watching: number; danmaku: number; comment: number; coin: number; like: number }> = []
  let play = 50000
  let watching = 800
  const base = Date.now() - days * 24 * 3600 * 1000
  for (let i = 0; i < days * 24; i += 4) {
    play += Math.floor(Math.random() * 400 + 200)
    watching = Math.max(0, watching + Math.floor(Math.random() * 50 - 20))
    series.push({
      ts: new Date(base + i * 3600 * 1000).toISOString(),
      play,
      watching,
      danmaku: Math.floor(play / 200),
      comment: Math.floor(play / 400),
      coin: Math.floor(play / 800),
      like: Math.floor(play / 300),
    })
  }
  return series
}

export function genFansSeries(days = 90) {
  const series: Array<{ ts: string; fans: number }> = []
  let fans = 100000
  const base = Date.now() - days * 24 * 3600 * 1000
  for (let i = 0; i < days; i++) {
    fans += Math.floor(Math.random() * 100 - 30)
    series.push({ ts: new Date(base + i * 24 * 3600 * 1000).toISOString(), fans })
  }
  return series
}

