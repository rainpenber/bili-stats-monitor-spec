# 低保真网页模板结构清单（评审稿）

目标：最小可运行的交互验证版，仅静态数据/假数据，不接真实 API。
栈：React + Vite + TypeScript + Tailwind + shadcn/ui +（后续再接）ECharts。

## 1. 目录结构（建议）

```
apps/
  web/
    index.html
    package.json
    vite.config.ts
    postcss.config.cjs
    tailwind.config.cjs
    tsconfig.json
    src/
      main.tsx
      App.tsx
      index.css
      router.tsx
      layouts/
        AppLayout.tsx         # 左侧导航 + 顶部工具条 + 主内容区
      pages/
        DashboardPage.tsx     # 默认页：卡片 + 内联详情区（Tab：视频 / 博主）
        VideosPage.tsx        # 备选：与 Dashboard 拆分，首期可仅用 Dashboard
        AuthorsPage.tsx
        AccountsPage.tsx      # 账号绑定（占位）
        SettingsPage.tsx      # 用户管理等（占位）
        LogsPage.tsx          # 日志（占位）
        NotificationsPage.tsx # 通知设置（占位）
      components/
        toolbar/
          FilterBar.tsx       # 搜索框、博主多选、标签多选、清除筛选
          BulkActionsBar.tsx  # 多选/本页全选/全量全选 + 启用/禁用
        cards/
          CardGrid.tsx
          VideoCard.tsx       # 封面(16:9) + 标题 + 播放量（xx万）
          AuthorCard.tsx      # 头像(1:1) + 昵称 + 粉丝数
        detail/
          InlineDetailPanel.tsx          # 内联详情容器，随选中卡片切换
          VideoMetricsChart.tsx          # 图1：播放量（万）+ 在线观看
          VideoEngagementChart.tsx       # 图2：弹幕/评论/投币/点赞
          AuthorFansChart.tsx            # 粉丝折线图（默认缩放近3个月）
        modals/
          TaskFormModal.tsx              # 新增/编辑任务（删除仅在这里）
          AccountBindModal.tsx           # Cookie/扫码 二选一（占位）
        ui/
          EmptyState.tsx
          PageHeader.tsx
      store/
        uiSelection.ts        # Zustand：activeItem、selection、filters、pagination
        query.ts              # 预留 React Query 客户端（首轮可不引入）
      lib/
        format.ts             # 格式化工具：toWan(播放量)、number/percent 等
        time.ts               # dayjs 封装，固定 Asia/Shanghai
        fake.ts               # 生成假数据（卡片与图表）
      assets/
        placeholders/cover-16x9.png
        placeholders/avatar-1x1.png
```

## 2. 路由与导航

- “/” → DashboardPage（默认 Tab=视频，可切换到“博主”）
- “/videos” → VideosPage（可选；与 Dashboard 交互一致）
- “/authors” → AuthorsPage（可选）
- “/accounts /settings /logs /notifications” → 先放占位页
- AppLayout：左侧导航（Dashboard/视频/博主/账号/设置/日志/通知）+ 顶部工具条（搜索/筛选/批量按钮）

## 3. 交互要点（低保真）

- 卡片点击 → 设置 activeItem（{ type: 'video'|'author', id }），InlineDetailPanel 根据 activeItem 渲染详情
- 仅保留卡片视图：CardGrid + VideoCard/AuthorCard
- 批量选择：
  - Card 左上角复选框
  - BulkActionsBar 提供：多选/本页全选/全量全选（提示：全量全选作用于当前筛选条件跨页集合），操作按钮“启用/禁用”
  - 首轮仅更新本地状态与 UI 展示，不发请求
- 编辑/删除：
  - 卡片仅“编辑”按钮 → 打开 TaskFormModal
  - 删除仅在 TaskFormModal 底部的危险区按钮，二次确认
- 封面/头像：
  - 使用 assets/placeholders 下的占位图；待接入 Mock 后改为从 Media API 取本地缓存 URL

## 4. 状态与数据（首轮）

- 不接 API：使用 lib/fake.ts 生成静态假数据：
  - 视频卡片 12~24 张（含封面 URL、标题、播放量）
  - 博主卡片 12~24 张（含头像 URL、昵称、粉丝数）
  - VideoMetricsChart / VideoEngagementChart / AuthorFansChart 均用假时序
- Zustand（store/uiSelection.ts）
  - activeItem: { type: 'video'|'author'|null, id?: string }
  - selection: { ids: Set<string>, mode: 'none'|'page'|'all' }
  - filters: { keyword?: string, authorUids: string[], tags: string[], type: 'video'|'author' }
  - pagination: { page: number, pageSize: number }
- 第二轮再引入 React Query，替换为 Mock API 请求

## 5. 组件清单（首轮实现优先级）

P1
- AppLayout / DashboardPage / CardGrid / VideoCard / AuthorCard
- InlineDetailPanel / VideoMetricsChart / VideoEngagementChart / AuthorFansChart（用假数据）
- FilterBar（关键词 + 分类 Tab + 标签多选 + 清除）
- BulkActionsBar（多选/本页全选/全量全选 + 启用/禁用）

P2
- TaskFormModal（新增/编辑；删除在此）
- AccountBindModal（仅 UI 占位）
- EmptyState / PageHeader

## 6. 样式与组件约束

- Tailwind 原子类 + shadcn/ui 组件（Button, Input, Checkbox, Dialog, Card, Tabs, Badge, Pagination）
- 播放量显示：format.toWan(数值) → “xx万”，保留 1 位小数，≥10000 生效
- 粉丝图默认缩放近 3 个月：图表层使用内建 dataZoom 初始范围

## 7. 迭代节奏（仅低保真阶段）

- Iteration 0：骨架与导航 + 空卡片 + 占位详情区
- Iteration 1：卡片渲染 + 点击切换内联详情区 + 假图表
- Iteration 2：筛选/搜索 + 批量选择/启用/禁用（仅本地态）
- Iteration 3：任务编辑 Modal（仅表单与校验，不落地）/ 删除确认

## 8. 验收口径（低保真）

- Dashboard 加载后能看到视频/博主两类卡片，点击任一卡片能在下方详情区切换渲染
- 批量选择支持本页全选与全量全选（UI 提示到位），“启用/禁用”按钮能改变本地状态与样式
- 任务删除只能在编辑 Modal 内操作，卡片上无删除按钮
- 播放量以“xx万”显示；粉丝图默认缩放到近 3 个月视窗

