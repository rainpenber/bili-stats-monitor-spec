# Mock 使用说明（B站数据监控工具 / MVP）

本 Mock 基于 Node + Express，覆盖 OpenAPI v1 核心能力，支持 CORS，便于前端本地联调。

- 统一约定：仅 GET/POST；变更/删除用 POST + body.action 指定
- 统一响应：{ code, message, data }
- 时间：ISO 8601，Asia/Shanghai
- 基础路径：/api/v1
- 端口：默认 8080（可通过环境变量 PORT 改）

## 一、启动 Mock

前置：Node.js >= 18

```bash
# 进入仓库根目录
# 安装依赖（本仓库未附 package.json，建议临时安装）
npm init -y
npm i express body-parser cors

# 启动
node specs/001-bilibili-monitor/mocks/mock-server.js
# or 指定端口
PORT=3001 node specs/001-bilibili-monitor/mocks/mock-server.js
```

启动后：Mock API at http://localhost:8080

## 二、关键接口速览（与 OpenAPI 一致）

- 认证
  - POST /api/v1/auth/login
  - POST /api/v1/auth/logout
  - GET  /api/v1/auth/profile

- 账号绑定（Cookie/扫码）
  - POST /api/v1/accounts/cookie { cookie }
  - POST /api/v1/accounts/qrcode -> { session_id, qr_url, expire_at, poll_interval_sec }
  - GET  /api/v1/accounts/qrcode/status?session_id=...
  - GET  /api/v1/accounts
  - POST /api/v1/accounts/{id}/action { action: validate | unbind }

- 任务与批量操作（卡片视图）
  - GET  /api/v1/tasks?keyword=&type=video|author&author_uid=&tags=&page=&page_size=
  - POST /api/v1/tasks  (创建)
  - GET  /api/v1/tasks/{id}
  - POST /api/v1/tasks/{id}  { action: update | delete, ...patch }
  - POST /api/v1/tasks/batch { action: enable | disable, selection }
    - selection: { type: 'ids'|'all', ids?:[], filters?:{ keyword,type,author_uid,tags } }

- 指标（内联详情数据）
  - GET /api/v1/videos/{bv}/metrics?from=&to=&fields=play,watching,danmaku,comment,coin,like
  - GET /api/v1/videos/{bv}/insights/daily   (完成率/平均观看时长，日粒度)
  - GET /api/v1/authors/{uid}/metrics

- 媒体资源（封面/头像本地缓存 URL）
  - GET  /api/v1/media/videos/{bv}/cover
  - GET  /api/v1/media/authors/{uid}/avatar
  - POST /api/v1/media/refresh { target_type, target_id }

- 通知/告警、日志、设置
  - GET/POST /api/v1/notifications/channels
  - GET/POST /api/v1/alerts/authors/{uid}
  - GET /api/v1/logs ；GET /api/v1/logs/download
  - GET/POST /api/v1/settings

## 三、示例请求

- 登录
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"pass"}'
```

- 创建视频任务（智能频率）
```bash
curl -X POST http://localhost:8080/api/v1/tasks \
  -H 'Content-Type: application/json' \
  -d '{"type":"video","target_id":"BV1abc123XYZ","strategy":{"mode":"smart"},"tags":["剪辑"]}'
```

- 批量禁用（全量全选：对当前筛选条件下的全部结果生效）
```bash
curl -X POST http://localhost:8080/api/v1/tasks/batch \
  -H 'Content-Type: application/json' \
  -d '{"action":"disable","selection":{"type":"all","filters":{"type":"video","keyword":"BV"}}}'
```

- 获取视频时序
```bash
curl 'http://localhost:8080/api/v1/videos/BV1abc123XYZ/metrics?fields=play,watching&from=2025-11-01T00:00:00%2B08:00'
```

- 二维码登录（演示）
```bash
# 1) 生成二维码
curl -X POST http://localhost:8080/api/v1/accounts/qrcode -H 'Content-Type: application/json'
# 2) 轮询状态（演示可用 ?stage=scanned|confirmed 模拟阶段）
curl 'http://localhost:8080/api/v1/accounts/qrcode/status?session_id=sess_xxx&stage=confirmed'
```

## 四、前端接入建议

- BaseURL 使用环境变量配置（如 VITE_API_BASE_URL）
- 统一封装请求：仅 GET/POST；错误码统一处理（code!=0）
- 卡片列表：
  - 视频卡片显示 cover_url、标题、播放量（“xx万”格式）
  - 博主卡片显示 avatar_url、昵称、粉丝数
  - 点击卡片后请求对应的 metrics 接口填充内联详情区
- 批量全选：
  - “全量全选”需传 selection.type=all + 当前 filters，后端按 filters 解析并作用于跨页集合
- 媒体资源：优先展示本地缓存 URL；失败则占位图

## 五、注意事项

- 二维码登录的接口形态为占位实现，后续需按实际可用的 B 站接口文档做适配
- 本 Mock 为内存态，重启后数据会重置

