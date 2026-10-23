# AUDIT-CONTRACT — 代码对 DS Bot 数据结构的假设 vs 现实

审查对象：`dsh-bot-board` v0.4.2（HEAD `bdd2e6d`）
数据来源：`~/.dsh/bot/state.json`（643 KB，2026-10-22 21:52 写入，revision 1355）
上游真源：`~/.dsh/profiles/desktop/node_modules/ds-bot` **v0.2.0**（`src/host/{handoffs,channel,store,turns,tools,roster,approvals}.js`）
方法：读真实数据 + 逐条比对上游客端写入点，不做任何源码改动。宿主快照逻辑用 `/tmp/sim-host.mjs` 按 `src/host/index.js` 原样复算，喂真实 `state.json` 跑通。

---

## 1. 真实数据摘要

### 1.1 顶层

| 键 | 真实类型 | 备注 |
|---|---|---|
| `version` | number `1` | |
| `revision` | number `1355` | |
| `workspaceId` | string uuid | |
| `mainBotIds` | array[1] | 只存 `session-<第一段 id>…`（Chief） |
| **`bots`** | **object（映射，非数组）** | 9 个键，**键 === `bot.id`**（已全量校验 `true`） |
| **`works`** | **object（映射，非数组）** | 3 个键 = `exchangeId` uuid |
| **`rooms`** | **object，空 `{}`** | 群聊从未使用过 |
| `questions` | object，空 | 按 session id 键 |
| `agents` | object，空 | |
| `exchangeTurns` | object[9] | 键 = session id，值 = turn number |
| `exchanges` | array[365] | 未使用 |
| `capabilities` | `{ items: [...] }` | |
| `connectors` | `{ github: {login, connectedAt} }` | |
| `prefs` | `{ motion: 'quiet' }` | |

### 1.2 `bots[<botId>]`

固定字段：`id:string`、`name:string`、`role:string`（可为 `""`）、`model:string`、`instructions:string`、`createdAt:number`、`createdBy:null|string`、`capabilities:array`、`appliedModel:string`、`color:string`、`avatar:object`。

**可选字段（只在特定生命周期出现）**：

| 字段 | 出现条件 | 本机实测 |
|---|---|---|
| `sessionId:string` | **仅当该 Bot 切过分段** | 9 个里只有 1 个（Chief） |
| `segments:array<{sessionId, endedAt, tokens, fallback}>` | 同上，只存**已结束**分段 | 9 个里只有 1 个，长度 1 |
| `pinned:boolean` | 用户置顶 | 1 个 |

Chief 的真实形态（关键，用于切段验证）：

```
id        = session-<第一段 id>…   ← 第一段会话 id，永不改变
sessionId = session-<当前分段 id>…   ← 当前分段（与 id 不同！）
segments  = [{ sessionId: session-<第一段 id>…, endedAt: 1792501275444, … }]
```

即 `segments[0].sessionId === bot.id`，`bot.sessionId !== bot.id`。上游 `store.js:345` `chatOf = botId => botOf(botId)?.sessionId ?? botId`，`store.js:350-358` 的 `chatOwners/pastOwners` 与之一致。

### 1.3 `works[<exchangeId>]`

本机 3 条，字段完全一致：

```
{ from: "session-<发送方 id>…", to: "session-<接收方 id>…", open: [], results: [], at: 1792431682064 }
```

| 字段 | 真实类型 | 语义（上游 `handoffs.js`） |
|---|---|---|
| `from` | string，**Bot id** | `openWork(from: sender.id)`，`tools.js:194` 的 `sender` 来自 `botOf(selfOf(...))`，恒为 Bot id |
| `to` | string，**Bot id**；**群聊派活时为 `undefined`（键不存在）** | `openWork(sub, { from: self, room: room.id })`，`tools.js:542` **不传 `to`** |
| **`open`** | **array<string>，子 work id 列表** | `handoffs.js:32-33` `above.open.push(id)`：收件人**自己再转包出去**的子 work |
| `results` | array<{id, name, text, length?}> | 子 work 交回的结果，`name` 是**子 Bot 的名字** |
| `at` | number（ms） | 创建时刻，恒存在 |
| `room` / `parent` / `fromRoom` / `held` | 可选 | `room` = **房间 id**；`parent` = 上级 work id |

**没有 `fromId` / `toId` 字段**——那两个是宿主快照自己派生的。

### 1.4 三条记录的真实状态

