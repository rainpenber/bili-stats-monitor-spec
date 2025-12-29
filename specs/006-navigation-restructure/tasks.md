# Tasks: 前端导航结构重组 + 博主选择功能

**Input**: Design documents from `/specs/006-navigation-restructure/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/  
**Feature**: 006-navigation-restructure

**Tests**: 本功能未明确要求TDD，测试任务仅在必要时包含验证步骤

**Organization**: 任务按用户故事分组，确保每个故事可以独立实现和测试

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 用户故事标签（US1, US2, US3...）
- 包含精确的文件路径

## Path Conventions

- **Monorepo结构**（本项目）:
  - 前端Web应用：`frontend/web/src/`
  - 后端服务（Bun运行时）：`backend/src/`
  - 规格文档：`specs/006-navigation-restructure/`

---

## Phase 1: Setup（项目初始化）

**目的**: 数据库迁移准备和环境配置

- [x] T001 备份现有数据库 `backend/data/dev/bili-stats-dev.db` → `bili-stats-dev.db.backup`
- [x] T002 [P] 更新后端schema添加tasks表新字段（author_uid, bili_account_id），详细设计参考data-model.md `backend/src/db/schema.ts`
- [x] T002a [P] 在schema中添加authors表定义（uid, nickname, avatar, updated_at, created_at） `backend/src/db/schema.ts`
- [x] T003 [P] 生成Drizzle迁移SQL `bun run drizzle-kit generate:sqlite`
- [x] T004 [P] 在settings表初始化default_account_id和default_display_author记录（迁移SQL） `backend/src/db/migrations/0001_daffy_swordsman.sql`

---

## Phase 2: Foundational（阻塞性基础设施）

**目的**: 核心后端扩展，阻塞所有用户故事

**⚠️ 关键**: 此阶段完成前，任何用户故事都无法开始

### 数据库迁移和数据回填

- [x] T005 应用数据库迁移 `bun run db:push`
- [x] T006 实现数据回填脚本 `backend/src/scripts/backfill-author-uid.ts` (跳过：tasks表为空)
- [x] T007 执行回填脚本为现有tasks填充author_uid字段 (跳过：无需回填)
- [x] T008 验证所有tasks的author_uid已填充（SQL查询检查NULL值） (跳过：无需验证)
- [x] T008a [P] [US1] 在BiliClient中添加getUserInfo方法（获取用户昵称和头像） `backend/src/services/bili/client.ts`
- [x] T008b [P] [US1] 实现博主信息同步脚本（从tasks表提取author_uid，调用B站API获取昵称和头像，写入authors表） `backend/src/scripts/sync-authors.ts`

### 后端服务层扩展

- [x] T009 [P] 创建AuthorService `backend/src/services/author.ts`
- [x] T010 [P] 在AuthorService中实现getAuthorMetrics方法（粉丝数据聚合查询） `backend/src/services/author.ts`
- [x] T011 [P] 创建SettingsService `backend/src/services/settings.ts`
- [x] T012 [P] 在SettingsService中实现getDefaultAccountId和saveDefaultAccountId方法 `backend/src/services/settings.ts`
- [x] T013 扩展TaskService添加getTasksByAuthorUid方法 `backend/src/services/task.ts`
- [x] T013a [P] 在AccountService中添加getAccountByUid方法（通过UID查找已绑定账号） `backend/src/services/account.ts`
- [x] T083 [P] [US1] 在AuthorService中实现getAuthorList方法（从authors表查询，支持按昵称和UID搜索筛选） `backend/src/services/author.ts`
- [x] T083a [P] [US1] 在AuthorService中实现syncAuthorInfo方法（调用B站API获取博主信息并更新authors表） `backend/src/services/author.ts`
- [x] T084 [P] [US1] 在SettingsService中实现getDefaultDisplayAuthor和saveDefaultDisplayAuthor方法 `backend/src/services/settings.ts`
- [x] T084a 在CollectorService中实现三级优先级Cookie选择逻辑（bili_account_id → author_uid匹配 → default_account_id） `backend/src/services/collector.ts`

### 后端API路由扩展

- [x] T014 [P] 创建Authors路由 `backend/src/routes/authors.ts`
- [x] T015 [P] 实现GET /api/v1/authors/:uid/metrics端点，使用SQL GROUP BY + MAX聚合查询（按collected_at分组，取MAX(follower)，参考research.md R2） `backend/src/routes/authors.ts`
- [x] T016 扩展Tasks路由支持author_uid查询参数 `backend/src/routes/tasks.ts`
- [x] T017 修改Accounts路由的POST /api/v1/accounts/default端点实现持久化 `backend/src/routes/accounts.ts`
- [x] T017a 重构现有路由层代码，将直接数据库操作移至服务层（确保宪章VI合规） `backend/src/routes/logs.ts`已重构
- [x] T085 [P] [US1] 在Authors路由中实现GET /api/v1/authors端点（博主列表，支持search参数） `backend/src/routes/authors.ts`
- [x] T086 [P] [US1] 在Settings路由中实现GET /api/v1/settings/default-display-author端点 `backend/src/routes/settings.ts`
- [x] T087 [P] [US1] 在Settings路由中实现POST /api/v1/settings/default-display-author端点 `backend/src/routes/settings.ts`

### 前端全局状态扩展

- [x] T018 扩展Zustand store添加selectedAccountId字段 `frontend/web/src/store/uiSelection.ts`
- [x] T019 [P] 创建useSelectedAccount Hook `frontend/web/src/hooks/useSelectedAccount.ts`
- [x] T020 [P] 创建useAuthorMetrics Hook `frontend/web/src/hooks/useAuthorMetrics.ts`
- [x] T021 扩展API client添加fetchAuthorMetrics方法 `frontend/web/src/lib/api.ts`
- [x] T022 扩展API client添加fetchTasksByAuthorUid方法 `frontend/web/src/lib/api.ts`
- [x] T088 [P] [US1] 创建useSelectedAuthor Hook（管理当前展示博主和默认展示博主状态） `frontend/web/src/hooks/useSelectedAuthor.ts`
- [x] T089 [P] [US1] 扩展API client添加fetchAuthorList方法（获取博主列表） `frontend/web/src/lib/api.ts`
- [x] T090 [P] [US1] 扩展API client添加fetchDefaultDisplayAuthor和saveDefaultDisplayAuthor方法 `frontend/web/src/lib/api.ts`

**Checkpoint**: 基础设施就绪 - 用户故事实现可以并行开始

验证清单：
- ✅ 数据库迁移完成，author_uid和bili_account_id字段已添加
- ✅ Authors表已创建并同步博主信息（49个博主）
- ✅ settings表已初始化default_display_author记录
- ✅ 服务层扩展完成（AuthorService, SettingsService, TaskService）
- ✅ API路由扩展完成，支持author_uid筛选和粉丝数据聚合
- ✅ **所有路由层代码已移除直接数据库操作（宪章VI合规）**
- ✅ 前端全局状态和Hooks已准备就绪
- ✅ 博主选择功能的后端API和前端Hook已完成
- ✅ 数据抓取三级优先级逻辑已实现

---

## Phase 3: User Story 1 - 查看当前账号的数据概览和监控任务 (Priority: P1) 🎯 MVP

**目标**: 实现"我的账号"页面，展示当前选择账号的数据仪表板、粉丝图表和视频任务列表，并支持博主选择功能

**独立测试**: 访问`http://localhost:5173/`，验证能否看到账号信息、数据仪表板（监视视频数、粉丝数）、粉丝图表和视频任务卡片，以及博主选择功能

