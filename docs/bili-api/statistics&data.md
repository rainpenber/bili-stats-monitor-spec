# 统计与数据

统计与数据次日中午12刷新

## UP主视频状态数据

> https://member.bilibili.com/x/web/index/stat

*请求方式：GET*

认证方式：仅可Cookie（SESSDATA）

**json回复：**

根对象：

| 字段    | 类型 | 内容     | 备注                          |
| ------- | ---- | -------- | ----------------------------- |
| code    | num  | 返回值   | 0：成功<br />-101：账号未登录 |
| message | str  | 错误信息 | 默认为0                       |
| ttl     | num  | 1        | 作用尚不明确                  |
| data    | obj  | 信息本体 |                               |

`data`对象：

| 字段              | 类型 | 内容           | 备注 |
| ----------------- | ---- | -------------- | ---- |
| inc_coin          | num  | 新增投币数     |      |
| inc_elec          | num  | 新增充电数     |      |
| inc_fav           | num  | 新增收藏数     |      |
| inc_like          | num  | 新增点赞数     |      |
| inc_share         | num  | 新增分享数     |      |
| incr_click        | num  | 新增播放数     |      |
| incr_dm           | num  | 新增弹幕数     |      |
| incr_fans         | num  | 新增粉丝数     |      |
| incr_reply        | num  | 新增评论数     |      |
| total_click       | num  | 总计播放数     |      |
| total_coin        | num  | 总计投币数     |      |
| total_dm          | num  | 总计弹幕数     |      |
| total_elec        | num  | 总计充电数     |      |
| total_fans        | num  | 总计粉丝数     |      |
| total_fav         | num  | 总计收藏数     |      |
| total_like        | num  | 总计点赞数     |      |
| total_reply       | num  | 总计评论数     |      |
| total_share       | num  | 总计分享数     |      |

**示例：**

```shell
curl 'https://member.bilibili.com/x/web/index/stat' \
-b 'SESSDATA=xxx'
```

<details>
<summary>查看响应示例：</summary>

```json
{
    "code": 0,
    "message": "0",
    "ttl": 1,
    "data": {
        "inc_coin": 0,
        "inc_elec": 0,
        "inc_fav": 0,
        "inc_like": 0,
        "inc_share": 0,
        "incr_click": 0,
        "incr_dm": 0,
        "incr_fans": 1,
        "incr_reply": 0,
        "total_click": 9,
        "total_coin": 1,
        "total_dm": 0,
        "total_elec": 0,
        "total_fans": 29,
        "total_fav": 1,
        "total_like": 1,
        "total_reply": 0,
        "total_share": 0
    }
}
```

</details>
## 新版数据分析
> https://member.bilibili.com/x/web/data/archive_diagnose/play_analyze?bvid=BV1YPhJzgEo7&tmid=&t=1757085576751

