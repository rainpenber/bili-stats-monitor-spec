# Tasks: 历史 CSV 数据导入工具

**Input**: Design documents from `/specs/002-python-csv-backend-data-old-migrate-follower-views/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Context**: 实现命令行工具，将历史 CSV 数据导入到数据库

**Organization**: 任务按功能模块组织，支持并行开发

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事（如 US1, US2）
- 描述中包含完整文件路径

---

## Phase 1: 项目设置与工具函数

**Purpose**: 创建项目结构，实现基础工具函数（CSV 解析、时间解析）

**Goal**: 完成 CSV 解析和时间解析工具，支持流式处理和多种格式

**Independent Test**: 单元测试验证 CSV 解析和时间解析功能

### 实现任务

- [x] I001 [P] 创建 CSV 解析工具：在 `backend/src/utils/csv-parser.ts` 中实现流式 CSV 解析，支持 UTF-8 BOM 处理、编码检测、逐行读取
- [x] I002 [P] 创建时间解析工具：在 `backend/src/utils/time-parser.ts` 中实现多种时间格式解析（YYYY-MM-DD HH:MM, ISO 8601 等），返回时间戳
- [x] I003 [P] 添加工具函数单元测试：在 `backend/tests/utils/` 中创建 `csv-parser.test.ts` 和 `time-parser.test.ts`，测试各种边界情况

**Checkpoint**: CSV 解析和时间解析工具可用，单元测试通过

---

## Phase 2: 数据验证与转换

**Purpose**: 实现数据验证逻辑，确保导入数据的质量和一致性

**Goal**: 验证 CSV 数据格式、数值有效性、时间有效性，处理缺失字段

**Independent Test**: 单元测试验证各种数据验证场景

### 实现任务

- [x] I004 [P] [US1] 实现粉丝数据验证：在 `backend/src/services/csv-import.ts` 中实现 `validateFollowerRow` 函数，验证时间戳和粉丝数
- [x] I005 [P] [US2] 实现视频数据验证：在 `backend/src/services/csv-import.ts` 中实现 `validateVideoRow` 函数，验证所有字段（时间、播放量、点赞等）
- [x] I006 [P] 实现文件名解析：在 `backend/src/services/csv-import.ts` 中实现 `parseFilename` 函数，从文件名提取 UID/BV 号和类型
- [x] I007 [P] 添加数据验证单元测试：在 `backend/tests/services/` 中创建 `csv-import.test.ts`，测试验证逻辑

**Checkpoint**: 数据验证逻辑完整，单元测试通过

---

## Phase 3: 任务管理逻辑

**Purpose**: 实现任务查找/创建逻辑，确保一个 CSV 文件对应一个任务

**Goal**: 根据 type + target_id 查找或创建任务，设置合理的默认值

**Independent Test**: 单元测试验证任务查找和创建逻辑

### 实现任务

- [x] I008 [P] [US1] [US2] 实现任务查找逻辑：在 `backend/src/services/csv-import.ts` 中实现 `findOrCreateTask` 函数，根据 type + target_id 查找任务，不存在则创建
- [x] I009 [P] 实现任务默认值设置：在 `backend/src/services/csv-import.ts` 中实现任务创建时的默认值设置（status, deadline, strategy, enabled 等）
- [x] I010 [P] 添加任务管理单元测试：在 `backend/tests/services/csv-import.test.ts` 中添加任务查找和创建测试

**Checkpoint**: 任务管理逻辑完整，单元测试通过

---

## Phase 4: 数据库导入服务

**Purpose**: 实现核心导入逻辑，将 CSV 数据批量插入数据库

**Goal**: 支持批量插入、重复数据检查、错误处理

**Independent Test**: 集成测试验证数据库导入流程

### 实现任务

- [x] I011 [P] [US1] 实现粉丝数据导入：在 `backend/src/services/csv-import.ts` 中实现 `importFollowerFile` 函数，解析 CSV 并批量插入 `author_metrics` 表
- [x] I012 [P] [US2] 实现视频数据导入：在 `backend/src/services/csv-import.ts` 中实现 `importVideoFile` 函数，解析 CSV 并批量插入 `video_metrics` 表
- [x] I013 [P] 实现批量插入优化：在导入函数中实现批量缓冲区（100-500 条），使用 Drizzle ORM 批量插入
- [x] I014 [P] 实现重复数据检查：在导入函数中实现基于 `task_id + collected_at` 的唯一性检查，支持 `--update-existing` 参数
- [x] I015 [P] 实现错误收集和报告：在导入过程中收集所有错误（解析、验证、数据库），生成结构化错误报告
- [x] I016 [P] 添加数据库导入集成测试：在 `backend/tests/scripts/` 中创建 `csv-import.integration.test.ts`，测试完整导入流程

**Checkpoint**: 数据库导入服务完整，集成测试通过

---

## Phase 5: CLI 脚本实现

**Purpose**: 实现命令行脚本入口，支持参数解析、进度显示、报告生成

**Goal**: 完整的 CLI 工具，支持所有命令行参数和功能

**Independent Test**: 端到端测试验证 CLI 功能

### 实现任务

- [x] I017 [P] [US4] 实现命令行参数解析：在 `backend/scripts/import-csv.ts` 中实现参数解析（--db, --activate, --update-existing, --output-report, --verbose）
- [x] I018 [P] [US4] 实现数据库选择逻辑：根据 `--db` 参数设置数据库连接（测试/生产），验证连接
- [x] I019 [P] [US3] 实现文件扫描逻辑：扫描指定目录或文件列表，识别 `_follower.csv` 和 `_views.csv` 文件
- [x] I020 [P] [US3] 实现批量导入流程：遍历文件列表，调用导入服务，显示进度
- [x] I021 [P] 实现进度显示：在导入过程中显示当前文件、已处理行数、总行数、进度条
- [x] I022 [P] 实现报告生成：在导入完成后生成详细报告（成功/失败文件数、总记录数、错误列表），输出到控制台或文件
- [x] I023 [P] 实现优雅中断：捕获 Ctrl+C 信号，完成当前批次后优雅退出
- [x] I024 [P] 添加 CLI 端到端测试：在 `backend/tests/scripts/` 中创建 `import-csv.e2e.test.ts`，测试完整 CLI 流程

**Checkpoint**: CLI 脚本完整，端到端测试通过

---

## Phase 6: 错误处理与优化

**Purpose**: 完善错误处理，优化性能和用户体验

**Goal**: 健壮的错误处理，清晰的错误消息，性能优化

**Independent Test**: 错误场景测试，性能测试

### 实现任务

- [x] I025 [P] 完善错误处理：处理文件读取错误、数据库连接错误、数据验证错误等各种异常情况
- [x] I026 [P] 优化错误消息：提供清晰、可操作的错误消息，包含文件路径、行号、错误原因
- [x] I027 [P] 性能优化：优化批量插入大小、流式处理缓冲区大小，确保大文件导入性能
- [x] I028 [P] 添加错误场景测试：在测试中添加各种错误场景测试（文件不存在、格式错误、数据库错误等）

**Checkpoint**: 错误处理完善，性能优化完成

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (工具函数)**: 可独立开始，无前置依赖
- **Phase 2 (数据验证)**: 依赖 Phase 1（CSV 解析、时间解析）
- **Phase 3 (任务管理)**: 依赖 Phase 2（数据验证）
- **Phase 4 (数据库导入)**: 依赖 Phase 1-3（所有基础功能）
- **Phase 5 (CLI 脚本)**: 依赖 Phase 4（导入服务）
- **Phase 6 (优化)**: 依赖 Phase 5（CLI 脚本）

### 并行执行机会

- **Phase 1**: I001, I002, I003 可以并行（不同文件）
- **Phase 2**: I004, I005, I006 可以并行（不同函数）
- **Phase 3**: I008, I009 可以并行（不同函数）
- **Phase 4**: I011, I012 可以并行（不同函数），但都依赖 I008-I010
- **Phase 5**: I017-I023 大部分可以并行（不同功能模块）
- **Phase 6**: I025-I028 可以并行（不同优化点）

### 任务内依赖

- **Phase 1**: I001 → I002 → I003（可以并行开发，但测试需要两者都完成）
- **Phase 2**: I004, I005, I006 可以并行，I007 依赖 I004-I006
- **Phase 3**: I008 → I009 → I010
- **Phase 4**: I011, I012 依赖 I008-I010，I013-I015 依赖 I011-I012，I016 依赖所有
- **Phase 5**: I017 → I018 → I019 → I020 → I021-I023（I021-I023 可以并行）
- **Phase 6**: I025-I028 可以并行

---

## Implementation Strategy

### MVP First (核心功能优先)

1. **Phase 1-2**: 基础工具和数据验证（必须）
2. **Phase 3**: 任务管理（必须）
3. **Phase 4**: 数据库导入（核心功能）
4. **Phase 5**: CLI 脚本（用户界面）
5. **Phase 6**: 优化和错误处理（完善）

### 增量交付

1. 完成 Phase 1 → CSV 解析可用 → 验证
2. 完成 Phase 2 → 数据验证可用 → 验证
3. 完成 Phase 3 → 任务管理可用 → 验证
4. 完成 Phase 4 → 数据库导入可用 → 验证
5. 完成 Phase 5 → CLI 工具可用 → 验证
6. 完成 Phase 6 → 优化完成 → 最终验证

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

- **总任务数**: 28 个任务
- **Phase 1 (工具函数)**: 3 个任务
- **Phase 2 (数据验证)**: 4 个任务
- **Phase 3 (任务管理)**: 3 个任务
- **Phase 4 (数据库导入)**: 6 个任务
- **Phase 5 (CLI 脚本)**: 8 个任务
- **Phase 6 (优化)**: 4 个任务

