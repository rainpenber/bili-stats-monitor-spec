# Implementation Plan: 前端导航结构重组

**Branch**: `006-navigation-restructure` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/006-navigation-restructure/spec.md`

## Summary

本功能将前端导航结构从扁平化菜单重组为更合理的层级结构，核心包括：

1. **新增"我的账号"页面**: 展示当前选择账号的数据仪表板(粉丝数、监视视频总数)、粉丝变化图表、以及该账号发布的所有视频监控任务
2. **重命名"仪表板"为"监视任务"**: 保持原有全局任务视图功能不变
3. **系统设置重组**: 将"账号管理"、"通知设置"、"日志"、"其他设置"整合为可折叠的二级菜单
4. **后端数据模型扩展**: Tasks表添加`author_uid`和`bili_account_id`字段，Settings表添加`default_account_id`记录
5. **状态管理优化**: 使用Zustand存储当前选择账号ID，LocalStorage持久化用户选择

**技术方法**: 前端React路由重构 + Zustand状态扩展 + 后端数据库迁移 + API端点扩展(按author_uid筛选任务、粉丝历史数据聚合)

## Technical Context

**Language/Version**: 
- Frontend: TypeScript 5.x + React 18 + Vite 5
- Backend: TypeScript + Bun 1.x

**Primary Dependencies**:
- Frontend: React Router v6, Zustand, Recharts (图表), Radix UI, TailwindCSS
- Backend: Hono (web framework), Drizzle ORM, better-sqlite3

**Storage**: 
- Development: SQLite (`backend/data/dev/bili-stats-dev.db`)
- Production: PostgreSQL (dual database support via Drizzle)

**Testing**: 
- Frontend: Vitest + React Testing Library
- Backend: Bun test + integration tests

**Target Platform**: 
- Desktop browsers (Chrome/Firefox/Safari latest versions)
- 不涉及移动端适配

**Project Type**: Monorepo web application (frontend + backend)

**Performance Goals**:
- 账号切换操作 < 3秒 (含数据加载)
- 数据仪表板/图表/任务列表渲染 < 2秒
- 系统设置菜单展开/收起动画 < 200ms
- LocalStorage恢复账号选择 < 1秒
- 账号绑定/解绑后状态刷新 < 500ms

**Constraints**:
- 数据库迁移必须向后兼容，不能破坏现有tasks数据
- 现有API端点保持兼容，仅扩展不删除
- LocalStorage需处理账号解绑的fallback逻辑
- 粉丝数据需要按author_uid聚合(author_metrics表按task_id存储)

**Scale/Scope**:
- 预计用户同时绑定账号数 ≤ 10
- 单个账号的粉丝历史数据点 ≤ 10,000条
- 单个账号的视频任务数 ≤ 100个
- 前端新增/修改页面: 4个 (MyAccountPage新增, DashboardPage重命名, SettingsPage重组, AccountsPage整合)
- 后端新增API端点: 2个 (GET /api/v1/authors/:uid/metrics, GET /api/v1/tasks?author_uid=X)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Front-End First

**Status**: PASS

- ✅ **核心页面已描述**: "我的账号"页面包含账号信息区、数据仪表板(2个大数字卡片)、粉丝图表、视频任务列表四个区域
- ✅ **用户旅程已映射**: 
  - US1: 查看账号数据概览 → 我的账号页面渲染逻辑
  - US2: 切换账号 → AccountSwitchModal交互 → 页面数据刷新
  - US3: 浏览全局任务 → 监视任务页面(原仪表板)
  - US4: 账号管理 → 系统设置二级菜单 → 整合页面
- ✅ **从用户价值出发**: 优先定义"用户需要看到什么数据"(粉丝数、视频数)，而非"数据库存什么"

### ✅ API Contract Before Backend

**Status**: PASS (需在Phase 1完成contracts/)

- ✅ **前端交互已识别**:
  - 切换账号 → GET /api/v1/accounts (已有)
  - 加载账号数据 → GET /api/v1/authors/:uid/metrics (新增)
  - 加载账号任务 → GET /api/v1/tasks?author_uid=:uid (扩展现有端点)
  - 设置默认账号 → POST /api/v1/accounts/default (已有，需实现持久化)
- ⚠️ **合约待补充**: Phase 1将在contracts/目录创建OpenAPI文件，明确请求/响应结构、错误码、分页参数

### ✅ Bun Runtime Alignment

**Status**: PASS

- ✅ **后端依赖Bun兼容**: Hono、Drizzle ORM、better-sqlite3均可在Bun下运行
- ✅ **数据库迁移**: 使用Drizzle Kit生成迁移SQL，在Bun环境下执行
- ✅ **脚本运行**: `bun run db:migrate`, `bun run dev`均在Bun运行时执行
- ✅ **无兼容性风险**: 未引入Node.js特有特性

### ✅ Monorepo + pnpm + Vite

**Status**: PASS

- ✅ **目录结构清晰**:
  - `frontend/web/` - Vite React应用
  - `backend/` - Bun + Hono服务
  - `specs/` - 功能规格与计划
- ✅ **包管理统一**: pnpm workspace管理依赖
- ✅ **前端构建**: Vite提供开发服务器和生产构建
- ✅ **无结构调整**: 本功能不涉及目录重组

### ✅ Incremental Delivery & Simplicity

**Status**: PASS

- ✅ **用户故事可独立交付**:
  - P1-US1: "我的账号"页面 → 可独立演示账号数据仪表板
  - P1-US2: 账号切换功能 → 可独立演示Modal交互
  - P2-US3: "监视任务"重命名 → 不影响其他功能
  - P2-US4: 系统设置重组 → 可独立演示二级菜单
- ✅ **避免过早抽象**: 不引入新框架，复用现有组件(Card, Modal, Button等)
- ✅ **复杂度有据**: 数据库迁移是必要的(无现有author_uid字段)，已在clarifications中说明

### ⚠️ Layered Architecture & Separation of Concerns

**Status**: CONDITIONAL PASS (需在Phase 1确保服务层设计)

- ✅ **现有架构基础**: 
  - Routes: `backend/src/routes/accounts.ts`, `backend/src/routes/tasks.ts`
  - Services: `backend/src/services/account.ts`, `backend/src/services/task.ts`
  - 当前部分路由直接操作数据库(需重构)
- ⚠️ **待实现**: 
  - 确保新增的`GET /api/v1/tasks?author_uid=X`通过TaskService实现
  - 确保`GET /api/v1/authors/:uid/metrics`通过AuthorService实现(聚合author_metrics表)
  - 确保`POST /api/v1/accounts/default`的持久化逻辑通过SettingsService实现
- ✅ **不引入违反分层的代码**: Phase 1设计时将明确服务层方法签名

**Violations Requiring Justification**: 无

### Constitution Compliance Summary

| Check | Status | Notes |
|-------|--------|-------|
| Front-End First | ✅ PASS | 页面结构、交互流程已定义 |
| API Contract | ⚠️ IN PROGRESS | Phase 1完成contracts/ |
| Bun Runtime | ✅ PASS | 无兼容性风险 |
| Monorepo | ✅ PASS | 目录结构符合规范 |
| Incremental | ✅ PASS | 用户故事可独立交付 |
| Layered Arch | ⚠️ IN PROGRESS | Phase 1确保服务层设计 |

**Gate Result**: ✅ **PASS** - 可以进入Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/006-navigation-restructure/
├── plan.md                     # This file
├── spec.md                     # Feature specification
├── clarification-report.md     # Clarification session results
├── research.md                 # Phase 0 output (数据库迁移策略、聚合查询模式)
├── data-model.md               # Phase 1 output (Tasks/Settings表变更)
├── quickstart.md               # Phase 1 output (开发者快速上手指南)
├── contracts/                  # Phase 1 output (OpenAPI specs)
│   ├── tasks-api.yaml         # Tasks API扩展(author_uid筛选)
│   └── authors-api.yaml       # Authors API(粉丝数据)
├── checklists/
│   └── requirements.md         # Spec quality checklist
└── tasks.md                    # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── routes/
│   │   ├── accounts.ts        # [EXTEND] POST /default持久化逻辑
│   │   ├── tasks.ts           # [EXTEND] GET /?author_uid=X筛选
│   │   └── authors.ts         # [NEW] GET /:uid/metrics粉丝数据
│   ├── services/
│   │   ├── account.ts         # [EXTEND] saveDefaultAccount()
│   │   ├── task.ts            # [EXTEND] getTasksByAuthorUid()
│   │   ├── author.ts          # [NEW] getAuthorMetrics()
│   │   └── settings.ts        # [NEW] 管理settings表
│   ├── db/
│   │   ├── schema.ts          # [EXTEND] tasks表+author_uid/bili_account_id
│   │   └── migrations/        # [NEW] 0001_add_author_uid.sql
│   └── scripts/
│       └── migrate-tasks.ts   # [NEW] 数据迁移脚本(从视频API获取author_uid)
└── tests/
    └── integration/
        ├── tasks.test.ts      # [EXTEND] 测试author_uid筛选
        └── authors.test.ts    # [NEW] 测试粉丝数据聚合

frontend/web/src/
├── pages/
│   ├── MyAccountPage.tsx      # [NEW] 我的账号页面
│   ├── DashboardPage.tsx      # [RENAME→] TasksMonitorPage.tsx
│   ├── SettingsPage.tsx       # [REFACTOR] 重组为二级菜单入口
│   └── AccountManagementPage.tsx # [NEW] 整合账号管理+默认账号设置
├── components/
│   ├── account/
│   │   ├── AccountSwitchModal.tsx    # [NEW] 账号切换Modal
│   │   └── AccountDataDashboard.tsx  # [NEW] 数据仪表板卡片
│   ├── charts/
│   │   └── FollowerChart.tsx         # [EXTEND] 复用并优化粉丝图表
│   ├── navigation/
│   │   ├── Sidebar.tsx               # [REFACTOR] 可折叠二级菜单
│   │   └── SettingsMenu.tsx          # [NEW] 系统设置子菜单
│   └── tasks/
│       └── TaskCardList.tsx          # [EXTEND] 支持按author_uid筛选
├── hooks/
│   ├── useSelectedAccount.ts         # [NEW] 管理选中账号ID(Zustand+localStorage)
│   └── useAuthorMetrics.ts           # [NEW] 获取粉丝历史数据
├── store/
│   └── uiSelection.ts                # [EXTEND] 添加selectedAccountId
└── lib/
    └── api.ts                        # [EXTEND] 新增API方法

shared/types/ (如有)
└── api-schema.d.ts                    # [EXTEND] 新增Author/Task类型
```

