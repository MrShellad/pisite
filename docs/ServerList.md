
# Minecraft 服务器发现页开发手册

## 一、项目目标

构建一个 **Minecraft Server Discover（服务器发现页）**，用于：

* 展示 Minecraft 公网服务器
* 支持筛选 / 搜索
* 显示实时在线人数
* 自动检测服务器状态
* 排名推荐优质服务器
* 支持启动器一键加入

类似：

* Modrinth Servers
* Planet Minecraft Servers
* Minecraft Server List

---

# 二、系统架构设计

推荐架构：

```
                    +----------------+
                    |   Frontend     |
                    | React / Next   |
                    +--------+-------+
                             |
                             |
                       REST API
                             |
            +----------------+----------------+
            |                                 |
      +-----v------+                   +------v------+
      |  API服务   |                   | 探测服务     |
      |  Backend   |                   | Server Ping |
      +-----+------+                   +------+------+
            |                                 |
            |                                 |
        +---v---------------------------------v---+
        |               Database                 |
        | PostgreSQL / MySQL / Redis cache      |
        +---------------------------------------+
```

组件：

| 模块           | 作用      |
| ------------ | ------- |
| Frontend     | 服务器发现页  |
| API服务        | 提供服务器列表 |
| Server Probe | 检测服务器状态 |
| Database     | 存储服务器信息 |
| Cache        | 缓存在线人数  |

---

# 三、核心功能模块

服务器发现页需要 6 个核心模块：

```
服务器提交
服务器审核
服务器探测
服务器搜索
服务器排名
服务器统计
```

---

# 四、数据库设计

推荐 **PostgreSQL**

## 1 服务器表

```
servers
```

字段：

| 字段             | 类型        | 说明    |
| -------------- | --------- | ----- |
| id             | uuid      | 服务器ID |
| name           | text      | 服务器名称 |
| description    | text      | 介绍    |
| ip             | text      | IP地址  |
| port           | int       | 端口    |
| version        | text      | MC版本  |
| max_players    | int       | 最大人数  |
| online_players | int       | 在线人数  |
| icon           | text      | 服务器图标 |
| hero           | text      | 服务器hero |
| website        | text      | 官网    |
| tags           | json      | 标签    |
| created_at     | timestamp | 创建时间  |
| verified       | boolean   | 是否审核  |

---

## 2 探测数据表

```
server_status
```

| 字段          | 说明 |
| ----------- | -- |
| server_id   |    |
| online      |    |
| motd        |    |
| players     |    |
| max_players |    |
| version     |    |
| ping        |    |
| updated_at  |    |

---

## 3 统计表

```
server_stats
```

| 字段        | 说明 |
| --------- | -- |
| server_id |    |
| views     |    |
| clicks    |    |
| favorites |    |
| votes     |    |

---

# 五、服务器探测系统

Minecraft服务器状态可以通过 **Server List Ping**

协议：

```
Minecraft Server List Ping (SLP)
```

参考：

* Minecraft Server List Ping protocol

---

## Ping流程

步骤：

```
1. TCP连接服务器
2. 发送 handshake
3. 发送 status request
4. 读取 JSON
```

返回：

```
{
  "version": {
    "name": "1.20.1"
  },
  "players": {
    "online": 32,
    "max": 200
  },
  "description": {
    "text": "Welcome"
  },
  "favicon": "data:image/png;base64"
}
```

---

## Rust实现示例

如果你服务器用 **Rust**：

```
tokio + mc_ping
```

示例：

```rust
use mc_ping::get_status;

let status = get_status("example.com", 25565).await?;

println!("players: {}", status.players.online);
```

---

## 探测策略

推荐：

```
每 60 秒探测一次
```

如果服务器很多：

```
1分钟 × 1000服务器 = 1000 ping
```

优化方案：

```
分布式探测
```

---

# 六、API设计

推荐：

```
REST API
```

---

## 获取服务器列表

```
GET /servers
```

参数：

```
?sort=players
?tag=smp
?version=1.20
?page=1
```

返回：

