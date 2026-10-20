# dsh-bot-board 代码评审报告

评审对象：`/Users/admin/Documents/dsh-bot-board`（v0.2.0）  
评审范围：`index.js`（157 行，宿主侧）、`client.js`（767 行，浏览器侧）、`tools/smoke.mjs`、`package.json`、`README.md`  
对照上游：`ds-bot@0.1.7`（`~/.dsh/profiles/desktop/node_modules/ds-bot`）、DSH 平台包（`/Applications/DeepSeek Harness.app/.../@deepseek-ai`）  
评审时间：2026-10-20

---

## 一句话结论

**插件的信息架构和视觉语言是好的，问题不在"想做的东西不对"，而在"已经拿到的数据没渲染、算错的状态优先级、以及一处暗色主题下的致命可读性问题"。** 修掉 8 个 P0 后，它才真正兑现 README 里写的"一眼看清每个 Bot 在干什么"。

问题总数 **23 项**：P0 正确性 8 项、P1 健壮性 8 项、P2 工程质量 7 项。

---

## 一、P0 正确性问题

这些是"用户看得见、且看得见的是错的"的问题。

### P0-1 报错压制 15 分钟：Bot 已经重新干活了，工位还是红的

- **位置**：`client.js:580-582`（状态计算）、`index.js:36-49`（失败保留 15 分钟）
- **现象**：`const status = alertOf(bot) ? 'alert' : failed ? 'error' : (activity[bot.id] || ...)` —— `error` 优先于 `activity`。一个 Bot 报错后即使已经重新开始干活，工位仍然显示"卡住"，最长 15 分钟。
- **证据**：`index.js:40` 的 `if (now - failure.at > 15 * 60 * 1000)` 决定清理时机；`errorsFrom()` 返回的失败在 15 分钟内一直存在。
- **为什么严重**："该绿的一直红"比"该红的没红"更消耗信任——你会以为它还卡着，实际它在跑，于是你跑去催一个没卡的人。
- **修法**：失败降级为**徽标**而非主状态。主状态由 `activity` 决定；失败只在"该 Bot 当前无 activity"时占主状态。同时该 Bot 一旦出现新 activity，立即清除它的 failure（不必等 15 分钟 TTL，TTL 只用于"无 activity 的孤立失败"）。
- **改动量**：S

### P0-2 暗色主题下文字不可读

- **位置**：`client.js:361-362`（`.bb-wrap{color:inherit}`）、`383`（`.bb-body{background:#FAF7F1}`）、`389-390`（`.bb-station-name` 继承色）
- **现象**：暗色主题下 `color:inherit` 拿到浅色文字，`.bb-body` 背景是固定的奶油色 `#FAF7F1`，`.bb-station-name` 直接继承 → **白字压奶油底**。图例 `.bb-legend`（`379-380`）同理。
- **证据**：CSS 里所有"教室"背景都是硬编码色值（`#FAF7F1`、`#E8D9C0`、`#3A3F45`），只有面板外壳用了 `--dsw-alias-bg-layer-1` token。
- **修法**：教室是刻意的奶油色，应保留。正确做法是给教室区域**显式深色文字**（`color:#2C2C2A`），而不是继承。若希望跟随主题，用 `ctx.theme.overrideTokens(source, {'--bb-room': {light:'#FAF7F1', dark:'#2A2724'}})` 提供双值。
- **改动量**：S

### P0-3 工位会跳：Bot 一改状态就在 3×3 里换位置

- **位置**：`client.js:589` —— `.sort((a, b) => (rank[a.scene] ?? 4) - (rank[b.scene] ?? 4))`
- **现象**：`rank = {error:0, alert:1, busy:2, done:3, idle:4}`，工位按状态重排。一个 Bot 从"干活"变"卡住"，它就飞到第一格；旁边的 Bot 全部平移。
- **矛盾点**：README 明确写"9 个团子按 Bot 名固定，刷新不换人"，造型确实固定了，但**位置没固定**，而人眼是靠位置记人的。
- **修法**：按 `ROSTER` 顺序（或 `bots` 数组顺序）固定排位，状态只靠颜色/动画/徽标表达。若确实需要"把要紧的顶上来"，改成可选的"聚焦模式"（按钮切换），不要默认重排。
- **改动量**：S

