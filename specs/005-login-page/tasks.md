# Tasks: 用户登录页面

**Input**: Design documents from `/specs/005-login-page/`  
**Prerequisites**: ✅ plan.md, ✅ spec.md, ✅ research.md

**Tests**: 本功能暂不包含单元测试任务（可在实施完成后补充）

**Organization**: 任务按用户故事分组，每个故事可独立实施和测试

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 任务所属用户故事（US1, US2, US3等）
- 包含精确的文件路径

## Path Conventions

- **Monorepo结构**:
  - 前端: `frontend/web/src/`
  - 后端: `backend/src/`（已就绪，无需修改）
- 所有路径相对于仓库根目录

---

## Phase 1: Setup (共享基础设施)

**目的**: 项目初始化和基础类型定义

- [X] T001 [P] 创建认证相关TypeScript类型定义 `frontend/web/src/types/auth.ts`
- [X] T002 [P] 创建Token存储工具函数 `frontend/web/src/utils/token.ts`
- [X] T003 [P] 创建登录表单Zod验证schema `frontend/web/src/lib/validations/authSchemas.ts`

---

## Phase 2: Foundational (阻塞性前置任务)

**目的**: 核心基础设施，必须在任何用户故事实施前完成

**⚠️ 关键**: 所有用户故事工作必须等待此阶段完成

- [X] T004 扩展Zustand store，添加`loginModalOpen`和`pendingAction`状态 `frontend/web/src/store/uiSelection.ts`
- [X] T005 [P] 实现HTTP请求拦截器（自动注入JWT token） `frontend/web/src/utils/authInterceptor.ts`
- [X] T006 [P] 更新HTTP客户端集成拦截器 `frontend/web/src/lib/http.ts`
- [X] T007 [P] 扩展API客户端，添加`login()`和`logout()`方法 `frontend/web/src/lib/api.ts`
- [X] T008 [P] 创建`useAuth` Hook（认证状态管理） `frontend/web/src/hooks/useAuth.ts`
- [X] T009 [P] 创建`usePendingAction` Hook（Pending Action管理） `frontend/web/src/hooks/usePendingAction.ts`

**检查点**: 基础设施就绪 - 用户故事实施现在可以并行开始

---

## Phase 3: User Story 1 - 管理员密码登录 (Priority: P1) 🎯 MVP

**目标**: 用户可以通过独立登录页面输入用户名和密码登录，获取JWT token，并访问受保护页面

**独立测试**: 访问`/login`页面，输入`admin/admin123`，点击登录，成功后跳转到仪表板，且后续API请求携带token

### Implementation for User Story 1

- [X] T010 [P] [US1] 创建LoginForm组件（复用登录表单） `frontend/web/src/components/auth/LoginForm.tsx`
- [X] T011 [US1] 创建独立LoginPage页面 `frontend/web/src/pages/LoginPage.tsx`（使用T010组件）
- [X] T012 [US1] 在App.tsx中添加`/login`路由 `frontend/web/src/App.tsx`
- [X] T013 [US1] 实现已登录用户访问`/login`时重定向到仪表板逻辑（FR-024） `frontend/web/src/App.tsx`

**检查点**: 用户故事1完全功能，可独立测试（独立登录页面可用）

---

## Phase 4: User Story 2 - 受保护路由访问控制 (Priority: P1)

**目标**: 未登录用户访问受保护页面时弹出登录Modal（优先）或重定向到登录页面（备选），登录成功后允许访问

**独立测试**: 未登录状态直接访问`/accounts`，系统弹出登录Modal，输入凭据登录成功后，可以正常访问该页面

### Implementation for User Story 2

- [X] T014 [US2] 创建ProtectedRoute HOC组件 `frontend/web/src/components/auth/ProtectedRoute.tsx`
- [X] T015 [US2] 更新App.tsx，为受保护路由添加ProtectedRoute包装 `frontend/web/src/App.tsx`
- [X] T016 [US2] 在ProtectedRoute中实现未登录时弹出Modal逻辑（FR-023）
- [X] T017 [US2] 实现登录成功后跳转到原始路径逻辑（通过sessionStorage记录） `frontend/web/src/components/auth/ProtectedRoute.tsx`

**检查点**: 用户故事2完全功能，路由保护机制工作正常

---

## Phase 5: User Story 3 - 退出登录 (Priority: P2)

**目标**: 已登录用户可以点击侧边栏"退出登录"按钮，清除token，UI更新为"未登录"状态

**独立测试**: 登录后，在侧边栏点击"退出登录"，系统清除token，侧边栏显示"未登录"，再次访问受保护页面时弹出登录Modal

### Implementation for User Story 3

