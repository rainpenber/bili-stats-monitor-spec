# ENCRYPT_KEY 数据加密密钥说明

## 🔐 什么是 ENCRYPT_KEY？

`ENCRYPT_KEY` 是用于加密敏感数据的密钥，采用 **AES-256-GCM** 加密算法。

### 用途

用于加密以下敏感信息：
- ✅ **账号Cookie** - Bilibili账号的SESSDATA等认证信息
- ✅ **通知密码** - 邮件SMTP密码、API Token等
- ✅ **其他敏感配置** - 任何需要保护的配置数据

### 为什么需要？

如果不加密存储，这些敏感数据将以明文形式保存在数据库中，存在**严重安全风险**：
- ❌ 数据库泄露将导致账号被盗
- ❌ 通知渠道密码泄露
- ❌ 可能被用于非法用途

---

## 📋 格式要求

- **长度**: 64个字符
- **格式**: 十六进制（0-9, a-f, A-F）
- **字节数**: 32字节

**正确示例**：
```
a1b2c3d4e5f6789012345678901234567890abcdefabcdef1234567890abcdef
```

**错误示例**：
```
too-short                          ❌ 太短
not-hex-characters-in-this-string  ❌ 不是十六进制
```

---

## 🚀 如何生成？

### 方法1: 使用npm命令（推荐）

```bash
cd backend
npm run generate-encrypt-key
```

输出示例：
```
🔐 Encryption Key Generator
============================================================

✅ Generated ENCRYPT_KEY:

a1b2c3d4e5f6789012345678901234567890abcdefabcdef1234567890abcdef

============================================================

📋 Usage:
1. Copy the key above
2. Open your .env.production file
3. Replace the ENCRYPT_KEY value with this key
```

### 方法2: 使用openssl

```bash
openssl rand -hex 32
```

### 方法3: 使用Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ⚙️ 如何配置？

### 开发环境

**已自动配置**，无需手动设置！

`backend/.env.development` 中已包含：
```bash
ENCRYPT_KEY=0000000000000000000000000000000000000000000000000000000000000000
```

这是一个固定的开发密钥，**仅用于开发环境**，方便调试。

### 生产环境

**必须手动生成并配置！**

#### 步骤1: 生成密钥

```bash
npm run generate-encrypt-key
```

#### 步骤2: 更新配置

编辑 `backend/.env.production`：

```bash
# 找到这一行
ENCRYPT_KEY=PLEASE-GENERATE-A-NEW-ENCRYPT-KEY-USING-npm-run-generate-encrypt-key-COMMAND

# 替换为生成的密钥
ENCRYPT_KEY=你刚才生成的64个hex字符的密钥
```

#### 步骤3: 备份密钥

⚠️ **非常重要**：将密钥备份到安全的地方！

推荐备份位置：
- ✅ 密码管理器（如1Password、LastPass、Bitwarden）
- ✅ 企业密钥管理系统（如HashiCorp Vault）
- ✅ 加密的备份文件（与数据库分开存储）
- ❌ 不要提交到Git仓库
- ❌ 不要存储在代码中
- ❌ 不要通过不安全的渠道传输

---

## 🔍 如何验证？

### 检查配置是否正确

```bash
cd backend

# 开发环境启动（应该成功）
npm run dev

# 生产环境启动（如果未配置会报错）
npm run start
```

### 启动成功的标志

```
🚀 Starting Bili Stats Monitor in PRODUCTION mode...
📝 Environment: production
🔒 Security: Enhanced
⚡ Performance: Optimized

[Config] Loading production configuration...
[Config] Configuration validated successfully
✅ Production server started successfully!
```

### 启动失败的错误

```
❌ Missing required environment variables:
   - ENCRYPT_KEY

Please set these variables in your .env.production file or environment.

💡 Tips:
   - Generate JWT_SECRET: npm run generate-secret
   - Generate ENCRYPT_KEY: npm run generate-encrypt-key
```

---

## ⚠️ 重要警告

### 密钥丢失的后果

如果丢失 `ENCRYPT_KEY`：

- ❌ **所有已加密的数据将永久无法解密**
- ❌ 需要重新配置所有Bilibili账号
- ❌ 需要重新配置所有通知渠道
- ❌ 历史数据可能需要重新采集

### 如何避免密钥丢失

1. **立即备份** - 生成后立即备份到多个安全位置
2. **定期验证** - 定期检查备份的密钥是否正确
3. **访问控制** - 限制密钥的访问权限
4. **监控告警** - 设置密钥轮换提醒

### 密钥轮换

如果需要更换密钥（安全考虑）：

1. ⚠️ 先备份当前密钥
2. ⚠️ 停止应用
3. ⚠️ 生成新密钥
4. ⚠️ 使用旧密钥解密数据
5. ⚠️ 使用新密钥重新加密
6. ⚠️ 更新配置并重启

**注意**: 目前系统不支持自动密钥轮换，需要手动操作。

---

## 🔒 安全最佳实践

### ✅ 应该做的

- ✅ 使用强随机密钥（通过工具生成）
- ✅ 将密钥存储在环境变量或密钥管理系统中
- ✅ 定期备份密钥
- ✅ 限制密钥的访问权限
- ✅ 在不同环境使用不同的密钥
- ✅ 记录密钥的生成和使用历史

### ❌ 不应该做的

- ❌ 使用简单或可预测的密钥
- ❌ 将密钥硬编码在代码中
- ❌ 将密钥提交到版本控制
- ❌ 通过不安全的渠道传输密钥
- ❌ 在多个环境共用同一密钥
- ❌ 将密钥存储在日志中

---

## 📊 技术细节

### 加密算法

- **算法**: AES-256-GCM
- **密钥长度**: 256位（32字节）
- **IV长度**: 96位（12字节）
- **认证标签**: 128位（16字节）

### 加密格式

加密后的数据格式：
```
iv:authTag:ciphertext
```

示例：
```
a1b2c3d4e5f6789012345678:fedcba9876543210:8a7b6c5d4e3f2a1b...
```

### 代码位置

- 加密工具: `backend/src/utils/crypto.ts`
- 配置加载: `backend/config/index.ts`
- 密钥生成: `backend/scripts/generate-encrypt-key.ts`

---

## 🆘 常见问题

### Q: 开发环境需要配置ENCRYPT_KEY吗？

**A**: 不需要！开发环境已经自动配置了一个固定的测试密钥。

### Q: 可以使用JWT_SECRET作为ENCRYPT_KEY吗？

**A**: 不可以！两者用途不同：
- JWT_SECRET: 用于生成和验证JWT令牌（用户认证）
- ENCRYPT_KEY: 用于加密存储的敏感数据

### Q: 如何知道哪些数据被加密了？

**A**: 查看数据库中以 `iv:authTag:ciphertext` 格式存储的字段。

### Q: 如果怀疑密钥泄露怎么办？

**A**: 
1. 立即生成新密钥
2. 使用旧密钥解密数据
3. 使用新密钥重新加密
4. 更新所有部署环境
5. 检查访问日志，评估影响范围

---

## 📚 相关文档

- [环境配置完整指南](./README-环境配置.md)
- [环境变量模板](./env-template.txt)
- [加密工具源码](./src/utils/crypto.ts)
- [配置系统文档](./docs/ENVIRONMENT_SETUP.md)

---

## 📞 获取帮助

如有问题：
1. 查看本文档的常见问题部分
2. 查看 `backend/README-环境配置.md`
3. 检查应用启动日志
4. 提交Issue到项目仓库

---

**最后更新**: 2025-12-25  
**维护者**: Bili Stats Monitor Team