| work | from → to | open | results | at | 年龄 |
|---|---|---|---|---|---|
| `53329ec7` | Bot1 → Researcher | `[]` | `[]` | 1792431560756 | 2.9 天 |
| `27297aaf` | Bot1 → Bot6 | `[]` | `[]` | 1792431613115 | 2.9 天 |
| `cce1c859` | Bot1 → Bot2 | `[]` | `[]` | 1792431682064 | 2.9 天 |

`closeWork` 会 `delete works()[id]`（`handoffs.js:42`），所以**记录存在 === 还没交回**。这 3 条是 3 天前派出、至今未回收的派活。

---

## 2. 假设 vs 现实对照表

| 代码位置 | 代码的假设 | 真实情况 | 判定 |
|---|---|---|---|
| `host/index.js:148,158` | `state.bots` / `state.works` 用 `Object.values` / `Object.entries` 取 | 确实是映射（不是数组） | **成立** |
| `host/index.js:168` | `work.open` 可能是数组，`Array.isArray` 后取 `length` | 恒为数组，`length` 合法 | **成立** |
| `host/index.js:168` → 客户端 | `open.length` = 「还欠几项」 | `open` 是**收件人的下游子 work**，`length` 与「欠 `from` 几项」无关 | **错误**（见 D1） |
| `host/index.js:168` | `open` 里的 id 都还存在 | `closeWork` **不从父 `open` 移除**子 id（只有 `taken()` 移除，而 `taken` 仅群聊 report 路径调用，`turns.js:406`） | **错误**（见 D2） |
| `host/index.js:150,163-166` | `works.from/to` 是 Bot id 或 session id，`botOf` 能还原 | `from` 恒为 Bot id；`to` 群聊时**缺失** | 部分成立（见 D3） |
| `host/index.js:156` `botOf` | `owners` 覆盖 Bot id / 当前 sessionId / 历史 segments / 房间 session | 与上游 `store.js:346-359` 等价（多收了一条 `bot.id → bot.id`，无害） | **成立** |
| `host/index.js:99-121` | `room.sessions` 是 `{botId: sessionId}`，`room.segments` 是 `{botId: [...]}` | 与 `store.js:354-359` 一致 | **成立**（本机 `rooms` 为空，未实测） |
| `host/index.js:199` | `bot.kickoff !== undefined` 等价于 `kickoff` 为真 | `kickoff` 只会是对象或不存在（`roster.js:151,183-184`） | 成立但脆弱 |
| `host/index.js:204` | `room.name` 存在 | 存在；缺失时回落房间 id | 成立 |
| `layers.js:67,88` | `Number(work.open) > 0` 判断「有未交」 | 原始 `open` 是数组：`Number([])===0`、`Number(['a'])===NaN` | **错误**（见 D7） |
| `layers.js:70-71` | `work.fromId ?? work.from` 二选一 | 宿主两者都给；原始数据只有 `from`（是 id 不是名字） | 成立 |
| `layers.js:86-87` | `work.from` 是**名字** | 宿主已换成名字，原始数据是 id | 成立（仅因宿主预处理） |
| `layers.js:37,45` | `since`/`failureAt` 是「已持续多久」 | 两者都是**绝对起始时刻**（ms epoch） | **错误**（见 D5） |
| `layers.js:81` | 同一 `from→to` 只有一条 open work | 同一对可以有多条并发 work（每次 `message_bot` 一个 `exchangeId`） | 存疑（`byPair` 后写覆盖，只影响 `mutual` 标记，不崩） |
| `rows.js:147` | `works.find(toId === bot.id)` 的 `results` 属于该 Bot | 该 work 的 `results` 是**该 Bot 的下游**交回的，`name` 不可能是该 Bot | **错误**（见 D4） |
| `rows.js:163` | `failure.at` 是 number | 宿主 `failures.set` 写入 `Date.now()` | 成立 |
| `rows.js:27` | `questions` 按 `sessionId`/`id`/`parts` 键 | 上游 `state.questions` 按 session id 键，`view.bots` 带 `parts` | 成立 |
| `rows.js:109` | `waiting[bot.id]` | `waitingView()` 的键是 `work.to` = Bot id | 成立 |
| `rows.js:72` | `wait.rooms[]` 是房间 id | `child.room` 是房间 id（`handoffs.js:126`） | 成立 |
| `handoffs.js:51,73` | `edge.toId` 能查到行 | 群聊 work / 已删 Bot 的 `toId` 查不到 | **错误**（见 D3、D6） |
| `rows.js:11` `seatOrder` | `ROSTER.name` 与真实 Bot 名一致 | 9 个名字逐一对应，名册顺序与真实 Bot 名完全对齐 | **成立** |
| 全链路 | `bots` 是数组 | `state.json` 里是映射；客户端拿的是 `api/bot` 的 `view().bots`（`channel.js:41` 已 `Object.values`） | 成立（容易误读，见 §4） |