**Structure Decision**: 采用Monorepo Web结构(Option 2)，前端使用Vite+React+Zustand，后端使用Bun+Hono+Drizzle。本功能为前端重构+后端扩展型需求，主要修改点在路由、页面和数据模型层。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations requiring justification**. 所有宪章检查项均通过或在Phase 1前完成。

## Phase 0: Research & Unknowns Resolution

### Research Tasks

以下技术点需要在Phase 0中研究并形成决策：

#### R1: SQLite数据库迁移策略（安全性与回滚）

**Unknown**: 如何安全地给tasks表添加`author_uid`(NOT NULL)和`bili_account_id`(可NULL)字段，同时保证现有数据不丢失？

**Research Points**:
- Drizzle Kit的ALTER TABLE ADD COLUMN支持程度
- 添加NOT NULL列时的默认值策略(临时空字符串 vs 立即填充)
- 数据回填方案：如何从B站API批量获取现有tasks的author_uid？
- 回滚计划：如何在迁移失败时恢复数据？
- PostgreSQL与SQLite迁移脚本的差异性

**Expected Output**: 迁移SQL脚本模板、数据回填脚本设计、回滚checklist

---

#### R2: Author Metrics数据聚合查询模式

**Unknown**: author_metrics表按task_id分组存储粉丝数，如何高效聚合查询某个author_uid的历史粉丝数据？

