# Tasks: 前端导航结构重组

**Input**: Design documents from `/specs/006-navigation-restructure/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo (this project)**:  
  - 前端 Web 应用：`frontend/web/src/`  
  - 后端服务（Bun 运行时）：`backend/src/`  
- 具体路径必须与 plan.md 中选定的实际结构一致，任务描述中应写明完整相对路径

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 数据库迁移和基础设施准备

- [ ] T001 备份当前数据库 `backend/data/dev/bili-stats-dev.db` → `backend/data/dev/bili-stats-dev.db.backup`
- [ ] T002 [P] 扩展SQLite schema在 `backend/src/db/schema.ts`：添加tasks表的author_uid和bili_account_id字段
- [ ] T003 [P] 扩展PostgreSQL schema在 `backend/src/db/schema-pg.ts`：同步添加author_uid和bili_account_id字段
- [ ] T004 生成数据库迁移脚本：执行 `bun run drizzle-kit generate:sqlite`，生成 `backend/src/db/migrations/0001_add_author_fields.sql`
- [ ] T005 执行数据库迁移：运行 `bun run db:migrate`，应用schema变更到开发数据库
- [ ] T006 [P] 创建数据回填脚本 `backend/src/scripts/backfill-author-uid.ts`，从B站API获取现有任务的author_uid
- [ ] T007 执行数据回填脚本：运行 `bun run src/scripts/backfill-author-uid.ts`，填充所有任务的author_uid字段
- [ ] T008 验证数据迁移：检查所有任务的author_uid已填充，无NULL值

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 核心服务层和API端点扩展，为所有用户故事提供数据支持

**⚠️ CRITICAL**: 所有用户故事的前端开发都依赖这些后端API

### Backend Services

- [ ] T009 [P] 创建Settings Service在 `backend/src/services/settings.ts`：实现getDefaultAccountId()和setDefaultAccountId()方法
- [ ] T010 [P] 创建Author Service在 `backend/src/services/author.ts`：实现getAuthorMetrics()方法（聚合查询粉丝历史数据）
- [ ] T011 扩展Task Service在 `backend/src/services/task.ts`：添加getTasksByAuthorUid()方法
- [ ] T012 在Settings Service中添加default_account_id初始化逻辑：如果settings表中没有该记录，插入空字符串

### Backend API Routes

- [ ] T013 创建Authors路由 `backend/src/routes/authors.ts`：实现GET /api/v1/authors/:uid/metrics端点
- [ ] T014 扩展Tasks路由 `backend/src/routes/tasks.ts`：添加author_uid查询参数支持到GET /api/v1/tasks
- [ ] T015 扩展Accounts路由 `backend/src/routes/accounts.ts`：实现GET /api/v1/accounts/default和POST /api/v1/accounts/default端点
- [ ] T016 在 `backend/src/index.ts` 中注册Authors路由：`app.route('/api/v1/authors', authorsRouter)`

### Backend Data Access

- [ ] T017 创建索引：在tasks表的author_uid字段上添加索引（已在迁移SQL中，验证生效）
- [ ] T018 [P] 优化author_metrics表查询：添加索引idx_author_metrics_collected_at（如需要）

**Checkpoint**: 后端API准备就绪 - 前端可以开始并行开发各用户故事

---

## Phase 3: User Story 1 - 查看当前账号的数据概览和监控任务 (Priority: P1) 🎯 MVP

**Goal**: 用户能在"我的账号"页面看到已选择账号的数据仪表板、粉丝图表和视频任务列表

**Independent Test**: 绑定至少一个B站账号后，访问"我的账号"页面，验证能否看到账号信息、数据指标卡片、粉丝折线图和任务卡片列表

### Frontend State Management

- [ ] T019 [P] [US1] 扩展Zustand Store在 `frontend/web/src/store/uiSelection.ts`：添加selectedAccountId字段和setSelectedAccountId方法
- [ ] T020 [P] [US1] 创建useSelectedAccount Hook在 `frontend/web/src/hooks/useSelectedAccount.ts`：实现localStorage持久化和fallback逻辑
- [ ] T021 [P] [US1] 创建useAuthorMetrics Hook在 `frontend/web/src/hooks/useAuthorMetrics.ts`：调用GET /api/v1/authors/:uid/metrics获取粉丝数据

### Frontend API Client

- [ ] T022 [US1] 扩展API Client在 `frontend/web/src/lib/api.ts`：添加getAuthorMetrics(uid, from?, to?)方法
- [ ] T023 [US1] 扩展API Client在 `frontend/web/src/lib/api.ts`：添加getTasksByAuthorUid(uid, page, pageSize)方法

### Frontend Components - Account Info

- [ ] T024 [P] [US1] 创建AccountInfoCard组件在 `frontend/web/src/components/account/AccountInfoCard.tsx`：显示账号头像、昵称、UID
- [ ] T025 [P] [US1] 创建AccountSwitchButton组件在 `frontend/web/src/components/account/AccountSwitchButton.tsx`：触发AccountSwitchModal

### Frontend Components - Data Dashboard

- [ ] T026 [P] [US1] 创建DataDashboardCard组件在 `frontend/web/src/components/account/DataDashboardCard.tsx`：单个数据指标卡片（粉丝数或视频数）
- [ ] T027 [US1] 创建AccountDataDashboard组件在 `frontend/web/src/components/account/AccountDataDashboard.tsx`：整合两个DataDashboardCard（粉丝数+视频总数）

### Frontend Components - Follower Chart

- [ ] T028 [US1] 复用并优化FollowerChart组件在 `frontend/web/src/components/charts/FollowerChart.tsx`：适配author_uid维度的数据（之前可能是task维度）

### Frontend Components - Task List

- [ ] T029 [P] [US1] 创建TaskCard组件在 `frontend/web/src/components/tasks/TaskCard.tsx`：单个任务卡片（如已有则复用）
- [ ] T030 [US1] 扩展TaskCardList组件在 `frontend/web/src/components/tasks/TaskCardList.tsx`：支持按author_uid筛选任务

### Frontend Page

- [ ] T031 [US1] 创建MyAccountPage在 `frontend/web/src/pages/MyAccountPage.tsx`：整合AccountInfoCard、AccountDataDashboard、FollowerChart、TaskCardList四个区域
- [ ] T032 [US1] 添加空状态处理到MyAccountPage：当用户未绑定账号时显示引导提示

**Checkpoint**: User Story 1 完成 - 用户可以查看单个账号的完整数据概览

---

## Phase 4: User Story 2 - 切换不同账号查看对应数据 (Priority: P1)

**Goal**: 用户能在"我的账号"页面点击切换账号按钮，选择其他已绑定账号，页面数据自动刷新

**Independent Test**: 绑定多个B站账号后，在"我的账号"页面点击切换按钮，验证Modal显示账号列表，选择后页面数据是否更新为新账号的数据

### Frontend Components - Account Switch Modal

- [ ] T033 [P] [US2] 创建AccountListItem组件在 `frontend/web/src/components/account/AccountListItem.tsx`：Modal中的单个账号项（昵称、UID、头像、状态）
- [ ] T034 [US2] 创建AccountSwitchModal组件在 `frontend/web/src/components/account/AccountSwitchModal.tsx`：显示已绑定账号列表，支持选择切换

### Frontend Integration

- [ ] T035 [US2] 在AccountSwitchButton组件中集成AccountSwitchModal：点击按钮时打开Modal
- [ ] T036 [US2] 在MyAccountPage中监听selectedAccountId变化：当账号切换时重新fetch数据（数据仪表板、粉丝图表、任务列表）
- [ ] T037 [US2] 添加Toast提示到账号切换逻辑：账号解绑时显示警告，切换成功时可选显示提示

### Frontend Edge Cases

- [ ] T038 [US2] 处理只有一个账号的情况：Modal显示唯一账号，同时提示"可前往系统设置绑定更多账号"
- [ ] T039 [US2] 处理账号Cookie已过期的情况：在AccountListItem中显示"已过期"标签

**Checkpoint**: User Story 2 完成 - 用户可以在多个账号之间无缝切换

---

## Phase 5: User Story 3 - 浏览和管理所有监控任务 (Priority: P2)

**Goal**: 用户能访问"监视任务"页面（原仪表板），查看所有监控任务，不限于特定账号

**Independent Test**: 访问"监视任务"页面，验证能否看到所有任务卡片，以及搜索、筛选功能是否正常

### Frontend Page Refactoring

- [ ] T040 [US3] 重命名DashboardPage为TasksMonitorPage：修改文件 `frontend/web/src/pages/DashboardPage.tsx` → `frontend/web/src/pages/TasksMonitorPage.tsx`
- [ ] T041 [US3] 更新路由配置在 `frontend/web/src/App.tsx`：将/dashboard路由改为/tasks，组件使用TasksMonitorPage
- [ ] T042 [US3] 验证TasksMonitorPage的现有功能：确认搜索、筛选、任务卡片点击等功能保持不变

**Checkpoint**: User Story 3 完成 - 全局任务视图功能保持正常

---

## Phase 6: User Story 4 - 管理B站账号绑定 (Priority: P2)

**Goal**: 用户能在"系统设置 > 账号管理"页面查看所有账号、绑定新账号、解绑账号、设置全局默认账号

**Independent Test**: 访问"系统设置 > 账号管理"，验证账号列表显示、绑定新账号、解绑账号、设置默认账号功能是否正常

### Frontend Components - Settings Navigation

- [ ] T043 [P] [US4] 创建SettingsMenu组件在 `frontend/web/src/components/navigation/SettingsMenu.tsx`：可折叠的二级菜单（账号管理、通知设置、日志、其他设置）
- [ ] T044 [US4] 扩展Sidebar组件在 `frontend/web/src/components/navigation/Sidebar.tsx`：集成SettingsMenu，实现URL驱动的展开/收起逻辑

### Frontend Routes - Settings Layout

- [ ] T045 [US4] 创建SettingsLayout在 `frontend/web/src/layouts/SettingsLayout.tsx`：系统设置的嵌套路由容器（使用React Router Outlet）
- [ ] T046 [US4] 更新App路由配置在 `frontend/web/src/App.tsx`：添加/settings嵌套路由（/settings/accounts, /settings/notifications, /settings/logs, /settings/other）

### Frontend Pages - Account Management

- [ ] T047 [P] [US4] 创建DefaultAccountSelector组件在 `frontend/web/src/components/account/DefaultAccountSelector.tsx`：全局默认账号选择器（下拉菜单+保存按钮）
- [ ] T048 [US4] 创建AccountManagementPage在 `frontend/web/src/pages/AccountManagementPage.tsx`：整合原AccountsPage的账号列表 + DefaultAccountSelector
- [ ] T049 [US4] 移除原AccountsPage的独立路由：从App路由中删除/accounts路由，功能迁移到/settings/accounts

### Frontend API Client - Default Account

- [ ] T050 [US4] 扩展API Client在 `frontend/web/src/lib/api.ts`：添加getDefaultAccountId()和setDefaultAccountId(accountId)方法

### Frontend Integration - Default Account Logic

- [ ] T051 [US4] 在DefaultAccountSelector中实现加载和保存逻辑：调用getDefaultAccountId()初始化，调用setDefaultAccountId()保存用户选择
- [ ] T052 [US4] 在AccountManagementPage中添加解绑警告：当用户解绑全局默认账号时，显示警告Toast并清空默认账号设置
- [ ] T053 [US4] 在AccountList组件中移除解绑按钮：将解绑功能移到AccountManagementPage（或保留但移动到设置页面的上下文中）

**Checkpoint**: User Story 4 完成 - 账号管理功能整合到系统设置，支持默认账号配置

---

## Phase 7: User Story 5 - 配置系统通知和查看日志 (Priority: P3)

**Goal**: 用户能在"系统设置 > 通知设置"和"系统设置 > 日志"页面访问对应功能

**Independent Test**: 访问"系统设置 > 通知设置"和"系统设置 > 日志"，验证原有功能是否正常

### Frontend Pages - Settings Submenu

- [ ] T054 [P] [US5] 确认NotificationsPage位置：验证 `frontend/web/src/pages/NotificationsPage.tsx` 已存在，无需修改
- [ ] T055 [P] [US5] 确认LogsPage位置：验证 `frontend/web/src/pages/LogsPage.tsx` 已存在或创建（如不存在）
- [ ] T056 [US5] 更新App路由配置在 `frontend/web/src/App.tsx`：确认/settings/notifications和/settings/logs路由已添加

**Checkpoint**: User Story 5 完成 - 通知设置和日志功能可通过系统设置二级菜单访问

---

## Phase 8: User Story 6 - 自定义系统外观和修改密码 (Priority: P3)

**Goal**: 用户能在"系统设置 > 其他设置"页面调整主题色、配色方案，以及修改管理员密码

**Independent Test**: 访问"系统设置 > 其他设置"，验证主题切换、配色方案切换、密码修改功能是否正常

### Frontend Pages - Other Settings

- [ ] T057 [P] [US6] 创建ThemeSelector组件在 `frontend/web/src/components/settings/ThemeSelector.tsx`：主题色选择器（默认、绿色、蓝色、紫色、橙色）
- [ ] T058 [P] [US6] 创建ColorSchemeSelector组件在 `frontend/web/src/components/settings/ColorSchemeSelector.tsx`：配色方案选择器（浅色、深色、跟随系统）
- [ ] T059 [P] [US6] 创建PasswordChangeForm组件在 `frontend/web/src/components/settings/PasswordChangeForm.tsx`：密码修改表单（旧密码、新密码、确认新密码）
- [ ] T060 [US6] 创建OtherSettingsPage在 `frontend/web/src/pages/OtherSettingsPage.tsx`：整合ThemeSelector、ColorSchemeSelector、PasswordChangeForm

### Frontend Theme Logic

- [ ] T061 [US6] 实现主题切换逻辑：在ThemeSelector中调用TailwindCSS或CSS变量修改主题色
- [ ] T062 [US6] 实现配色方案切换逻辑：在ColorSchemeSelector中修改dark/light模式（localStorage持久化）
- [ ] T063 [US6] 实现密码修改逻辑：在PasswordChangeForm中调用POST /api/v1/auth/change-password端点

**Checkpoint**: User Story 6 完成 - 用户可以自定义系统外观和修改密码

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 优化、测试和文档完善

### Performance Optimization

- [ ] T064 [P] 验证账号切换性能：测试切换账号后页面数据加载时间 < 3秒
- [ ] T065 [P] 验证数据仪表板渲染性能：测试"我的账号"页面完整渲染时间 < 2秒
- [ ] T066 [P] 验证系统设置菜单动画性能：测试展开/收起动画时间 < 200ms

### Edge Cases & Error Handling

- [ ] T067 优化localStorage fallback体验：在useSelectedAccount中添加详细的Toast提示
- [ ] T068 处理粉丝数据为空的情况：在FollowerChart中显示"暂无数据"占位图
- [ ] T069 处理账号Cookie即将过期的情况：在AccountManagementPage中显示过期提醒（距离过期 < 7天）

### Documentation

- [ ] T070 [P] 更新quickstart.md在 `specs/006-navigation-restructure/quickstart.md`：补充前端开发启动步骤
- [ ] T071 [P] 创建迁移验证文档在 `backend/docs/MIGRATION_006.md`：记录数据库迁移步骤和验证方法

### Testing (Optional - 基于实际需求决定)

- [ ] T072 [P] 为useSelectedAccount Hook编写单元测试在 `frontend/web/src/hooks/useSelectedAccount.test.ts`
- [ ] T073 [P] 为AuthorService编写单元测试在 `backend/src/services/author.test.ts`
- [ ] T074 [P] 为GET /api/v1/authors/:uid/metrics编写集成测试在 `backend/tests/integration/authors.test.ts`

### Final Validation

- [ ] T075 运行quickstart.md验证：按照quickstart.md完整测试所有用户故事
- [ ] T076 代码清理和重构：移除未使用的导入、注释、调试代码
- [ ] T077 更新.gitignore（如需要）：确保迁移备份文件不被提交

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 - 立即开始
- **Foundational (Phase 2)**: 依赖Setup完成 - 阻塞所有用户故事
- **User Stories (Phase 3-8)**: 全部依赖Foundational完成
  - US1 & US2 (P1): 可并行开发（如有多人）或按优先级顺序执行
  - US3 (P2): 可独立开发，不依赖US1/US2
  - US4 (P2): 可独立开发，但建议在US1/US2后（需要账号列表数据）
  - US5 & US6 (P3): 可独立开发
- **Polish (Phase 9)**: 依赖所有期望的用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Setup + Foundational完成后即可开始 - 无其他故事依赖
- **User Story 2 (P1)**: Setup + Foundational完成后即可开始 - 依赖US1的MyAccountPage（在同一页面扩展）
- **User Story 3 (P2)**: Setup + Foundational完成后即可开始 - 无其他故事依赖（仅重命名和路由调整）
- **User Story 4 (P2)**: Setup + Foundational完成后即可开始 - 无其他故事依赖（独立的设置页面）
- **User Story 5 (P3)**: Setup + Foundational完成后即可开始 - 无其他故事依赖（已有页面迁移）
- **User Story 6 (P3)**: Setup + Foundational完成后即可开始 - 无其他故事依赖（独立的设置页面）

### Within Each User Story

**US1典型流程**:
1. 并行: T019(Zustand), T020(Hook), T021(Hook), T024(Component), T025(Component), T026(Component)
2. 顺序: T022(API) → T023(API) → T027(Dashboard) → T028(Chart) → T029(TaskCard) → T030(TaskList) → T031(Page) → T032(Empty State)

**US2典型流程**:
1. 并行: T033(AccountListItem)
2. 顺序: T034(Modal) → T035(Button Integration) → T036(Page Integration) → T037(Toast) → T038(Edge Case) → T039(Edge Case)

### Parallel Opportunities

- **Setup Phase**: T002(SQLite schema) 和 T003(PostgreSQL schema) 可并行
- **Foundational Phase**: T009(Settings Service), T010(Author Service) 可并行
- **US1**: T019-T026(所有标[P]的任务) 可并行开发
- **US4**: T043(SettingsMenu) 和 T047(DefaultAccountSelector) 可并行开发
- **US6**: T057(Theme), T058(ColorScheme), T059(Password) 可并行开发
- **Polish Phase**: 所有标[P]的任务可并行执行

---

## Parallel Example: User Story 1

```bash
# 并行开发US1的核心组件（需要3名开发者）:
Developer A:
  - T019: Zustand Store扩展
  - T024: AccountInfoCard
  - T027: AccountDataDashboard