---

## 3. 缺陷清单

### D1（P0）`open` 被当成「欠 `from` 的条数」，方向与语义都反了

- **位置**：`src/host/index.js:168`、`src/host/index.js:183-185`、`src/client/layers.js:67`、`src/client/layers.js:88`、`src/client/panel.js:230`、`src/client/panel.js:285`、`src/client/panel.js:315-317`
- **假设**：`works[from→to].open` 是「`to` 还欠 `from` 的项数」，`open > 0` 才叫「在交接」。
- **现实**：`open` 是**收件人 `to` 自己再转包出去的子 work id 列表**。
  - `handoffs.js:32-33`：`openWork(id, {parent})` 时 `above.open.push(id)`，`above` 是 `works[parent]`，即「A 派给 B」那条记录。
  - `handoffs.js:114-128`：上游自己的 `held()` 用 `work.open.map(id => works[id])` 得到 `out`，再把 `out` 记成 **`work.to` 正在等的人**（`view[work.to].bots`）。
  - 结论：`open.length` = 「B 又派给了几个人」，不是「B 欠 A 几项」。
- **触发条件**：一直触发，无需特殊操作。
- **后果**（本机可复现）：
  - 3 条 2.9 天未回的工作，`open` 全为 `[]` → `openWorks` 为空 → `Handoffs` 返回 `null`，**交接表完全不渲染**；头部 `openHandoffs = 0`，显示「0 项在交接」。
  - 即「A 派给 B、B 还没交」这个看板最该显示的事实，**永远不显示**；只有 B 再往下转包时才会冒出一行，而那行的数字表示的是 B 的下游数量。
  - `showRun`（`panel.js:230`）同样依赖 `open > 0`，全员空闲时整条「在动」带会因未交工作而隐藏——注释里写的「open debts with no owner at work are still worth showing」实际不成立。
- **修法**：把「未交」定义为**记录存在**（`works` 里还在就是没交，`closeWork` 会删），即 `openHandoffs = listed.length`；`topologyOf` 的过滤条件从 `open > 0` 改为不过滤（或 `!work.closed`）。`open` 若要保留，只能用于「该收件人还在等下游」，并且 UI 文案要改成「等 N 处回话」而不是「N 项待交」。

### D2（P0）`open.length` 会把已删除的子 work 算进去，且永不自愈

- **位置**：`src/host/index.js:168`（`Array.isArray(work.open) ? work.open.length : 0`）
- **假设**：`open` 里每个 id 都还对应一条现存 work。
- **现实**：`closeWork`（`handoffs.js:39-53`）删除子 work 时**没有**把子 id 从 `parent.open` 里移除；唯一移除入口是 `taken(workId, id)`（`handoffs.js:63-68`），而 `takenWork` 只在 `turns.js:406` 被调用——条件是 `source.role === 'report' && source.replyTo !== undefined`，即**只有群聊 report_back 路径**。
  - 上游自己对此是防御的：`held()` 里 `.filter(Boolean)`，`out.length === 0` 时 `continue`（`handoffs.js:116,124`）。宿主没有这层过滤。
- **触发条件**：A 派给 B，B 派给 C，C 交回。从 C 交回到 B 结束本轮之间，`A→B.open` 一直挂着已删除的 C 的 work id。
- **后果**：`open` 只增不减 → 交接表永久显示一条「N 项待交」的幽灵边；若 B 本轮异常结束/被杀，这条幽灵边**永久留在 state.json**（本机那 3 条 2.9 天的记录就是这类残留）。同时 `done`（`results.length`）与 `open` 会互相矛盾（已交回却仍算未交）。
- **修法**：宿主侧改成 `work.open.filter(id => state.works?.[id] !== undefined).length`，与上游 `held()` 的 `out` 口径对齐；顺手把 D1 一起改。

### D3（P1）群聊派活没有 `to`：交接表出现 `→ ？` + 假的「未开始」标记 + 点击无反应

