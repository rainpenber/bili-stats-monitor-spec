# Feature Specification: 历史 CSV 数据导入工具

**Feature Branch**: `002-python-csv-backend-data-old-migrate-follower-views`  
**Created**: 2025-12-20  
**Status**: Draft  
**Input**: 将 Python 版本后端抓取的 CSV 数据导入到新数据库系统

## Clarifications

### Session 2025-12-20

- Q: 如果数据库中已存在相同 target_id 的任务，导入新 CSV 时应如何处理？ → A: 使用现有任务，将新 CSV 的数据追加到该任务的 metrics 表
- Q: 脚本如何指定目标数据库？ → A: 通过命令行参数指定（测试/生产数据库）
- Q: 如何处理重复数据（同一时间点的多条记录或数据库中已存在的记录）？ → A: 默认跳过已存在的记录（基于 task_id + collected_at 唯一性），提供命令行参数 `--update-existing` 可强制覆盖
- Q: 导入脚本如何控制任务的激活状态和监控间隔？ → A: 提供命令行参数 `--activate`，指定时任务 `enabled=true` 且使用固定4小时间隔（`strategy.mode='fixed'`, `interval=240分钟`）；未指定时默认 `enabled=false`，需在前端批量激活

---

## User Scenarios & Testing

### User Story 1 - 管理员批量导入历史粉丝数据 (Priority: P1)

管理员需要将历史 CSV 文件中的粉丝数数据导入到新系统的数据库中，以便在新系统中查看历史趋势。

**Why this priority**: 历史数据是系统价值的重要组成部分，导入功能是数据迁移的基础。

**Independent Test**: 管理员运行导入命令，系统成功解析 `_follower.csv` 文件并将数据写入 `author_metrics` 表，可在数据库中查询到导入的数据。

**Acceptance Scenarios**:

1. **Given** 管理员在 `backend/data/old-migrate` 目录下有 `28457_follower.csv` 文件, **When** 运行导入命令指定该文件, **Then** 系统解析文件并将所有行数据导入到 `author_metrics` 表
2. **Given** CSV 文件包含时间戳和粉丝数字段, **When** 导入, **Then** 数据正确映射到 `collected_at` 和 `follower` 字段
3. **Given** 文件名格式为 `{UID}_follower.csv`, **When** 导入, **Then** 系统从文件名提取 UID，查找是否存在相同 `target_id` 的任务，不存在则创建新任务，`title` 字段暂时使用 UID 值
4. **Given** 导入过程中出现数据格式错误, **When** 系统检测到, **Then** 记录错误但继续处理其他行，最后报告成功和失败数量

---

### User Story 2 - 管理员批量导入历史视频数据 (Priority: P1)

管理员需要将历史 CSV 文件中的视频播放数据导入到新系统的数据库中，包括播放量、在线人数、点赞、投币等指标。

**Why this priority**: 视频数据是核心监控指标，历史数据导入是系统完整性的关键。

**Independent Test**: 管理员运行导入命令，系统成功解析 `_views.csv` 文件并将数据写入 `video_metrics` 表。

**Acceptance Scenarios**:

1. **Given** 管理员有 `BV11A7fzTEti_views.csv` 文件, **When** 运行导入命令, **Then** 系统解析所有字段（时间、播放量、在线观看人数、点赞、投币、收藏、分享、弹幕）并导入到 `video_metrics` 表
2. **Given** CSV 文件包含多行数据, **When** 导入, **Then** 每行数据正确映射到对应的数据库字段
3. **Given** 文件名格式为 `{BV号}_views.csv`, **When** 导入, **Then** 系统从文件名提取 BV 号，查找是否存在相同 `target_id` 的任务，不存在则创建新任务，`title` 字段暂时使用 BV 号值
4. **Given** 某些字段值为空或无效, **When** 导入, **Then** 系统使用默认值（如 0）或跳过该行并记录警告

