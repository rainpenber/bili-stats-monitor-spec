# Tasks: B站账号绑定功能

**Input**: Design documents from `/specs/004-bilibili-account-binding/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/bilibili-binding-api.yaml  
**Generated**: 2025-12-27

**Tests**: 本功能未明确要求TDD，测试任务为可选，建议在实现后补充

**Organization**: 任务按用户故事分组，每个故事可独立实现和测试

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 任务所属的用户故事（US1、US2、US3）
- 包含精确的文件路径

## Path Conventions

- **前端**: `frontend/web/src/`
- **后端**: `backend/src/`
- **测试**: `backend/tests/` 和 `frontend/web/tests/`
- **文档**: `specs/004-bilibili-account-binding/`

---

## Phase 1: Setup（项目初始化）

**Purpose**: 数据库Schema更新和基础类型定义

- [x] T001 在backend/src/db/schema.ts中添加qrcode_sessions表定义
- [x] T002 运行drizzle-kit生成数据库迁移文件
- [x] T003 应用数据库迁移到开发环境（bun run db:push）
- [x] T004 [P] 在frontend/web/src/types/bilibili.ts中定义BilibiliAccount和QRCodeSession类型

**Checkpoint**: 数据库表已创建，类型定义完成

---

## Phase 2: Foundational（基础设施-阻塞所有用户故事）

**Purpose**: 核心服务和工具，必须在任何用户故事实现前完成

**⚠️ CRITICAL**: 所有用户故事工作必须等待本阶段完成

- [x] T005 在backend/src/services/bili/client.ts中扩展BiliClient类，添加pollQrcode方法
- [x] T006 [P] 创建backend/src/services/bilibili/binding.ts绑定服务类框架（空方法）
- [x] T007 [P] 在frontend/web/src/lib/validations/bilibiliSchemas.ts中创建Cookie验证Zod Schema
- [x] T008 [P] 在frontend/web/src/lib/api.ts中添加bilibili相关API方法定义（bindByCookie, generateQRCode, pollQRCode）

**Checkpoint**: 基础服务层和验证工具就绪，可以开始用户故事实现

---

## Phase 3: User Story 1 - Cookie方式绑定B站账号 (Priority: P1) 🎯 MVP

**Goal**: 用户通过粘贴Cookie完成B站账号绑定，系统验证有效性并加密存储

**Independent Test**: 用户在"绑定B站账号"对话框中粘贴有效Cookie，点击保存，系统验证Cookie有效性并保存绑定信息，可立即用于创建监控任务

### Backend Implementation for User Story 1

- [x] T009 [US1] 在backend/src/services/bilibili/binding.ts中实现bindByCookie方法（解析Cookie、调用B站nav接口验证、检测重复、加密存储）
- [x] T010 [US1] 创建backend/src/routes/bilibili/binding.ts路由文件，实现POST /api/v1/bilibili/bind/cookie路由（参数验证、调用服务层、错误处理）
- [x] T011 [US1] 在backend/src/index.ts中注册/api/v1/bilibili路由组

### Frontend Implementation for User Story 1

- [x] T012 [P] [US1] 重构frontend/web/src/components/modals/AccountBindModal.tsx，移除mock内容，实现真实绑定逻辑（保留现有标签页切换结构）
- [x] T013 [P] [US1] 创建frontend/web/src/components/bilibili/CookieBindingTab.tsx组件（多行文本输入、React Hook Form集成、Zod验证）
- [x] T014 [US1] 在frontend/web/src/lib/api.ts中实现bindByCookie API调用方法
- [x] T015 [US1] 集成AccountBindingModal到现有页面（需确定触发入口，如设置页面或任务创建页面）

### Error Handling & Validation for User Story 1

- [x] T016 [US1] 在CookieBindingTab中实现前端验证错误提示（格式错误、字段缺失）
- [x] T017 [US1] 在路由层实现后端错误码映射（INVALID_COOKIE_FORMAT、COOKIE_INVALID、ACCOUNT_ALREADY_BOUND等7种错误）
- [x] T018 [US1] 添加成功提示（toast/notification）和对话框自动关闭逻辑

**Checkpoint**: Cookie绑定功能完整可用，用户可以成功绑定账号并在数据库中查看加密后的凭证

---

## Phase 4: User Story 2 - 扫码方式绑定B站账号 (Priority: P2)

**Goal**: 用户通过B站App扫码完成账号绑定，无需手动获取Cookie，提升用户体验

**Independent Test**: 用户在"绑定B站账号"对话框中选择"扫码登录"，系统生成二维码，用户使用B站App扫码并确认授权，系统自动完成绑定

### Backend Implementation for User Story 2

- [ ] T019 [US2] 在backend/src/services/bilibili/binding.ts中实现generateQRCode方法（调用B站API生成二维码、创建会话记录）
- [ ] T020 [US2] 在backend/src/services/bilibili/binding.ts中实现pollQRCode方法（查询会话、检查过期、调用B站API轮询、处理confirmed状态）
- [ ] T021 [US2] 在backend/src/routes/bilibili/binding.ts中实现POST /api/v1/bilibili/bind/qrcode/generate路由
- [ ] T022 [US2] 在backend/src/routes/bilibili/binding.ts中实现GET /api/v1/bilibili/bind/qrcode/poll路由（参数验证、用户隔离检查）

### Frontend Implementation for User Story 2

- [ ] T023 [P] [US2] 创建frontend/web/src/hooks/useQRCodePolling.ts自定义Hook（2秒轮询、状态管理、定时器清理）
- [ ] T024 [P] [US2] 创建frontend/web/src/components/bilibili/QRCodeDisplay.tsx二维码显示组件（使用qrcode.react或类似库）
- [ ] T025 [US2] 创建frontend/web/src/components/bilibili/QRCodeBindingTab.tsx组件（生成二维码、显示状态提示、重新获取按钮）
- [ ] T026 [US2] 在frontend/web/src/lib/api.ts中实现generateQRCode和pollQRCode API调用方法
- [ ] T027 [US2] 在AccountBindingModal中集成QRCodeBindingTab标签页，确保切换标签时停止轮询

### State Management & Lifecycle for User Story 2

- [ ] T028 [US2] 在useQRCodePolling Hook中实现状态转换逻辑（pending→scanned→confirmed/expired）
- [ ] T029 [US2] 在QRCodeBindingTab中实现UI状态更新（待扫码、已扫码、等待确认、已过期）
- [ ] T030 [US2] 实现二维码过期后的"重新获取二维码"功能（清理旧会话、生成新二维码、重置状态）
- [ ] T031 [US2] 确保组件卸载或标签页切换时清理轮询定时器（useEffect cleanup）

**Checkpoint**: 扫码绑定功能完整可用，用户可以通过扫码完成绑定，轮询机制正常工作无内存泄漏

---

## Phase 5: User Story 3 - 查看和管理已绑定账号 (Priority: P3)

**Goal**: 用户可以查看所有已绑定的B站账号列表，了解账号状态，并能解绑或重新绑定过期账号

**Independent Test**: 用户在账号设置页面查看已绑定的B站账号列表，看到账号名称、绑定时间和状态，可以点击"解绑"按钮移除绑定

### Backend Implementation for User Story 3

- [ ] T032 [US3] 在backend/src/services/bilibili/binding.ts中实现listBoundAccounts方法（查询当前用户的所有绑定账号）
- [ ] T033 [US3] 在backend/src/services/bilibili/binding.ts中实现unbindAccount方法（验证所有权、删除账号记录、处理关联任务）
- [ ] T034 [US3] 在backend/src/routes/bilibili/binding.ts中实现GET /api/v1/bilibili/accounts路由（分页、过滤、排序）
- [ ] T035 [US3] 在backend/src/routes/bilibili/binding.ts中实现DELETE /api/v1/bilibili/accounts/:accountId路由（权限检查、解绑逻辑）

### Frontend Implementation for User Story 3

- [ ] T036 [P] [US3] 创建frontend/web/src/components/bilibili/AccountList.tsx账号列表组件（表格展示、状态标签、操作按钮）
- [ ] T037 [P] [US3] 创建frontend/web/src/components/bilibili/AccountListItem.tsx单个账号项组件（昵称、UID、绑定时间、状态、操作）
- [ ] T038 [US3] 在frontend/web/src/lib/api.ts中实现listAccounts和unbindAccount API调用方法
- [ ] T039 [US3] 创建frontend/web/src/pages/BilibiliAccountsPage.tsx或集成到现有设置页面
- [ ] T040 [US3] 实现解绑确认对话框（Radix UI Alert Dialog）

### Status Display & Rebinding for User Story 3

- [ ] T041 [US3] 在AccountListItem中实现状态标签显示（有效-绿色、过期-红色）
- [ ] T042 [US3] 对于过期账号，提供"重新绑定"入口（打开AccountBindingModal并预填账号信息提示）
- [ ] T043 [US3] 实现空状态UI（用户未绑定任何账号时显示引导）

**Checkpoint**: 账号管理功能完整可用，用户可以查看、解绑和重新绑定账号

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 跨用户故事的改进和完善

### Error Handling & User Experience

- [ ] T044 [P] 在所有API调用中统一错误处理（使用TanStack Query的error boundary）
- [ ] T045 [P] 添加Loading状态指示器（绑定过程中的加载动画）
- [ ] T046 [P] 实现网络超时处理（Cookie验证和二维码轮询的超时提示）
- [ ] T047 统一错误提示样式和位置（使用sonner toast组件）

### Performance & Security

- [ ] T048 [P] 在backend路由中添加请求日志（记录绑定尝试、失败原因）
- [ ] T049 [P] 验证ENCRYPT_KEY环境变量已正确配置（开发和生产环境）
- [ ] T050 在frontend实现防抖处理（Cookie验证和二维码生成按钮）
- [ ] T051 [P] 添加安全headers（CSP、CORS配置检查）

### Testing (Optional - 建议补充)

- [ ] T052 [P] 创建backend/tests/unit/services/bilibili/binding.test.ts单元测试（bindByCookie、generateQRCode、pollQRCode方法）
- [ ] T053 [P] 创建backend/tests/integration/bilibili/binding.test.ts集成测试（完整绑定流程、错误处理）
- [ ] T054 [P] 创建frontend/web/tests/components/bilibili/CookieBindingTab.test.tsx组件测试（表单验证、错误显示）
- [ ] T055 [P] 创建frontend/web/tests/hooks/useQRCodePolling.test.ts Hook测试（轮询逻辑、清理机制）

### Documentation & Cleanup

- [ ] T056 [P] 更新backend/README-环境配置.md，添加绑定功能说明
- [ ] T057 [P] 在specs/004-bilibili-account-binding/contracts/中验证OpenAPI规范与实际实现一致
- [ ] T058 代码审查和重构（移除任何直接数据库操作从路由层到服务层）
- [ ] T059 [P] 运行quickstart.md中的检查清单验证所有功能点
- [ ] T060 [P] 清理开发过程中的临时代码和注释

### Optional: Session Cleanup Task (Future Enhancement)

- [ ] T061 [P] 实现定期清理过期二维码会话的后台任务（backend/src/services/scheduler.ts，每小时执行）
- [ ] T062 [P] 在backend/src/services/scheduler.ts中添加定期验证账号凭证有效性的任务（每24小时调用validateAccount方法，实现FR-018需求）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，立即开始
- **Foundational (Phase 2)**: 依赖Setup完成 - 阻塞所有用户故事
- **User Stories (Phase 3-5)**: 均依赖Foundational完成
  - User Story 1 (P1): 可在Foundational后立即开始 - 无其他故事依赖
  - User Story 2 (P2): 可在Foundational后立即开始 - 与US1独立，但共享Modal组件
  - User Story 3 (P3): 可在Foundational后立即开始 - 与US1/US2独立
- **Polish (Phase 6)**: 依赖所需的用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational完成后可开始 - 无其他故事依赖（MVP核心）
- **User Story 2 (P2)**: Foundational完成后可开始 - 依赖US1的AccountBindingModal组件，但可以同时开发不同标签页
- **User Story 3 (P3)**: Foundational完成后可开始 - 依赖US1/US2的绑定功能产生数据，但可独立测试

### Within Each User Story

- **US1**: 后端服务（T009）→ 后端路由（T010-T011）→ 前端组件（T012-T015）→ 错误处理（T016-T018）
- **US2**: 后端服务（T019-T020）→ 后端路由（T021-T022）→ 前端Hook（T023）→ 前端组件（T024-T027）→ 状态管理（T028-T031）
- **US3**: 后端服务（T032-T033）→ 后端路由（T034-T035）→ 前端组件（T036-T040）→ 状态显示（T041-T043）

### Parallel Opportunities

- **Phase 1**: T001-T003必须顺序执行（数据库迁移），T004可并行
- **Phase 2**: T005-T008全部可并行（不同文件）
- **US1 Frontend**: T012和T013可并行（不同组件文件）
- **US2 Frontend**: T023、T024可并行（Hook和组件独立）
- **US3 Frontend**: T036和T037可并行（不同组件文件）
- **Phase 6**: 大部分任务可并行（T044-T061标记为[P]）
- **跨用户故事**: 如果团队有多人，US1/US2/US3可由不同开发者并行实现（在Foundational完成后）

---

## Parallel Example: User Story 1

```bash
# 后端服务实现后，可以并行启动：
Task T012: "创建AccountBindingModal.tsx主对话框组件"
Task T013: "创建CookieBindingTab.tsx组件"