*请求方式：GET*
认证方式：仅可Cookie（SESSDATA）
**url参数：**
| 参数名 | 类型 | 内容         | 必要性 | 备注           |
| ------ | ---- | ------------ | ------ | -------------- |
| bvid   | string  | 视频BV号 | 必选   |  |
| t   | num  | 时间戳 | 可选   |  |
**json回复**
字段请参考下一项
**回复示例**
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "viewer_assistant": {
      "play_fan_rate": 140,
      "play_viewer_rate": 9860,
      "play_viewer_rate_med": 0,
      "play": 54533
    },
    "arc_audience": {
      "play_viewer_compare": 2,
      "play_viewer_rate": 9860,
      "play_viewer_pass_rate": 5001,
      "play_fan_compare": 2,
      "play_fan_rate": 135,
      "play_fan_pass_rate": 4999,
      "tip": "播放量在近五稿中排第5，低于中位数64%，粉丝播放低于过往和同类，建议关注3s跳出率、互动率、播转粉率，继续加油~"
    },
    "guest_interact": {
      "tip": "点击率、3秒跳出率、互动率等待提升",
      "suggestion": "你的点击率、互动率、播转粉率偏低，3秒跳出率偏高，建议优化封标、控制节奏、引导讨论、设计差异化转粉点，同时平衡游客和粉丝表现能获得更多推荐",
      "qf_url": "",
      "web_qf_url": "",
      "interact_rate": 201,
      "interact_rate_med": 567,
      "interact_fan_rate": 2741,
      "interact_viewer_rate": 176,
      "interact_pass_rate": 2250,
      "interact_fan_simi_rate_med": 849,
      "interact_fan_pass_rate": 9337,
      "interact_viewer_simi_rate_med": 363,
      "interact_viewer_pass_rate": 2791,
      "crash_rate": 5775,
      "crash_rate_med": 3473,
      "crash_fan_rate": 4921,
      "crash_viewer_rate": 5798,
      "crash_pass_rate": 8654,
      "crash_fan_simi_rate_med": 3980,
      "crash_fan_pass_rate": 6772,
      "crash_viewer_simi_rate_med": 2785,
      "crash_viewer_pass_rate": 9055,
      "tm_rate": 140,
      "tm_rate_med": 291,
      "tm_fan_rate": 159,
      "tm_viewer_rate": 113,
      "tm_pass_rate": 2410,
      "tm_fan_simi_rate_med": 261,
      "tm_fan_pass_rate": 3189,
      "tm_viewer_simi_rate_med": 261,
      "tm_viewer_pass_rate": 3060,
      "play_trans_fan_rate": 0,
      "play_trans_fan_pass_rate": 0,
      "play_trans_fan_rate_med": 10,
      "interact_compare": 2,
      "crash_compare": 1,
      "tm_compare": 1,
      "play_trans_fan_compare": 2,
      "log_date": 20250905,
      "log_hour": 21,
      "interact_star": 23,
      "crash_star": 26,
      "play_trans_fan_star": 20,
      "tm_star": 24
    },
    "improve_idea": {
      "fans_tags_all": "极米,极米RS20,apple watch,投影仪推荐,喷射战士,马里奥赛车,播放器,稳定器,米家,小米油烟机",
      "viewer_tags_all": "极米,极米RS20,宠物机,播放器,投影仪推荐,家庭影院,网盘,拓麻歌子,稳定器,马里奥赛车",
      "fans_tags_main": "极米RS20,极米,apple watch,宠物机,投影仪推荐,播放器,稳定器,马里奥赛车,拓麻歌子,哈曼卡顿",
      "viewer_tags_main": "极米RS20,极米,宠物机,播放器,投影仪推荐,家庭影院,网盘,坚果N1S 4K,apple watch,拓麻歌子",
      "viewer_tag_ratio_all": "184500,184500,104400,89800,71200,38710,32690,26075,22520,18600",
      "fans_tag_ratio_all": "157200,156200,72300,53766,21385,20900,17500,16140,12821,12112",
      "viewer_tag_ratio_main": "156900.0,156800.0,87400.0,75125.0,60466.67,32490.0,27400.0,24200.0,22000.0,21800.0",
      "fans_tag_ratio_main": "186200.0,180200.0,85400.0,78300.0,64633.33,20525.0,18720.0,18300.0,17800.0,16066.67",
      "active_tid_name": "科技",
      "recent_create_tags": "Switch,影音设备,挑战,家庭影院,NAS,网盘,农村,智能家居,米家,摄影技巧"
    }
  }
}
```

## 新版UP主视频数据比较

> https://member.bilibili.com/x/web/data/archive_diagnose/compare

*请求方式：GET*

认证方式：仅可Cookie（SESSDATA）

**url参数：**

| 参数名 | 类型 | 内容         | 必要性 | 备注           |
| ------ | ---- | ------------ | ------ | -------------- |
| t   | num  | 时间戳 | 可选   |  |
| size   | num  | 比较最近的N条视频 | 可选，默认5   | 似乎没有最大值，或者最大值很大 |

**json回复：**

根对象：

| 字段    | 类型 | 内容     | 备注                          |
| ------- | ---- | -------- | ----------------------------- |
| code    | num  | 返回值   | 0：成功<br />-101：账号未登录 |
| message | str  | 错误信息 | 默认为0                       |
| ttl     | num  | 1        | 作用尚不明确                  |
| data    | obj  | 信息本体 |                               |

`data`对象：

| 字段       | 类型 | 内容       | 备注 |
| ---------- | ---- | ---------- | ---- |
| list | list | 最近的视频 | |

`data`中的`list`项：
> [!TIP]
> 这里的数字一般都是百分比，小数点后保留两位，100代表1%，10000代表100%

| 字段       | 类型 | 内容       | 备注 |
| ---------- | ---- | ---------- | ---- |
| aid       | num  | av号 |      |
| bvid | str | bv号 | |
| cover | str | 封面url | |
|title| str|标题|
|pubtime|num|发布时间|
|duration|num|视频长度（秒）|
|play|num|播放数||
|vt|num|未知
|like|num|点赞数
|comment|num|评论数
|dm|num|弹幕数
|fav|num|收藏数|
|coin|num|投币数
|share|num|分享数
|full_play_ratio|num|完播比，用户平均在百分之多少退出
|play_viewer_rate|num|游客播放数，这个视频有多少是游客播放
|active_fans_rate|num|粉丝观看率，多少粉丝看了这个视频
|active_fans_med|num|b站对这一项的评分，显示就是“XX星”
|tm_rate|num|封标点击率
|tm_rate_med|num|你自己平均封标点击率
|tm_fan_simi_rate_med|num|同类up粉丝封标点击率
|tm_viewer_simi_rate_med|num|同类up游客封标点击率
|tm_fan_rate|num|粉丝封标点击率
|tm_viewer_rate|num|游客封标点击率
|tm_pass_rate|num|封标点击率超过n%同类稿件
|tm_fan_pass_rate|num|粉丝封标点击率超过n%同类稿件
|tm_viewer_pass_rate|num|游客封标点击率超过n%同类稿件
|crash_rate|num|3秒退出率
|crash_rate_med|num|b站对这一项的评分，显示就是“XX星”
|crash_fan_simi_rate_med|num|同类up粉丝3秒退出率
|crash_viewer_simi_rate_med|num|同类up游客3秒退出率
|crash_fan_rate|num|粉丝3秒退出率
|crash_viewer_rate|num|游客3秒退出率
|interact_rate|num|互动率
|interact_rate_med|num|b站对这一项的评分，显示就是“XX星”
|interact_fan_simi_rate_med|num|同类up粉丝互动率
|interact_viewer_simi_rate_med|num|同类up游客互动率
|interact_fan_rate|num|粉丝互动率
|interact_viewer_rate|num|游客互动率
|avg_play_time|num|平均播放时间|注意：此字段总是0，可能b站正在写代码，或者和播放量改播放时长有关？
|total_new_attention_cnt|num|涨粉
|play_trans_fan_rate|num|播转粉率
|play_trans_fan_rate_med|num|其他up平均播转粉率

**示例：**

```shell
curl 'https://member.bilibili.com/x/web/data/archive_diagnose/compare?size=10' \
-b 'SESSDATA=xxx'
```
返回示例：
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "list": [
      {
        "aid": 114952417316588,
        "bvid": "BV1YPhJzgEo7",
        "cover": "http://i2.hdslb.com/bfs/archive/afe8d447e6b32b3817fca2e042823f8a8213ab67.jpg",
        "title": "全村第一台高科技油烟机？",
        "pubtime": 1754042400,
        "duration": 306,
        "stat": {
          "not_ready_field": null,
          "play": 54533,
          "vt": 0,
          "full_play_ratio": 415,
          "play_viewer_rate": 9860,
          "play_viewer_rate_med": 6969,
          "play_fan_rate": 135,
          "play_fan_rate_med": 139,
          "active_fans_rate": 135,
          "active_fans_med": 139,
          "tm_rate": 125,
          "tm_rate_med": 259,
          "tm_fan_simi_rate_med": 233,
          "tm_viewer_simi_rate_med": 233,
          "tm_fan_rate": 141,
          "tm_viewer_rate": 100,
          "tm_pass_rate": 2410,
          "tm_fan_pass_rate": 3189,
          "tm_viewer_pass_rate": 3060,
          "crash_rate": 5775,
          "crash_rate_med": 3473,
          "crash_fan_simi_rate_med": 3980,
          "crash_viewer_simi_rate_med": 2785,
          "crash_fan_rate": 4921,
          "crash_viewer_rate": 5798,
          "interact_rate": 201,
          "interact_rate_med": 567,
          "interact_fan_simi_rate_med": 849,
          "interact_viewer_simi_rate_med": 363,
          "interact_fan_rate": 2741,
          "interact_viewer_rate": 176,
          "avg_play_time": 0,
          "avg_play_time_int": 0,
          "total_new_attention_cnt": 4,
          "play_trans_fan_rate": 0,
          "play_trans_fan_rate_med": 10,
          "like": 689,
          "comment": 65,
          "dm": 128,
          "fav": 96,
          "coin": 128,
          "share": 4,
          "unfollow": 23,
          "tm_star": 24,
          "tm_viewer_star": 24,
          "tm_fan_star": 23,
          "crash_p50": 2570,
          "crash_viewer_p50": 2428,
          "crash_fan_p50": 3026,
          "interact_p50": 630,
          "interact_viewer_p50": 487,
          "interact_fan_p50": 1362,
          "play_trans_fan_p50": 20
        },
        "is_only_self": false,
        "hour_stat": {
          "not_ready_field": null,
          "play": 4854,
          "vt": 0,
          "like": 166,
          "comment": 50,
          "dm": 123,
          "fav": 17,
          "coin": 38,
          "share": 1,
          "tm_pass_rate": 2655,
          "interact_rate": 813,
          "tm_star": 24
        }
      }, 
	  // 省略，这个list里一共10个这样的内容
    ]
  }
}
```


