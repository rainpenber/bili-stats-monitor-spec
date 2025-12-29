/**
 * AccountDataDashboard - 账号数据仪表板
 * 
 * 显示账号的关键数据指标：
 * - 总监视视频数
 * - 粉丝量
 * 
 * 参考: specs/006-navigation-restructure/spec.md FR-010
 * 布局要求（tasks.md T070）:
 * - 2列网格布局
 * - 每个卡片宽度约200px
 * - 左对齐
 * - 固定高度约120px
 */

export interface AccountDataDashboardProps {
  totalVideos: number
  followerCount: number
  loading?: boolean
  activeTab?: 'videos' | 'followers'
  onTabChange?: (tab: 'videos' | 'followers') => void
}

export function AccountDataDashboard({ 
  totalVideos, 
  followerCount, 
  loading,
  activeTab = 'videos',
  onTabChange
}: AccountDataDashboardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="w-[200px] h-[120px] border rounded-lg bg-card animate-pulse" />
        <div className="w-[200px] h-[120px] border rounded-lg bg-card animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      {/* 总监视视频数（可点击切换tab） */}
      <div 
        className={`w-[200px] h-[120px] p-4 border rounded-lg bg-card flex flex-col justify-between transition-colors ${
          activeTab === 'videos' ? 'border-primary bg-primary/5' : 'hover:border-primary/50 cursor-pointer'
        }`}
        onClick={() => onTabChange?.('videos')}
      >
        <div className="text-sm text-muted-foreground">总监视视频数</div>
        <div className="text-4xl font-bold">{totalVideos}</div>
      </div>

      {/* 粉丝量（可点击切换tab） */}
      <div 
        className={`w-[200px] h-[120px] p-4 border rounded-lg bg-card flex flex-col justify-between transition-colors ${
          activeTab === 'followers' ? 'border-primary bg-primary/5' : 'hover:border-primary/50 cursor-pointer'
        }`}
        onClick={() => onTabChange?.('followers')}
      >
        <div className="text-sm text-muted-foreground">粉丝量</div>
        <div className="text-4xl font-bold">{followerCount.toLocaleString()}</div>
      </div>
    </div>
  )
}

