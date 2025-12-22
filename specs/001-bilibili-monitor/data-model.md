# Data Model: B站数据监控工具（001-bilibili-monitor）

> 从 feature spec 中抽取关键实体、字段、关系与状态/校验规则，用于指导后端建模与前端类型定义。

---

## 1. User

**Purpose**: 系统登录与权限控制（管理员 / 普通用户）。

**Fields**:
- `id`: string — 内部用户 ID（不暴露给前端的实现细节，可为自增或 UUID）  
- `username`: string — 用户名（唯一）  
- `password_hash`: string — 密码哈希（不存明文）  
- `role`: enum `"admin" | "viewer"` — 对应 spec 中“管理员 / 普通用户”  
- `created_at`: datetime  
- `updated_at`: datetime  

**Validation**:
- `username` 唯一；  
- 仅两位用户存在（1 管理员 + 1 普通用户）是业务约束，可通过种子数据与管理端限制实现。  

---

## 2. BiliAccount

**Purpose**: 表示系统中绑定的 B 站账号，用于请求受限 API。

**Fields**:
- `id`: string — 内部唯一 ID  
- `uid`: string — B 站 UID（前端宽松为字符串）  
- `display_name`: string — 展示用昵称（可空，前端显示）  
- `bind_method`: enum `"cookie" | "qrcode"` — 绑定方式  
- `credential_encrypted`: string — 加密存储的 Cookie/登录凭据  
- `status`: enum `"valid" | "expired"` — 当前鉴权状态  
- `last_bound_at`: datetime — 最近绑定时间  
- `last_failed_at`: datetime | null — 最近一次鉴权失败时间  
- `consecutive_failures`: int — 连续鉴权失败次数（用于 >5 次逻辑）  
- `created_at`: datetime  
- `updated_at`: datetime  

**Relationships**:
- `BiliAccount` 1 - N `MonitoringTask`（作为“关联账号”）。  

**State Transitions（关键）**:
- `valid` → `expired`：连续鉴权失败次数 > 5；  
- `expired` → `valid`：管理员完成重新登录（Cookie 或扫码）并验证成功。  

---

## 3. MonitoringTask

**Purpose**: 核心监控任务（视频或博主），驱动调度与数据采集。

**Fields**:
- `id`: string — 内部唯一 taskId（不使用 BV/UID 作为主键）；  
- `type`: enum `"video" | "author"` — 监控对象类型；  
- `target_id`: string — 视频 BV 号或博主 UID（宽松字符串）；  
- `title`: string — 视频标题或博主昵称（可编辑）；  
- `bili_account_id`: string | null — 关联 B 站账号（可为空，使用默认账号）；  
- `schedule_type`: enum `"fixed" | "smart_video"` — 定时策略；  
- `schedule_value`: json —  
  - 当 `fixed` 时：`{ value: number, unit: "minute" | "hour" | "day" }`；  
  - 当 `smart_video` 时：无需额外字段，由业务规则计算；  
- `deadline_at`: datetime — 截止时间（默认创建后三个月）；  
- `status`: enum `"running" | "stopped" | "completed" | "failed" | "paused"`  
- `pause_reason`: string | null — 暂停原因（如“因鉴权失败暂停”）；  
- `tags`: string[] — 标签列表（约束见“标签输入”）；  
- `created_at`: datetime  
- `updated_at`: datetime  

**Validation**:
- 固定频率换算后 ≥ 1 分钟，且 ≤ 系统设置上限（默认 1 天）；  
- 每个任务标签数 ≤ 10，单个标签长度 ≤ 20，允许中文与空格。  

**State Transitions**:
- `running` → `completed`：到达截止时间后自动停止；  
- `running` → `failed`：超过最大重试次数；  
- `running` → `paused`：关联账号连续鉴权失败 > 5；  
- `paused` → `running`：管理员确认恢复被标记任务；  
- 任意 → `stopped`：管理员手动停止任务；  
- 在同一 `id` 下允许替换 `target_id` 与 `title` 等信息，不新建任务，需记录变更事件（可选扩展实体）。  

---

## 4. VideoData

**Purpose**: 存储每次采集的视频指标，用于趋势图与告警判断。

**Fields**:
- `id`: string — 记录 ID  
- `task_id`: string — 关联 `MonitoringTask`（type=video）  
- `video_bv`: string — 视频 BV 号（便于跨任务聚合查询）  
- `collected_at`: datetime — 采集时间  
- `view_count`: int — 播放量  
- `concurrent_viewers`: int — 实时观看人数  
- `danmaku_count`: int — 弹幕数  
- `comment_count`: int — 评论数  
- `coin_count`: int — 投币数  
- `like_count`: int — 点赞数  
- `completion_rate`: float | null — 播放完成率（持有账号时可采集）  
- `avg_watch_duration`: float | null — 平均观看时长（秒）  

