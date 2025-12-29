# Implementation Plan: 前端导航结构重组 + 博主选择功能

**Branch**: `006-navigation-restructure` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-navigation-restructure/spec.md`

## Summary

本功能重组前端导航结构，将原有功能整合为三个一级菜单："我的账号"、"监视任务"、"系统设置"。同时新增博主选择功能，允许用户在"我的账号"页面选择要展示的博主，支持临时选择和默认展示设置。

**技术方案**：
- 前端：重构导航菜单结构，实现可折叠的"系统设置"菜单，新增"我的账号"页面和博主选择Modal
- 后端：扩展数据模型（tasks表添加author_uid和bili_account_id字段，settings表添加default_display_author记录），新增博主列表和默认展示博主管理API
- 数据抓取：实现三级优先级逻辑（任务指定账号 → 发布者账号 → 全局默认账号）

## Technical Context

**Language/Version**: TypeScript 5.x, Bun 1.x  
**Primary Dependencies**: 
- 前端：React 18, React Router, Zustand, Vite, Tailwind CSS
- 后端：Hono, Drizzle ORM, Bun SQLite
**Storage**: SQLite (开发环境), PostgreSQL (生产环境可选)  
**Testing**: Vitest (前后端统一)  
**Target Platform**: 桌面端浏览器 (Chrome/Firefox/Safari最新版本)  
**Project Type**: Web application (monorepo)  
**Performance Goals**: 
- 页面加载后2秒内渲染完成数据仪表板、图表和任务列表
- 账号切换操作在3秒内完成
- 系统设置菜单展开/收起动画流畅（<200ms）  
**Constraints**: 
- 必须支持localStorage持久化用户选择
- 必须兼容现有账号绑定和任务管理功能
- 数据抓取逻辑必须100%正确（每个任务使用正确的账号Cookie）  
**Scale/Scope**: 
- 最多同时绑定10个B站账号
- 粉丝数据每小时更新一次
- 假设系统中最多有数百个监控任务

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **Front-End First**:  
  - ✅ 核心页面已明确描述："我的账号"页面（账号信息、数据仪表板、粉丝图表、任务列表）、"监视任务"页面、"系统设置"页面（含4个子菜单）
  - ✅ 用户旅程清晰：从登录到查看账号数据、切换账号、选择博主、管理设置等完整流程已在spec中定义
  - ✅ 前端交互细节已明确：Modal设计、搜索筛选、按钮位置等

- ✅ **API Contract Before Backend**:  
  - ✅ 需要新增的API已在spec的Dependencies部分明确列出：
    - 获取博主列表（从tasks表提取author_uid）
    - 获取/设置默认展示博主（settings表读写）
    - 获取某个博主的粉丝数据（已有，需确认支持无绑定账号的博主）
  - ✅ 现有API（账号管理、任务查询、作者指标）已存在，本次仅扩展功能
  - ⚠️ 需要在Phase 1生成OpenAPI合约文档，明确请求/响应结构

- ✅ **Bun Runtime Alignment**:  
  - ✅ 后端实现完全基于Bun运行时，使用Drizzle ORM（Bun兼容）
  - ✅ 数据库迁移脚本使用Bun的SQLite支持
  - ✅ 所有服务层代码已在Bun环境下验证可运行

- ✅ **Monorepo + pnpm + Vite**:  
  - ✅ 项目结构明确：`frontend/web/`（Vite应用）、`backend/`（Bun服务）
  - ✅ 依赖管理统一使用pnpm workspace
  - ✅ 前端构建工具为Vite（已配置）

- ✅ **Incremental Delivery & Simplicity**:  
  - ✅ 功能已拆分为6个用户故事（US1-US6），每个故事可独立交付
  - ✅ 每个用户故事在前端都有可演示界面
  - ✅ 避免过度抽象：复用现有组件（Modal、Card、Button等），仅新增必要的博主选择Modal

- ✅ **Layered Architecture & Separation of Concerns**:  
  - ✅ 后端已遵循分层架构：routes → services → database
  - ✅ 新增功能将遵循相同模式：
    - 路由层：`backend/src/routes/authors.ts`（博主列表）、`backend/src/routes/settings.ts`（默认展示博主设置）
    - 服务层：`backend/src/services/author.ts`（已有，需扩展）、`backend/src/services/settings.ts`（已有，需扩展）
    - 数据层：通过Drizzle ORM访问，所有数据库操作在服务层完成

**总结**: 🎉 **通过所有宪章检查，无违规项**

## Project Structure

### Documentation (this feature)

```text
specs/006-navigation-restructure/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (已完成，包含数据库迁移策略)
├── data-model.md        # Phase 1 output (已完成，包含default_display_author字段)
├── quickstart.md        # Phase 1 output (待生成)
├── contracts/           # Phase 1 output (待生成)
│   ├── authors-api.yaml # 博主列表和默认展示博主API合约
│   └── settings-api.yaml # 设置管理API合约（扩展）
└── tasks.md             # Phase 2 output (/speckit.tasks command - 待生成)
```

### Source Code (repository root)

```text
# Web应用结构（Monorepo）
frontend/web/
├── src/
│   ├── pages/
│   │   ├── MyAccountPage.tsx              # [EXISTS] 我的账号页面（需扩展博主选择功能）
│   │   ├── TasksMonitorPage.tsx           # [EXISTS] 监视任务页面（重命名自DashboardPage）
│   │   ├── AccountManagementPage.tsx      # [EXISTS] 账号管理页面
│   │   └── OtherSettingsPage.tsx           # [EXISTS] 其他设置页面
│   ├── components/
│   │   ├── account/
│   │   │   ├── AccountSwitchModal.tsx     # [EXISTS] 账号切换Modal
│   │   │   ├── AuthorSelectModal.tsx      # [NEW] 博主选择Modal（新增）
│   │   │   ├── AccountDataDashboard.tsx   # [EXISTS] 数据仪表板
│   │   │   ├── FollowerChart.tsx          # [EXISTS] 粉丝图表
│   │   │   └── TaskCardList.tsx           # [EXISTS] 任务卡片列表
│   │   └── layouts/
│   │       └── AppLayout.tsx              # [EXISTS] 主布局（需扩展可折叠菜单）
│   ├── hooks/
│   │   ├── useSelectedAccount.ts          # [EXISTS] 账号选择Hook
│   │   ├── useSelectedAuthor.ts           # [NEW] 博主选择Hook（新增）
│   │   └── useAuthorMetrics.ts            # [EXISTS] 作者指标Hook
│   ├── store/
│   │   └── uiSelection.ts                 # [EXISTS] UI状态管理（需扩展博主选择状态）
│   └── lib/
│       └── api.ts                         # [EXISTS] API客户端（需扩展博主相关API）
└── tests/
    └── components/
        └── account/
            └── AuthorSelectModal.test.tsx # [NEW] 博主选择Modal测试

