# Feature Specification: 用户登录页面

**Feature Branch**: `005-login-page`  
**Created**: 2025-12-27  
**Status**: Draft  
**Input**: User description: "实现登录页面"

## Clarifications

### Session 2025-12-27

- Q: 侧边栏用户状态模块的位置？ → A: 导航菜单末尾（作为最后一个菜单项）
- Q: 登录Modal的触发时机？ → A: ABC全部支持（用户点击受保护操作按钮、API返回401错误、用户手动点击"未登录"状态区域时 - 即在未登录或token过期状态下访问任何需要权限的页面或操作都弹出登录Modal）
- Q: 已登录用户访问 `/login` 页面的行为？ → A: 重定向到仪表板（避免重复登录）
- Q: 侧边栏"未登录"状态的展示内容？ → A: 显示"未登录"+登录按钮；已登录状态显示用户头像（用户可上传，没有的话使用占位符）+ 登出按钮
- Q: 登录Modal成功后的行为？ → A: 自动重试之前失败的操作（如重新发起API请求或打开功能Modal）

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

未登录用户尝试直接通过URL访问受保护的页面（如账号管理、任务列表等）时，系统弹出登录Modal（优先）或重定向到登录页面（备选）。用户登录成功后，可以正常访问该页面。

**Why this priority**: 与P1登录功能同等重要，确保安全性和用户体验的连贯性。如果没有路由保护，登录功能就失去了意义。

**Independent Test**: 可以独立测试 - 未登录状态下直接在地址栏输入 `/accounts`，系统应弹出登录Modal（或重定向到 `/login?redirect=/accounts`），登录成功后允许访问该页面。

**Acceptance Scenarios**:

1. **Given** 用户未登录，**When** 直接访问受保护页面（如 `/accounts`），**Then** 系统弹出登录Modal（优先）或重定向到 `/login?redirect=/accounts`（备选）
2. **Given** 用户在登录Modal中，**When** 登录成功，**Then** Modal关闭，用户可以访问当前受保护页面
3. **Given** 用户已登录且token有效，**When** 访问任何受保护页面，**Then** 系统允许访问，不弹出Modal或重定向
4. **Given** 用户已登录但token过期，**When** 访问受保护页面或触发API请求，**Then** 系统检测到token失效，弹出登录Modal提示"登录已过期，请重新登录"

---

### User Story 3 - 退出登录 (Priority: P2)

已登录用户可以点击侧边栏用户状态区域的"退出登录"按钮，清除本地存储的token，并更新UI为"未登录"状态。

**Why this priority**: 虽然不是最核心功能，但对于多用户或公共设备使用场景很重要。可以在P1功能完成后再实现。

**Independent Test**: 可以独立测试 - 登录后，在侧边栏用户状态区域点击"退出登录"，系统清除token，侧边栏恢复为"未登录"状态，再次访问受保护页面或执行受保护操作时弹出登录Modal。

**Acceptance Scenarios**:

1. **Given** 用户已登录，**When** 点击侧边栏的"退出登录"按钮，**Then** 系统清除本地存储的JWT token，侧边栏更新为"未登录"状态
2. **Given** 用户已退出登录，**When** 尝试访问受保护页面或执行受保护操作，**Then** 系统弹出登录Modal
3. **Given** 用户在多个标签页中登录，**When** 在一个标签页退出登录，**Then** 其他标签页也应检测到退出状态（刷新后要求重新登录）

---

### User Story 4 - 侧边栏用户状态展示 (Priority: P1)

系统在侧边栏导航菜单末尾显示用户登录状态。未登录时显示"未登录"文字和登录按钮，点击后弹出登录Modal。已登录时显示用户头像（支持上传，默认占位符）和登出按钮。

**Why this priority**: 用户状态展示是核心UI功能，让用户清楚了解当前登录状态，并提供便捷的登录/登出入口。与P1登录功能同等重要。

**Independent Test**: 可以独立测试 - 未登录时侧边栏显示"未登录"+登录按钮，点击后弹出登录Modal；登录成功后侧边栏显示用户头像和登出按钮，点击登出后回到"未登录"状态。

**Acceptance Scenarios**:

1. **Given** 用户未登录，**When** 查看侧边栏导航菜单末尾，**Then** 看到"未登录"文字和"登录"按钮
2. **Given** 用户未登录，**When** 点击侧边栏的"登录"按钮，**Then** 弹出登录Modal（不跳转页面）
3. **Given** 用户已登录，**When** 查看侧边栏导航菜单末尾，**Then** 看到用户头像（默认占位符或已上传头像）、用户名和"登出"按钮
4. **Given** 用户已登录，**When** 点击侧边栏的"登出"按钮，**Then** 系统清除token，侧边栏恢复为"未登录"状态
5. **Given** 用户未上传头像，**When** 登录成功，**Then** 侧边栏显示默认头像占位符（如首字母或通用图标）

---

### User Story 5 - 登录Modal交互 (Priority: P1)

系统提供一个登录Modal组件，在用户执行需要鉴权的操作时弹出（而不是跳转页面），支持用户原地登录。登录成功后自动关闭Modal并继续之前的操作。