---

### User Story 3 - 管理员批量导入多个文件 (Priority: P2)

管理员可以一次性导入目录下的所有 CSV 文件，系统自动识别文件类型（粉丝数据或视频数据）并批量处理。

**Why this priority**: 提高导入效率，减少重复操作。

**Independent Test**: 管理员指定目录路径，系统扫描所有 CSV 文件，按类型分组处理，显示总体进度和结果汇总。

**Acceptance Scenarios**:

1. **Given** `backend/data/old-migrate` 目录下有多个 `_follower.csv` 和 `_views.csv` 文件, **When** 管理员运行批量导入命令, **Then** 系统识别所有文件并按类型处理
2. **Given** 批量导入过程中, **When** 处理每个文件, **Then** 系统显示当前处理的文件名和进度
3. **Given** 批量导入完成, **When** 所有文件处理完毕, **Then** 系统显示汇总报告（总文件数、成功数、失败数、总记录数）

---

### User Story 4 - 管理员选择目标数据库 (Priority: P2)

管理员可以在导入时选择目标数据库（测试数据库或生产数据库），确保数据导入到正确的环境。

**Why this priority**: 支持分阶段导入策略，先导入测试环境验证，再导入生产环境。

**Independent Test**: 管理员通过命令行参数或配置文件指定目标数据库，系统连接到指定数据库并执行导入。

**Acceptance Scenarios**:

1. **Given** 管理员首次导入, **When** 指定测试数据库, **Then** 数据导入到测试数据库（端口 5555）
2. **Given** 测试环境导入验证通过, **When** 管理员指定生产数据库, **Then** 数据导入到生产数据库（端口 5556）
3. **Given** 管理员未指定目标数据库, **When** 运行导入命令, **Then** 系统使用默认配置（测试数据库）并提示用户

---

### Edge Cases

- 如何处理 CSV 文件编码问题（UTF-8 BOM、GBK 等）？
- 如何处理时间格式不一致（多种日期时间格式）？
- 如何处理重复数据（同一时间点的多条记录）？→ 默认跳过已存在记录，可通过 `--update-existing` 参数强制覆盖
- 如何处理文件名格式不符合预期的情况？
- 如何处理超大文件（内存限制）？
- 如何处理导入过程中的数据库连接中断？
- 如何处理部分导入成功后的回滚需求？

---

## Requirements

### Functional Requirements

#### CSV 文件解析

- **FR-001**: 系统 MUST 支持解析 `_follower.csv` 格式文件，包含"时间"和"粉丝数"两列
- **FR-002**: 系统 MUST 支持解析 `_views.csv` 格式文件，包含"时间、播放量、在线观看人数、点赞、投币、收藏、分享、弹幕"列
- **FR-003**: 系统 MUST 从文件名提取标识符（`{UID}_follower.csv` 提取 UID，`{BV号}_views.csv` 提取 BV 号）
- **FR-004**: 系统 MUST 支持多种时间格式解析（如 "2025-11-28 16:43"、"2025-11-28T16:43:00" 等）
- **FR-005**: 系统 MUST 处理 CSV 文件中的 BOM（Byte Order Mark）和编码问题
- **FR-006**: 系统 MUST 跳过 CSV 文件中的空行和无效行

#### 数据验证与转换

- **FR-007**: 系统 MUST 验证时间字段的有效性，无效时间应记录错误并跳过该行
- **FR-008**: 系统 MUST 验证数值字段（粉丝数、播放量等）为有效整数，非数字值应使用默认值 0 或跳过
- **FR-009**: 系统 MUST 将 CSV 中的时间字符串转换为数据库时间戳格式
- **FR-010**: 系统 MUST 处理缺失字段（使用默认值 0 或 null）

#### 数据库导入

