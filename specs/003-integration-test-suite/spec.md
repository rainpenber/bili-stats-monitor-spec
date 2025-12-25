# Feature Specification: 前后端集成测试与接口验证

**Feature Branch**: `003-integration-test-suite`  
**Created**: 2025-12-23  
**Status**: Draft  
**Input**: 目前前后端的开发已经大体完成。但是由于是分别、分步骤开发，无法得知目前开发过程中前后端的接口是否完全对的上，以及代码是否存在可能的运行错误。我需要按照详细的逐个检查和测试方案，设计必要的单元测试

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 开发人员验证前后端接口契约一致性 (Priority: P1)

开发人员运行自动化工具，检查前端 API 调用代码与后端 OpenAPI 规范是否完全对齐，包括请求路径、方法、参数、请求体和响应体结构。

**Why this priority**: 接口不匹配会导致前端调用失败，是最基础的集成问题，必须首先解决。

**Independent Test**: 可以独立运行契约验证工具，对比前端 TypeScript 类型定义与 OpenAPI schema，生成差异报告。

**Acceptance Scenarios**:

1. **Given** 前后端代码库已准备好, **When** 运行接口契约验证工具, **Then** 生成详细的对比报告，列出所有不匹配的端点、参数和类型
2. **Given** 存在前端调用的路径在 OpenAPI 中不存在, **When** 验证工具检测到, **Then** 报告中标记为"前端多余调用"
3. **Given** 存在 OpenAPI 定义的端点前端未使用, **When** 验证工具检测到, **Then** 报告中标记为"未使用的后端端点"
4. **Given** 请求参数类型不匹配（如前端发送 string 但 OpenAPI 要求 number）, **When** 验证工具检测到, **Then** 报告中详细列出类型不匹配的字段路径
5. **Given** 响应体结构不一致, **When** 验证工具检测到, **Then** 报告中展示预期结构与实际定义的差异

---

### User Story 2 - 开发人员对后端服务模块执行单元测试 (Priority: P1)

开发人员为后端的关键业务逻辑模块编写并运行单元测试，包括任务调度、数据采集、认证授权、通知渠道等模块，确保每个函数/类的行为符合预期。

**Why this priority**: 单元测试是代码质量的基础保障，能快速定位逻辑错误，必须优先完成。

**Independent Test**: 每个模块的单元测试可独立运行，无需依赖数据库或外部服务（通过 Mock 隔离）。

**Acceptance Scenarios**:

1. **Given** 任务调度模块（scheduler.ts）编写了完整的单元测试, **When** 运行测试, **Then** 覆盖智能策略计算、固定策略解析、任务优先级排序等逻辑
2. **Given** 时间解析工具（time-parser.ts）有单元测试, **When** 测试各种输入格式（如"5分钟"、"2小时"、"1天"）, **Then** 所有解析结果正确且边界情况被覆盖
3. **Given** 加密工具（crypto.ts）有单元测试, **When** 测试密码哈希和验证, **Then** 确保相同密码生成不同哈希值（有盐值），验证功能正常
4. **Given** Bilibili WBI 签名模块有单元测试, **When** 测试签名生成逻辑, **Then** 生成的签名与预期结果一致
5. **Given** CSV 解析器有单元测试, **When** 测试解析旧数据文件, **Then** 正确解析粉丝数和播放量数据，处理缺失字段和格式错误

---

### User Story 3 - 开发人员对 API 路由执行集成测试 (Priority: P1)

开发人员编写并运行 API 集成测试，启动真实的后端服务（使用测试数据库），模拟前端发送 HTTP 请求，验证端到端的请求处理流程，包括鉴权、参数验证、业务逻辑和响应格式。

**Why this priority**: 集成测试验证整个请求链路，确保各模块协同工作正常，是接口可用性的直接证明。

**Independent Test**: 每个 API 端点的集成测试可独立运行，覆盖正常场景和异常场景。

**Acceptance Scenarios**:

1. **Given** 编写了 Auth 模块的集成测试, **When** 测试登录、登出、获取用户信息流程, **Then** 验证 JWT token 生成和验证正确，未授权请求返回 401
2. **Given** 编写了 Accounts 模块的集成测试, **When** 测试绑定账号（Cookie 和扫码）、查询账号列表、设置默认账号, **Then** 所有操作成功且数据库状态正确更新
3. **Given** 编写了 Tasks 模块的集成测试, **When** 测试创建任务、查询任务列表、更新任务、删除任务、批量启停, **Then** 所有操作符合 OpenAPI 规范且返回正确的状态码和响应体
4. **Given** 编写了 Metrics 模块的集成测试, **When** 测试查询视频指标时序、博主粉丝时序、视频私密指标, **Then** 返回的数据格式正确，时间范围过滤有效
5. **Given** 测试分页功能, **When** 发送带有 page 和 page_size 参数的请求, **Then** 返回正确的分页数据，total 字段准确
6. **Given** 测试错误处理, **When** 发送无效的请求参数, **Then** 返回统一的错误响应格式 { code, message, data }，HTTP 状态码合理（如 400 Bad Request）

