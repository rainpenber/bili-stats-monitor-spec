import { useUISelection } from '@/store/uiSelection'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

export default function FilterBar() {
  const { type, setType, setKeyword, keyword, clearSelection, selecting, setSelecting } = useUISelection()
  const [value, setValue] = useState(keyword)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setKeyword(value.trim())
    clearSelection()
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <Button variant={type === 'video' ? 'default' : 'outline'} onClick={() => { setType('video'); clearSelection() }}>视频</Button>
        <Button variant={type === 'author' ? 'default' : 'outline'} onClick={() => { setType('author'); clearSelection() }}>博主</Button>
        {!selecting ? (
          <Button variant="outline" onClick={() => setSelecting(true)}>多选</Button>
        ) : (
          <Button variant="destructive" onClick={() => setSelecting(false)}>退出多选</Button>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          className="h-9 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
          placeholder="按 BV/UID/标题/博主名 搜索"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit">搜索</Button>
        <Button type="button" variant="ghost" onClick={() => { setValue(''); setKeyword(''); clearSelection() }}>清除筛选</Button>
      </form>
    </div>
  )
}
