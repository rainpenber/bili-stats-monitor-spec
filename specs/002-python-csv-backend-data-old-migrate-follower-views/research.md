# Research: 历史 CSV 数据导入工具

> 目标：明确本特性在 CSV 解析、流式处理、数据库批量插入和命令行参数解析上的关键决策，为后续实现提供依据。  
> 所有 NEEDS CLARIFICATION 已在本文件中落地为具体选择。

---

## Decision 1: CSV 解析库选择

**Decision**: 使用 Bun 内置的文件读取能力 + 手动 CSV 解析，或使用轻量级库 `papaparse`（如果 Bun 兼容性验证通过）。优先尝试 Bun 内置能力。

**Rationale**:  
- Bun 提供了高性能的文件 I/O 和流处理能力，对于 CSV 这种简单格式，手动解析可以避免额外依赖
- 如果需要处理复杂 CSV（引号转义、多行字段等），`papaparse` 是成熟且轻量的选择
- 避免引入重型依赖（如 `csv-parse`），保持工具轻量

**Alternatives considered**:  
- 使用 Node.js 的 `fs.readFileSync` + 手动 split：Bun 兼容，但无法流式处理大文件
- 使用 `csv-parse`：功能完整但体积较大，不符合轻量原则
- 使用 `fast-csv`：性能好但需要验证 Bun 兼容性

**Implementation Notes**:
- 优先使用 `Bun.file().text()` 或 `Bun.file().stream()` 进行文件读取
- 对于大文件（> 1MB），使用流式处理逐行解析
- 处理 UTF-8 BOM：检测文件开头 BOM 标记并跳过

---

## Decision 2: 流式处理策略

**Decision**: 使用 Bun 的 `Bun.file().stream()` 配合逐行解析，批量收集到缓冲区（每 100-500 行）后执行数据库批量插入。

**Rationale**:  
- 流式处理避免将整个文件加载到内存，支持处理 10,000+ 行的大文件
- 批量插入（每批 100-500 条）平衡性能和内存使用
- Bun 的流处理性能优秀，适合这种场景

**Alternatives considered**:  
- 一次性读取整个文件：简单但无法处理超大文件，可能内存溢出
- 逐行插入数据库：安全但性能差，不适合批量导入场景
- 使用数据库 COPY 命令（PostgreSQL）：性能最优但需要数据库特定实现，增加复杂度

**Implementation Notes**:
- 使用 `for await (const chunk of stream)` 逐块读取
- 使用换行符分割，处理跨块的行
- 批量缓冲区大小：100 条记录（可配置）

---

## Decision 3: 时间格式解析

**Decision**: 使用 `Date` 构造函数 + 手动格式匹配，支持多种常见格式：
- `YYYY-MM-DD HH:MM` (主要格式)
- `YYYY-MM-DDTHH:MM:SS` (ISO 8601)
- `YYYY/MM/DD HH:MM` (备用格式)

**Rationale**:  
- CSV 数据主要使用 `YYYY-MM-DD HH:MM` 格式，简单解析即可
- 避免引入 `date-fns` 或 `moment` 等重型库
- 手动解析可以精确控制错误处理

**Alternatives considered**:  
- 使用 `date-fns`：功能完整但增加依赖，不符合轻量原则
- 使用 `moment`：已过时，不推荐
- 使用正则表达式匹配：灵活但可能遗漏边界情况

**Implementation Notes**:
- 按优先级尝试解析格式
- 解析失败时记录错误行号，继续处理其他行
- 统一转换为数据库时间戳格式（Unix timestamp 或 ISO 8601）

---

## Decision 4: 命令行参数解析

**Decision**: 使用 Bun 内置的 `process.argv` 手动解析，或使用轻量级库 `commander`（如果 Bun 兼容性验证通过）。

**Rationale**:  
- 命令行参数简单（`--db`, `--activate`, `--update-existing`），手动解析足够
- 如果需要更复杂的参数（子命令、帮助信息），`commander` 是成熟选择
- 避免引入重型 CLI 框架

**Alternatives considered**:  
- 使用 `yargs`：功能强大但体积较大
- 使用 `minimist`：轻量但功能有限
- 使用环境变量：不符合 spec 要求（必须通过命令行参数）

**Implementation Notes**:
- 参数格式：`--db test|prod`, `--activate` (flag), `--update-existing` (flag)
- 提供 `--help` 输出使用说明
- 参数验证：数据库类型必须是 `test` 或 `prod`

---

## Decision 5: 数据库连接复用

**Decision**: 复用现有 `backend/src/config/` 和 `backend/src/db/` 的配置和连接逻辑，通过环境变量或命令行参数覆盖数据库连接。

**Rationale**:  
- 避免重复实现数据库连接逻辑
- 保持与主应用一致的配置管理
- 支持 SQLite 和 PostgreSQL 双驱动

**Alternatives considered**:  
- 独立实现数据库连接：增加代码重复和维护成本
- 仅支持 PostgreSQL：不符合现有架构（支持 SQLite/PostgreSQL 双驱动）

**Implementation Notes**:
- 通过命令行参数 `--db test|prod` 设置 `DB_TYPE` 和 `DATABASE_URL`
- 复用 `loadConfig()` 和 `createDb()` 函数
- 在导入前验证数据库连接（调用 `db.execute()` 测试查询）

---

## Decision 6: 错误处理和报告

**Decision**: 使用结构化错误对象收集所有错误，在导入完成后生成详细报告（JSON 或表格格式输出到控制台）。

**Rationale**:  
- 结构化错误便于管理员定位问题
- 控制台输出符合 CLI 工具的使用习惯
- 可选：将错误报告写入文件（`--output-report` 参数）

**Alternatives considered**:  
- 实时输出错误：干扰进度显示，难以汇总
- 仅输出成功/失败统计：信息不足，难以排查问题
- 使用日志文件：增加复杂度，控制台输出已足够

**Implementation Notes**:
- 错误类型：文件解析错误、数据验证错误、数据库错误
- 报告格式：成功文件数、失败文件数、总记录数、错误列表（文件 + 行号 + 错误信息）
- 使用 `console.table()` 或手动格式化输出表格

---

## Summary

所有技术选型已明确，无 NEEDS CLARIFICATION 项。实现将使用：
- Bun 内置文件 I/O 和流处理
- 手动 CSV 解析（或 `papaparse` 作为备选）
- 批量数据库插入（每批 100-500 条）
- 手动时间格式解析
- 手动命令行参数解析（或 `commander` 作为备选）
- 复用现有数据库连接和配置

