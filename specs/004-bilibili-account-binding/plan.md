# Implementation Plan: B站账号绑定功能

**Branch**: `004-bilibili-account-binding` | **Date**: 2025-12-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-bilibili-account-binding/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本功能旨在完成现有B站账号绑定模态框的开发，去除mock内容，对接真实的B站API。支持两种绑定方式：

1. **Cookie绑定（P1-MVP）**：用户粘贴从浏览器导出的B站Cookie，系统验证有效性后保存
2. **扫码登录绑定（P2-增强）**：通过B站App扫码方式完成绑定，更友好和安全
3. **账号管理（P3-完整）**：查看、解绑和重新绑定已存在的账号

技术方案采用前端React+Vite、后端Bun+Hono、数据库SQLite+Drizzle ORM，凭证使用AES-256-GCM加密存储，通过轮询机制实现扫码状态检测。

## Technical Context

**Language/Version**: TypeScript 5.6 (前端) / TypeScript 5.3 (后端) / Bun 最新稳定版  
**Primary Dependencies**: 
  - 前端：React 18.3, React Hook Form 7.68, Zod 4.2, TanStack Query 5.51, Radix UI
  - 后端：Hono 4.0, Drizzle ORM 0.29, Better-SQLite3 9.2, Jose 6.1 (JWT), Bcrypt 6.0, Zod 3.22
**Storage**: SQLite (使用better-sqlite3驱动，生产环境支持PostgreSQL切换)  
**Testing**: Vitest 4.0 (前后端统一测试框架)  
**Target Platform**: Web应用（跨平台浏览器）+ Linux/Windows服务器  
**Project Type**: Web应用（Monorepo：frontend/ + backend/）  
**Performance Goals**: 
  - Cookie验证响应时间 < 3秒（FR-003成功标准）
  - 扫码轮询接口响应时间 < 500ms（95%请求，SC-004）
  - 支持并发10个用户同时绑定账号
**Constraints**: 
  - 二维码有效期固定2分钟（B站API限制）
  - 轮询间隔2秒（避免B站API限流）
  - Cookie和OAuth token必须加密存储（安全要求）
  - 必须检测重复绑定，防止数据冲突
**Scale/Scope**: 
  - 预计每个用户绑定1-3个B站账号
  - 单系统实例支持10-50个用户
  - 绑定操作频率低（每用户每月1-2次）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Front-End First**: ✅ **PASS**
  - 核心前端页面已在spec中明确：绑定B站账号Modal对话框，包含Cookie绑定和扫码登录两个标签页
  - 明确的用户交互流程：选择绑定方式 → 输入凭证/扫描二维码 → 验证 → 成功/失败反馈
  - 用户价值清晰：从"需要绑定B站账号"出发，而非从"需要存储账号凭证"出发
  - 前端需求（FR-001至FR-007）先于后端需求定义

- **API Contract Before Backend**: ✅ **PASS**
  - 三个核心API接口已在spec中明确定义（FR-008至FR-013）：
    - `POST /api/v1/bilibili/bind/cookie` - Cookie绑定
    - `POST /api/v1/bilibili/bind/qrcode/generate` - 生成二维码
    - `GET /api/v1/bilibili/bind/qrcode/poll` - 轮询扫码状态
  - 请求/响应结构在Phase 1将生成OpenAPI规范
  - 错误码和状态枚举已明确（pending/scanned/confirmed/expired）

- **Bun Runtime Alignment**: ✅ **PASS**
  - 后端使用Bun运行时，已有基础设施（见backend/package.json）
  - 依赖库均兼容Bun：Hono、Drizzle ORM、Better-SQLite3
  - 加密工具已使用Node.js crypto模块（Bun完全兼容）
  - 无需引入与Bun不兼容的依赖

- **Monorepo + pnpm + Vite**: ✅ **PASS**
  - 项目已采用pnpm workspace结构（根package.json确认）
  - 前端位于frontend/web/，使用Vite 5.4构建
  - 后端位于backend/，使用Bun运行时
  - 新功能代码将遵循现有目录结构：
    - 前端：frontend/web/src/components/bilibili/
    - 后端：backend/src/routes/bilibili/、backend/src/services/bilibili/

- **Incremental Delivery & Simplicity**: ✅ **PASS**
  - 功能已拆分为3个独立可交付的用户故事（P1/P2/P3）
  - P1（Cookie绑定）可作为MVP独立交付，无需扫码功能
  - 每个故事在前端都有可演示界面（Modal对话框不同状态）
  - 避免过度设计：不引入OAuth2.0完整流程，仅使用B站现有扫码登录机制
  - 复杂度控制：轮询机制使用简单的setInterval，无需WebSocket或SSE

- **Layered Architecture & Separation of Concerns**: ✅ **PASS**
  - 后端实现将遵循三层架构：
    - **路由层**（routes/bilibili/binding.ts）：仅处理HTTP请求响应、参数验证
    - **服务层**（services/bilibili/binding.ts）：业务逻辑、B站API调用、数据库操作
    - **数据层**：通过Drizzle ORM统一访问（已有accounts表Schema）
  - 现有代码已遵循此模式（参考backend/src/services/account.ts）
  - 新功能将复用现有加密工具（backend/src/utils/crypto.ts）

**总结**: 所有宪章检查项通过，无需在Complexity Tracking中记录违反项。

## Project Structure

### Documentation (this feature)