### P0-4 `waiting` 被画成"等你"，语义错了

- **位置**：`client.js:60-66`（`sceneOf`）、`25-31`（图例与文案）
- **现象**：`if (status === 'alert' || status === 'waiting') return 'alert'`。`waiting` 的含义是"这个 Bot 在等别的 Bot 交活"（`handoffs.js:120-130`），但 `alert` 的图例是"**等你**"、灯是黄色。
- **证据**：`ds-bot` 的 `waitingView()` 注释写明"Per Bot, the Bots and groups it waits for"——等的是同行，不是用户。
- **后果**：黄色图例承诺"需要你"，实际是"它在等同事"。你会反复点进去看，发现没事可做，然后开始忽略黄灯——这是告警疲劳的起点。
- **修法**：新增第六态 `waiting`（建议灯色蓝/紫，图例"等交活"），与 `alert`（等你）彻底分开。
- **改动量**：S

### P0-5 有报错时，胶囊指示灯显示黄色而不是红色

- **位置**：`client.js:718`（收起态胶囊）、`732`（展开态标题灯）
- **现象**：`tone: errorCount || alertCount ? '#EAB308' : ...` —— `errorCount > 0` 时短路，取到黄色 `#EAB308`。红色 `#EF4444` 永远用不到。
- **后果**：最需要被看见的状态（出错）用了最不刺眼的颜色，而图例里"卡住=红"。自相矛盾。
- **修法**：`errorCount ? '#EF4444' : alertCount ? '#EAB308' : busy ? '#22C55E' : '#D3D1C7'`。
- **改动量**：XS

### P0-6 `work.room` 用 Bot 表查房间 id，永远查不到名字

- **位置**：`index.js:102` —— `room: nameOf(work.room) ?? work.room ?? null`
- **现象**：`nameOf` 是 `bots.find(bot => bot.id === id)`。而 `works[].room` 存的是**房间 id**（`handoffs.js` 里 `room` 是 room id，`from`/`to` 才是 bot id）。
- **证据**：本机 `state.json` 现有 8 条 works，`room` 均为 `undefined`，所以这个 bug 目前潜伏；一旦用群聊派活就会暴露成"群显示一串 id"。
- **修法**：建 `roomNameOf = id => rooms[id]?.name ?? id`，或该字段不渲染就直接删掉（见"明确不做"）。
- **改动量**：XS

### P0-7 `ownerOf` 漏掉 `bots[].sessionId`，切段后报错映射不回来

- **位置**：`index.js:74-86`
- **现象**：映射只登记了 `bot.id` 和 `bot.segments[].sessionId`（**已结束**的 part）。Bot 当前的 part（`bot.sessionId`）没登记。
- **证据**：`roster.js` 的 Bot 结构是 `{id, sessionId, segments[], ...}`，`id` 恒等于首个会话 id，`sessionId` 随切段变化。本机当前 `bots with segments: 0`，所以还没踩到——**属于潜伏 bug，一旦某个 Bot 切过段就必然踩**。
- **后果**：切段后该 Bot 的 `agent/error` 事件映射不到 Bot，报错静默消失（而 P0-1 又让它 15 分钟不消，两者叠加会出现"红着但不说是为什么"）。
- **修法**：`if (bot.sessionId) ownerOf.set(bot.sessionId, bot.id)`，并放在 `segments` 之前（当前 part 优先）。
- **改动量**：XS

### P0-8 群聊时间恒为 0，`ago()` 是死代码

- **位置**：`index.js:119-125`、`client.js:69-77`（`ago`）
- **现象**：`at: Number(line.time) || 0`。但 `groups.js:174-177` 的日志行结构是 `{seq, who, botId?, kind?, text, length?}`——**没有 `time` 字段**。所以 `at` 恒为 0，`ago(0)` 返回空串。
- **证据**：本机 `state.json` 的 `rooms` 为空，`~/.dsh/bot/group-lines/` 目录不存在——群聊从未被使用过。
- **修法**：随群聊功能一起移除 rooms 采集（减小快照体积、减少 2.5s 轮询的负载）；`ago()` 若不再使用则删除。
- **改动量**：S（含删除 `index.js` 的 rooms 分支）