---

### User Story 4 - 开发人员对关键业务流程执行端到端测试 (Priority: P2)

开发人员编写端到端（E2E）测试，模拟完整的用户操作流程，从登录到创建任务、查看数据、配置通知等，验证前后端完整交互的正确性。

**Why this priority**: E2E 测试模拟真实用户场景，能发现跨模块的集成问题和用户体验缺陷。

**Independent Test**: 每个 E2E 测试覆盖一个完整的用户场景，可独立运行。

**Acceptance Scenarios**:

1. **Given** 编写了"管理员登录并创建视频监控任务"的 E2E 测试, **When** 运行测试, **Then** 自动执行：登录 → 获取 token → 调用创建任务 API → 查询任务列表验证任务存在
2. **Given** 编写了"账号过期后重新绑定并恢复任务"的 E2E 测试, **When** 模拟账号过期, **Then** 任务被标记为暂停 → 重新绑定账号 → 系统提示恢复任务 → 任务恢复监控
3. **Given** 编写了"批量启停任务"的 E2E 测试, **When** 运行测试, **Then** 创建多个任务 → 批量选择 → 调用批量启停 API → 验证任务状态更新
4. **Given** 编写了"查看视频数据趋势"的 E2E 测试, **When** 运行测试, **Then** 创建任务 → 等待采集数据 → 调用 metrics API → 验证返回的时序数据格式正确

---

### User Story 5 - 开发人员对数据采集和调度模块执行功能测试 (Priority: P2)

开发人员编写测试验证后台任务调度和数据采集模块的正确性，包括定时策略解析、任务优先级排序、Bilibili API 调用、数据存储和错误重试逻辑。

**Why this priority**: 调度和采集是核心后台逻辑，直接影响数据的准确性和及时性。

**Independent Test**: 可以独立测试调度器的逻辑（Mock 时间和 API），以及采集器的数据转换逻辑。

**Acceptance Scenarios**:

1. **Given** 测试智能策略任务的调度间隔计算, **When** 任务年龄不同（如 1 天、7 天、30 天）, **Then** 计算出的采集间隔符合智能策略规则
2. **Given** 测试固定策略任务的下次执行时间计算, **When** 配置不同的间隔（如 5 分钟、2 小时、1 天）, **Then** 下次执行时间计算正确
3. **Given** 测试任务优先级排序逻辑, **When** 多个任务等待执行, **Then** 按照"距离下次执行时间最近"优先排序
4. **Given** 测试 Bilibili API 调用失败重试, **When** API 返回错误（如 403 鉴权失败）, **Then** 调度器记录失败次数，达到阈值后暂停任务
5. **Given** 测试数据采集后的存储逻辑, **When** 成功获取视频或博主数据, **Then** 数据被正确解析并插入到 metrics 表中，timestamp 正确

---

### User Story 6 - 开发人员对前端组件执行单元测试 (Priority: P3)

开发人员为前端的关键组件和工具函数编写单元测试，确保 UI 组件渲染正确、用户交互逻辑正常、工具函数返回预期结果。

**Why this priority**: 前端单元测试能提高组件的稳定性和可维护性，但优先级低于后端和集成测试。

**Independent Test**: 每个组件或函数的单元测试可独立运行，无需启动完整应用。

**Acceptance Scenarios**:

1. **Given** 编写了 TaskCard 组件的单元测试, **When** 传入不同的 task 数据, **Then** 组件正确渲染标题、状态徽章、最新数据等信息
2. **Given** 编写了 FilterBar 组件的单元测试, **When** 用户选择筛选条件, **Then** 正确触发回调函数并传递筛选参数
3. **Given** 编写了 http.ts 工具的单元测试, **When** 测试 GET 和 POST 请求, **Then** 正确发送请求并解析响应（Mock fetch）
4. **Given** 编写了 format.ts 工具的单元测试, **When** 格式化时间、数字、持续时间, **Then** 返回正确的格式化字符串

---

### Edge Cases

