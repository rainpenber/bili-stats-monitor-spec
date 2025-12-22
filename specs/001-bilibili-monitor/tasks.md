# Tasks: B站数据监控工具 - 核心页面完善

**Input**: Design documents from `/specs/001-bilibili-monitor/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Context**: 继续完善核心页面 - 前端页面功能完善与体验优化

**Organization**: 任务按功能模块组织，支持并行开发

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事（如 US2, US4）
- 描述中包含完整文件路径

---

## Phase 1: 表单校验与数据验证

**Purpose**: 为任务创建/编辑表单添加完整的校验逻辑，提升数据质量与用户体验

**Goal**: 使用 zod + react-hook-form 改造 AddTaskModal 和 TaskFormModal，添加必填、格式、范围等校验规则

**Independent Test**: 在任务创建/编辑 Modal 中，输入无效数据应显示明确的错误提示，阻止提交；输入有效数据可正常提交

### 实现任务

- [x] T001 [P] 安装并配置表单校验依赖：在 `frontend/web/package.json` 中添加 `zod` 和 `react-hook-form` 依赖
- [x] T002 [P] [US2] 创建任务表单校验 Schema：在 `frontend/web/src/lib/validations/taskSchema.ts` 中定义视频/博主任务的 zod schema（BV/UID、标题/昵称、固定频率范围、标签约束等）
- [x] T003 [US2] 改造 AddTaskModal 使用 react-hook-form：在 `frontend/web/src/components/modals/AddTaskModal.tsx` 中集成 `useForm` 和 `zodResolver`，替换现有 useState 管理
- [x] T004 [US4] 改造 TaskFormModal 使用 react-hook-form：在 `frontend/web/src/components/modals/TaskFormModal.tsx` 中集成 `useForm` 和 `zodResolver`，替换现有 useState 管理
- [x] T005 [US2] 添加表单字段错误提示：在 AddTaskModal 中为每个字段添加 `{errors.fieldName && <span>错误信息</span>}` 显示
- [x] T006 [US4] 添加表单字段错误提示：在 TaskFormModal 中为每个字段添加错误提示显示
- [x] T007 [US2] 实现表单提交前校验：在 AddTaskModal 的提交处理中，仅在 `formState.isValid` 为 true 时允许提交
- [x] T008 [US4] 实现表单提交前校验：在 TaskFormModal 的提交处理中，仅在 `formState.isValid` 为 true 时允许提交

**Checkpoint**: ✅ 任务创建/编辑表单具备完整的校验能力，无效输入无法提交并显示明确错误

---

## Phase 2: 全局默认账号 UI 完善

**Purpose**: 优化系统设置页面的全局默认账号选择体验，提升可用性与反馈

**Goal**: 完善 SettingsPage 中全局默认账号的 UI 展示、状态反馈和错误处理

**Independent Test**: 在设置页面可以清晰看到当前默认账号、已绑定账号列表，选择并保存后显示成功提示；未设置时显示明确警告

### 实现任务

- [x] T009 [P] [US1] 优化默认账号选择 UI：在 `frontend/web/src/pages/SettingsPage.tsx` 中使用 Card 组件包装账号选择区域，提升视觉层次
- [x] T010 [US1] 添加账号状态标识：在 SettingsPage 中为每个账号显示状态（有效/过期），使用 Badge 组件标识
- [x] T011 [US1] 完善加载与错误状态：在 SettingsPage 中为账号加载失败、保存失败等场景添加明确的错误提示和重试按钮
- [x] T012 [US1] 添加账号选择确认反馈：在 SettingsPage 中保存默认账号后，显示 toast 成功提示并高亮当前选中的账号
- [x] T013 [US1] 优化未设置默认账号的警告：在 SettingsPage 中使用 Alert 或 Card 组件展示未设置警告，包含跳转到账号管理页的链接

**Checkpoint**: ✅ 全局默认账号选择功能具备完整的 UI 反馈和错误处理

---

## Phase 3: 日志页面优化

**Purpose**: 完善日志页面的筛选体验和交互细节

**Goal**: 优化 LogsPage 的筛选条件展示、分页交互和下载反馈

**Independent Test**: 在日志页面可以流畅使用所有筛选条件，分页切换正常，下载功能有明确的进度反馈

### 实现任务

- [x] T014 [P] [US7] 优化筛选条件布局：在 `frontend/web/src/pages/LogsPage.tsx` 中调整筛选表单的响应式布局，确保在窄屏下也能良好展示
- [x] T015 [US7] 添加筛选条件重置确认：在 LogsPage 中点击"重置"时，使用 AlertDialog 确认（可选，或直接重置）
- [x] T016 [US7] 优化分页控件：在 LogsPage 中使用 PaginationBar 组件（如已存在）替换当前自定义分页，或统一分页样式
- [x] T017 [US7] 添加下载进度反馈：在 LogsPage 中实现下载功能时，显示 loading 状态和成功/失败 toast 提示
- [x] T018 [US7] 优化日志表格展示：在 LogsPage 中为不同日志等级添加颜色标识（使用 Badge 或文本颜色），提升可读性

**Checkpoint**: ✅ 日志页面具备流畅的筛选、分页和下载体验

---

## Phase 4: 通知页面完善

**Purpose**: 完善通知设置页面的规则管理和渠道配置体验

**Goal**: 优化 NotificationsPage 的规则编辑表单、渠道配置验证和测试发送反馈

**Independent Test**: 在通知页面可以流畅创建/编辑/删除规则，配置渠道并测试发送，所有操作有明确的成功/失败反馈

### 实现任务

- [x] T019 [P] [US7] 为通知规则表单添加校验：在 `frontend/web/src/pages/NotificationsPage.tsx` 中为规则名称、触发器、渠道选择添加必填校验
- [x] T020 [US7] 优化规则编辑 Modal：在 NotificationsPage 中使用 Card 或更好的布局组件优化规则编辑表单的视觉层次
- [x] T021 [US7] 添加渠道配置验证：在 NotificationsPage 中为各渠道的 target/token 字段添加格式校验（如邮箱格式、URL 格式等）
- [x] T022 [US7] 完善测试发送反馈：在 NotificationsPage 中为测试发送功能添加 loading 状态和详细的成功/失败消息
- [x] T023 [US7] 优化规则列表展示：在 NotificationsPage 中为规则列表添加状态标识（启用/禁用），使用 Badge 或开关组件

**Checkpoint**: ✅ 通知页面具备完整的规则管理和渠道配置能力

---

## Phase 5: UI/UX 细节优化

**Purpose**: 统一页面风格，优化交互细节，提升整体用户体验

**Goal**: 统一各页面的视觉风格，优化加载状态、空状态、错误提示等细节

**Independent Test**: 所有页面风格统一，加载/空/错误状态展示一致，交互流畅无卡顿

### 实现任务

- [X] T024 [P] 统一页面标题样式：检查所有页面（DashboardPage、AccountsPage、LogsPage、NotificationsPage、SettingsPage）的标题样式，确保使用一致的 `text-xl font-semibold` 类名
- [X] T025 [P] 统一空状态展示：为所有列表页面（DashboardPage、AccountsPage、NotificationsPage）添加统一的空状态组件，使用 Card 和提示文字
- [X] T026 [P] 统一加载状态：检查所有页面的加载状态展示，确保使用一致的 loading 文本或 Spinner 组件
- [X] T027 [P] 优化错误提示一致性：检查所有页面的错误提示，确保使用 `toast.error` 统一展示，错误消息格式一致
- [X] T028 [P] 添加页面间导航优化：在需要跳转的页面（如 SettingsPage 跳转到 AccountsPage）使用 Link 组件，确保导航体验流畅
- [X] T029 [P] 优化 Modal 关闭体验：检查所有 Modal（AddTaskModal、TaskFormModal、AccountBindModal 等），确保关闭时有适当的清理逻辑

**Checkpoint**: 所有页面风格统一，交互体验一致

---

## Phase 6: 代码质量与重构

**Purpose**: 提升代码质量，统一代码风格，优化可维护性

**Goal**: 统一 API 调用方式，优化类型定义，清理冗余代码

**Independent Test**: 代码通过 lint 检查，类型检查无错误，所有 API 调用使用统一的 http.ts SDK

### 实现任务

- [X] T030 [P] 统一 API 调用：检查所有页面和组件，确保所有 `fetch` 调用已替换为 `http.ts` 中的统一方法
- [X] T031 [P] 优化类型定义：检查 `frontend/web/src/lib/api.ts` 中的类型定义，确保与 OpenAPI 契约一致，补充缺失的类型
- [X] T032 [P] 清理未使用的导入和变量：运行 ESLint 检查，清理所有未使用的导入、变量和函数
- [X] T033 [P] 统一错误处理：检查所有 try-catch 块，确保错误处理逻辑一致，使用统一的错误消息格式
- [X] T034 [P] 优化组件 Props 类型：检查所有组件的 Props 类型定义，确保使用 TypeScript 严格模式，避免 `any` 类型

**Checkpoint**: 代码质量提升，类型安全，风格统一

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (表单校验)**: 可独立开始，无前置依赖
- **Phase 2 (默认账号 UI)**: 可独立开始，无前置依赖
- **Phase 3 (日志页面)**: 可独立开始，无前置依赖
- **Phase 4 (通知页面)**: 可独立开始，无前置依赖
- **Phase 5 (UI/UX 优化)**: 建议在 Phase 1-4 完成后进行，确保功能稳定后再优化细节
- **Phase 6 (代码质量)**: 建议在所有功能完成后进行，作为最终优化

### 并行执行机会

- **Phase 1-4**: 可以完全并行执行，涉及不同页面和组件
- **Phase 5**: 内部任务可以并行（不同页面）
- **Phase 6**: 内部任务可以并行（不同文件）

### 任务内依赖

- **Phase 1**: T001 → T002 → T003/T004 → T005/T006 → T007/T008
- **Phase 2**: T009-T013 可以并行执行
- **Phase 3**: T014-T018 可以并行执行
- **Phase 4**: T019-T023 可以并行执行
- **Phase 5**: T024-T029 可以完全并行
- **Phase 6**: T030-T034 可以完全并行

---

## Parallel Example: Phase 1-4 并行执行

```bash
# 开发者 A: 表单校验
Task: "安装并配置表单校验依赖"
Task: "创建任务表单校验 Schema"
Task: "改造 AddTaskModal 使用 react-hook-form"