- **位置**：`src/host/index.js:164-166`（`toId: work.to ? … : null` / `to: … ?? work.to ?? ''`）、`src/client/layers.js:71,87`、`src/client/handoffs.js:51,73,76`
- **假设**：每条 work 都有 `from` 和 `to` 两个 Bot。
- **现实**：`tools.js:542` `rt.openWork(sub, { from: self, room: room.id, parent: work })` —— **只有 `from` 和 `room`，没有 `to`**。这是「在群里喊人回话」的子 work。
- **触发条件**：任何 Bot 用 `post_to_group` + `report_back` 且自己正欠着别人的活。
- **后果**：
  - 宿主产出 `toId: null`、`to: ''`；`topologyOf` 生成 `to: ''` 的边 → 渲染成 `→ ？`。
  - `handoffs.js:51` `sceneOf(null)` → `rows.find(bot.id === null)` → `undefined` → `blockedOf(undefined)` 返回 `'idle'` → 打上「未开始」标记。对一个正在群里等回复的工作说「未开始」是反向误导。
  - `onPick`（`panel.js:627-630`）`rows.find(row.bot.id === edge.toId)` 找不到 → **点不动，键盘 Enter 也没反应**，违反 `handoffs.js:55-67` 自己写的键盘可达承诺。
- **修法**：`work.room` 存在时，`toId` 用房间 id、`to` 用 `群 <name>`（宿主已有 `rooms` 名字表，`index.js:204`），`onPick` 分支到房间而不是 Bot 抽屉；`blockedOf` 对房间边返回 `'false'` 而不是 `'idle'`。

### D4（P2）`lastResult` 取错了对象，注释声称的「优先取点名自己的那条」永远不成立

- **位置**：`src/client/rows.js:147-148`
- **假设**：`works.find(item => item.toId === bot.id)` 拿到的 work 里，`results` 包含该 Bot 自己交回的那条。
- **现实**：`results` 是**该 work 的收件人（= 这个 Bot）的下游**交回来的（`handoffs.js:47` `above.results.push({ id, name, text })`，`name` 是子 Bot 名）。所以 `item.name === bot.name` 恒不成立，`own` 恒为 `undefined`。
- **后果**：`lastResult` 恒等于 `handed.last`，即「谁最后交的」，正好是注释（`rows.js:144-146`）明确说要避免的情况——抽屉里可能显示别人的结果文本。
- **修法**：要找「这个 Bot 交回的东西」，得去**它的父 work** 的 `results` 里按 `name === bot.name` 找：`works.flatMap(w => w.results ?? []).filter(r => r.name === bot.name).at(-1)`。

### D5（P1）`attentionOf` 把「起始时刻」当「已持续时长」，排序方向与注释相反

- **位置**：`src/client/layers.js:37`（`waitKey`）、`src/client/layers.js:43-46`（`waitKey(b) - waitKey(a)`）
- **假设**：`since` / `failureAt` 越大表示等得越久。
- **现实**：两者都是**绝对时间戳**。`rows.js:111` `since = work.since`（上游 `workView` 的 `entry.since`，`turns.js:291`）；`rows.js:163` `failureAt = failure.at`（`approvals`/`failures` 里的 `Date.now()`）。`Elapsed since={row.since}` 也是按起始时刻算的。
- **后果**：降序排列 = **最新发生的排最前**，而注释与 `handoffs.js` 的设计意图是「跑得最久的排最前」。所以「需要你」列表在 ≥2 条同类时，把刚出错的顶到最上面，把已经卡了半小时的压到下面——恰好把最该处理的藏起来。
- **附带**：`tools/smoke.mjs:245-254` 用 `'daibe'` 把「降序」写成了断言，注释却写 `longest first`，测试把 bug 固化成了规格。
- **修法**：`return waitKey(a) - waitKey(b)`（升序 = 最早开始在前），或把 `waitKey` 改成 `now - since` 的时长再降序；同时改 `smoke.mjs:246` 的期望串与 `:252` 的比较方向。
- **附加**：审批/提问没有 `since`（`workView` 只收正在跑 turn 的 Bot），`failureAt` 也为 0，于是所有 alert 的 `waitKey` 都是 0，稳定排序退化成花名册顺序，「最久优先」对 alert 完全不生效。上游 `approvals.js:29` 有 `at: Date.now()`，`rows.js` 没接。

### D6（P2）已删除 Bot 的 `to` 会退化成裸 session id

