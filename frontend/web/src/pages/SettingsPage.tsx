import { useUISelection } from '@/store/uiSelection'
import { Button } from '@/components/ui/Button'

export default function SettingsPage() {
  const { theme, setTheme } = useUISelection()
  const presets: Array<{ key: typeof theme; label: string; color: string }> = [
    { key: 'green', label: '绿色', color: 'bg-emerald-500' },
    { key: 'blue', label: '蓝色', color: 'bg-blue-500' },
    { key: 'purple', label: '紫色', color: 'bg-violet-500' },
    { key: 'orange', label: '橙色', color: 'bg-orange-500' },
  ]

  return (
    <div className="container-page py-6 space-y-6">
      <h1 className="text-xl font-semibold">系统设置（低保真）</h1>

      <section className="card p-4">
        <h2 className="font-medium mb-3">主题色</h2>
        <div className="flex items-center gap-3">
          {presets.map(p => (
            <button
              key={p.key}
              className={`relative h-9 px-3 rounded-md border ${theme === p.key ? 'border-primary' : 'border-gray-200'} flex items-center gap-2`}
              onClick={() => setTheme(p.key)}
            >
              <span className={`inline-block w-3 h-3 rounded-full ${p.color}`} />
              <span className="text-sm">{p.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-3">其他（占位）</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
          <li>全局最小采集间隔</li>
          <li>固定频率最大值</li>
          <li>最大重试次数</li>
          <li>分页大小</li>
          <li>用户管理（仅两位用户）</li>
        </ul>
      </section>
    </div>
  )
}