```text
specs/004-bilibili-account-binding/
├── spec.md              # 功能规范（已完成）
├── plan.md              # 本文件（实现计划）
├── research.md          # Phase 0 输出（技术研究）
├── data-model.md        # Phase 1 输出（数据模型设计）
├── quickstart.md        # Phase 1 输出（快速开始指南）
├── contracts/           # Phase 1 输出（API合约）
│   └── bilibili-binding-api.yaml  # OpenAPI 3.0规范
├── checklists/          # 质量检查清单
│   └── requirements.md  # 规范质量检查（已完成）
└── tasks.md             # Phase 2 输出（任务拆分，通过/speckit.tasks生成）
```

### Source Code (repository root)

```text
# Web应用结构（Monorepo）
frontend/web/
├── src/
│   ├── components/
│   │   ├── bilibili/                    # 新增：B站相关组件
│   │   │   ├── AccountBindingModal.tsx  # 绑定账号主对话框
│   │   │   ├── CookieBindingTab.tsx     # Cookie绑定标签页
│   │   │   ├── QRCodeBindingTab.tsx     # 扫码绑定标签页
│   │   │   └── QRCodeDisplay.tsx        # 二维码显示组件
│   │   └── ...（现有组件）
│   ├── hooks/
│   │   └── useBilibiliBinding.ts        # 新增：绑定逻辑Hook
│   ├── services/
│   │   └── bilibili-api.ts              # 新增：B站API调用
│   ├── types/
│   │   └── bilibili.ts                  # 新增：B站相关类型定义
│   └── ...（现有目录）
└── tests/
    └── components/
        └── bilibili/                     # 新增：B站组件测试
            ├── AccountBindingModal.test.tsx
            └── QRCodeBindingTab.test.tsx

backend/
├── src/
│   ├── routes/
│   │   └── bilibili/
│   │       └── binding.ts                # 新增：绑定路由（仅HTTP处理）
│   ├── services/
│   │   └── bilibili/
│   │       ├── binding.ts                # 新增：绑定服务（业务逻辑）
│   │       └── qrcode-session.ts         # 新增：二维码会话管理
│   ├── db/
│   │   └── schema.ts                     # 修改：accounts表已存在，可能需要调整
│   ├── utils/
│   │   └── crypto.ts                     # 复用：已有加密工具
│   └── ...（现有目录）
└── tests/
    ├── integration/
    │   └── bilibili/
    │       └── binding.test.ts           # 新增：绑定集成测试
    └── unit/
        └── services/
            └── bilibili/
                └── binding.test.ts       # 新增：服务单元测试
```

**Structure Decision**: 

采用Web应用结构（Option 2），符合现有monorepo布局：
- **前端**：在frontend/web/src/下新增bilibili/子目录，组织账号绑定相关组件
- **后端**：在backend/src/下按分层架构新增routes/bilibili/和services/bilibili/
- **测试**：前后端分别在各自的tests/目录下创建对应测试文件
- **API合约**：存放在specs/004-bilibili-account-binding/contracts/，可通过generate:types脚本生成TypeScript类型

## Complexity Tracking

> **无需填写** - Constitution Check所有项均通过，无违反项需要记录和辩护。

---

## Phase 2: Constitution Check Re-evaluation

*在Phase 1设计完成后重新评估宪章合规性*

### 前端优先 ✅ **持续通过**
- ✅ **数据模型**：BilibiliAccount和QRCodeSession实体定义明确，支持前端绑定流程
- ✅ **API合约**：OpenAPI规范完整定义了三个接口，请求/响应结构清晰
- ✅ **用户界面**：quickstart中详细说明了Modal、Tab组件结构和交互流程

### API合约先行 ✅ **持续通过**
- ✅ **OpenAPI规范**：`contracts/bilibili-binding-api.yaml`完整定义了所有接口
- ✅ **错误码**：统一的错误响应格式，包含code、message和详细提示
- ✅ **类型安全**：前端可通过`generate:types`脚本生成TypeScript类型

### Bun运行时对齐 ✅ **持续通过**
- ✅ **依赖兼容**：所有后端依赖（Hono、Drizzle ORM、crypto）均兼容Bun
- ✅ **脚本执行**：数据库迁移、测试、服务启动均使用`bun run`命令
- ✅ **无风险依赖**：未引入与Bun不兼容的新依赖

### Monorepo + pnpm + Vite ✅ **持续通过**
- ✅ **目录结构**：严格遵循`frontend/web/`和`backend/src/`分层结构
- ✅ **前端工具链**：使用Vite开发服务器，React组件化开发
- ✅ **依赖管理**：前端pnpm workspace，后端Bun管理

### 渐进式交付 ✅ **持续通过**
- ✅ **独立交付**：P1（Cookie绑定）、P2（扫码绑定）、P3（账号管理）可独立开发和测试
- ✅ **无过度设计**：避免引入WebSocket、OAuth2.0等复杂机制
- ✅ **简单轮询**：使用setInterval实现扫码轮询，清晰易维护

### 分层架构 ✅ **持续通过**
- ✅ **路由层**：`routes/bilibili/binding.ts`仅负责HTTP处理和参数验证
- ✅ **服务层**：`services/bilibili/binding.ts`包含所有业务逻辑和数据库操作
- ✅ **数据层**：通过Drizzle ORM统一访问，无直接SQL查询

### 总结

**Phase 2评估结果**: 所有宪章检查项继续通过 ✅

设计阶段未引入任何违反宪章的复杂度或技术债务，可以安全进入实现阶段（`/speckit.tasks`）。