```
{
  "servers":[
     {
       "id":"",
       "name":"",
       "online":32,
       "max":200,
       "ping":54,
       "version":"1.20"
     }
  ]
}
```

---

## 获取服务器详情

```
GET /servers/{id}
```

---

## 搜索服务器

```
GET /servers/search?q=smp
```

---

## 提交服务器

```
POST /servers
```

数据：

```
{
  name
  ip
  port
  website
}
```

---

# 七、服务器排名算法

推荐综合评分：

```
Score =
在线人数权重
+点击率
+投票
+稳定性
```

公式：

```
score =
(players * 0.6) +
(votes * 2) +
(clicks * 0.1)
```

再做：

```
log(players)
```

防止大服垄断。

---

# 八、标签系统

服务器可以打标签：

```
SMP
PVP
RPG
MODDED
ANARCHY
MINIGAME
SKYBLOCK
```

数据库：

```
tags JSON
```

前端筛选：

```
tag=smp
tag=modded
```

---

# 九、服务器自动识别

可以自动识别：

### 1 服务器版本

Ping返回：

```
version.name
```

---

### 2 Mod服务器

检测：

```
Forge
Fabric
NeoForge
```

返回字段：

```
modinfo
```

---

### 3 图标

服务器 icon：

```
favicon
```

base64 PNG

---

# 十、搜索系统

推荐：

```
Elasticsearch
```

索引字段：

```
name
description
tags
```

支持：

```
模糊搜索
拼音搜索
标签过滤
```

---

# 十一、前端设计

推荐：

```
React + Next.js
```

UI结构：

```
Discover Page
```

```
+-----------------------------+
| 搜索框                      |
+-----------------------------+

| 标签筛选                    |

| 服务器列表                  |
|                             |
| [icon] Server Name          |
| Players 32 / 200            |
| Ping 45ms                   |
| Version 1.20                |
| Tags SMP PVP                |
|                             |
+-----------------------------+
```

---

## 卡片设计

```
ServerCard
```

展示：

```
icon
name
players
version
ping
tags
```

---

# 十二、启动器一键加入

如果服务器列表在启动器中：

按钮：

```
Join
```

点击：

```
minecraft://server/ip
```

或

```
--server ip
```

---

# 十三、反作弊

服务器榜单容易被刷。

必须防止：

### 刷在线人数

检测：

```
player sample
```

---

### 刷点击

使用：

```
IP + user agent
```

限流。

---

### 僵尸服务器

规则：

```
连续5分钟 offline
自动降权
```

---

# 十四、缓存系统

推荐：

```
Redis
```

缓存：

```
server list
players
ranking
```

TTL：

```
30秒
```

---

# 十五、CDN

服务器图标建议：

```
S3 + CDN
```

避免：

```
base64过大
```

---

# 十六、性能设计

假设：

```
服务器数量：5000
用户：10万
```

优化：

```
缓存
分页
CDN
```

---

# 十七、审核系统

建议人工审核：

```
服务器提交
→ pending
→ admin approve
```

防止：

```
诈骗服务器
恶意服务器
```

---

# 十八、SEO

如果是网站：

```
/servers
/servers/smp
/servers/1.20
```

---

# 十九、数据统计

统计：

```
服务器点击
玩家来源
活跃服务器
```

---

# 二十、未来扩展

可以加入：

### 1 玩家评论

```
server_reviews
```

### 2 收藏服务器

```
favorites
```

### 3 玩家评分

```
1-5 stars
```

---

# 二十一、推荐技术栈

后端：

```
Rust (axum)
Node (nestjs)
Go (gin)
```

数据库：

```
PostgreSQL
Redis
```

探测：

```
Rust async ping
```

前端：

```
React
Next.js
Tailwind
```

---

# 二十二、服务器发现页核心指标

优秀服务器列表必须保证：

```
响应 < 100ms
数据更新 < 60秒
列表加载 < 1秒
```

---

# 二十三、完整系统规模

成熟服务器发现页通常：

```
服务器数量：1万+
每日访问：50万+
Ping次数：100万/天
```