# 开发者 B: 默认账号 UI
Task: "优化默认账号选择 UI"
Task: "添加账号状态标识"
Task: "完善加载与错误状态"

# 开发者 C: 日志页面优化
Task: "优化筛选条件布局"
Task: "添加筛选条件重置确认"
Task: "优化分页控件"

# 开发者 D: 通知页面完善
Task: "为通知规则表单添加校验"
Task: "优化规则编辑 Modal"
Task: "添加渠道配置验证"
```

---

## Implementation Strategy

### MVP First (核心功能优先)

1. **Phase 1 (表单校验)**: 优先完成，提升数据质量
2. **Phase 2 (默认账号 UI)**: 核心功能，优先完善
3. **Phase 3-4 (日志/通知)**: 按优先级完成
4. **Phase 5-6 (优化)**: 最后进行

### 增量交付

1. 完成 Phase 1 → 表单校验可用 → 验证
2. 完成 Phase 2 → 默认账号 UI 完善 → 验证
3. 完成 Phase 3 → 日志页面优化 → 验证
4. 完成 Phase 4 → 通知页面完善 → 验证
5. 完成 Phase 5-6 → 整体优化 → 最终验证

### 并行团队策略

- **开发者 A**: Phase 1 (表单校验)
- **开发者 B**: Phase 2 (默认账号 UI)
- **开发者 C**: Phase 3 (日志页面)
- **开发者 D**: Phase 4 (通知页面)
- 所有 Phase 完成后，统一进行 Phase 5-6 优化

---

## Notes

- [P] 任务 = 不同文件，无依赖，可并行
- [Story] 标签映射到具体用户故事，便于追溯
- 每个 Phase 应独立完成和验证
- 提交前确保代码通过 lint 和类型检查
- 每个 Phase 完成后进行独立验证
- 避免：模糊任务、文件冲突、跨 Phase 依赖破坏独立性

---

## Summary

- **总任务数**: 34 个任务
- **Phase 1 (表单校验)**: 8 个任务 ✅ **已完成**
- **Phase 2 (默认账号 UI)**: 5 个任务 ✅ **已完成**
- **Phase 3 (日志页面)**: 5 个任务 ✅ **已完成**
- **Phase 4 (通知页面)**: 5 个任务 ✅ **已完成**
- **Phase 5 (UI/UX 优化)**: 6 个任务 ⏸️ **待开始**
- **Phase 6 (代码质量)**: 5 个任务 ⏸️ **待开始**

**进度统计**:
- ✅ **已完成**: 23 个任务 (68%)
- ⏸️ **待开始**: 11 个任务 (32%)

**并行机会**: Phase 1-4 可以完全并行执行，Phase 5-6 内部任务也可以并行

**建议 MVP 范围**: Phase 1 (表单校验) + Phase 2 (默认账号 UI) 作为第一优先级 ✅ **已完成**

**当前状态**: Phase 1-4 已完成，建议继续 Phase 5 (UI/UX 细节优化) 和 Phase 6 (代码质量与重构)