---

## 二、P1 健壮性问题

### P1-1 `ctx.effect` 未用 `ctx.inject(['connection'])` 包裹，路由可能永不注册

- **位置**：`index.js:146-155`
- **现象**：`if (!ctx.connection?.fetch?.register) return` —— 一次性检查。若 `connection` 服务在 `apply()` 之后才就绪（cordis 的服务是异步提供、可延迟注入的），这个 `return` 会让路由**永久不注册**，前端永远 404，且没有任何报错。
- **证据**：同一文件的 `agent/error` 监听特意写了注释"注入始终回调、由 store 判定"，说明作者知道这个坑，但路由这半没做。
- **修法**：`ctx.inject(['connection'], ctx => ctx.effect(() => ctx.connection.fetch.register({...})))`。cordis 会在依赖就绪时回调、卸载时自动清理。
- **改动量**：S

### P1-2 `state.json` 并发读：解析失败静默返回 stale 数据

- **位置**：`index.js:62-67`
- **现象**：`ds-bot` 写 `state.json` 时若正好被读到半截，`JSON.parse` 抛错 → `return cache.data ?? {ok:false, reason:'unreadable'}`。有缓存就返回旧数据，**前端完全不知道**。
- **修法**：失败后 `await sleep(10)` 重试一次；仍失败则返回 `{...cache.data, stale:true}`，前端在面板顶部标一行"数据延迟"。
- **改动量**：S

### P1-3 缓存键只用 `mtimeMs`，同毫秒两次写会漏

- **位置**：`index.js:58` —— `cache.mtimeMs === info.mtimeMs`
- **现象**：`state.json` 在密集派活时可能同一毫秒内被写两次；`mtimeMs` 精度不足时第二次改动被忽略，看板停在旧快照直到下一次写。
- **修法**：`mtimeMs + size` 组合，或改用 `fs.watch`（注意 macOS 上 watch 有合并行为，建议组合方案）。
- **改动量**：XS

### P1-4 `boardError` 设了但从不渲染

- **位置**：`client.js:471-475`（设置）、全文件（无读取）
- **现象**：宿主侧读取失败时 `setBoard(prev => ({...prev, boardError: '本地数据读取失败'}))`，但这个字段没有任何组件读它。
- **后果**：派活/报错数据整块失效时，面板看起来"一切正常，只是没活"，属于最危险的静默失败。
- **修法**：渲染到 `.bb-body` 顶部一条浅红提示条。
- **改动量**：XS

### P1-5 1.5 秒轮询每次都触发上游的昂贵副作用

- **位置**：`client.js:436-448`
- **证据**：`ds-bot/src/host/channel.js:103-116` —— `handle()` 在进入 `switch` 之前就 `await rt.refresh()`；`case 'state'` 里还有 `rt.bootstrap()`、`rt.catalog()`、`rt.loadSecrets()`。**`since + models` 命中 `unchanged:true` 也照样先跑完这些**（第 115 行在 112-114 之后）。
- **后果**：`state` 不是纯读接口。看板每 1.5 秒一次 = 40 次/分钟额外 `refresh + catalog + loadSecrets`，且与 DS Bot 自身前端同频叠加。
- **修法**：面板折叠时不轮询（或 30s）；`document.hidden` 时 30s 而不是 10s；对 `refresh` 的昂贵性在上游无解，只能降频。
- **改动量**：S

### P1-6 每秒强制重渲染 9 个 SVG，而心跳没有任何消费者

- **位置**：`client.js:429,485-488`（`setBeat`）、`78-84`（`elapsed` 从未被调用）、`69-77`（`ago` 从未被调用）
- **现象**：`setInterval(() => setBeat(n => n + 1), 1000)` 每秒触发整棵 `Board` 重渲染；`Station` 没有 `memo`，9 个 SVG（每个约 20 个节点）全部重建。而 `beat` 的值**没有任何地方读取**。
- **修法**：加入"已跑时长"显示后心跳才有意义（见 P2/信息增强）。同时 `Station` 用 `React.memo`，时长文本用独立小组件订阅 beat，避免整树重绘。
- **改动量**：S