# 错误处理阶段可以并行：
Task T016: "前端验证错误提示"
Task T017: "后端错误码映射"
```

---

## Parallel Example: Phase 6 Polish

```bash
# 多个优化任务可同时进行：
Task T044: "统一错误处理（前端）"
Task T048: "添加请求日志（后端）"
Task T049: "验证ENCRYPT_KEY配置"
Task T052: "编写后端单元测试"
Task T054: "编写前端组件测试"
Task T056: "更新文档"
```

---

## Implementation Strategy

### MVP First (仅 User Story 1)

1. 完成 Phase 1: Setup（数据库和类型）
2. 完成 Phase 2: Foundational（基础服务和验证）⚠️ **必须完成才能继续**
3. 完成 Phase 3: User Story 1（Cookie绑定）
4. **STOP and VALIDATE**: 独立测试US1功能
   - 测试有效Cookie绑定
   - 测试无效Cookie错误提示
   - 测试重复绑定检测
   - 验证数据库中凭证已加密
5. 可选择部署/演示MVP

### Incremental Delivery（推荐）

1. Setup + Foundational → 基础就绪
2. 添加 User Story 1 → 独立测试 → 部署/演示（**MVP!**）
3. 添加 User Story 2 → 独立测试 → 部署/演示（增强版）
4. 添加 User Story 3 → 独立测试 → 部署/演示（完整版）
5. Phase 6 Polish → 最终优化
6. 每个故事增加价值但不破坏之前的功能

### Parallel Team Strategy（如果有多人）

1. 团队一起完成 Setup + Foundational（1-2天）
2. Foundational完成后：
   - **开发者A**: User Story 1（Cookie绑定）- 3-4天
   - **开发者B**: User Story 2（扫码绑定）- 4-5天
   - **开发者C**: User Story 3（账号管理）- 2-3天
3. 各故事完成后独立测试和集成
4. 最后一起完成Phase 6的优化任务

**注意**: US2依赖US1的AccountBindingModal组件，建议US1先完成Modal框架后，US2再开始QRCodeBindingTab的开发，或两人协作约定Modal的props接口

---

## Task Count Summary

- **Phase 1 (Setup)**: 4个任务
- **Phase 2 (Foundational)**: 4个任务（阻塞）
- **Phase 3 (US1 - Cookie绑定)**: 10个任务
- **Phase 4 (US2 - 扫码绑定)**: 13个任务
- **Phase 5 (US3 - 账号管理)**: 12个任务
- **Phase 6 (Polish)**: 18个任务

**总计**: 61个任务

**并行机会**: 
- Phase 2中4个任务可并行
- US1中2个前端任务可并行
- US2中2个前端任务可并行
- US3中2个前端任务可并行
- Phase 6中约12个任务可并行
- 跨用户故事：3个用户故事可由不同开发者并行实现

**建议MVP范围**: Phase 1 + Phase 2 + Phase 3（共18个任务）

---

## Independent Test Criteria

### User Story 1验收标准
✅ 用户可以在"绑定B站账号"对话框中粘贴有效Cookie  
✅ 点击"保存"后，系统在3秒内验证Cookie并返回结果  
✅ 绑定成功后显示成功消息并关闭对话框  
✅ 数据库中sessdata字段已加密存储（非明文）  
✅ 尝试绑定相同账号时提示"账号已绑定"  
✅ 粘贴无效Cookie时显示具体错误原因  

### User Story 2验收标准
✅ 用户切换到"扫码登录"标签页后立即看到二维码  
✅ 二维码下方显示"请使用B站App扫码登录"提示  
✅ 系统每2秒轮询一次扫码状态（通过网络监控验证）  
✅ 用户扫码后界面提示更新为"等待确认"  
✅ 用户在App中确认后，系统自动完成绑定并关闭对话框  
✅ 二维码过期（2分钟）后显示"重新获取二维码"按钮  
✅ 切换回Cookie标签页时轮询立即停止  

### User Story 3验收标准
✅ 用户可以在设置页面看到所有已绑定账号列表  
✅ 每个账号显示昵称、UID、绑定时间、状态（有效/过期）  
✅ 点击"解绑"按钮后弹出确认对话框  
✅ 确认解绑后，账号从列表中移除  
✅ 过期账号旁边显示"过期"标签和"重新绑定"按钮  
✅ 未绑定任何账号时显示引导提示  

---

## Notes

- **[P]任务** = 不同文件，无依赖，可并行
- **[Story]标签** = 将任务映射到具体用户故事，便于追踪
- 每个用户故事应该可独立完成和测试
- 在实现前验证测试失败（如果编写测试）
- 每个任务或逻辑组完成后提交代码
- 在每个Checkpoint停下来独立验证故事功能
- **避免**: 模糊任务、同文件冲突、破坏故事独立性的跨故事依赖
- **关键**: Foundational阶段必须完全完成才能开始任何用户故事