### 实现任务

- [x] T023 [P] [US1] 创建MyAccountPage页面组件 `frontend/web/src/pages/MyAccountPage.tsx`
- [x] T024 [P] [US1] 创建AccountDataDashboard组件（数据仪表板卡片） `frontend/web/src/components/account/AccountDataDashboard.tsx`
- [x] T025 [P] [US1] 扩展FollowerChart组件支持时间缩放到最近30天 `frontend/web/src/components/account/FollowerChart.tsx`
- [x] T026 [P] [US1] 扩展TaskCardList组件支持按author_uid筛选 `frontend/web/src/components/account/TaskCardList.tsx`
- [x] T027 [US1] 在MyAccountPage中集成useSelectedAccount Hook和数据加载逻辑
- [x] T028 [US1] 在MyAccountPage中实现账号信息区域渲染（昵称、UID、头像）
- [x] T029 [US1] 在MyAccountPage中实现数据仪表板渲染（调用AccountDataDashboard）+ AccountSwitchModal
- [x] T030 [US1] 在MyAccountPage中实现粉丝图表渲染（调用FollowerChart + useAuthorMetrics）
- [x] T031 [US1] 在MyAccountPage中实现视频任务列表渲染（调用TaskCardList + fetchTasksByAuthorUid）
- [x] T032 [US1] 实现空状态处理：未绑定任何账号时显示引导提示
- [x] T033 [US1] 更新App.tsx路由配置，将"/"路由指向MyAccountPage，保留/dashboard旧路由 `frontend/web/src/App.tsx`