**Why this priority**: 登录Modal是避免页面跳转、保持用户操作连贯性的关键功能。与独立登录页面相比，Modal提供更好的用户体验，特别是在用户已经在某个功能页面中操作时。

**Independent Test**: 可以独立测试 - 未登录时点击"绑定新账号"按钮，触发登录Modal；输入凭据登录成功后，Modal自动关闭，账号绑定Modal自动打开。

**Acceptance Scenarios**:

1. **Given** 用户未登录，**When** 点击需要鉴权的操作按钮（如"绑定新账号"），**Then** 弹出登录Modal，当前页面不跳转
2. **Given** 用户正在操作，**When** API返回401错误（token过期），**Then** 立即弹出登录Modal，提示"登录已过期，请重新登录"
3. **Given** 登录Modal已打开，**When** 输入正确凭据并登录成功，**Then** Modal自动关闭，系统自动重试之前失败的操作（如重新发起API请求或打开功能Modal）
4. **Given** 登录Modal已打开，**When** 输入错误凭据，**Then** Modal内显示错误提示，不关闭Modal，允许用户重试
5. **Given** 登录Modal已打开，**When** 点击Modal外部区域或关闭按钮，**Then** Modal关闭，之前的操作被取消
6. **Given** 登录Modal已打开，**When** 用户多次登录失败，**Then** 每次都显示错误提示，不锁定账号（允许无限重试）

---

### User Story 6 - 记住我功能 (Priority: P3)

用户可以选择"记住我"选项，延长token的有效期或在浏览器关闭后保持登录状态。

**Why this priority**: 这是用户体验优化功能，不影响核心登录流程。可以在基础功能稳定后再添加。

**Independent Test**: 可以独立测试 - 登录时勾选"记住我"，关闭浏览器后重新打开，系统仍保持登录状态（使用localStorage而非sessionStorage）。

**Acceptance Scenarios**:

1. **Given** 登录页面已打开，**When** 勾选"记住我"并登录成功，**Then** token存储在localStorage（而非sessionStorage）
2. **Given** 用户选择了"记住我"，**When** 关闭浏览器并重新打开，**Then** 用户仍然保持登录状态
3. **Given** 用户未选择"记住我"，**When** 关闭浏览器并重新打开，**Then** 用户需要重新登录

---

### Edge Cases

- **Token过期处理**: 当用户正在操作时token过期，系统如何优雅地处理？（应在API响应401时弹出登录Modal，提示"登录已过期，请重新登录"）
- **登录Modal与独立登录页面的选择**: 什么情况下使用Modal，什么情况下跳转页面？（Modal用于不打断当前操作的场景；独立页面用于用户主动访问/login或首次进入系统）
- **登录Modal关闭后的状态**: 用户未完成登录就关闭Modal，之前的操作如何处理？（操作被取消，保持在当前页面，用户可以重新触发）
- **Pending Action队列**: 如果用户同时触发多个需要鉴权的操作，登录后如何处理？（只重试最后一次触发的操作，避免混乱）
- **网络错误**: 登录请求失败时如何提示用户？（在Modal内显示网络错误提示，允许重试，不关闭Modal）
- **空输入**: 用户未输入用户名或密码就点击登录，如何处理？（前端验证，显示"请输入用户名"/"请输入密码"）
- **XSS防护**: 如何防止用户名/密码字段的XSS攻击？（前端输入sanitization，后端验证）
- **并发登录**: 同一账号在多个设备或浏览器登录，是否允许？（允许，但每个session使用独立的token）
- **Token存储安全**: JWT token存储在哪里最安全？（localStorage vs sessionStorage vs httpOnly cookie）
- **用户头像上传**: 头像文件大小限制？支持哪些格式？（限制2MB，支持jpg/png/gif，在后续版本实现）

## Requirements *(mandatory)*

### Functional Requirements

#### 前端界面需求

- **FR-001**: 系统必须提供一个独立的登录页面（路由 `/login`），包含用户名输入框、密码输入框和登录按钮
- **FR-002**: 系统必须提供一个登录Modal组件，在需要鉴权时弹出，内容与独立登录页面相同（用户名、密码、登录按钮）
- **FR-003**: 系统必须在侧边栏导航菜单末尾显示用户状态模块
- **FR-004**: 用户状态模块在未登录时必须显示"未登录"文字和"登录"按钮，点击后弹出登录Modal
- **FR-005**: 用户状态模块在已登录时必须显示用户头像（默认占位符或已上传头像）、用户名和"登出"按钮
- **FR-006**: 系统必须在以下情况自动弹出登录Modal：1) 用户点击需要鉴权的操作按钮，2) API返回401错误，3) 用户点击侧边栏"登录"按钮
- **FR-007**: 登录表单（页面和Modal）必须包含客户端验证，确保用户名和密码不为空
- **FR-008**: 系统必须在登录失败时显示明确的错误提示信息（如"用户名或密码错误"、"网络连接失败"）
- **FR-009**: 登录成功后，系统必须将JWT token存储到浏览器本地存储（localStorage或sessionStorage）
- **FR-010**: 系统必须在所有受保护的API请求中自动附加JWT token（通过Authorization: Bearer <token> header）
- **FR-011**: 系统必须在登录Modal成功后自动重试之前失败的操作（如重新发起API请求或打开功能Modal）
- **FR-012**: 系统必须在token无效或过期时弹出登录Modal（优先）或跳转到登录页面（备选）
- **FR-013**: 登录页面必须支持"记住我"选项（可选，P3优先级）
- **FR-014**: 系统必须在独立登录页面登录成功后支持重定向到原始请求的页面（通过URL参数 `redirect`）
- **FR-015**: 系统必须支持用户头像上传功能（在后续版本实现，当前版本使用默认占位符）

