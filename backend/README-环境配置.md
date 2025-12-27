# 🎯 环境配置完成！

## ✅ 已为您准备的配置

我已经为您创建了**两套完全独立的环境配置**：

### 📁 文件清单

```
backend/
├── .env.development      ✅ 开发环境配置（已生成）
├── .env.production       ✅ 生产环境配置（已生成）
├── config/
│   ├── development.ts    ✅ 开发环境代码配置
│   ├── production.ts     ✅ 生产环境代码配置
│   └── index.ts          ✅ 智能配置加载器
├── scripts/
│   ├── start-dev.ts      ✅ 开发环境启动脚本
│   ├── start-prod.ts     ✅ 生产环境启动脚本
│   └── generate-jwt-secret.ts  ✅ 密钥生成工具
└── docs/
    ├── ENVIRONMENT_SETUP.md      ✅ 完整配置文档
    └── ENVIRONMENT_QUICKSTART.md ✅ 快速开始指南
```

---

## 🚀 立即使用

### 方式1: 开发环境（推荐用于本地开发）

```bash
cd backend
npm run dev
```

**特点**：
- 🎯 自动使用 `.env.development` 配置
- 📊 Debug级别日志，详细错误信息
- ⚡ 1分钟最小采集间隔
- 🔄 热重载支持
- 📁 数据存储在 `data/dev/`

### 方式2: 生产环境（用于正式部署）

**⚠️ 重要：首次使用需要配置JWT密钥！**

#### 步骤1: 生成安全密钥

```bash
cd backend

# 生成JWT密钥
npm run generate-secret

# 生成数据加密密钥
npm run generate-encrypt-key
```

这会生成两个密钥：
- **JWT_SECRET**: 用于用户认证
- **ENCRYPT_KEY**: 用于加密敏感数据（64个hex字符）

#### 步骤2: 更新生产配置

编辑 `backend/.env.production` 文件：

```bash
# 修改JWT密钥
JWT_SECRET=你生成的JWT密钥

# ⚠️ 重要：修改数据加密密钥（64个hex字符）
ENCRYPT_KEY=你生成的加密密钥

# 同时修改CORS域名为您的实际域名
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

#### 步骤3: 启动生产环境

```bash
npm run start
# 或
npm run start:prod
```

**特点**：
- 🔒 强制安全验证（必须设置强JWT密钥）
- 📊 Info级别日志，隐藏敏感信息
- ⏱️ 5分钟最小采集间隔（更保守安全）
- 🚀 性能优化（更大缓存、更高并发）
- 📁 数据存储在 `data/prod/`

---

## 📊 两套环境对比

| 配置项 | 开发环境 | 生产环境 |
|--------|---------|---------|
| **命令** | `npm run dev` | `npm run start` |
| **配置文件** | `.env.development` | `.env.production` |
| **数据目录** | `data/dev/` | `data/prod/` |
| **数据库** | `bili-stats-dev.db` | `bili-stats.db` |
| **日志级别** | `debug`（详细） | `info`（精简） |
| **详细错误** | ✅ 启用 | ❌ 禁用 |
| **API日志** | ✅ 启用 | ❌ 禁用 |
| **采集间隔** | 1分钟 | 5分钟 |
| **并发任务** | 5个 | 10个 |
| **缓存时间** | 5分钟 | 10分钟 |
| **CORS** | localhost | 仅允许配置的域名 |
| **JWT密钥** | 开发默认值 | 必须设置强密钥 |

---

## 🎮 常用命令

```bash
# 开发环境
npm run dev              # 启动开发服务器
npm run start:dev        # 同上（别名）

# 生产环境
npm run start            # 启动生产服务器  
npm run start:prod       # 同上（别名）

# 工具
npm run generate-secret     # 生成JWT密钥
npm run generate-encrypt-key # 生成数据加密密钥

# 数据库
npm run db:studio        # 打开数据库管理界面
npm run db:push          # 推送schema到数据库

# 测试
npm run test             # 运行测试
npm run test:watch       # 监听模式测试
```

---

## 🔐 安全检查清单

### 开发环境
- ✅ 使用默认配置即可
- ✅ JWT密钥仅用于开发，安全性要求低

### 生产环境（部署前必查）
- [ ] 已生成并设置强JWT密钥（至少32字符）
- [ ] **已生成并设置数据加密密钥（ENCRYPT_KEY，64个hex字符）** ⚠️
- [ ] **已备份ENCRYPT_KEY（丢失将无法解密数据）** ⚠️
- [ ] 已修改CORS为实际域名（移除localhost）
- [ ] 已关闭详细错误信息（`ENABLE_DETAILED_ERRORS=false`）
- [ ] 已关闭API日志（`ENABLE_API_LOGGING=false`）
- [ ] 已配置HTTPS访问
- [ ] `.env.production` 未提交到版本控制
- [ ] 已备份数据库

---

## 📂 数据目录结构

启动后自动创建：

```
backend/data/
├── dev/                          # 开发环境（隔离）
│   ├── bili-stats-dev.db        # 开发数据库
│   ├── media/                   # 媒体缓存
│   ├── logs/                    # 日志文件
│   │   ├── app.log
│   │   ├── error.log
│   │   └── access.log
│   └── notifications.json       # 通知配置
│
└── prod/                         # 生产环境（隔离）
    ├── bili-stats.db            # 生产数据库
    ├── media/                   # 媒体缓存
    ├── logs/                    # 日志文件
    └── notifications.json       # 通知配置