- [X] T018 [US3] 创建UserStatus组件（侧边栏用户状态模块） `frontend/web/src/components/auth/UserStatus.tsx`
- [X] T019 [US3] 在AppLayout中集成UserStatus组件（导航菜单末尾） `frontend/web/src/layouts/AppLayout.tsx`
- [X] T020 [US3] 实现UserStatus中的"未登录"状态UI（显示"未登录"+登录按钮）
- [X] T021 [US3] 实现UserStatus中的"已登录"状态UI（显示头像+用户名+登出按钮）
- [X] T022 [US3] 实现登出按钮点击逻辑（调用logout API，清除token，更新UI）

**检查点**: 用户故事3完全功能，用户可以正常退出登录

---

## Phase 6: User Story 4 - 侧边栏用户状态展示 (Priority: P1)

**目标**: 侧边栏导航菜单末尾显示用户登录状态，未登录时显示"未登录"+登录按钮，已登录时显示头像+用户名+登出按钮

**独立测试**: 未登录时侧边栏显示"未登录"+登录按钮，点击登录按钮弹出登录Modal；登录成功后侧边栏显示头像+用户名+登出按钮

**注**: 此用户故事的实施任务已包含在Phase 5 (US3)中，因为UserStatus组件同时满足US3和US4需求

**检查点**: 用户故事4完全功能（已通过Phase 5完成）

---

## Phase 7: User Story 5 - 登录Modal交互 (Priority: P1)

**目标**: 系统提供登录Modal，在用户执行需要鉴权的操作时弹出，登录成功后自动关闭并重试之前的操作

**独立测试**: 未登录时点击"绑定新账号"按钮，触发登录Modal，输入凭据登录成功后，Modal关闭，账号绑定Modal自动打开

### Implementation for User Story 5

- [X] T023 [P] [US5] 创建LoginModal组件 `frontend/web/src/components/auth/LoginModal.tsx`（复用LoginForm）
- [X] T024 [US5] 在App.tsx或AppLayout中添加LoginModal组件（全局渲染）
- [X] T025 [US5] 实现HTTP拦截器401响应触发LoginModal逻辑（FR-020） `frontend/web/src/utils/authInterceptor.ts`
- [X] T026 [US5] 实现侧边栏"登录"按钮点击触发LoginModal逻辑（FR-006） `frontend/web/src/components/auth/UserStatus.tsx`
- [X] T027 [US5] 实现登录成功后自动重试Pending Action逻辑（FR-011） `frontend/web/src/components/auth/LoginModal.tsx`
- [X] T028 [US5] 实现Modal关闭（未登录）时清空Pending Action逻辑

**检查点**: 用户故事5完全功能，登录Modal可正常弹出并重试操作

---

## Phase 8: User Story 6 - 记住我功能 (Priority: P3)

**目标**: 用户可以选择"记住我"选项，延长token有效期或在浏览器关闭后保持登录状态

**独立测试**: 登录时勾选"记住我"，关闭浏览器后重新打开，系统仍保持登录状态

### Implementation for User Story 6

- [ ] T029 [US6] 在LoginForm中添加"记住我"复选框 `frontend/web/src/components/auth/LoginForm.tsx`
- [ ] T030 [US6] 更新Token存储逻辑，根据"记住我"选择localStorage或sessionStorage `frontend/web/src/utils/token.ts`
- [ ] T031 [US6] 在useAuth Hook中实现初始化时从localStorage/sessionStorage恢复登录状态 `frontend/web/src/hooks/useAuth.ts`

**检查点**: 用户故事6完全功能，"记住我"功能工作正常

---

## Phase 9: Polish & Cross-Cutting Concerns

**目的**: 跨多个用户故事的改进和优化

- [ ] T032 [P] 添加登录/登出过程的加载状态和视觉反馈（SC-001, SC-009, SC-010）
- [ ] T033 [P] 实现错误提示优化（网络错误、凭据错误等） `frontend/web/src/components/auth/LoginForm.tsx`
- [ ] T034 [P] 添加Token过期倒计时提示（可选，用户体验增强）
- [ ] T035 [P] 更新项目文档，记录登录流程和API使用方式 `docs/authentication.md`
- [ ] T036 代码审查和重构（确保遵循分层架构，无直接数据库操作）
- [ ] T037 [P] 性能优化（确保满足SC-008至SC-010的性能目标）
- [ ] T038 [P] 安全加固（XSS防护、CSP策略验证）
- [ ] T039 验证quickstart.md中的开发流程（待quickstart.md生成后）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 - 可立即开始
- **Foundational (Phase 2)**: 依赖Setup完成 - 阻塞所有用户故事
- **User Stories (Phase 3-8)**: 所有依赖Foundational阶段完成
  - 用户故事可以并行进行（如果有团队人力）
  - 或按优先级顺序进行（P1 → P2 → P3）