### P1-7 `seenRef` 无上界

- **位置**：`client.js:529,609-627`
- **现象**：已通知过的 key 只增不减。长会话下（每天几十条审批）Set 会持续增长。
- **修法**：只保留最近 N 条（如 200），或用 `Map` + 时间戳定期清理。
- **改动量**：XS

### P1-8 `ROSTER` 只有 9 套造型，第 10 个 Bot 会撞脸

- **位置**：`client.js:36-55`（`ROSTER` + `seatOf` 的 hash 兜底）
- **现象**：`ROSTER[hash % ROSTER.length]`。超过 9 个 Bot 时，两个 Bot 会拿到同一套颜色+头饰+桌道具；网格是 `auto-fit minmax(150px)`，会自己往下加行，但"9 工位教室"的隐喻就破了。
- **修法**：造型改成"主色 + 头饰 + 道具"三轴组合生成（9 色 × 4 头饰 × 8 道具 = 288 种），而不是 9 套固定搭配；超过 9 个时网格行数自适应并在头部汇总条显示总数。
- **改动量**：M

---

## 三、P2 工程质量问题

| #    | 位置                              | 问题                                                                                                                      | 建议                                                                                             |
| ---- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P2-1 | `client.js` 全文                  | 767 行单文件，SVG 绘制、状态推导、轮询、拖拽、通知、样式全在一处                                                                                    | 拆成 `scene / station / panel / drawer / poll / style / locale` 七个模块                             |
| P2-2 | `client.js:506-523,542,689,707` | 裸 `localStorage` 四处，key 手工拼                                                                                             | 用 `@deepseek-ai/dsh-client-store` 的 `createSnapshotStore(init, {persist:{name}})`，自带 rehydrate |
| P2-3 | 全文                              | 文案硬编码中文，无 i18n                                                                                                          | `ctx.locale.register(ns, {en, zh})` + `bind(ns)`，符合平台惯例                                        |
| P2-4 | `client.js:25-31,361-415`       | 颜色硬编码，主题 token 只用在外壳                                                                                                    | 教室色板走 `ctx.theme.overrideTokens` 的 light/dark 双值                                               |
| P2-5 | `README.md:3,33-36`             | 文档与实现不符：第 3 行声称"谁给谁派了活、群聊里谁在说话"，但 `client.js` 里 `board.rooms` 出现 **0 次**、`board.works` 只用于 7 秒动画判定（第 634 行），派活列表和群聊从未渲染 | 报告批准后按实际实现重写，或把缺的功能补上                                                                          |
| P2-6 | `tools/smoke.mjs`               | 断言多为"源码里包含某个字符串"（如 `source.includes('SIZE_KEY')`），重构即失效；且依赖固定的 `order:500`                                              | 改为对**构建产物**做行为断言；把 `sceneOf`/`statusOf` 提为纯函数单测                                                |
| P2-7 | 仓库根                             | `preview.png` 2.6MB + `preview-class.png` 116KB 混在源码目录                                                                  | 移到 `docs/` 或用 Git LFS；`package.json` 补 `files` 白名单                                             |

---

## 四、信息架构建议（对照同类项目）

### 调研结论摘要

| 项目                             | 做法                                                                                                | 可借鉴                                                 | 不适用                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| **openclaw-office**（WW-AI-Lab） | 等距投影办公室 + 协作连线；侧栏 5 视图：Token 折线、成本饼图、活跃热力图、子 Agent 关系图、事件时间轴；**WebSocket 事件驱动 + 60s 低频对账**        | "事件驱动 + 低频对账"的混合模型；确定性 SVG 头像（`agentId → 外观`）；状态即动画 | 等距 3D 场景（你的 2D 工位已足够，且 3D 成本高）；5 个图表对一个 560×420 浮窗过载 |
| **agent-trees**（xiezouqu12）    | 卡片一行压满：状态点、`P0-P3` 徽章、进度条、token、USD 成本、role、runtime、`done/total`；**头部单行汇总，明确不放 legend/搜索/filter** | 每张卡片必须回答"它在干什么、花了多少、跑了多久"；成本/时长压到页脚一行；头部只放汇总        | 树形拓扑（DS Bot 是平级 9 人，没有父子层级）                          |
| **dsh-cockpit**（zoe1nan）       | 同类 DSH 看板，带"直接审批、发话、中断"写操作                                                                        | 证明"看板 + 审批"是刚需                                      | 写操作（本插件定位只读，见"明确不做"）                                 |
| **dsh-agent-board**（21hbguo）   | 树形看板 + **停滞自动告警** + SSE 实时推送                                                                      | "停滞自动告警"：超过 N 分钟无变化才提醒，比每次状态变化都弹更有价值                | 树形结构；SSE（DSH 的 `connection` 通道不提供推送到前端的能力）           |