**Research Points**:
- SQL聚合查询：如何去重？按时间窗口(小时/天)聚合？
- Drizzle ORM的GROUP BY和DISTINCT支持
- 性能优化：是否需要索引author_uid字段？
- 数据一致性：多个task_id的同一时间点数据如何处理(取平均/最新/最大)？
- 替代方案：是否重构author_metrics表结构(长期方案 vs 短期聚合)

**Expected Output**: SQL查询语句模板、性能评估、索引建议

---

#### R3: LocalStorage Fallback逻辑最佳实践

**Unknown**: localStorage存储的账号ID失效时，如何优雅地fallback到第一个可用账号或空状态？

**Research Points**:
- React Hook设计：useSelectedAccount的初始化逻辑
- API调用时序：先检查localStorage ID → 验证账号存在 → fallback
- 用户体验：是否显示Toast提示"之前选择的账号已解绑"？
- 边界情况：localStorage为空、所有账号已解绑、账号列表加载失败
- Zustand store初始化：同步 vs 异步获取账号列表

**Expected Output**: useSelectedAccount Hook伪代码、状态机图、错误处理策略

---

#### R4: React Router嵌套路由与可折叠菜单状态管理

**Unknown**: 系统设置二级菜单的展开/收起状态如何与路由同步？页面刷新时如何自动展开？