- **接口契约验证**：前端使用可选字段但后端未标记为 optional，或反之？
- **认证失败场景**：Token 过期时，前端是否正确处理 401 响应并跳转到登录页？
- **并发请求**：多个任务同时触发数据采集时，调度器是否正确处理并发和资源限制？
- **数据库连接失败**：后端在数据库不可用时，是否返回合理的错误响应（如 503 Service Unavailable）？
- **大数据量**：查询大量任务或指标时，分页是否正常工作，性能是否可接受？
- **时区处理**：前后端在不同时区环境下，时间戳是否一致？
- **边界值输入**：如创建任务时 interval 为 0 或负数，后端是否拒绝并返回明确错误？
- **CSV 导入旧数据**：导入脚本对各种异常 CSV 格式（缺失列、编码错误、空行）是否健壮？

## Requirements *(mandatory)*

### Functional Requirements

#### 接口契约验证

- **FR-001**: 系统 MUST 提供自动化工具，对比前端 API 调用代码与 OpenAPI 规范，生成差异报告
- **FR-002**: 验证工具 MUST 检查所有 API 端点的路径、HTTP 方法、请求参数、请求体结构、响应体结构是否一致
- **FR-003**: 差异报告 MUST 清晰列出：前端多余调用、后端未使用端点、参数类型不匹配、响应结构不一致
- **FR-004**: 验证工具 MUST 支持 CI/CD 集成，在代码提交时自动运行并阻止不匹配的代码合并

#### 后端单元测试

- **FR-005**: 系统 MUST 为以下模块提供单元测试覆盖率 ≥ 80%：
  - 任务调度器（scheduler.ts）
  - 时间解析器（time-parser.ts）
  - 加密工具（crypto.ts）
  - CSV 解析器（csv-parser.ts）
  - Bilibili WBI 签名（wbi.ts）
- **FR-006**: 单元测试 MUST 覆盖正常流程、边界条件和异常情况
- **FR-007**: 单元测试 MUST 使用 Mock 隔离外部依赖（数据库、HTTP 请求、文件系统）
- **FR-008**: 单元测试 MUST 在 1 秒内完成执行（单个测试文件）

#### API 集成测试

- **FR-009**: 系统 MUST 为以下 API 模块提供集成测试：
  - Auth（登录、登出、获取用户信息）
  - Accounts（绑定账号、查询列表、设置默认账号、账号操作）
  - Tasks（创建、查询、更新、删除、批量操作）
  - Metrics（视频指标、博主指标、私密指标）
  - Media（封面、头像、刷新缓存）
  - Notifications（渠道配置、规则管理、测试通知）
  - Alerts（粉丝告警规则）
  - Logs（查询日志、下载日志）
  - Settings（获取配置、保存配置）
- **FR-010**: 集成测试 MUST 使用独立的测试数据库，每次测试前重置数据
- **FR-011**: 集成测试 MUST 验证响应格式符合 OpenAPI 规范，包括统一的 `{ code, message, data }` 结构
- **FR-012**: 集成测试 MUST 覆盖鉴权流程，验证需要 token 的端点在未授权时返回 401
- **FR-013**: 集成测试 MUST 覆盖参数验证，验证无效参数时返回 400 和明确的错误信息

#### 端到端测试

- **FR-014**: 系统 MUST 提供以下关键业务流程的 E2E 测试：
  - 管理员登录并创建监控任务
  - 账号过期后重新绑定并恢复任务
  - 批量启停任务
  - 查看数据趋势图表
- **FR-015**: E2E 测试 MUST 模拟真实的前端请求序列，验证完整的业务流程
- **FR-016**: E2E 测试 MUST 验证前后端交互中的数据一致性（如创建后查询能获取到）

#### 调度和采集测试

- **FR-017**: 系统 MUST 提供调度器逻辑的功能测试，包括：
  - 智能策略间隔计算
  - 固定策略时间解析
  - 任务优先级排序
  - 任务状态转换（running → paused → completed）
- **FR-018**: 系统 MUST 提供数据采集器的功能测试，包括：
  - Bilibili API 调用和响应解析
  - 数据持久化到数据库
  - 失败重试逻辑
  - 鉴权失败处理（连续失败 > 5 次暂停任务）
- **FR-019**: 调度测试 MUST 验证不同时间配置下的行为（如最小间隔 1 分钟、最大间隔 1 天）

#### 前端单元测试

- **FR-020**: 系统 MUST 为以下前端模块提供单元测试：
  - 核心组件（TaskCard, FilterBar, AddTaskModal）
  - HTTP 工具（http.ts）
  - 格式化工具（format.ts）
  - 验证逻辑（validations/taskSchema.ts, notificationSchema.ts）