- **Polish (Phase 9)**: 依赖所有期望的用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational完成后可开始 - 无其他故事依赖
- **User Story 2 (P1)**: Foundational完成后可开始 - 依赖US1的登录表单组件
- **User Story 3 (P2)**: Foundational完成后可开始 - 无其他故事依赖
- **User Story 4 (P1)**: 已包含在US3中
- **User Story 5 (P1)**: Foundational完成后可开始 - 依赖US1的登录表单组件
- **User Story 6 (P3)**: 依赖US1完成（需修改LoginForm）

### Within Each User Story

- LoginForm组件先于LoginPage和LoginModal
- 组件创建先于集成
- 核心功能先于优化
- 故事完成后再进入下一优先级

### Parallel Opportunities

- Phase 1中所有标记[P]的任务可并行
- Phase 2中所有标记[P]的任务可并行（在Phase 2内）
- Foundational完成后，US1、US3、US5可并行开始（US2依赖US1）
- Phase 9中所有标记[P]的任务可并行

---

## Parallel Example: User Story 1

```bash
# 并行启动User Story 1的所有可并行任务:
Task T010: "创建LoginForm组件"
# 然后依次:
Task T011: "创建独立LoginPage页面"（依赖T010）
Task T012: "添加/login路由"
Task T013: "实现重定向逻辑"
```

---

## Parallel Example: Foundational Phase

```bash
# Foundational阶段可并行的任务:
Task T005: "实现HTTP请求拦截器"
Task T007: "扩展API客户端"
Task T008: "创建useAuth Hook"
Task T009: "创建usePendingAction Hook"

# 然后串行:
Task T004: "扩展Zustand store"（其他任务可能依赖）
Task T006: "更新HTTP客户端集成拦截器"（依赖T005）
```

---

## Implementation Strategy

### MVP First (仅User Story 1)

1. 完成Phase 1: Setup
2. 完成Phase 2: Foundational（关键 - 阻塞所有故事）
3. 完成Phase 3: User Story 1
4. **停止并验证**: 独立测试User Story 1
5. 如果就绪可部署/演示

### Incremental Delivery（推荐）

1. 完成Setup + Foundational → 基础就绪
2. 添加User Story 1 → 独立测试 → 部署/演示（MVP！）
3. 添加User Story 2 → 独立测试 → 部署/演示
4. 添加User Story 5 → 独立测试 → 部署/演示
5. 添加User Story 3 → 独立测试 → 部署/演示
6. 添加User Story 6 → 独立测试 → 部署/演示
7. 每个故事增加价值而不破坏之前的故事

### Parallel Team Strategy

多人开发时：

1. 团队一起完成Setup + Foundational
2. Foundational完成后：
   - Developer A: User Story 1 + User Story 2（串行，US2依赖US1）
   - Developer B: User Story 3（独立）
   - Developer C: User Story 5（依赖US1的LoginForm，可在US1完成T010后开始）
3. 故事独立完成和集成

---

## Task Statistics

- **总任务数**: 39个任务
- **Setup阶段**: 3个任务
- **Foundational阶段**: 6个任务（关键阻塞点）
- **User Story 1**: 4个任务
- **User Story 2**: 4个任务
- **User Story 3**: 5个任务
- **User Story 4**: 0个任务（已包含在US3中）
- **User Story 5**: 6个任务
- **User Story 6**: 3个任务
- **Polish阶段**: 8个任务

### Parallel Opportunities Identified

- **Phase 1**: 3个任务可并行（T001-T003）
- **Phase 2**: 4个任务可并行（T005, T007, T008, T009）
- **Phase 9**: 6个任务可并行（T032-T038中的6个）
- **跨User Story并行**: US1 + US3 + US5可同时开始（Foundational完成后）

### Independent Test Criteria

每个用户故事都有明确的独立测试标准（见各Phase的"独立测试"部分）

### Suggested MVP Scope

**最小MVP**: Phase 1 + Phase 2 + Phase 3 (User Story 1)
- 提供独立登录页面
- 用户可以登录并获取token
- 约13个任务，预计1-2天完成

**完整P1功能MVP**: Phase 1 + Phase 2 + Phase 3-7 (所有P1故事)
- 包括登录页面、路由保护、登录Modal、用户状态展示
- 约28个任务，预计2-3天完成

---

## Notes

- **[P]** 任务 = 不同文件，无依赖
- **[Story]** 标签将任务映射到特定用户故事以便追踪
- 每个用户故事应可独立完成和测试
- 在每个检查点停止以独立验证故事
- 避免：模糊任务、相同文件冲突、破坏独立性的跨故事依赖
- 提交建议：每个任务或逻辑组完成后提交一次

---

## Format Validation

✅ **所有任务遵循清单格式**:
- ✅ 复选框: `- [ ]`
- ✅ 任务ID: T001-T039（按执行顺序）
- ✅ [P]标记: 用于可并行任务
- ✅ [Story]标签: 用于用户故事阶段任务（US1-US6）
- ✅ 描述: 清晰的操作和精确的文件路径