Developer B:
  - T020: useSelectedAccount Hook
  - T025: AccountSwitchButton
  - T028: FollowerChart优化

Developer C:
  - T021: useAuthorMetrics Hook
  - T026: DataDashboardCard
  - T029: TaskCard
  
# 然后顺序集成:
All Developers:
  - T022-T023: API Client扩展
  - T030: TaskCardList
  - T031: MyAccountPage整合
  - T032: 空状态处理
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. ✅ 完成Phase 1: Setup（数据库迁移）
2. ✅ 完成Phase 2: Foundational（后端API准备）
3. ✅ 完成Phase 3: User Story 1（我的账号页面）
4. ✅ 完成Phase 4: User Story 2（账号切换功能）
5. **STOP and VALIDATE**: 测试核心功能（账号数据概览+切换）
6. 如果满足需求，可先演示/部署

### Incremental Delivery

1. Setup + Foundational → 基础设施就绪
2. 添加US1 + US2 → 测试独立 → 部署/演示（MVP!）
3. 添加US3 → 测试独立 → 部署/演示
4. 添加US4 → 测试独立 → 部署/演示
5. 添加US5 + US6 → 测试独立 → 部署/演示
6. 每个故事都增加价值，不破坏已有功能

### Parallel Team Strategy

如果有多名开发者：

1. 团队共同完成Setup + Foundational
2. Foundational完成后：
   - Developer A: User Story 1（前端）
   - Developer B: User Story 2（前端，集成US1）
   - Developer C: User Story 3 + 4（独立开发）
   - Developer D: User Story 5 + 6（独立开发）
3. 各故事独立完成并集成

---

## Notes

- [P] 标记 = 不同文件，无依赖，可并行执行
- [Story] 标记 = 将任务映射到具体用户故事，便于追溯
- 每个用户故事应该可以独立完成和测试
- 在每个Checkpoint停下来验证故事的独立功能
- 提交代码时按任务或逻辑组提交
- 避免：模糊任务、同文件冲突、破坏故事独立性的跨故事依赖

---

**任务总数**: 77个任务  
**估算时间**: 
- Setup (Phase 1): 4-6小时
- Foundational (Phase 2): 8-12小时
- US1 + US2 (MVP): 16-24小时
- US3-US6: 12-16小时
- Polish: 4-6小时
- **总计**: 约44-64小时（5-8个工作日，单人开发）

**MVP范围**: Phase 1 + Phase 2 + Phase 3 + Phase 4（约28-42小时）


