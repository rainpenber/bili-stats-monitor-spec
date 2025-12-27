# Feature Specification: 用户登录页面

**Feature Branch**: `005-login-page`  
**Created**: 2025-12-27  
**Status**: Draft  
**Input**: User description: "实现登录页面"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 管理员密码登录 (Priority: P1)

管理员使用默认账号和密码登录到系统，获取访问令牌（JWT token），以便访问受保护的功能页面（如账号管理、任务管理、通知配置等）。

**Why this priority**: 这是系统的基础功能，没有登录功能，用户无法访问任何受JWT保护的API端点。这是阻塞所有其他功能的前置条件。

**Independent Test**: 可以独立测试 - 在浏览器中访问登录页面，输入默认管理员账号（admin/admin123），点击登录，成功后跳转到仪表板页面，并且后续API请求都携带有效的JWT token。

**Acceptance Scenarios**:

1. **Given** 用户未登录，**When** 访问登录页面 `/login`，**Then** 看到登录表单（包括用户名、密码输入框和登录按钮）
2. **Given** 登录页面已打开，**When** 输入正确的用户名和密码并点击登录，**Then** 系统验证凭据，返回JWT token，并跳转到仪表板页面 `/`
3. **Given** 登录页面已打开，**When** 输入错误的用户名或密码并点击登录，**Then** 系统显示错误提示"用户名或密码错误"，不跳转页面
4. **Given** 用户已成功登录，**When** 刷新页面或重新打开应用，**Then** 系统检测到本地存储的token仍然有效，自动保持登录状态
5. **Given** 用户已登录，**When** token过期或无效，**Then** 系统自动跳转到登录页面，提示"登录已过期，请重新登录"

---

### User Story 2 - 受保护路由访问控制 (Priority: P1)

未登录用户尝试访问受保护的页面（如账号管理、任务列表等）时，系统自动重定向到登录页面，登录成功后再返回到原始请求的页面。

**Why this priority**: 与P1登录功能同等重要，确保安全性和用户体验的连贯性。如果没有路由保护，登录功能就失去了意义。

**Independent Test**: 可以独立测试 - 未登录状态下直接访问 `/accounts` 或 `/tasks`，系统应跳转到 `/login?redirect=/accounts`，登录成功后自动返回到 `/accounts`。

**Acceptance Scenarios**:

1. **Given** 用户未登录，**When** 访问受保护页面（如 `/accounts`），**Then** 系统重定向到 `/login?redirect=/accounts`
2. **Given** 用户在登录页面，**When** 登录成功，**Then** 系统跳转到原始请求的页面（通过 `redirect` 参数）
3. **Given** 用户已登录且token有效，**When** 访问任何受保护页面，**Then** 系统允许访问，不重定向
4. **Given** 用户已登录但token过期，**When** 访问受保护页面，**Then** 系统检测到token失效，重定向到登录页面

---

### User Story 3 - 退出登录 (Priority: P2)

已登录用户可以点击"退出登录"按钮，清除本地存储的token，并返回到登录页面。

**Why this priority**: 虽然不是最核心功能，但对于多用户或公共设备使用场景很重要。可以在P1功能完成后再实现。

**Independent Test**: 可以独立测试 - 登录后，在顶部导航栏或设置页面点击"退出登录"，系统清除token，跳转到登录页面，再次访问受保护页面时需要重新登录。

**Acceptance Scenarios**:

1. **Given** 用户已登录，**When** 点击"退出登录"按钮，**Then** 系统清除本地存储的JWT token，并跳转到登录页面
2. **Given** 用户已退出登录，**When** 尝试访问受保护页面，**Then** 系统提示需要登录
3. **Given** 用户在多个标签页中登录，**When** 在一个标签页退出登录，**Then** 其他标签页也应检测到退出状态（刷新后要求重新登录）

---

### User Story 4 - 记住我功能 (Priority: P3)

用户可以选择"记住我"选项，延长token的有效期或在浏览器关闭后保持登录状态。

**Why this priority**: 这是用户体验优化功能，不影响核心登录流程。可以在基础功能稳定后再添加。

**Independent Test**: 可以独立测试 - 登录时勾选"记住我"，关闭浏览器后重新打开，系统仍保持登录状态（使用localStorage而非sessionStorage）。

**Acceptance Scenarios**:

1. **Given** 登录页面已打开，**When** 勾选"记住我"并登录成功，**Then** token存储在localStorage（而非sessionStorage）
2. **Given** 用户选择了"记住我"，**When** 关闭浏览器并重新打开，**Then** 用户仍然保持登录状态
3. **Given** 用户未选择"记住我"，**When** 关闭浏览器并重新打开，**Then** 用户需要重新登录

---

### Edge Cases

- **Token过期处理**: 当用户正在操作时token过期，系统如何优雅地处理？（应在API响应401时自动跳转登录页）
- **网络错误**: 登录请求失败时如何提示用户？（显示网络错误提示，允许重试）
- **空输入**: 用户未输入用户名或密码就点击登录，如何处理？（前端验证，显示"请输入用户名"/"请输入密码"）
- **XSS防护**: 如何防止用户名/密码字段的XSS攻击？（前端输入sanitization，后端验证）
- **并发登录**: 同一账号在多个设备或浏览器登录，是否允许？（允许，但每个session使用独立的token）
- **Token存储安全**: JWT token存储在哪里最安全？（localStorage vs sessionStorage vs httpOnly cookie）

## Requirements *(mandatory)*

### Functional Requirements

#### 前端界面需求