- **FR-021**: 前端单元测试 MUST 使用 Mock 隔离 API 调用和浏览器环境依赖

#### 测试基础设施

- **FR-022**: 系统 MUST 提供测试脚本，支持一键运行所有测试套件（单元测试、集成测试、E2E 测试）
- **FR-023**: 系统 MUST 生成测试覆盖率报告，展示代码行覆盖率、分支覆盖率和函数覆盖率
- **FR-024**: 系统 MUST 支持监听模式（watch mode），在代码修改时自动重新运行相关测试
- **FR-025**: 系统 MUST 集成到 CI/CD 流程，在代码提交时自动运行所有测试

### Key Entities *(include if feature involves data)*

- **TestSuite（测试套件）**: 包含一组相关的测试用例，如"Auth API 集成测试"
- **TestCase（测试用例）**: 单个测试场景，包含 Given-When-Then 结构、输入数据、期望输出
- **ContractDiff（契约差异）**: 接口契约验证工具生成的差异项，包含路径、类型、差异描述
- **TestDatabase（测试数据库）**: 用于集成测试的隔离数据库，每次测试前重置
- **MockServer（模拟服务器）**: 用于前端测试的 API 模拟服务，返回预定义的响应

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 接口契约验证工具成功对比所有前端 API 调用与 OpenAPI 规范，报告显示 0 个严重不匹配项
- **SC-002**: 后端核心模块单元测试覆盖率达到 80% 以上，所有测试在 5 秒内完成
- **SC-003**: 所有 API 端点有对应的集成测试，测试通过率 100%，验证请求响应符合 OpenAPI 规范
- **SC-004**: 至少 4 个关键业务流程有完整的 E2E 测试，覆盖登录、创建任务、数据查询、批量操作
- **SC-005**: 任务调度器和数据采集器通过所有功能测试，包括正常流程和异常场景（如 API 失败、鉴权过期）
- **SC-006**: 前端核心组件和工具函数有单元测试，测试覆盖主要交互逻辑和边界情况
- **SC-007**: CI/CD 流程集成所有测试，代码提交时自动运行并在 10 分钟内完成，失败时阻止合并
- **SC-008**: 测试覆盖率报告生成成功，整体代码覆盖率 ≥ 70%（后端 ≥ 75%，前端 ≥ 60%）

## Assumptions & Dependencies

### Assumptions

- 现有的 OpenAPI 规范文件（openapi.yaml）是最新且准确的接口契约定义
- 前端 API 调用代码主要集中在 `frontend/web/src/lib/api.ts` 和 `http.ts`
- 后端使用 Bun 作为运行时，可以使用 Bun 内置的测试框架或 Jest/Vitest
- 前端使用 Vite + React，可以使用 Vitest 或 React Testing Library
- 测试环境可以访问独立的测试数据库（SQLite 或 PostgreSQL）
- 有足够的测试数据和 Mock 服务来模拟 Bilibili API 响应
- CI/CD 环境已搭建（如 GitHub Actions），可以集成自动化测试

### Dependencies

- 需要选择并配置接口契约验证工具（如 openapi-typescript 或自定义脚本）
- 需要配置后端测试框架（Bun Test 或 Vitest）
- 需要配置前端测试框架（Vitest + React Testing Library）
- 需要准备测试数据库的初始化脚本和数据重置逻辑
- 需要编写 Mock 工具，模拟 Bilibili API 的各种响应场景
- 依赖现有的代码库稳定（特别是 API 路由和前端调用代码）

## Out of Scope

- 性能测试和负载测试（如压力测试、并发测试）不在本次范围内
- UI 自动化测试（如 Cypress、Playwright 模拟浏览器操作）暂不包含
- 代码静态分析和 Linting 规则优化不在本次范围内
- 安全测试（如 SQL 注入、XSS 攻击防护）暂不包含
- 前端的视觉回归测试（Visual Regression Testing）不在本次范围内
- 不涉及对旧的 Python 监控脚本的测试（仅针对新的 TypeScript 后端和 React 前端）

## Technical Constraints

- 测试执行时间：单元测试应在秒级完成，集成测试应在分钟级完成，E2E 测试可能需要数分钟
- 测试隔离：集成测试和 E2E 测试必须使用独立的测试数据库，避免污染生产数据
- CI/CD 环境：测试在 CI 环境中运行时需要自动化设置（如安装依赖、启动数据库、配置环境变量）
- 测试框架选择：需要与现有技术栈兼容（Bun、TypeScript、React）

## Follow-up Questions

（本规格说明已尽量详细，暂无需要用户澄清的问题）
