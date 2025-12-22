# 配置验证报告

## 服务器 Docker 配置

根据你提供的 `docker-compose.yml`，服务器配置如下：

### 测试环境 (postgres-test)
- **容器名**: `bili-monitor-postgres-test`
- **用户名**: `bili_monitor_test`
- **数据库名**: `bili_monitor_test`
- **端口映射**: `5555:5432` (外部端口 5555)
- **密码**: 从环境变量 `POSTGRES_TEST_PASSWORD` 读取

### 生产环境 (postgres-prod)
- **容器名**: `bili-monitor-postgres-prod`
- **用户名**: `bili_monitor_prod`
- **数据库名**: `bili_monitor_prod`
- **端口映射**: `5556:5432` (外部端口 5556)
- **密码**: 从环境变量 `POSTGRES_PROD_PASSWORD` 读取

## 本地配置验证

### 当前配置状态

✅ **已正确配置:**
- 数据库类型: `postgres`
- 用户名: `bili_monitor_test` ✅
- 主机: `192.168.0.124` ✅
- 端口: `5555` ✅
- 数据库名: `bili_monitor_test` ✅

⚠️ **需要完成:**
- 密码: 当前为占位符 `your_password`，需要替换为实际密码

### 连接字符串格式

**测试环境:**
```
postgres://bili_monitor_test:实际密码@192.168.0.124:5555/bili_monitor_test
```

**生产环境:**
```
postgres://bili_monitor_prod:实际密码@192.168.0.124:5556/bili_monitor_prod
```

## 配置匹配检查清单

- [x] 用户名匹配 (`bili_monitor_test` 或 `bili_monitor_prod`)
- [x] 端口匹配 (`5555` 测试 / `5556` 生产)
- [x] 数据库名匹配 (`bili_monitor_test` 或 `bili_monitor_prod`)
- [x] 主机地址正确 (`192.168.0.124`)
- [ ] 密码已替换（需要手动完成）

## 如何获取服务器密码

在服务器上，查看 Docker Compose 的 `.env` 文件：

```bash
# 在服务器上执行
cat /path/to/docker-compose/.env
```

查找以下变量：
- `POSTGRES_TEST_PASSWORD` - 测试数据库密码
- `POSTGRES_PROD_PASSWORD` - 生产数据库密码

## 验证步骤

### 1. 验证配置格式

```bash
bun run db:verify
```

应该看到：
- ✅ 所有配置项匹配
- ⚠️ 密码需要替换（如果还是占位符）

### 2. 替换密码

编辑 `backend/.env`，将 `your_password` 替换为服务器上的实际密码。

### 3. 测试连接

```bash
bun run db:test
```

如果连接成功，你会看到：
```
✅ PostgreSQL 连接成功!
📊 数据库版本: PostgreSQL 16.x
```

## 常见问题

### Q: 如何确认服务器上的密码？

A: 在服务器上执行：
```bash
docker exec bili-monitor-postgres-test env | grep POSTGRES_PASSWORD
```

或者查看服务器上的 `.env` 文件（Docker Compose 使用的）。

### Q: 连接失败怎么办？

A: 检查以下项目：
1. 服务器容器是否运行: `docker ps | grep postgres`
2. 密码是否正确
3. 网络连接: `ping 192.168.0.124`
4. 端口是否开放: `telnet 192.168.0.124 5555`

### Q: 如何切换到生产环境？

A: 在 `backend/.env` 中：
1. 注释掉测试环境的 `DATABASE_URL`
2. 取消注释生产环境的 `DATABASE_URL`
3. 确保密码是 `POSTGRES_PROD_PASSWORD` 的值

## 下一步

配置验证通过后：
1. ✅ 运行 `bun run db:generate` 生成迁移文件
2. ✅ 运行 `bun run db:migrate` 创建数据库表
3. ✅ 运行 `bun run dev` 启动后端服务

