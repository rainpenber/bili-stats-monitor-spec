# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Front-End First**:  
  - Have the core pages/visualizations (e.g., dashboards, charts, trends) and main user journeys been described?  
  - Is there a clear mapping from user value →前端界面，而不是直接从数据模型或后端结构出发？  
- **API Contract Before Backend**:  
  - For每个需要后端支持的前端交互，是否已经在 `specs/`（或对应 OpenAPI 文件）中定义或更新 API 合约？  
  - 是否明确了请求/响应结构、错误码以及分页/过滤等约束？  
- **Bun Runtime Alignment**:  
  - 计划中的后端实现是否在 Bun 运行时下可行（依赖、工具链、脚本等）？  
  - 是否避免依赖与 Bun 兼容性存疑的特性/库，或在计划中给出验证与降级方案？  
- **Monorepo + pnpm + Vite**:  
  - 是否在 plan 中明确对应的 `frontend/`、`backend/`、`packages/` 目录与包结构？  
  - 前端是否以 Vite 应用为基础，依赖管理是否统一通过 pnpm workspace？  
- **Incremental Delivery & Simplicity**:  
  - 是否将功能拆分为可独立交付的用户故事，并能在前端形成可演示界面？  
  - 是否避免过早抽象或复杂设计，必要复杂度是否在本计划中给出理由与替代方案比较？
- **Layered Architecture & Separation of Concerns**:  
  - 后端实现是否遵循路由层→服务层→数据层的分层架构？  
  - 路由层是否仅负责 HTTP 处理，所有数据库操作是否通过服务层进行？  
  - 是否避免了在路由层直接使用 ORM 进行数据库查询或更新？

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