```

**✨ 完全隔离**：开发和生产数据互不影响！

---

## 🔍 验证配置

启动后查看控制台输出：

### 开发环境成功启动：
```
🚀 Starting Bili Stats Monitor in DEVELOPMENT mode...
📝 Environment: development
🔧 Features: Hot Reload, Detailed Errors, API Logging

[Config] Loading development configuration...
[Config] Configuration validated successfully
✅ Development server started successfully!
Server running on http://localhost:3000
```

### 生产环境成功启动：
```
🚀 Starting Bili Stats Monitor in PRODUCTION mode...
📝 Environment: production
🔒 Security: Enhanced
⚡ Performance: Optimized

[Config] Loading production configuration...
[Config] Configuration validated successfully
✅ Production server started successfully!
Server running on http://localhost:3000
```

---

## ❓ 常见问题

### Q: 忘记生成密钥，启动失败？

**症状**：
```
❌ Missing required environment variables:
   - JWT_SECRET
   - ENCRYPT_KEY
```

**解决**：
```bash
# 1. 生成JWT密钥
npm run generate-secret

# 2. 生成数据加密密钥
npm run generate-encrypt-key

# 3. 复制密钥到 .env.production
# 4. 重新启动
npm run start
```

### Q: ENCRYPT_KEY是什么？为什么需要它？

**答**：
- **用途**: 用于加密敏感数据（如账号cookie、通知密码等）
- **格式**: 必须是64个十六进制字符（32字节）
- **重要性**: ⚠️ 如果丢失此密钥，已加密的数据将无法解密！
- **生成**: `npm run generate-encrypt-key`
- **备份**: 强烈建议将此密钥备份到安全的地方（密码管理器、保险库等）

### Q: 如果丢失了ENCRYPT_KEY怎么办？

**答**：
- ❌ 已加密的数据将**永久无法解密**
- ⚠️ 需要重新配置所有账号和通知渠道
- ✅ 预防措施：
  1. 将ENCRYPT_KEY备份到密码管理器
  2. 将ENCRYPT_KEY与数据库分开存储
  3. 定期验证备份的密钥是否正确

### Q: 如何在同一台机器上同时运行开发和生产？

**答**：使用不同端口
```bash
# Terminal 1: 开发环境（端口3000）
npm run dev

# Terminal 2: 生产环境（端口3001）
PORT=3001 npm run start
```

### Q: 如何切换环境？

**答**：直接使用对应的命令即可，系统会自动加载正确的配置
```bash
npm run dev    # 自动使用开发配置
npm run start  # 自动使用生产配置
```

### Q: 环境变量修改后没生效？

**答**：
1. 重启应用（环境变量只在启动时加载）
2. 确认修改了正确的 `.env.{environment}` 文件
3. 确认使用了正确的启动命令

---

## 📚 进一步阅读

- 📖 [完整环境配置指南](./docs/ENVIRONMENT_SETUP.md) - 详细的配置说明
- 📖 [快速开始指南](./ENVIRONMENT_QUICKSTART.md) - 更多示例和技巧
- 📖 [环境变量模板](./env-template.txt) - 所有可配置项的说明
- 📖 [数据加密密钥说明](./ENCRYPT_KEY说明.md) - ENCRYPT_KEY配置和使用

---

## 🔗 B站账号绑定功能

本系统支持绑定B站账号用于创建监控任务。提供两种绑定方式：

### Cookie绑定
- 用户手动从浏览器获取Cookie（包含SESSDATA字段）
- 系统验证Cookie有效性并加密存储
- 适合技术用户快速绑定

### 扫码登录绑定
- 系统生成二维码，用户使用B站App扫码
- 每2秒自动轮询登录状态
- 180秒二维码有效期
- 适合普通用户安全绑定

### 账号管理
- 查看所有已绑定账号及其状态（有效/已过期）
- 解绑不需要的账号
- 过期账号一键重新绑定
- 实时状态监控

### 技术实现
- **加密存储**: 使用AES-256-GCM加密SESSDATA和bili_jct
- **JWT认证**: 所有API端点需要JWT Token
- **智能轮询**: 自动状态管理，组件卸载时清理定时器
- **错误处理**: 7种错误码映射，友好的错误提示

### API端点
```
POST   /api/v1/bilibili/bind/cookie             # Cookie绑定
POST   /api/v1/bilibili/bind/qrcode/generate    # 生成二维码
GET    /api/v1/bilibili/bind/qrcode/poll        # 轮询二维码状态
GET    /api/v1/bilibili/accounts                # 获取账号列表
DELETE /api/v1/bilibili/accounts/:accountId     # 解绑账号
```

详见：`specs/004-bilibili-account-binding/` 目录下的完整规范文档。

---

## 🎉 完成！

现在您可以：
- ✅ 使用 `npm run dev` 启动开发环境
- ✅ 使用 `npm run start` 启动生产环境
- ✅ 两套环境数据完全隔离
- ✅ 一键切换，无需手动修改配置
- ✅ 绑定B站账号创建监控任务

祝开发愉快！🚀

---

**最后更新**: 2025-12-27  
**创建者**: AI Assistant