- **位置**：`src/host/index.js:150`（`nameOf` 返回 `null`）、`src/host/index.js:165-166`（`?? work.from ?? ''` 回落原始 id）
- **假设**：`botOf(work.to)` 一定能映射到一个现存 Bot。
- **现实**：`handoffs.js:133-137` `forgetBot` 只 `dropWork` 掉 `from === botId` 的记录，**`to === botId` 的记录保留**（作为「等待中」上报）。删 Bot 后，这些记录的 `to` 指向一个不存在的 Bot。
- **触发条件**：删除一个正欠着别人活的 Bot（非 Main Bot）。
- **后果**：`botOf` 返回原值 → `nameOf` 返回 `null` → 回落 `work.to`，交接表上出现 `session-<id>-<分段>…` 这种裸 id 的幽灵边——正是 v0.3.x 踩过的那个坑；`toId` 同样查不到行，不可点、标「未开始」。
- **修法**：`nameOf` 返回 `null` 时不要回落原始 id，标成「已离开」并（或）在 `listed` 阶段过滤掉 `owners` 里查不到的 id。

### D7（P3）`topologyOf` 对原始 `open` 形状零兼容，喂错数据会静默空表

- **位置**：`src/client/layers.js:67,88`
- **假设**：`work.open` 是数字。
- **现实**：`state.json` 原始值恒为数组。`Number([]) === 0`、`Number(['a']) === NaN`，两者都 `> 0` 为假 → 全部被过滤 → 返回 `[]`，不报错、不告警。
- **触发条件**：任何直接把 `state.json` 的 `works` 喂给 `topologyOf` 的调用（未来的调试面板、把预览脚本改成读真实数据、或有人「简化」掉宿主的扁平化）。
- **后果**：交接表静默消失，且没有任何日志能定位。
- **修法**：`const n = Array.isArray(work.open) ? work.open.length : Number(work.open) || 0`，或干脆在 `topologyOf` 入口断言形状。

### D8（P3）`bot.kickoff !== undefined` 与上游的真值判断不等价

- **位置**：`src/host/index.js:199`
- **假设**：`kickoff` 存在即「等你选模型」。
- **现实**：上游用 `...(kickoff ? { waiting: true } : {})`（`channel.js:42`）——**真值**判断。目前 `roster.js` 只会写对象或删除键，两者等价；但若将来写入 `kickoff: false` 或 `null`，看板会把一个正常 Bot 永久标成「待设置」。
- **修法**：`waiting: Boolean(bot.kickoff)`。

---

## 4. 我验证过、确认成立的路径（没有编造问题）

- **切段（session 分段）**：`topologyOf` / `attentionOf` / `buildRows` 全部以 `bot.id` 为键；`work.from/to` 恒为 Bot id（`tools.js:194` 的 `sender.id`、`target.id`），不随分段变化。`host.ownersOf` 同时收了 `bot.id`、`bot.sessionId`、`bot.segments[].sessionId`、`room.sessions`、`room.segments`，与上游 `store.js:346-359` 等价。用 Chief（唯一切过段的 Bot，`id ≠ sessionId`）实测：`owners` 三条路径都映射回 Chief，`works` 归属正确。**v0.3.x 的 `session-xxxx` 显示问题在这条链路上已修好**——除 D6（Bot 被删）这一种新触发方式。
- **`bots` 是映射而非数组**：`host/index.js:148` 用 `Object.values`，客户端用的是 `api/bot` 的 `view().bots`（`channel.js:41` 已 `Object.values`），两边都不会拿到裸映射。这条假设成立，但 README/brief 里写 `bots[]` 容易误导后来者。
- **`works` 键 === `exchangeId`，`bot.id` === `bots` 键**：全量校验通过。
- **`at` 缺失**：不存在。`openWork` 恒写 `at`（`handoffs.js:32`）。
- **`rooms` / `questions` 为空**：群聊与提问的真实字段（`room.sessions`、`room.segments`、`question.detail/options/multiSelect`）本机**没有数据可对照**，只能按上游源码判断，已在对照表中标注「成立（未实测）」。
- **`ROSTER` 与真实 Bot 名**：9 个逐一对应，`seatOrder` 不会退化成按 id 排。
- **`seatOrder` 之外的稳定排序**：`rows.js:173` 以 `bot.id` 兜底，同一 `name` 重复时不会抖动。

---

## 5. 一句话总结

最要命的是 D1+D2：`works[].open` 被当成了「欠账计数」，而它实际是「收件人的下游派活列表」——于是**看板现在正对着 3 笔 2.9 天未回收的派活显示「0 项在交接」**，并且这个计数还会因为上游不清理悬挂 id 而永久虚高。D5 是同一类错误的另一个实例：把时间戳当成时长，排序方向反了，测试还把它固化成了规格。