### 推荐的信息层次（三层，不新增第四层）

**第一层：工位卡片（不增加面积，只在名字下面加一行元信息）**

```
[团子 + 显示器 + 状态灯]
数学
调用 Bash · 已跑 4m12s        ← 新增：工具 + 时长
```

- 时长来自 `work.bots[botId].since`（`turns.js:291` 确认存在），**数据已经在手上，一行代码的事**
- 停滞超过 5 分钟时，时长文字变琥珀色（借鉴 dsh-agent-board 的停滞告警，但不用弹窗）
- 审批态时这一行换成 `等你批：rm -rf dist`（来自 `approvals[].detail.text/code`）

**第二层：详情抽屉（点工位打开）**

- 身份：角色（`bots[].role`）、模型（`bots[].model`）
- 当前：状态、已跑时长、当前工具、`said`/`note` 全文
- 卡点：审批的完整命令（`detail.code` 用等宽块显示）+ `reason`；提问的 `options[]` 列表
- 最近：该 Bot 最近一次派活的 `results[].text`
- 底部主按钮「打开聊天 ↗」——**跳会话的能力从"点工位"移到抽屉内**，这是有意的交互变更，因为点工位现在承担"看详情"更高频的需求

**第三层：活动交接列表（面板底部，0-3 行，通常为空）**

```
班主任 → 数学 · 4 项待交 · 12 分钟前
班主任 → 生物 · 1 项待交 · 3 分钟前
```

- 只取 `works` 中 `open.length > 0` 的记录（`handoffs.js:114-116` 的 `held()` 就是这个语义）
- 点一行跳到接收方
- **不做成图**：子 work 在 `closeWork` 时被删除，历史链路必然断裂；本机已存在 3 条 16 小时前 `open:0 results:0` 的僵尸记录，画成图就是一堆死线

**头部汇总条（单行，借鉴 agent-trees）**

`3 忙 · 1 等 · 0 错 · 累计已跑 18m` —— 不放搜索、不放筛选、不放第二个图例。

### 为什么砍掉你原本选的"链路图 + 群聊"

- **群聊**：本机 `rooms: 0`、`group-lines/` 目录不存在、`room.log[]` 无时间字段。0 使用率 + 已知数据缺陷 = 负收益。
- **链路图**：数据会被上游删除，且已有僵尸记录，图会不断重排，视觉噪音大于信息。
- 二者都可以在"真的开始用"之后再加，代码位置已在工程化拆分中预留（`drawer.js` 可扩展 tab）。

---

## 五、工程化路线（报告批准后执行）

### 目录结构

```
src/
  host/index.js        宿主侧：路由 + 快照 + 失败存储
  client/index.js      apply / slots 注册
  client/scene.js      纯函数：sceneOf / statusOf / rankOf（可单测）
  client/station.js    工位 SVG（blob / headGear / deskProp / screen）
  client/panel.js      外壳、拖动、缩放、折叠、头部汇总条
  client/drawer.js     详情抽屉
  client/poll.js       轮询器（含折叠/隐藏降频）
  client/style.js      CSS + 主题 token
  client/locale.js     中/英文案
dist/client.js         构建产物（DSH 加载这个）
```


