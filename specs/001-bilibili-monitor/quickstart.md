# Quickstart: B站数据监控工具（001-bilibili-monitor）

> 面向本仓库开发者的“上手指南”：如何启动前端、理解后端契约、使用 mock server 验证交互，并逐步实现后端。

---

## 1. 前置条件

- 已安装 **pnpm ≥ 9**；  
- 本地已安装 **Node ≥ 22**（用于前端构建）与 **Bun**（用于后端实现，未来阶段）；  
- 克隆本仓库到本地，例如 `D:\coding\bili-stats-monitor-spec`。

---

## 2. 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

> 仓库采用 pnpm workspace 管理依赖；`frontend/web` 的前端应用依赖会被一并安装。

---

## 3. 启动前端（现阶段主要工作面）

进入前端目录并启动 Vite 开发服务器：

```bash
cd frontend/web
pnpm dev
```

默认访问地址：`http://localhost:5173`  

主要结构：

- `src/App.tsx` & `src/layouts/AppLayout.tsx`：应用入口与左侧导航布局；  
- `src/pages/`：  
  - `DashboardPage.tsx` — 任务卡片 + 内联详情区主界面；  
  - `AccountsPage.tsx` — B 站账号绑定/管理；  
  - `LogsPage.tsx` — 日志筛选与下载；  
  - `NotificationsPage.tsx` — 通知与告警规则配置；  
  - `SettingsPage.tsx` — 用户管理、主题设置等；  
- `src/components/`：  
  - `cards/` — `VideoCard` / `AuthorCard` / `CardGrid` 等卡片视图；  
  - `detail/` — 视频/粉丝图表组件；  
  - `modals/` — 新增任务、选择视频、账号绑定等 Modal；  
  - `toolbar/` — 过滤、批量操作、分页工具栏；  
  - `ui/` — Button、Input、Modal、DatePicker、TagInput 等基础 UI；  
- `src/lib/`：API 封装、格式化、主题与图表配置；  
- `src/store/`：Zustand 状态（标签、视频选择、UI selection 等）。

前端可以在没有真实后端的情况下，通过 mock server 和假数据完成大部分交互联调。

---

## 4. API 契约与 mock server

### 4.1 OpenAPI 契约

本特性所有后端 HTTP 接口统一定义在：

- `specs/001-bilibili-monitor/api/openapi.yaml`

约定包括：

- 仅使用 GET / POST；  
- 统一响应结构：`{ code, message, data }`；  
- bearerAuth 鉴权；  
- 分页与 selection 语义；  
- 各域（Auth/Users/Accounts/Tasks/Metrics/Media/Notifications/Alerts/Logs/Settings）下的具体路径、请求和响应字段。

在实现后端或调整接口前，应优先更新/扩展该文件并通过 OpenSpec proposal 评审。

### 4.2 mock server

目录：

- `specs/001-bilibili-monitor/mocks/mock-server.js`

用途：

- 在后端 Bun 服务尚未落地时，通过 Node 运行的 mock server 按 OpenAPI 契约返回假数据；  
- 供前端 `lib/api.ts` / `lib/http.ts` 使用，完成列表/卡片/详情/筛选等交互验证。

> 建议在实现后端前，优先保证前端界面与交互在 mock 数据下可用并满足 spec 中的 Acceptance Scenarios。

---

## 5. 计划中的后端结构（Bun）

后端目前仅有占位说明（`backend/README.md`），后续实现将遵循：

```text
backend/
├── src/
│   ├── api/        # 基于 openapi.yaml 的路由与控制器
│   ├── services/   # 调度、账号与任务状态机、告警派发
│   ├── models/     # 对接 PostgreSQL 的数据访问层
│   └── jobs/       # 定时任务与全局单并发队列执行
└── tests/          # 契约与集成测试
```

第一阶段（建议顺序）：

1. 落地基础 Bun 服务骨架（健康检查 + 简单 `/ping`）；  
2. 实现 Auth/Users 相关接口，与前端登录流程打通；  
3. 实现 Accounts + Tasks 相关基础 CRUD，与前端账号绑定、任务新增/编辑/批量操作串联；  
4. 补充 Metrics/Logs/Notifications 等查询/配置接口。

---

## 6. 推荐的实现路径（面向开发任务）

基于 spec 与现有前端原型，推荐从“前端可见价值”出发，按以下顺序推进：

1. **仪表板与卡片交互完善（前端优先）**  
   - 确认卡片视图（视频/博主）、内联详情区、筛选与搜索的最终交互；  
   - 用 mock 数据或现有 fake 数据补足 Dashboard 端到端体验。  

2. **账号管理与任务管理前端流程打通**  
   - 完善账号绑定 Modal（Cookie / 扫码）的交互与校验文案；  
   - 新增/编辑任务 Modal、批量启停工具栏的 UX 调整。  

3. **基于 openapi.yaml 实现最小后端骨架（Bun）**  
   - 登录/登出/Profile；  
   - 列表/详情 API（Accounts / Tasks / Metrics / Logs）；  
   - 先用内存或简化持久层验证流程，再切换到 PostgreSQL。  

4. **调度器与账号过期处理**  
   - 根据 data-model 与 research 中的决策实现单 worker 调度器；  
   - 连续失败 > 5 次触发统一暂停 + 标记 + 告警；  
   - 登录后恢复任务的弹窗与批量恢复逻辑。  

5. **日志、通知与告警规则**  
   - 按 FR-035~FR-043 落地日志过滤/排序/导出；  
   - 支持多渠道通知配置与简单告警规则。  

---

## 7. 验证与测试建议

- 按 `specs/001-bilibili-monitor/spec.md` 中的 User Stories 与 Acceptance Scenarios 逐条回归；  
- 为关键 API 编写 contract 测试，验证其与 openapi.yaml 定义一致；  
- 对调度与账号过期/恢复流程编写集成测试，确保边界条件（多账号、多任务）下行为稳定；  
- 对前端卡片交互和 Modal 流程编写组件级测试，覆盖主要 P1/P2 用户故事。