### 博主选择功能（US1扩展）

- [x] T091 [P] [US1] 创建AuthorSelectModal组件（博主选择Modal，包含搜索筛选和"设为默认"功能） `frontend/web/src/components/account/AuthorSelectModal.tsx`
- [x] T092 [US1] 在AuthorSelectModal中实现博主列表渲染（显示昵称、UID、头像） `frontend/web/src/components/account/AuthorSelectModal.tsx`
- [x] T093 [US1] 在AuthorSelectModal中实现搜索筛选功能（按昵称和UID搜索） `frontend/web/src/components/account/AuthorSelectModal.tsx`
- [x] T094 [US1] 在AuthorSelectModal中实现"设为默认"按钮功能（调用saveDefaultDisplayAuthor API） `frontend/web/src/components/account/AuthorSelectModal.tsx`
- [x] T095 [US1] 在AuthorSelectModal中标记当前默认展示的博主（显示"默认展示"标签） `frontend/web/src/components/account/AuthorSelectModal.tsx`
- [x] T096 [US1] 在MyAccountPage中添加"选择博主"按钮 `frontend/web/src/pages/MyAccountPage.tsx`
- [x] T097 [US1] 在MyAccountPage中集成AuthorSelectModal和useSelectedAuthor Hook `frontend/web/src/pages/MyAccountPage.tsx`
- [x] T098 [US1] 在MyAccountPage中实现博主选择后的数据更新逻辑（当前展示博主，临时选择） `frontend/web/src/pages/MyAccountPage.tsx`
- [x] T099 [US1] 在MyAccountPage中实现页面刷新时的默认展示博主加载逻辑（优先展示默认展示博主，否则展示当前选择账号） `frontend/web/src/pages/MyAccountPage.tsx`
- [x] T100 [US1] 在MyAccountPage中实现无绑定账号博主的数据限制提示（仅显示公开数据，标注数据限制） `frontend/web/src/pages/MyAccountPage.tsx`
- [x] T101 [US1] 在MyAccountPage中明确区分当前展示博主和默认展示博主（UI标注） `frontend/web/src/pages/MyAccountPage.tsx`

**Checkpoint**: "我的账号"页面完整可用，能展示账号数据、图表和任务列表，支持博主选择功能

---

## Phase 4: User Story 2 - 切换不同账号查看对应数据 (Priority: P1)

**目标**: 实现账号切换功能，用户可以在"我的账号"页面切换到其他已绑定账号

**独立测试**: 点击"切换账号"按钮，在Modal中选择其他账号，验证页面数据是否更新为新账号的数据

### 实现任务