#### API合约需求

- **FR-016**: 后端已有登录API端点 `POST /api/v1/auth/login`，接受 `{ username: string, password: string }` 作为请求体
- **FR-017**: 登录API成功时必须返回 `{ token: string, user: { id: string, username: string, role: string } }`
- **FR-018**: 登录API失败时必须返回标准错误响应 `{ error: string, message: string }` 和相应的HTTP状态码（401）
- **FR-019**: 所有受保护的API端点必须验证JWT token，无效token返回401状态码
- **FR-020**: 系统必须在HTTP拦截器中统一处理401响应，弹出登录Modal

#### 路由保护需求

- **FR-021**: 系统必须定义哪些路由需要认证（如 `/accounts`, `/tasks`, `/notifications`, `/settings`）
- **FR-022**: 系统必须在路由守卫（Route Guard）中检查token有效性
- **FR-023**: 未登录用户访问受保护路由时，必须弹出登录Modal（优先）或重定向到 `/login?redirect=<original-path>`（备选）
- **FR-024**: 已登录用户访问登录页面时，应直接重定向到仪表板（避免重复登录）

### Key Entities

- **用户凭据（User Credentials）**: 包含用户名（username）和密码（password），用于身份验证
- **JWT Token**: 包含用户身份信息和过期时间的加密令牌，用于后续API请求的认证
- **用户信息（User Info）**: 登录成功后返回的用户基本信息（id, username, role），用于前端展示和权限判断
- **用户头像（User Avatar）**: 用户上传的头像图片或默认占位符，显示在侧边栏用户状态模块中
- **重定向路径（Redirect Path）**: 记录用户原本想访问的路径，独立登录页面登录成功后自动跳转
- **Pending Action**: 触发登录Modal时记录的待执行操作（如API请求或打开功能Modal），登录成功后自动重试

> **Constitution Alignment Hint**  
> 本规范按照项目宪章的顺序组织：  
> 1. ✅ 前端界面需求（FR-001至FR-015）- 描述用户在登录页面/Modal、侧边栏用户状态模块的交互  
> 2. ✅ API合约需求（FR-016至FR-020）- 定义前后端的数据交换格式  
> 3. ✅ 路由保护需求（FR-021至FR-024）- 后端实现已完成（JWT中间件），前端需要实现路由守卫和登录Modal触发逻辑

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户可以在10秒内完成登录操作（从打开登录页面或Modal到完成登录）
- **SC-002**: 登录失败时，错误提示在1秒内显示，用户可立即重试
- **SC-003**: 95%的用户在首次使用时能成功登录（使用默认账号admin/admin123）
- **SC-004**: Token过期后，用户在下次操作时能在2秒内看到登录Modal，并提示需要重新登录
- **SC-005**: 登录成功后，后续所有API请求都能正确携带Authorization header，无需手动处理
- **SC-006**: 退出登录后，所有受保护页面都无法访问，必须重新登录才能使用
- **SC-007**: 未登录用户直接访问受保护页面时，能在1秒内看到登录Modal或被重定向到登录页面
- **SC-008**: 登录Modal成功后，之前触发的操作能在2秒内自动重试并完成（如打开账号绑定Modal）
- **SC-009**: 侧边栏用户状态模块在登录状态变化时能在0.5秒内更新显示（登录后显示头像，退出后显示"未登录"）
- **SC-010**: 用户点击侧边栏"登录"按钮后，登录Modal能在0.3秒内弹出

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
- 登录Modal采用居中弹出设计，背景半透明遮罩，点击遮罩或关闭按钮可关闭
- 侧边栏用户状态模块位于导航菜单末尾，作为最后一个菜单项
- 未登录状态显示"未登录"文字+小型"登录"按钮
- 已登录状态显示圆形头像（32x32px）+用户名+小型"登出"图标按钮
- 默认头像占位符使用用户名首字母或通用图标
- 错误提示使用红色文字或Toast通知，明确清晰
- 登录成功后有视觉反馈（如加载动画）
- "记住我"选项默认不勾选，由用户自主选择
- Token存储在localStorage（支持"记住我"）或sessionStorage（不记住）
- 用户头像上传功能在后续版本实现，当前版本只使用默认占位符

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
- ❌ 用户头像上传功能（在后续版本实现，当前版本只使用默认占位符）
- ❌ 用户个人资料编辑（昵称、邮箱等）
- ❌ 多个Pending Action队列管理（当前只处理最后一次触发的操作）