**Relationships**:
- N - 1 `MonitoringTask`（视频类型）。  

**Notes**:
- 所有数据“永久保留”，后续可通过时间窗口查询和聚合支持可视化与告警。  

---

## 5. AuthorData

**Purpose**: 存储博主粉丝数按日数据。

**Fields**:
- `id`: string  
- `task_id`: string — 关联 `MonitoringTask`（type=author）  
- `author_uid`: string — UID  
- `collected_at`: datetime — 采集时间（建议统一按日粒度）  
- `follower_count`: int — 粉丝数  

**Relationships**:
- N - 1 `MonitoringTask`（博主类型）。  

---

## 6. MediaAsset

**Purpose**: 封面/头像的本地缓存与状态。

**Fields**:
- `id`: string  
- `target_type`: enum `"video" | "author"`  
- `target_id`: string — BV 或 UID  
- `local_path`: string — 本地缓存路径  
- `source_url`: string — 原始 URL  
- `last_refreshed_at`: datetime — 最后刷新时间  
- `status`: enum `"ok" | "failed"` — 最近一次刷新结果  

**Notes**:
- 失败时前端使用占位图；  
- 缓存存在有效期（如 7 天），到期后调度刷新。  

---

## 7. Notification

**Purpose**: 通知渠道配置。

**Fields**:
- `id`: string  
- `channel_type`: enum `"email" | "dingding" | "wechat_work" | "webhook" | "bark" | "pushdeer" | "onebot_qq" | "telegram"`  
- `name`: string — 配置名称  
- `target`: json — 渠道具体配置（如邮箱地址、Webhook URL、Bot Token 等）  
- `enabled`: boolean  
- `created_at`: datetime  
- `updated_at`: datetime  

---

## 8. AlertRule

**Purpose**: 告警规则（粉丝数、指标阈值、任务失败、账号异常等）。

**Fields**:
- `id`: string  
- `name`: string — 规则名  
- `type`: enum `"follower_spike" | "video_metric_threshold" | "task_failure" | "auth_failure"` 等  
- `threshold_mode`: enum `"absolute" | "percentage"` — 粉丝告警阈值模式  
- `threshold_value`: float — 阈值（绝对值或百分比）  
- `window_seconds`: int — 对比时间窗口（默认 24h）  
- `enabled`: boolean  
- `channels`: string[] — 关联的 `Notification` ID 列表  
- `created_at`: datetime  
- `updated_at`: datetime  

---

## 9. SystemLog

**Purpose**: 系统日志记录与查询/下载。

**Fields**:
- `id`: string  
- `timestamp`: datetime  
- `level`: enum `"DEBUG" | "INFO" | "WARNING" | "ERROR"`  
- `source`: string — 来源（模块名/功能名，如 `auth`, `scheduler`, `alerts` 等）  
- `message`: string — 文本消息  
- `context`: json | null — 结构化上下文（任务 ID、账号 ID 等，注意不包含敏感原文）  

**Query Requirements**（来自 FR-039 ~ FR-043）:
- 支持按日期范围、等级（多选）、来源（多选）、关键字过滤；  
- 支持按时间升序/降序排序；  
- 支持基于当前筛选条件导出下载。  

---

## Relationships Overview

- `User` 1 - N `SystemLog`（通过 `source`/`context` 间接关联用户操作）；  
- `BiliAccount` 1 - N `MonitoringTask`；  
- `MonitoringTask` 1 - N `VideoData` / `AuthorData`；  
- `MonitoringTask` 与 `MediaAsset` 通过 `target_type + target_id` 间接关联；  
- `AlertRule` N - N `Notification`（通过 `channels` 数组）；  
- `AlertRule` 与 `MonitoringTask` / `BiliAccount` / 指标数据通过运行时条件关联（不强制建外键）。  

---

## State Machines（摘要）

### BiliAccount 状态机

- `valid`  
  - on 鉴权失败（累加 > 5） → `expired`  
- `expired`  
  - on 管理员重新登录成功 → `valid`（同时重置 `consecutive_failures`）  

### MonitoringTask 状态机

- `running`  
  - on 到达 `deadline_at` → `completed`  
  - on 超过最大重试次数 → `failed`  
  - on 关联账号连续失败 > 5 → `paused`（带原因）  
  - on 管理员手动停止 → `stopped`  
- `paused`  
  - on 管理员确认恢复 → `running`  

其他从属状态由业务操作和后台任务驱动，均需要在日志中记录对应的状态变更事件，便于后续问题排查与可观测性提升。