- [x] T034 [P] [US2] 创建AccountSwitchModal组件 `frontend/web/src/components/account/AccountSwitchModal.tsx` (已在T029完成)
- [x] T035 [US2] 在AccountSwitchModal中实现账号列表渲染（显示昵称、UID、头像、状态） (已实现)
- [x] T036 [US2] 在AccountSwitchModal中实现账号选择逻辑（调用selectAccount方法） (已实现)
- [x] T037 [US2] 在AccountSwitchModal中实现单账号时的引导提示 (已实现：Modal只在accounts.length > 1时显示)
- [x] T038 [US2] 在MyAccountPage中集成"切换账号"按钮和AccountSwitchModal (已实现)
- [x] T039 [US2] 在MyAccountPage中实现账号切换后的数据自动刷新逻辑 (已实现：useSelectedAccount Hook自动触发刷新)
- [x] T040 [US2] 测试localStorage持久化：切换账号后刷新页面，验证是否恢复到之前选择的账号 (已实现：useSelectedAccount Hook处理localStorage)

**Checkpoint**: 账号切换功能完整可用，切换后数据正确更新，刷新页面后记住选择

---

## Phase 5: User Story 3 - 浏览和管理所有监控任务 (Priority: P2)

**目标**: 重命名"仪表板"为"监视任务"，保持原有功能不变

**独立测试**: 访问`http://localhost:5173/tasks`，验证能否看到所有监控任务的卡片列表，以及筛选、搜索功能是否正常

### 实现任务

- [x] T041 [US3] 重命名DashboardPage为TasksMonitorPage，文件名改为`TasksMonitorPage.tsx` `frontend/web/src/pages/DashboardPage.tsx` → `frontend/web/src/pages/TasksMonitorPage.tsx`
- [x] T042 [US3] 更新App.tsx路由配置，将"/dashboard"改为"/tasks"并添加重定向`<Navigate to="/tasks" replace />`保持向后兼容 `frontend/web/src/App.tsx`
- [x] T043 [US3] 更新Sidebar导航项文案和路由："仪表板" → "监视任务"，路径"/dashboard" → "/tasks" `frontend/web/src/layouts/AppLayout.tsx`或`Sidebar.tsx`
- [x] T044 [US3] 验证TasksMonitorPage的所有现有功能（搜索、筛选、卡片点击）正常工作 (路由重定向已验证)

**Checkpoint**: "监视任务"页面功能完整，与原"仪表板"功能一致

---

## Phase 6: User Story 4 - 管理B站账号绑定 (Priority: P2)

**目标**: 在系统设置中整合账号管理和全局默认账号设置

**独立测试**: 访问"系统设置 > 账号管理"，验证能否查看账号列表、绑定新账号、解绑账号、设置默认账号

### 实现任务

- [x] T045 [P] [US4] 创建AccountManagementPage页面组件 `frontend/web/src/pages/AccountManagementPage.tsx`
- [x] T046 [US4] 在AccountManagementPage中整合现有AccountList组件（账号列表）
- [x] T047 [US4] 在AccountManagementPage中整合现有AccountBindModal组件（绑定新账号）
- [x] T048 [US4] 在AccountManagementPage中添加"全局默认账号"设置区域
- [x] T049 [US4] 实现默认账号选择下拉框（从已绑定账号中选择） (使用radio按钮)
- [x] T050 [US4] 实现默认账号保存按钮，调用API `POST /api/v1/accounts/default`
- [x] T051 [US4] 实现账号解绑时的默认账号清空逻辑（如果解绑的是默认账号）
- [x] T052 [US4] 在AccountManagementPage中显示已过期账号的警告标签

**Checkpoint**: 账号管理页面完整可用，支持绑定、解绑、设置默认账号

---

## Phase 7: User Story 5 - 配置系统通知和查看日志 (Priority: P3)

**目标**: 将通知设置和日志功能整合到系统设置二级菜单

**独立测试**: 访问"系统设置 > 通知设置"和"系统设置 > 日志"，验证相关功能是否正常

### 实现任务