## 视频数据增量趋势

> https://member.bilibili.com/x/web/data/pandect 

*请求方式：GET*

认证方式：仅可Cookie（SESSDATA）

数据为前30天

**url参数：**

| 参数名 | 类型 | 内容         | 必要性 | 备注           |
| ------ | ---- | ------------ | ------ | -------------- |
| type   | num  | 目标数据类型 | 必要   | 类型代码见下表 |

类型代码`type`：

| 代码 | 含义 |
| ---- | ---- |
| 1    | 播放 |
| 2    | 弹幕 |
| 3    | 评论 |
| 4    | 分享 |
| 5    | 投币 |
| 6    | 收藏 |
| 7    | 充电 |
| 8    | 点赞 |

**json回复：**

根对象：

| 字段    | 类型  | 内容     | 备注                                              |
| ------- | ----- | -------- | ------------------------------------------------- |
| code    | num   | 返回值   | 0：成功<br />-101：账号未登录<br />-400：请求错误 |
| message | str   | 错误信息 | 默认为0                                           |
| ttl     | num   | 1        | 作用尚不明确                                      |
| data    | array | 趋势列表 |                                                   |

`data`数组：

| 项   | 类型 | 内容              | 备注     |
| ---- | ---- | ----------------- | -------- |
| 0    | obj  | 1天前的数据       |          |
| n    | obj  | （n+1）天前的数据 |          |
| ……   | obj  | ……                | ……       |
| 29   | obj  | 30天前的数据      | 最后一条 |

`data`数组中的对象：

| 字段      | 类型 | 内容     | 备注                 |
| --------- | ---- | -------- | -------------------- |
| date_key  | num  | 对应时间 | 时间戳  前一天的8:00 |
| total_inc | num  | 增加数量 | 意义为数据类型决定   |

**示例：**

查询30天前的视频播放增量趋势，可知`2020-04-05`的播放增量为`46`，`2020-04-04`的播放增量为`58`

```shell
curl -G 'https://member.bilibili.com/x/web/data/pandect' \
--data-urlencode 'type=1' \
-b 'SESSDATA=xxx'
```

<details>
<summary>查看响应示例：</summary>

```json
{
	"code": 0,
	"message": "0",
	"ttl": 1,
	"data": [{
		"date_key": 1586044800,
		"total_inc": 46
	}, {
		"date_key": 1585958400,
		"total_inc": 58
	}, {
		"date_key": 1585872000,
		"total_inc": 81
	}, {
		"date_key": 1585785600,
		"total_inc": 90
	}, {
		"date_key": 1585699200,
		"total_inc": 62
	}, {
		"date_key": 1585612800,
		"total_inc": 70
	},
	…………
	]
}
```

</details>
