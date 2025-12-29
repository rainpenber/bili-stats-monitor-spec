# 数据库连接配置指南

## 服务器信息

- **服务器 IP**: 192.168.0.124
- **测试数据库端口**: 5555
- **生产数据库端口**: 5556

## 快速配置步骤

### 1. 更新 .env 文件

编辑 `backend/.env` 文件，确保包含以下配置：

```env
# 数据库类型
DB_TYPE=postgres

# 测试环境连接（端口 5555）
DATABASE_URL=postgres://bili_monitor_test:你的密码@192.168.0.124:5555/bili_monitor_test

# 生产环境连接（端口 5556）- 需要时取消注释
# DATABASE_URL=postgres://bili_monitor_prod:你的密码@192.168.0.124:5556/bili_monitor_prod
```

**重要**: 将 `你的密码` 替换为服务器上 Docker 容器中设置的实际密码。

### 2. 测试连接

运行测试脚本验证连接：

```bash
bun run db:test
```

如果连接成功，你会看到：
```
✅ PostgreSQL 连接成功!
📊 数据库版本: PostgreSQL 16.x
```

### 3. 初始化数据库

首次连接后，需要运行数据库迁移：

```bash
# 生成迁移文件
bun run db:generate

# 运行迁移
bun run db:migrate
```

## 故障排查

### 连接失败

1. **检查服务器上的容器是否运行**:
   ```bash
   # 在服务器上执行
   docker ps | grep postgres
   ```

2. **检查端口是否开放**:
   ```bash
   # 在本地执行
   telnet 192.168.0.124 5555
   # 或
   nc -zv 192.168.0.124 5555
   ```

3. **检查防火墙设置**:
   - 确保服务器防火墙允许端口 5555 和 5556
   - 确保本地防火墙允许出站连接

4. **验证连接字符串**:
   - 检查用户名是否正确: `bili_monitor_test` 或 `bili_monitor_prod`
   - 检查密码是否正确
   - 检查 IP 地址和端口是否正确

### 常见错误

**错误: "DATABASE_URL is required when DB_TYPE=postgres"**
- 解决: 确保 `.env` 文件中设置了 `DATABASE_URL`

**错误: "Connection refused"**
- 解决: 检查服务器上的容器是否运行，端口是否正确

**错误: "password authentication failed"**
- 解决: 检查 `.env` 中的密码是否与服务器上 Docker 容器的密码一致

**错误: "database does not exist"**
- 解决: 确保数据库名称正确（`bili_monitor_test` 或 `bili_monitor_prod`）

## 验证清单

- [ ] `.env` 文件中设置了 `DB_TYPE=postgres`
- [ ] `.env` 文件中设置了正确的 `DATABASE_URL`
- [ ] `DATABASE_URL` 中的密码已替换为实际密码
- [ ] `DATABASE_URL` 中的 IP 地址是 `192.168.0.124`
- [ ] `DATABASE_URL` 中的端口是 `5555`（测试）或 `5556`（生产）
- [ ] 服务器上的 Docker 容器正在运行
- [ ] 网络连接正常（可以 ping 通服务器）
- [ ] 防火墙允许连接

## 下一步

连接成功后，可以：
1. 运行 `bun run db:generate` 生成迁移文件
2. 运行 `bun run db:migrate` 创建数据库表
3. 运行 `bun run dev` 启动后端服务

