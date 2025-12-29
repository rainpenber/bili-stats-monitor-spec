# Implementation Plan: 历史 CSV 数据导入工具

**Branch**: `002-python-csv-backend-data-old-migrate-follower-views` | **Date**: 2025-12-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-python-csv-backend-data-old-migrate-follower-views/spec.md`

## Summary

本功能实现一个命令行工具，用于将 Python 版本后端抓取的历史 CSV 数据（粉丝数据和视频数据）导入到新系统的数据库中。工具支持：
- 解析 `_follower.csv` 和 `_views.csv` 格式文件
- 自动创建或关联监控任务
- 批量导入多个文件
- 通过命令行参数指定目标数据库（测试/生产）
- 控制任务激活状态和监控间隔
- 处理重复数据和错误情况

**技术方案**：使用 Bun 运行时 + TypeScript，复用现有数据库连接和 Drizzle ORM，实现独立的 CLI 脚本。

## Technical Context

**Language/Version**: TypeScript 5.3+ / Bun 1.x  
**Primary Dependencies**: 
- `drizzle-orm` (数据库 ORM，已存在)
- `postgres` / `better-sqlite3` (数据库客户端，已存在)
- `zod` (数据验证，已存在)
- `nanoid` (ID 生成，已存在)
- 需要新增：CSV 解析库（考虑使用 Bun 内置能力或轻量级库）

**Storage**: 
- 目标数据库：PostgreSQL (测试端口 5555，生产端口 5556) 或 SQLite
- 复用现有 Drizzle schema (`tasks`, `video_metrics`, `author_metrics` 表)

**Testing**: 
- `bun test` (Bun 内置测试框架)
- 单元测试：CSV 解析、数据验证、任务创建逻辑
- 集成测试：数据库导入流程

**Target Platform**: 
- 命令行工具，运行在 Bun 运行时环境
- 支持 Windows / Linux / macOS

**Project Type**: 
- 后端 CLI 工具（monorepo 中的 `backend/scripts/` 目录）

**Performance Goals**: 
- 单个 CSV 文件（≤ 10MB）导入时间 ≤ 5 分钟
- 批量导入 100 个文件 ≤ 30 分钟
- 支持流式处理，避免大文件内存溢出（≥ 10,000 行）

**Constraints**: 
- 必须支持测试和生产数据库切换（命令行参数）
- 必须处理 UTF-8 BOM 和多种时间格式
- 必须提供详细的错误报告和进度显示
- 必须支持优雅中断（Ctrl+C）

**Scale/Scope**: 
- 预计导入文件数：50-200 个 CSV 文件
- 单个文件最大行数：10,000+ 行
- 总数据量：预计 < 100MB

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Front-End First**:  
  - ✅ **N/A** - 本功能为后端命令行工具，不涉及前端界面。功能价值通过数据导入到数据库体现，管理员可通过前端查看导入后的数据。
  
- **API Contract Before Backend**:  
  - ✅ **N/A** - 本功能为独立 CLI 脚本，不提供 HTTP API。命令行参数和输出格式已在 spec 中明确。
  
- **Bun Runtime Alignment**:  
  - ✅ **通过** - 脚本将在 Bun 运行时下执行，复用现有后端基础设施（数据库连接、Drizzle ORM、配置加载）
  - ✅ **通过** - 使用 Bun 内置能力（文件 I/O、流处理）或 Bun 兼容的轻量级库
  
- **Monorepo + pnpm + Vite**:  
  - ✅ **通过** - 脚本位于 `backend/scripts/import-csv.ts`，复用 `backend/` 目录下的共享代码（数据库、配置、服务）
  - ✅ **通过** - 通过 `pnpm workspace` 管理依赖，与后端主应用共享依赖
  
- **Incremental Delivery & Simplicity**:  
  - ✅ **通过** - 功能拆分为可独立验证的步骤：
    1. CSV 文件解析和验证
    2. 单文件导入（任务创建 + 数据插入）
    3. 批量导入和进度显示
    4. 数据库选择和错误处理
  - ✅ **通过** - 避免过度设计，直接使用 Drizzle ORM 批量插入，不引入额外的抽象层

## Project Structure

### Documentation (this feature)

```text
specs/002-python-csv-backend-data-old-migrate-follower-views/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (CLI 接口定义，非 HTTP API)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── scripts/
│   └── import-csv.ts          # 主导入脚本（CLI 入口）
├── src/
│   ├── services/
│   │   └── csv-import.ts       # CSV 导入服务（解析、验证、导入逻辑）
│   ├── utils/
│   │   ├── csv-parser.ts      # CSV 解析工具（处理 BOM、编码、流式读取）
│   │   └── time-parser.ts     # 时间格式解析工具
│   ├── db/
│   │   └── schema.ts          # 复用现有 schema
│   └── config/
│       └── index.ts            # 复用现有配置加载
└── tests/
    └── scripts/
        └── import-csv.test.ts  # 导入脚本测试

backend/data/old-migrate/      # CSV 文件存放目录（已存在）
```

**Structure Decision**: 
- 采用 monorepo 结构，脚本位于 `backend/scripts/` 目录
- 导入逻辑封装为服务 (`src/services/csv-import.ts`)，便于测试和复用
- CSV 解析和时间处理工具独立为 utils，便于单元测试
- 复用现有数据库连接和配置加载机制

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (无违反) | - | - |

---

## Phase 0: Research & Design (Completed)

### Research Output

✅ **research.md** 已生成，包含以下技术决策：
- CSV 解析库选择（Bun 内置能力 + 手动解析）
- 流式处理策略（批量缓冲区 + 数据库批量插入）
- 时间格式解析（手动解析，支持多种格式）
- 命令行参数解析（手动解析或 `commander`）
- 数据库连接复用（复用现有配置和连接逻辑）
- 错误处理和报告（结构化错误对象 + 控制台输出）

### Design Output

✅ **data-model.md** 已生成，包含：
- 核心实体定义（MonitoringTask, AuthorMetrics, VideoMetrics）
- 字段映射规则（CSV → 数据库）
- 数据验证规则
- 导入流程数据流
- 错误处理数据模型

✅ **contracts/cli.md** 已生成，包含：
- CLI 命令格式和参数说明
- 使用示例
- 输出格式规范
- 退出码定义
- 错误处理规范

✅ **quickstart.md** 已生成，包含：
- 前置条件
- 快速开始步骤
- 常见场景示例
- 故障排查指南

---

## Phase 1: Implementation Planning (Completed)

### Generated Artifacts

- ✅ `research.md` - 技术选型和决策文档
- ✅ `data-model.md` - 数据模型和字段映射
- ✅ `contracts/cli.md` - CLI 接口规范
- ✅ `quickstart.md` - 快速开始指南

### Next Steps

1. **运行 `/speckit.tasks`** 创建详细任务清单
2. 开始实现 Phase 2: 核心功能实现