**Research Points**:
- React Router v6的路由配置：/settings vs /settings/accounts嵌套关系
- Sidebar组件状态：本地state vs Zustand全局state vs URL query参数
- 自动展开逻辑：useLocation监听当前路由，判断是否在/settings/*下
- 动画实现：CSS transition vs Radix UI Collapsible组件
- 用户手动收起后如何记住(localStorage vs sessionStorage)

**Expected Output**: 路由配置示例、Sidebar状态管理方案、动画实现代码片段

---

### Research Output Location

所有研究结果将整合到 `specs/006-navigation-restructure/research.md`，格式如下：

```markdown
# Research: 前端导航结构重组

## R1: SQLite数据库迁移策略

**Decision**: [选择的方案]
**Rationale**: [为什么这样做]
**Alternatives Considered**: [评估过的其他方案]
**Implementation Notes**: [关键实现细节]

## R2: Author Metrics数据聚合查询模式
...
```

## Phase 1: Design & Contracts

**Prerequisites**: Phase 0 research.md完成，所有NEEDS CLARIFICATION已解决

### Phase 1 Outputs

#### 1.1 Data Model (`data-model.md`)

从feature spec和clarifications中提取实体变更：

**Tasks表扩展**:
```sql
ALTER TABLE tasks ADD COLUMN author_uid TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN bili_account_id TEXT;
-- 数据回填后移除DEFAULT ''约束
```

**Settings表扩展**:
```sql
-- 已有表结构，添加新记录
INSERT INTO settings (key, value, updated_at) 
VALUES ('default_account_id', '', strftime('%s', 'now'));
```

**数据关系变更**:
- Tasks表新增外键约束（可选）：`bili_account_id` REFERENCES `accounts(id)`
- 按author_uid查询tasks的索引：`CREATE INDEX idx_tasks_author_uid ON tasks(author_uid)`

**状态转换**: 无新状态机，但需记录数据迁移状态（迁移前后验证）

---

#### 1.2 API Contracts (`contracts/`)

从FR-032至FR-036和数据抓取逻辑提取API端点：

**新增端点**:

`contracts/authors-api.yaml`:
```yaml
/api/v1/authors/{uid}/metrics:
  get:
    summary: 获取作者粉丝历史数据
    parameters:
      - name: uid
        in: path
        required: true
        schema: {type: string}
      - name: from
        in: query
        schema: {type: string, format: date-time}
      - name: to
        in: query
        schema: {type: string, format: date-time}
    responses:
      '200':
        content:
          application/json:
            schema:
              type: object
              properties:
                code: {type: integer}
                data:
                  type: object
                  properties:
                    series:
                      type: array
                      items:
                        type: object
                        properties:
                          timestamp: {type: integer}
                          follower: {type: integer}
```

**扩展端点**:

`contracts/tasks-api.yaml`:
```yaml
/api/v1/tasks:
  get:
    summary: 获取任务列表（扩展author_uid筛选）
    parameters:
      - name: author_uid
        in: query
        description: 按发布者UID筛选任务
        schema: {type: string}
      - name: page
        in: query
        schema: {type: integer, default: 1}
      - name: page_size
        in: query
        schema: {type: integer, default: 20}
    responses:
      '200':
        content:
          application/json:
            schema:
              type: object
              properties:
                code: {type: integer}
                data:
                  type: object
                  properties:
                    items: {type: array}
                    page: {type: integer}
                    page_size: {type: integer}
                    total: {type: integer}
```

---

#### 1.3 Quick Start (`quickstart.md`)

开发者快速上手指南，包含：
- 本地环境搭建（数据库迁移执行）
- 前端开发服务器启动（`pnpm dev:web`）
- 后端开发服务器启动（`bun run dev`）
- 如何测试"我的账号"页面（Mock数据 vs 真实B站账号）
- 常见问题排查（author_uid为空、粉丝数据未聚合等）

---

#### 1.4 Agent Context Update

运行脚本更新Cursor Agent上下文：

```bash
cd D:/coding/bili-stats-monitor-spec
powershell.exe -File .specify/scripts/powershell/update-agent-context.ps1 -AgentType cursor-agent
```

**Expected Changes**:
- 在`.cursor/agent-context.md`中添加本功能的技术栈信息
- 记录Tasks表新字段：author_uid, bili_account_id
- 记录新API端点：/api/v1/authors/:uid/metrics
- 保留人工添加的项目约定(位于markers之间)

---

### Phase 1 Validation

完成Phase 1后，重新检查Constitution Check：

- ✅ API契约已定义（contracts/目录）
- ✅ 服务层方法已设计（data-model.md中明确）
- ✅ 前端组件结构已确定（Project Structure中列出）

如有任何违反宪章的设计决策，必须在Complexity Tracking中记录并给出理由。

## Phase 2: Task Decomposition

**Not executed by /speckit.plan**. 

Phase 2由 `/speckit.tasks` 命令执行，将Phase 1的设计分解为可执行的任务列表，输出到`specs/006-navigation-restructure/tasks.md`。

任务分解将基于：
- Phase 1的data-model.md（数据库迁移任务）
- Phase 1的contracts/（API实现任务）
- Project Structure中的文件修改清单（前端组件开发任务）
- 用户故事优先级（P1先行）

## Implementation Notes

### Critical Path

1. **数据库迁移**（阻塞性）: 必须先完成Tasks表扩展，否则无法按author_uid筛选
2. **API端点扩展**（阻塞性）: 前端依赖/api/v1/tasks?author_uid=X和/api/v1/authors/:uid/metrics
3. **前端路由重构**（并行）: 可与后端开发并行，使用Mock数据
4. **状态管理**（依赖前端路由）: Zustand扩展需在页面组件确定后进行

### Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 数据库迁移失败导致tasks数据丢失 | Low | Critical | Phase 0制定回滚计划，迁移前备份数据库 |
| Author_metrics聚合查询性能差 | Medium | High | Phase 0评估查询性能，必要时添加索引或重构表 |
| LocalStorage账号ID失效未处理 | Medium | Medium | 实现完整的fallback逻辑，添加单元测试 |
| 粉丝数据为空导致图表崩溃 | Low | Medium | 前端添加空状态处理，显示"暂无数据"提示 |
| 系统设置菜单状态管理复杂 | Low | Low | 使用Radix UI Collapsible简化实现 |

### Testing Strategy

- **单元测试**: 
  - useSelectedAccount Hook的fallback逻辑
  - AuthorService.getAuthorMetrics的聚合查询
  - SettingsService的default_account_id读写

- **集成测试**:
  - GET /api/v1/tasks?author_uid=X返回正确的任务列表
  - POST /api/v1/accounts/default持久化到settings表

- **E2E测试**（可选）:
  - 完整的账号切换流程：点击切换按钮 → 选择账号 → 页面数据刷新

### Deployment Considerations

- **数据库迁移**: 在生产环境部署前，先在staging环境验证迁移脚本
- **向后兼容**: 新增字段不影响现有API端点(GET /api/v1/tasks不带author_uid参数时返回全部)
- **配置管理**: default_account_id初始值为空字符串，系统启动时不报错

## Next Steps

1. ✅ **Phase 0 Complete**: 执行`/speckit.plan`命令生成research.md
2. ⏭️ **Phase 1 Pending**: 手动或通过工具生成data-model.md、contracts/、quickstart.md
3. ⏭️ **Phase 2 Pending**: 执行`/speckit.tasks`命令分解任务
4. ⏭️ **Implementation**: 按任务优先级开始开发

---

**Plan Version**: 1.0  
**Last Updated**: 2025-12-28  
**Status**: Phase 0 Ready