- **FR-011**: 系统 MUST 将粉丝数据导入到 `author_metrics` 表，映射字段：`collected_at` ← 时间，`follower` ← 粉丝数
- **FR-012**: 系统 MUST 将视频数据导入到 `video_metrics` 表，映射所有字段（view, online, like, coin, favorite, share, danmaku, reply）
- **FR-013**: 系统 MUST 为导入的数据创建或关联对应的监控任务（`tasks` 表）
- **FR-014**: 系统 MUST 支持批量插入以提高导入性能（每批至少 100 条记录）
- **FR-015**: 系统 MUST 在导入前检查任务是否存在（基于 `type` 和 `target_id` 组合），不存在时自动创建任务记录

#### 任务关联

- **FR-016**: 对于 `_follower.csv` 文件，系统 MUST 查找是否存在 `type='author'` 且 `target_id` 等于文件名的 UID 的任务，如果存在则使用现有任务，如果不存在则创建新任务
- **FR-017**: 对于 `_views.csv` 文件，系统 MUST 查找是否存在 `type='video'` 且 `target_id` 等于文件名的 BV 号的任务，如果存在则使用现有任务，如果不存在则创建新任务
- **FR-018**: 系统 MUST 确保一个 CSV 文件对应一个任务，即：一个任务 = 一个 CSV 文件 = 一个对应的视频/博主。如果任务已存在（相同 target_id），则将新 CSV 的数据追加到该任务的 metrics 表
- **FR-019**: 系统 MUST 为自动创建的任务设置 `title` 字段为 `target_id`（UID 或 BV 号），因为 CSV 数据中不包含标题或昵称信息
- **FR-020**: 系统 MUST 为自动创建的任务设置合理的默认值：
  - `status`: `'active'`
  - `deadline`: `null`（无限制）
  - `alert_rules`: `[]`（空数组）
  - `enabled`: 根据命令行参数 `--activate` 决定（见 FR-020a）
  - `strategy`: 根据命令行参数 `--activate` 决定（见 FR-020a）
- **FR-020a**: 系统 MUST 提供命令行参数 `--activate`：
  - 当指定 `--activate` 时：任务 `enabled=true`，`strategy.mode='fixed'`，`strategy.value=240`（分钟），`strategy.unit='minute'`（固定4小时间隔）
  - 当未指定 `--activate` 时：任务 `enabled=false`，`strategy.mode='fixed'`，`strategy.value=240`（分钟），`strategy.unit='minute'`（任务创建但不激活，需在前端批量激活）

#### 错误处理与报告

- **FR-021**: 系统 MUST 记录导入过程中的所有错误（文件解析错误、数据验证错误、数据库错误）
- **FR-022**: 系统 MUST 在导入完成后生成详细报告（成功文件数、失败文件数、总记录数、错误列表）
- **FR-023**: 系统 MUST 默认跳过已存在的记录（基于 `task_id` + `collected_at` 唯一性检查），只插入新记录
- **FR-023a**: 系统 MUST 提供命令行参数 `--update-existing`，当指定该参数时，覆盖已存在的记录（相同 `task_id` + `collected_at` 时更新旧值）
- **FR-024**: 系统 MUST 在遇到严重错误时提供回滚选项（可选功能）

#### 数据库选择

- **FR-025**: 系统 MUST 支持通过命令行参数指定目标数据库（测试数据库或生产数据库）
- **FR-026**: 命令行参数 MUST 明确标识数据库类型（如 `--db test` 或 `--db prod`），不允许仅通过环境变量配置
- **FR-027**: 系统 MUST 默认使用测试数据库（端口 5555）进行导入（当未指定参数时）
- **FR-028**: 系统 MUST 在导入前验证目标数据库连接

#### 性能与进度

- **FR-029**: 系统 MUST 显示导入进度（当前文件、已处理行数、总行数）
- **FR-030**: 系统 MUST 支持导入大文件（使用流式处理避免内存溢出）
- **FR-031**: 系统 MUST 在导入过程中提供可中断机制（Ctrl+C 优雅退出）

