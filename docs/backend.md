# B站相关
## B站相关API
所有B站的API文档在 /docs/bili-api 中，具体对应内容如下：
- 二维码扫描登录： `QR.md`
- WBI登录鉴权： `wbi.md` ，wbi鉴权相关的操作：登录、账号后台数据、动态相关数据
- 查询特定用户的视频投稿： `space.md`
- 视频基本数据（播放数，互动数据等）：`info.md`
  
- 动态数据：`detail.md`
  - 查询动态评论区：`https://api.bilibili.com/x/v2/reply/wbi/main`

## 旧版系统python实现参考：
本系统之前已经用python实现了一遍。每次启动python脚本，他会读取一个要监控的视频列表，每个视频都有你可以参考 /docs/back-dev 下的部分python代码验证代码实现方法。
- 视频基本数据的监控：`docs\back-dev\main.py`
- 粉丝数的监控：`docs\back-dev\follower_monitor.py`
- 动态数据的监控：`docs\back-dev\dynamic_monitor.py`
  - 查询某条动态的评论区的监控：`docs\back-dev\dynamic_comment_monitor.py`

## 特别注意
- BV号是一个视频标识编号，但是要拿到视频数据，要用BV号反查CID号。CID号只有在视频上线的时候才会产生。参考 `docs\back-dev\main.py` line 65 def save_cid()
- 接上一条，有时候可能在视频上线前，用户会添加一条未发布视频的监控任务。系统应该在用户指定的发布时间之后尝试获取cid，再尝试查询视频数据。


# 通知系统

请参阅青龙面板的通知实现：`docs\qinglong\notify.py`
修改现在已经有的API是否符合，并根据性调整