backend/
├── src/
│   ├── routes/
│   │   ├── authors.ts                     # [EXISTS] 作者相关路由（需扩展博主列表）
│   │   └── settings.ts                    # [EXISTS] 设置路由（需扩展默认展示博主）
│   ├── services/
│   │   ├── author.ts                      # [EXISTS] 作者服务（需扩展博主列表查询）
│   │   └── settings.ts                    # [EXISTS] 设置服务（需扩展default_display_author）
│   ├── db/
│   │   ├── schema.ts                      # [EXISTS] 数据库Schema（已包含author_uid和bili_account_id）
│   │   └── migrations/
│   │       └── 0001_daffy_swordsman.sql   # [EXISTS] 迁移脚本（已包含default_display_author初始化）
│   └── scripts/
│       └── backfill-author-uid.ts         # [EXISTS] 数据回填脚本
└── tests/
    ├── integration/
    │   ├── authors.test.ts                # [NEW] 博主列表API集成测试
    │   └── settings.test.ts                # [NEW] 默认展示博主设置测试
    └── services/
        └── author.test.ts                 # [EXISTS] 作者服务测试（需扩展）
```

**Structure Decision**: 采用现有monorepo结构，前端在`frontend/web/`，后端在`backend/`。新增功能遵循现有架构模式，复用现有组件和服务，仅新增必要的Modal和Hook。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

无违规项，无需填写。
