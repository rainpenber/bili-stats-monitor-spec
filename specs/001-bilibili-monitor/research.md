# Research: B站数据监控工具（001-bilibili-monitor）

> 目标：明确本特性在技术栈、存储、调度和契约上的关键决策，为后续 tasks 拆分与实现提供依据。  
> 所有 NEEDS CLARIFICATION 已在本文件中落地为具体选择。

---

## Decision 1: 后端运行时与 Web 框架

**Decision**: 采用 Bun 1.x 作为唯一后端运行时，配合轻量级 TypeScript Web 框架（优先 Hono，其次 Elysia），通过手写路由与中间件对接 OpenAPI 契约。  

**Rationale**:  
- 宪章强制后端以 Bun 为运行时，Bun 在 I/O 和启动速度上相对 Node 有优势，适合本项目的定时抓取与 Web API 场景；  
- Hono/Elysia 是社区已验证的、在 Bun 下兼容性良好的微框架，API 简单、依赖体积小，满足“简单优先”的约束；  
- 手写路由 + 显式控制中间件链路，有利于将性能和可观测性控制在可见范围内。  

**Alternatives considered**:  
- 继续使用 Node.js + Express/Koa：与宪章中“后端以 Bun 运行时为基础”冲突，且引入双运行时增加心智负担；  
- 使用更重的全家桶（如 NestJS）：在当前 MVP 范围内会引入大体量装饰器/DI/模块系统，不符合“小步快跑、<100 行新代码为默认”的复杂度策略。  

---

## Decision 2: 数据库存储与持久化策略

**Decision**: 使用 PostgreSQL 作为唯一关系型数据库，所有核心实体（User、BiliAccount、MonitoringTask、VideoData、AuthorData、MediaAsset、Notification、AlertRule、SystemLog）全部落在同一实例中；日志与时序数据在表设计上通过适当索引和分区支持长期保留。  

**Rationale**:  
- 需求中明确“系统 MUST 永久保留所有收集的数据”，同时存在多实体强关系（任务 ←→ 账号、任务 ←→ 视频/博主、日志与任务/账号来源关联），关系型数据库更适合；  
- PostgreSQL 在云与自托管场景都易于获取，生态成熟，配合 Bun 下的 TypeScript ORM/查询构造器（Kysely/Drizzle）可以保证类型安全；  
- 对于当前预计的规模（数千任务、按分钟/日写入指标），单库单实例完全可承载，后续若需扩展可通过表分区与只读副本扩展读取能力。  

**Alternatives considered**:  
- SQLite：实现和运维极简，但在并发写入、日志体量和未来横向扩展上有明显限制，不适合作为长期“永久保留”指标库；  
- 专用时序数据库（如 Timescale / Influx）：对当前 MVP 体量而言过度设计，同时会引入第二种数据存储与迁移复杂度，违反“简单优先”。  

---

## Decision 3: 定时调度与抓取架构

**Decision**: 采用“单进程全局单并发调度器 + 任务表驱动”的架构：  
- Bun 后端内置一个 scheduler worker，按照 config 周期性扫描 `MonitoringTask`；  
- 根据“固定频率/智能频率”规则计算下一次执行时间并写入任务实例表或内存计划；  
- 实际抓取过程串行执行，必要时通过短暂的 Promise 并行但整体保持单账号单并发，避免触发 B 站风控。  

**Rationale**:  
- 直接呼应 spec 中 Assumptions 的“队列采用全局单并发，避免并发触发风控”；  
- MVP 阶段任务数量有限，串行模型足以满足 SC-004 对 200 条任务 10 秒内调度完成的要求（可通过将“调度”与“执行”解耦、批量提交请求来保障）；  
- 单 worker 架构易于排查问题，告警与日志路径简单清晰。  

**Alternatives considered**:  
- 引入专门队列系统（如 Redis + bullmq）：在当前阶段需要额外运维 Redis，且 Bun 与部分队列库兼容性尚需验证，暂不采纳；  
- 多 worker 并发抓取：虽然可以提升吞吐，但在未明确风控阈值前风险较大，后续如有需要可通过 proposal 引入“多 worker + 账号级并发限制”的方案。  

---

## Decision 4: 鉴权与会话管理

**Decision**: 对 Web 管理端采用基于 HTTP-only Cookie 的会话（后端维护短期会话 token 或 session id），内部 API 统一使用 `Authorization: Bearer <token>` 校验；B 站账号凭据（SESSDATA/Cookie/扫码登录凭据）以加密形式存储，仅在调度抓取时解密使用。  

**Rationale**:  
- 与 openapi.yaml 中已经存在的 bearerAuth 安全方案兼容，并方便将未来的多客户端访问统一在同一鉴权模型下；  
- 使用 HTTP-only Cookie 可以降低 XSS 窃取 token 的风险，满足管理后台场景的安全需求；  
- 对 B 站敏感凭据进行加密存储和脱敏日志输出，符合 spec 中“出于安全考虑，Cookie 与登录凭据以加密形式存储；日志中不落地敏感原文”的假设。  

**Alternatives considered**:  
- 纯前端本地存储 token：容易被 XSS 窃取，不符合管理后台安全期望；  
- 将 B 站 Cookie 明文存入数据库：违背安全假设与业界最佳实践。  

---

## Decision 5: API 契约与前后端协作方式

**Decision**: 以 `specs/001-bilibili-monitor/api/openapi.yaml` 为唯一 API 契约来源，前端通过统一 `lib/api.ts` + `lib/http.ts` 封装访问，后端在 Bun 服务中实现对应路径；任何字段/语义变更必须以 OpenSpec change proposal 形式修改 spec 再更新实现。  

**Rationale**:  
- 符合宪章中“API 合约先行”的原则，避免前后端各自为政；  
- 通过单一 OpenAPI 文件集中描述分页、selection、统一响应包格式，有利于前端统一封装 React Query hooks；  
- 与现有 mock-server（`specs/001-bilibili-monitor/mocks/mock-server.js`）一同使用时，可以在后端未就绪时完成前端大部分交互验证。  

**Alternatives considered**:  
- 让代码“自描述”而不维护 OpenAPI：与宪章和当前目录结构直接冲突；  
- 为不同子域拆分多个 OpenAPI 文件：在当前 MVP 阶段先保持单文件集中管理，等域复杂度提升后再通过 proposal 进行拆分设计。  

---

## Summary

上述决策为本特性的实现提供了清晰的技术边界：  
- Bun + 轻量 Web 框架 + PostgreSQL 作为后端主干；  
- 单 worker 串行调度以适配 B 站风控假设；  
- 以 OpenAPI 为中心协调前后端，并通过加密存储保护 B 站账号凭据。  

在进入 Phase 1 设计时，不再存在“NEEDS CLARIFICATION” 的技术栈/存储/调度/契约级别未知项，后续复杂度增加（如引入队列、分库分表）须通过新的 OpenSpec proposal 评审后再推进。








