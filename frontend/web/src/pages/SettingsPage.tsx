export default function SettingsPage() {
  return (
    <div className="container-page py-6">
      <h1 className="text-xl font-semibold mb-4">系统设置（占位）</h1>
      <ul className="list-disc pl-6 text-gray-700 space-y-1">
        <li>全局最小采集间隔</li>
        <li>固定频率最大值</li>
        <li>最大重试次数</li>
        <li>分页大小</li>
        <li>用户管理（仅两位用户）</li>
      </ul>
    </div>
  )
}