### Key Entities

- **CSVFile**: CSV 文件实体（文件名、类型、路径、行数）
- **ImportJob**: 导入任务（目标数据库、文件列表、状态、开始时间、结束时间、结果统计）
- **ImportRecord**: 单条导入记录（源文件、目标表、记录数、状态、错误信息）

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 管理员可以在 5 分钟内完成单个 CSV 文件的导入（文件大小 ≤ 10MB）
- **SC-002**: 系统能够成功导入至少 95% 的有效数据行（排除格式错误的数据）
- **SC-003**: 批量导入 100 个文件时，系统在 30 分钟内完成处理
- **SC-004**: 导入后的数据在数据库中可正确查询，时间序列数据保持完整性
- **SC-005**: 导入过程产生的错误报告清晰明确，管理员能够根据报告定位问题文件
- **SC-006**: 系统支持导入至少 10,000 行数据的单个文件而不出现内存错误
- **SC-007**: 导入功能支持测试和生产数据库切换，切换时间 ≤ 1 分钟

---

## Assumptions

1. CSV 文件使用 UTF-8 编码（可能带 BOM）
2. 时间格式主要为 "YYYY-MM-DD HH:MM" 格式
3. 数值字段均为整数，无小数
4. 文件名格式严格遵循 `{ID}_follower.csv` 或 `{BV}_views.csv` 模式
5. 同一文件中的数据按时间升序排列
6. 导入过程中数据库连接稳定
7. CSV 数据中不包含标题或昵称信息，只有 UID 或 BV 号
8. 一个 CSV 文件对应一个任务，即：一个任务 = 一个 CSV 文件 = 一个对应的视频/博主
9. 任务的 `title` 字段在导入时暂时使用 `target_id`，后续通过独立脚本更新
10. 历史数据导入是一次性操作，不需要支持增量更新

---

## Notes

- 本功能主要面向管理员用户，通过命令行工具执行
- 导入过程应提供详细的日志输出，便于问题排查
- 考虑未来可能需要支持其他格式的历史数据（JSON、Excel 等）
- 导入工具应设计为可独立运行的脚本，不依赖 Web 服务
- 建议先导入测试数据库验证，确认无误后再导入生产数据库

### 关于任务标题和元数据

**当前导入策略**：
- CSV 数据中只包含 UID 或 BV 号，不包含标题或昵称
- 导入时，每个 CSV 文件创建一个对应的任务，任务的 `title` 字段暂时设置为 `target_id`（UID 或 BV 号）
- 一个 CSV 文件 = 一个任务 = 一个对应的视频/博主

**未来更新计划**：
- 将提供一个独立的脚本工具，调用 B站 API 批量更新所有任务的 `title` 字段
- 该脚本将获取视频标题或用户昵称，并更新到对应的任务记录
- 同时拉取视频封面或用户头像到本地缓存
- 此功能将在后续特性中实现，不在本次导入功能范围内

### 关于监控间隔和智能策略

**后端智能间隔设计**（已在 `backend-architecture.md` 中实现）：
- 后端调度器支持智能间隔策略（`strategy.mode='smart'`），根据视频发布时间动态调整监控频率：
  - 0-5 天：每 10 分钟检测一次
  - 5-14 天：每 2 小时检测一次
  - 14 天以上：每 4 小时检测一次

**导入脚本的间隔策略**：
- 导入脚本创建的任务使用**固定间隔**（`strategy.mode='fixed'`），固定为 4 小时（240 分钟）
- 理由：历史数据导入的任务通常对应已发布较久的视频/博主，使用固定 4 小时间隔更合适
- 如果用户需要智能间隔，可在前端手动修改任务的策略设置

**任务激活控制**：
- 通过 `--activate` 参数控制任务是否立即激活监控
- 未指定时默认不激活，管理员可在前端批量激活并调整策略