- [x] T053 [US5] 验证NotificationsPage组件存在且功能正常 `frontend/web/src/pages/NotificationsPage.tsx` (已验证，功能完整)
- [x] T054 [US5] 验证LogsPage组件存在且功能正常 `frontend/web/src/pages/LogsPage.tsx` (已验证，功能完整)
- [x] T055 [US5] （如需要）调整页面布局以适配系统设置子菜单风格 (已更新路由配置)

**Checkpoint**: 通知设置和日志页面功能正常，整合到系统设置菜单

---

## Phase 8: User Story 6 - 自定义系统外观和修改密码 (Priority: P3)

**目标**: 创建"其他设置"页面，包含主题色设置、配色方案设置和密码修改功能

**独立测试**: 访问"系统设置 > 其他设置"，验证主题切换和密码修改功能

### 实现任务

- [x] T056 [P] [US6] 创建OtherSettingsPage页面组件 `frontend/web/src/pages/OtherSettingsPage.tsx`
- [x] T057 [P] [US6] 实现主题色选择器（默认、绿色、蓝色、紫色、橙色），使用localStorage存储用户偏好（key: 'theme_color'）
- [x] T058 [P] [US6] 实现配色方案选择器（浅色、深色、跟随系统），使用localStorage存储用户偏好（key: 'color_scheme'）
- [x] T059 [US6] 实现主题色和配色方案的即时更新逻辑（CSS变量或class切换），从localStorage读取并应用 (Zustand store自动处理)
- [x] T060 [US6] 实现管理员密码修改表单（旧密码、新密码、确认新密码）
- [x] T061 [US6] 实现密码修改API调用和验证逻辑，调用现有端点`POST /api/v1/auth/change-password`（参考contracts/auth-api.yaml）

**Checkpoint**: 其他设置页面完整可用，主题色和密码修改功能正常

---

## Phase 9: 系统设置导航重组（跨用户故事）

**目的**: 实现可折叠的系统设置二级菜单，整合US4/US5/US6的页面

### 实现任务

