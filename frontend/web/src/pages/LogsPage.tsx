export default function LogsPage() {
  return (
    <div className="container-page py-6">
      <h1 className="text-xl font-semibold mb-4">日志（占位）</h1>
      <p className="text-gray-600 mb-3">低保真阶段展示占位列表，后续接入 Mock API。</p>
      <div className="card p-4 text-sm text-gray-700 space-y-2">
        <div>2025-11-28 16:00:01 INFO tasks: scheduled 10 tasks</div>
        <div>2025-11-28 16:05:12 WARNING accounts: auth failed (count=3)</div>
        <div>2025-11-28 16:10:45 DEBUG collector: GET /video stats ok</div>
      </div>
    </div>
  )
}