- **FR-001**: 系统必须提供一个独立的登录页面（路由 `/login`），包含用户名输入框、密码输入框和登录按钮
- **FR-002**: 登录表单必须包含客户端验证，确保用户名和密码不为空
- **FR-003**: 系统必须在登录失败时显示明确的错误提示信息（如"用户名或密码错误"、"网络连接失败"）
- **FR-004**: 登录成功后，系统必须将JWT token存储到浏览器本地存储（localStorage或sessionStorage）
- **FR-005**: 系统必须在所有受保护的API请求中自动附加JWT token（通过Authorization: Bearer <token> header）
- **FR-006**: 系统必须提供退出登录功能，清除本地存储的token
- **FR-007**: 系统必须在token无效或过期时自动跳转到登录页面
- **FR-008**: 登录页面必须支持"记住我"选项（可选，P3优先级）
- **FR-009**: 系统必须在登录成功后支持重定向到原始请求的页面（通过URL参数 `redirect`）

#### API合约需求

- **FR-010**: 后端已有登录API端点 `POST /api/v1/auth/login`，接受 `{ username: string, password: string }` 作为请求体
- **FR-011**: 登录API成功时必须返回 `{ token: string, user: { id: string, username: string, role: string } }`
- **FR-012**: 登录API失败时必须返回标准错误响应 `{ error: string, message: string }` 和相应的HTTP状态码（401）
- **FR-013**: 所有受保护的API端点必须验证JWT token，无效token返回401状态码
- **FR-014**: 系统必须在HTTP拦截器中统一处理401响应，自动跳转到登录页面

#### 路由保护需求

- **FR-015**: 系统必须定义哪些路由需要认证（如 `/accounts`, `/tasks`, `/notifications`, `/settings`）
- **FR-016**: 系统必须在路由守卫（Route Guard）中检查token有效性
- **FR-017**: 未登录用户访问受保护路由时，必须重定向到 `/login?redirect=<original-path>`
- **FR-018**: 已登录用户访问登录页面时，应直接重定向到仪表板（避免重复登录）

### Key Entities

- **用户凭据（User Credentials）**: 包含用户名（username）和密码（password），用于身份验证
- **JWT Token**: 包含用户身份信息和过期时间的加密令牌，用于后续API请求的认证
- **用户信息（User Info）**: 登录成功后返回的用户基本信息（id, username, role），用于前端展示和权限判断
- **重定向路径（Redirect Path）**: 记录用户原本想访问的路径，登录成功后自动跳转

> **Constitution Alignment Hint**  
> 本规范按照项目宪章的顺序组织：  
> 1. ✅ 前端界面需求（FR-001至FR-009）- 描述用户在登录页面的交互  
> 2. ✅ API合约需求（FR-010至FR-014）- 定义前后端的数据交换格式  
> 3. ✅ 路由保护需求（FR-015至FR-018）- 后端实现已完成（JWT中间件），前端需要实现路由守卫

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户可以在10秒内完成登录操作（从打开登录页面到跳转到仪表板）
- **SC-002**: 登录失败时，错误提示在1秒内显示，用户可立即重试
- **SC-003**: 95%的用户在首次使用时能成功登录（使用默认账号admin/admin123）
- **SC-004**: Token过期后，用户在下次操作时能在2秒内被重定向到登录页面，并提示需要重新登录
- **SC-005**: 登录成功后，后续所有API请求都能正确携带Authorization header，无需手动处理
- **SC-006**: 退出登录后，所有受保护页面都无法访问，必须重新登录才能使用
- **SC-007**: 未登录用户直接访问受保护页面时，能在1秒内被重定向到登录页面

## Assumptions *(optional)*

### Technical Assumptions

- 后端已实现 `POST /api/v1/auth/login` API端点，返回JWT token
- 后端已实现JWT中间件，验证所有受保护API的token
- 前端使用React Router进行路由管理
- 前端使用Axios或Fetch进行HTTP请求
- 默认管理员账号为 `admin / admin123`（已在后端初始化）

### Business Assumptions

- 当前版本只需要支持管理员登录，不需要普通用户注册功能
- Token有效期由后端配置决定（假设为24小时）
- 不需要实现"忘记密码"功能（管理员可直接访问数据库重置）
- 不需要实现双因素认证（2FA）
- 允许同一账号在多个设备同时登录

### User Experience Assumptions

- 登录页面采用居中卡片布局，简洁美观
- 错误提示使用红色文字或Toast通知，明确清晰
- 登录成功后有视觉反馈（如加载动画）
- "记住我"选项默认不勾选，由用户自主选择
- Token存储在localStorage（支持"记住我"）或sessionStorage（不记住）

## Dependencies *(optional)*

### External Dependencies

- **后端API**: 依赖 `POST /api/v1/auth/login` 端点正常工作
- **JWT验证**: 依赖后端JWT中间件正确验证token
- **前端路由库**: React Router v6（已在项目中使用）
- **HTTP客户端**: 现有的 `src/lib/api.ts` 封装

### Internal Dependencies

- 登录功能是其他所有功能的前置条件（账号管理、任务管理、通知配置等都依赖登录）
- 需要先实现登录功能，才能测试B站账号绑定功能（004-bilibili-account-binding）

## Out of Scope *(optional)*

以下功能不在当前版本范围内：

- ❌ 用户注册功能（只有管理员，不支持自助注册）
- ❌ 忘记密码/重置密码功能
- ❌ 双因素认证（2FA）
- ❌ OAuth2第三方登录（如Google、GitHub）
- ❌ 用户权限管理（只有admin一个角色）
- ❌ 登录日志/审计功能
- ❌ 密码强度策略/密码过期机制
- ❌ 账号锁定机制（多次登录失败后锁定）
- ❌ 手机号/邮箱验证码登录
