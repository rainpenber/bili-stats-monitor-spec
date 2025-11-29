import { useMemo, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { useTags } from '@/store/tags'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

export default function TagInput({ value, onChange, placeholder }: Props) {
  const { all, addTag } = useTags()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as string[]
    return all.filter(t => t.toLowerCase().includes(q) && !value.includes(t)).slice(0, 8)
  }, [query, all, value])

  function add(t: string) {
    const tag = t.trim()
    if (!tag) return
    if (!value.includes(tag)) onChange([...value, tag])
    addTag(tag)
    setQuery('')
    setOpen(false)
    setActive(0)
    inputRef.current?.focus()
  }

  function remove(t: string) {
    onChange(value.filter(x => x !== t))
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (open && suggestions.length > 0) add(suggestions[active] || suggestions[0])
      else add(query)
    } else if (e.key === 'Backspace' && !query) {
      if (value.length > 0) remove(value[value.length - 1])
    } else if (e.key === ',') {
      e.preventDefault()
      add(query)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (suggestions.length > 0) setActive((prev) => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (suggestions.length > 0) setActive((prev) => (prev - 1 + suggestions.length) % suggestions.length)
    }
  }

  useEffect(() => {
    setOpen(!!query && suggestions.length > 0)
    setActive(0)
  }, [query, suggestions.length])

  useEffect(() => {
    if (!open) return
    const container = listRef.current
    if (!container) return
    const el = container.querySelector(`[data-index='${active}']`) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [active, open])

  return (
    <div className="relative">
      <div className="min-h-10 w-full border border-gray-300 rounded-md px-2 py-1.5 flex items-center gap-1 flex-wrap bg-white dark:bg-transparent">
        {value.map(tag => (
          <span key={tag} className="tag-item">
            <span>{tag}</span>
            <button className="tag-remove" onClick={() => remove(tag)} aria-label="删除标签">×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm px-1"
          value={query}
          placeholder={placeholder || '输入标签，回车添加'}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && (
        <div ref={listRef} className="absolute z-20 mt-1 w-full max-h-40 overflow-auto bg-white dark:bg-[rgb(var(--background))] border border-gray-200 rounded-md shadow-sm p-1">
          {suggestions.map((s, i) => (
            <div key={s}
              data-index={i}
              className={cn(
                'px-2 py-1.5 text-sm rounded cursor-pointer',
                i === active ? 'bg-gray-100 dark:bg-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
              )}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); add(s) }}
            >{s}</div>
          ))}
        </div>
      )}
    </div>
  )
}