```

### 构建

- `esbuild` 打包 `src/client/index.js` → IIFE，外面包一层 `window.__ModuleLoader__.load({id:'dsh-bot-board', factory})`
- **`react` / `react-dom` 必须 external**，由 `__ModuleLoader__` 的 `require` 提供，绝不能打进 bundle（会破坏共享实例，导致 hooks 报错）
- `package.json`：`exports['./client'] → ./dist/client.js`，加 `scripts: {build, check, smoke}`

### 用官方能力替换土办法

| 现状 | 替换为 | 收益 |
|---|---|---|
| 裸 `localStorage` ×4 | `createSnapshotStore` | 自动 rehydrate、命名空间、跨版本迁移 |
| 硬编码中文 | `ctx.locale.register/bind` | 中英双语，符合平台惯例 |
| 硬编码色值 | `ctx.theme.overrideTokens` 双值 | 暗色真正可用（P0-2 的根治） |
| `if (!ctx.connection) return` | `ctx.inject(['connection'], ...)` | 服务晚就绪也能挂上（P1-1） |
| 无日志 | `ctx.logger` | 出问题能在 DSH 日志里查到 |

### 测试

- `scene.js` 提为纯函数后直接单测：状态优先级、`waiting` 与 `alert` 分离、失败徽标降级
- `smoke.mjs` 改为对 `dist/client.js` 断言，保留现有 CSS 断言（`step-end`、`reduced-motion` 顺序这些是有价值的回归）
- 新增两条：**"工位顺序不随状态变化"**、**"error 恢复后 ≤1 个轮询周期转绿"**

---

## 六、明确不做

| 不做 | 理由 |
|---|---|
| 群聊面板 | `rooms: 0`、`group-lines/` 不存在、`log[]` 无时间字段；0 使用率 |
| 完整派活链路图 | 子 work 被 `closeWork` 删除导致历史断链；已有 3 条 16h 僵尸记录 |
| 写操作（审批/回话/中断） | 本插件定位只读，写操作涉及权限与误触风险；若需要，另起一个插件（参考 dsh-cockpit 的做法） |

---

## 七、建议的执行顺序

| 批次 | 内容 | 改动量 | 理由 |
|---|---|---|---|
| 第 1 批 | P0-1、P0-2、P0-3、P0-4、P0-5、P0-6、P0-7、P0-8 | S | 全是小改动，但直接决定"看得准不准" |
| 第 2 批 | 工程化拆分 + 构建（P2-1/2/3/4）+ P1-1 | M | 先有骨架，后面加功能才不会继续堆在单文件里 |
| 第 3 批 | 信息增强：时长、审批详情、活动交接列表、详情抽屉 | M | 依赖第 2 批的模块边界 |
| 第 4 批 | P1-2/3/4/5/6/7、P2-5/6/7 | S | 收尾：健壮性、性能、文档、测试 |

---

## 八、验收标准

1. `node tools/smoke.mjs` 全绿（含新增的"顺序稳定"与"错误恢复"断言）
2. 浅色/暗色主题下，工位名与状态文字对比度 ≥ 4.5:1
3. Bot 状态变化时工位位置不重排（截图对比）
4. Bot 从 error 恢复到干活后，≤ 1 个轮询周期（1.5s）转绿
5. 面板折叠时不再 1.5s 轮询（Network 面板确认）
6. 面板空闲时 1s 心跳不重建工位 SVG（React DevTools Profiler 确认）
7. 重启 DSH 后插件正常加载，`POST /api/bot-board` 返回 200 且 `ok:true`

---

## 附：本机数据快照（评审时的真实状态）

| 项 | 值 | 说明 |
|---|---|---|
| bots | 9 | 与 `ROSTER` 恰好一一对应，所以"撞脸"问题还没暴露 |
| bots with segments | 0 | P0-7 属潜伏 bug，尚未踩到 |
| rooms | 0 | 群聊功能 0 使用率 |
| works | 8（其中 1 条 `open:4`） | 派活是活跃功能，**这条支持保留"活动交接列表"** |
| works 僵尸记录 | 3 条（16.4h 前，`open:0 results:0`） | 永远不清理，是"不做链路图"的直接证据 |
| questions | 0 | 提问功能本次未触发 |
| revision | 1050 | 增量轮询的锚点 |
```