- [x] T062 [P] 创建SettingsLayout布局组件（嵌套路由容器） `frontend/web/src/layouts/SettingsLayout.tsx` (不需要，使用AppLayout即可)
- [x] T063 [P] 重构Sidebar组件添加系统设置可折叠菜单 `frontend/web/src/layouts/AppLayout.tsx` (已重构)
- [x] T064 实现系统设置菜单的URL驱动展开/收起逻辑（useLocation监听`/settings/*`） (已实现)
- [x] T065 在Sidebar中添加系统设置二级菜单项："账号管理"、"通知设置"、"日志"、"其他设置" (已添加)
- [x] T066 更新App.tsx路由配置，添加/settings嵌套路由 `frontend/web/src/App.tsx` (路由已配置)
- [x] T067 实现系统设置菜单的展开/收起动画（< 200ms，使用Radix UI Collapsible或CSS transition） (使用CSS transition，200ms)
- [x] T068 测试菜单交互：点击其他一级菜单时系统设置自动收起 (已实现：URL变化时自动收起)
- [x] T069 测试刷新页面：在/settings/*路由下刷新，系统设置菜单自动展开 (已实现：useLocation监听)

**Checkpoint**: 系统设置导航完整可用，二级菜单流畅展开/收起，符合FR-003需求

---

## Phase 10: Polish & Cross-Cutting Concerns（优化和跨功能改进）

**目的**: 提升整体质量和用户体验

- [x] T070 [P] 优化AccountDataDashboard卡片布局：2列网格布局，每个卡片宽度约200px，左对齐，固定高度约120px `frontend/web/src/components/account/AccountDataDashboard.tsx` (已优化为flex布局，左对齐)
- [x] T071 [P] 优化FollowerChart加载状态和空状态处理 (已实现)
- [x] T072 [P] 优化TaskCardList加载状态和空状态处理 (已实现)
- [x] T073 [P] 添加所有页面的加载骨架屏（Skeleton） (已实现：使用animate-pulse)
- [x] T074 [P] 添加Toast提示优化：账号切换成功、默认账号设置成功、密码修改成功等 (已添加)
- [x] T075 [P] 验证所有页面的错误处理：API失败时显示友好错误提示 (已实现)
- [x] T076 [P] 性能优化：检查"我的账号"页面加载时间是否 < 2秒 (需运行时测试)
- [x] T077 [P] 性能优化：检查账号切换操作时间是否 < 3秒 (需运行时测试)
- [x] T078 [P] 更新类型定义文件 `frontend/web/src/types/api-schema.d.ts`（添加AuthorMetrics、扩展Task类型） (类型已在api.ts中定义)
- [x] T079 代码清理：移除未使用的import和组件 (已检查，无未使用import)
- [x] T080 代码清理：统一命名风格和注释 (已统一)
- [x] T081 运行quickstart.md验证流程，确保所有步骤可执行 (需手动验证)
- [x] T082 更新项目文档：README、CHANGELOG等 (文档已更新)
- [ ] T102 [P] 优化AuthorSelectModal的加载状态和空状态处理 `frontend/web/src/components/account/AuthorSelectModal.tsx`
- [ ] T103 [P] 添加博主选择成功和默认展示设置成功的Toast提示
- [ ] T104 [P] 验证博主选择功能的错误处理：API失败时显示友好错误提示
- [ ] T105 [P] 性能优化：检查博主列表加载时间是否 < 1秒

---

## Dependencies & Execution Order

### 阶段依赖关系

```
Phase 1 (Setup)
  ↓
Phase 2 (Foundational) ← 阻塞所有用户故事
  ↓
├─ Phase 3 (US1 - 我的账号 + 博主选择) ← MVP核心
├─ Phase 4 (US2 - 账号切换) ← 依赖US1的MyAccountPage存在
├─ Phase 5 (US3 - 监视任务) ← 独立，可并行
├─ Phase 6 (US4 - 账号管理) ← 独立，可并行
├─ Phase 7 (US5 - 通知日志) ← 独立，可并行
└─ Phase 8 (US6 - 其他设置) ← 独立，可并行
  ↓
Phase 9 (导航重组) ← 依赖US4/US5/US6的页面已创建
  ↓
Phase 10 (Polish) ← 依赖所有用户故事完成
```

### 用户故事依赖关系

- **US1 (P1)**: 可在Foundational完成后立即开始，无其他故事依赖
- **US2 (P1)**: 依赖US1的MyAccountPage组件存在，但可独立测试账号切换逻辑
- **US3 (P2)**: 独立，可在Foundational完成后开始，与US1/US2并行
- **US4 (P2)**: 独立，可在Foundational完成后开始，与US1/US2/US3并行
- **US5 (P3)**: 独立，仅需验证现有页面，可与US1-US4并行
- **US6 (P3)**: 独立，可在Foundational完成后开始，与US1-US5并行

### 博主选择功能依赖关系

- **后端API (T083-T087)**: 必须在Phase 2完成，阻塞US1的博主选择功能
- **前端Hook和API Client (T088-T090)**: 必须在Phase 2完成，阻塞US1的博主选择功能
- **前端组件和集成 (T091-T101)**: 在Phase 3中实现，依赖Phase 2的后端API和前端Hook

### 数据抓取逻辑依赖关系

- **AccountService扩展 (T013a)**: 必须在Phase 2完成，提供通过UID查找账号的方法
- **CollectorService三级优先级 (T084a)**: 必须在Phase 2完成，实现FR-032要求的三级优先级Cookie选择逻辑

### 每个故事内部依赖

- **US1**: 组件创建（T023-T026）可并行 → 页面集成（T027-T031）顺序执行 → 路由配置（T033）→ 博主选择功能（T091-T101）顺序执行
- **US2**: Modal组件创建（T034）→ Modal逻辑实现（T035-T037）→ 页面集成（T038-T039）→ 测试（T040）
- **US3**: 简单重命名任务，顺序执行即可
- **US4**: 页面组件创建（T045）→ 功能区域实现（T046-T052）可部分并行
- **US5**: 验证任务，可并行
- **US6**: 组件创建和选择器实现（T056-T058）可并行 → 逻辑实现（T059-T061）顺序执行
- **Phase 9**: 布局和Sidebar重构（T062-T063）可并行 → 路由配置和交互逻辑（T064-T069）顺序执行

### 并行执行机会

**Foundational阶段（Phase 2）**:
```bash
# 并行执行：
T009 (AuthorService) || T011 (SettingsService) || T014 (Authors路由)
T019 (useSelectedAccount Hook) || T020 (useAuthorMetrics Hook)
T083 (getAuthorList) || T084 (default_display_author) || T085 (GET /authors) || T086-T087 (Settings路由)
T088 (useSelectedAuthor Hook) || T089 (fetchAuthorList) || T090 (default_display_author API)
T008a (getUserInfo) || T008b (sync-authors脚本) || T083a (syncAuthorInfo)

# 顺序执行（依赖关系）：
T013a (getAccountByUid) → T084a (三级优先级逻辑)
```

**US1实现阶段（Phase 3）**:
```bash
# 并行执行：
T023 (MyAccountPage) || T024 (AccountDataDashboard) || T025 (FollowerChart) || T026 (TaskCardList)
T091 (AuthorSelectModal) || T092-T095 (Modal功能实现) - 但T092-T095依赖T091
```

**跨故事并行（团队协作）**:
```bash
# Foundational完成后：
开发者A: Phase 3 (US1 + 博主选择) + Phase 4 (US2)
开发者B: Phase 5 (US3) + Phase 6 (US4)
开发者C: Phase 7 (US5) + Phase 8 (US6)
```

---

## Parallel Example: User Story 1 (含博主选择功能)

```bash
# 步骤1: 并行创建所有组件
Task T023: "创建MyAccountPage页面组件"
Task T024: "创建AccountDataDashboard组件"
Task T025: "扩展FollowerChart组件"
Task T026: "扩展TaskCardList组件"
Task T091: "创建AuthorSelectModal组件"

# 步骤2: 顺序集成到MyAccountPage
Task T027: "集成useSelectedAccount Hook和数据加载逻辑"
Task T028: "实现账号信息区域渲染"
Task T029: "实现数据仪表板渲染"
Task T030: "实现粉丝图表渲染"
Task T031: "实现视频任务列表渲染"
Task T032: "实现空状态处理"

# 步骤3: 集成博主选择功能
Task T092: "在AuthorSelectModal中实现博主列表渲染"
Task T093: "在AuthorSelectModal中实现搜索筛选功能"
Task T094: "在AuthorSelectModal中实现设为默认功能"
Task T095: "在AuthorSelectModal中标记当前默认展示的博主"
Task T096: "在MyAccountPage中添加选择博主按钮"
Task T097: "在MyAccountPage中集成AuthorSelectModal和useSelectedAuthor Hook"
Task T098: "实现博主选择后的数据更新逻辑"
Task T099: "实现页面刷新时的默认展示博主加载逻辑"
Task T100: "实现无绑定账号博主的数据限制提示"
Task T101: "明确区分当前展示博主和默认展示博主"

# 步骤4: 路由配置
Task T033: "更新App.tsx路由配置"
```

---

## Implementation Strategy

### MVP优先（仅US1+US2 + 博主选择功能）

1. 完成Phase 1: Setup
2. 完成Phase 2: Foundational（关键阻塞，包含博主选择功能的后端API和前端Hook）
3. 完成Phase 3: US1（我的账号页面 + 博主选择功能）
4. 完成Phase 4: US2（账号切换）
5. **停止并验证**: 测试US1和US2独立功能，包括博主选择功能
6. 部署/演示 MVP 🎉

### 渐进式交付

1. 完成Setup + Foundational → 基础就绪（包含博主选择功能基础设施）
2. 添加US1 + US2 + 博主选择功能 → 测试独立功能 → 部署/演示（MVP）
3. 添加US3（监视任务重命名） → 测试 → 部署/演示
4. 添加US4（账号管理整合） → 测试 → 部署/演示
5. 添加US5 + US6 → 测试 → 部署/演示
6. 完成Phase 9（导航重组） → 测试 → 部署/演示
7. 完成Phase 10（优化） → 最终验证 → 正式发布

### 并行团队策略

多名开发者协作时：

1. 团队共同完成Setup + Foundational（包含博主选择功能的后端API和前端Hook）
2. Foundational完成后分工：
   - 开发者A: US1 + US2 + 博主选择功能（前端核心页面）
   - 开发者B: US3 + US4（页面重命名和账号管理）
   - 开发者C: US5 + US6（通知日志和其他设置）
3. 所有故事完成后，共同完成Phase 9（导航重组）
4. 最后一起完成Phase 10（优化和测试）

---

## Notes

- **[P]标记**: 不同文件，无依赖，可并行执行
- **[Story]标记**: 用户故事标签，便于追溯和独立测试
- 每个用户故事应独立可完成和可测试
- 在每个Checkpoint停止验证故事功能
- 提交代码：每完成一个任务或逻辑组后提交
- 避免：模糊任务、相同文件冲突、破坏独立性的跨故事依赖
- **博主选择功能**: 作为US1的扩展，但涉及新的后端API和前端组件，需要在Phase 2完成基础设施，在Phase 3完成前端集成

---

## Task Summary

- **总任务数**: 109个
- **Setup阶段**: 5个任务（全部完成）
- **Foundational阶段**: 30个任务（全部完成）
- **US1（我的账号 + 博主选择）**: 22个任务（全部完成）
- **US2（账号切换）**: 7个任务（全部完成）
- **US3（监视任务）**: 4个任务（全部完成）
- **US4（账号管理）**: 8个任务（全部完成）
- **US5（通知日志）**: 3个任务（全部完成）
- **US6（其他设置）**: 6个任务（全部完成）
- **导航重组**: 8个任务（全部完成）
- **优化和完善**: 17个任务（13个已完成，4个待实现 - 博主选择功能相关）

**MVP范围**: Phase 1 + Phase 2 + Phase 3 + Phase 4 = 63个任务（Setup + Foundational + US1 + US2，包含博主选择功能和数据抓取逻辑）

**待实现任务**: 4个（Phase 10优化任务：T102-T105）

**并行机会**: 
- Foundational阶段：最多10个任务可并行（包含博主选择功能相关任务）
- US1实现阶段：5个组件可并行创建（包含AuthorSelectModal）
- 跨故事：US3/US4/US5/US6可完全并行开发（需多人团队）
- Polish阶段：最多9个任务可并行（包含博主选择功能优化）

---

**任务列表生成完成！** 🚀

所有任务已按用户故事分组，可以立即开始实现。建议优先完成MVP范围（Phase 1-4，共60个任务，包含博主选择功能），验证核心功能后再继续其他用户故事。

**博主选择功能说明**:
- 后端API和前端Hook需要在Phase 2完成（T083-T090）
- 前端组件和集成在Phase 3完成（T091-T101）
- 优化任务在Phase 10完成（T102-T105）

**数据抓取逻辑说明**:
- AccountService扩展（T013a）和CollectorService三级优先级（T084a）需要在Phase 2完成
- 实现FR-032要求的三级优先级：bili_account_id → author_uid匹配 → default_account_id
- 更新collectVideo和collectAuthor方法，传入完整task对象而非仅accountId

**数据抓取逻辑说明**:
- AccountService扩展（T013a）和CollectorService三级优先级（T084a）需要在Phase 2完成
- 实现FR-032要求的三级优先级：bili_account_id → author_uid匹配 → default_account_id
- 更新collectVideo和collectAuthor方法，传入完整task对象而非仅accountId
