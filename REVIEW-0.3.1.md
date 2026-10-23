# dsh-bot-board 复审（v0.3.1）

复审对象：`dsh-bot-board`，v0.3.1（`src/` 拆分后的当前代码）
对照上游：`ds-bot@0.1.7`（`~/.dsh/profiles/desktop/node_modules/ds-bot/src/host/`）
复审时间：2026-10-20
基线：`REVIEW.md`（针对 v0.2.0 的 23 项）已基本落地，本文件**只报 0.3.1 现存的问题**，不重复旧账。

> **落地状态**：批次 1–5 全部完成（D1–D8、E1–E5、第二节的上游字段、第三节的自适应轮询），见文末「已修」。当前版本 v0.3.4。
> 本文件保留作为改动依据；后续若再复审，请另起一份。

---

## 一句话结论

0.2.0 那批 P0 修得干净——状态优先级、`waiting`/`alert` 拆分、暗色可读、工位不重排、轮询单飞、`ctx.inject` 都真的改对了，而且 `smoke` + `render` 两套检查是行为断言不是字符串断言，这在插件里算罕见的好。

剩下的问题不再是"错得很明显"，而是三类：**三处状态/时间算错（会让人误判）、一批上游已经给了但被丢掉的数据（抽屉本来能说清楚）、以及一处没做完的性能优化（轮询节奏）**。另外这个仓库**没有 git**，4.2k 行 + 已经经历过一次 8 个 P0 的重写，这是最大的过程风险。

`npm run check` 当前全绿，以下问题都不在检查覆盖范围内。

---

## 一、真正的缺陷（建议改）

### D1 `done` 会盖掉 `busy`：Bot 已经在干活了，工位还在画"干完"

- **位置**：`src/client/scene.js:38-45`
- **现象**：`sceneOf()` 的判断顺序是 `alert → waiting → error → done → idle → busy`，`done` 排在 `busy` 前面。所以 `sceneOf('working', true) === 'done'`。
- **触发**：`panel.js:175` 在 `work.open` 从 >0 掉到 0 时给接收方点亮 `waveMap` 7 秒。而"接到交活"和"立刻开始下一轮"往往是同一秒——于是接下来 7 秒里，一个正在跑 `Bash` 的 Bot 显示为「干完」、显示器打勾、手在挥，头部计数也把它算进 `done` 而不是 `busy`。
- **为什么算缺陷**：`scene.js` 文件头第 3-5 行自己写着"失败永远不该压过正在干活"，0.2.0 的 P0-1 就是这个道理。`done` 压过 `busy` 是同一个错误的另一面：该绿的时候青了。
- **改法**（一行）：`if (done && status === 'idle') return 'done'`——只庆祝真的闲下来的人。
- **顺带**：`smoke.mjs` 有 `sceneOf('idle', true) === 'done'`，但**没有** `sceneOf('working', true)` 这一条。补上，这个回归就锁死了。

### D2 新建 Bot 在等你选模型，看板说它"闲着"

- **位置**：`src/client/rows.js:82-141`（`buildRows` 从未读 `bot.waiting`）
- **上游事实**：`channel.js:40` 在 `view().bots[]` 里带出 `...(kickoff ? { waiting: true } : {})`，注释写明"`waiting`: the Bot holds its greeting until the user picks its model"。`roster.js:148-151` 证实：没有 model 时 `bot.kickoff` 挂起，Bot 一句话都不说。
- **后果**：新建一个 Bot 却没选模型，它会永远静音，而看板给的是灰灯「闲着」。这恰好是「等你」最该抓的一类——用户不动手，它永远不动。现在这个面板对"我新建的 Bot 怎么不理我"完全无感。
- **注意命名撞车**：ds-bot 用了两个 `waiting`。`bot.waiting`（等用户选模型）和 `activity[id] === 'waiting'`（等别的 Bot 交活）不是一回事。现在只处理了后者。
- **改法**：`buildRows` 里 `const kickoff = bot.waiting === true`，并入 `statusOf` 的 `alerting`（或单开一个"待设置"态，但六态已经满了，并入 alert 更省事，`describe()` 里给一句「等你选模型」）。
- **附带**：`src/host/index.js:169-175` 的快照只发 `id/name/role/model/sessionId`，`bot.waiting` 在宿主侧就丢了。`view` 在时不影响，但 `board` 兜底路径会缺这个字段，一并补。

### D3 抽屉里的"已跑"是死的

- **位置**：`src/client/drawer.js:42` —— `since ? elapsed(since) : t('drawer.unknown')`
- **现象**：`elapsed()` 不传 `now` 就用 `Date.now()` 求值，而 `Drawer` 没有订阅时钟。工位上的时长每秒跳（`station.js:224-228` 的 `Elapsed` + `useNow`），**点开抽屉之后那个数字就冻在打开的那一刻**，不再动。
- **为什么难受**：抽屉是"盯一个 Bot"的入口。你打开它就是为了看它还要跑多久，结果它不动，你会以为它卡了。
- **改法**：把 `Elapsed` 抽成共用组件（`drawer.js` 里复用 `useNow`），或者给 `Drawer` 加一个 `useNow(Boolean(since))`。

### D4 面板位置恢复不夹边界：窗口变小后可能拖不回来

- **位置**：`src/client/panel.js:52-57`（读 `POS_KEY` 直接 `JSON.parse` 就用）、`256`（`wrapStyle` 直接套 `left/top`）
- **现象**：`size` 恢复时有 `Math.min/max` 夹到 `SIZE_MIN/MAX`（`62-66`），`pos` 没有。拖到右下角再关掉、把窗口从 2560 缩到 1440 再打开——面板落在视口外，`position:fixed` + `left:1800` 就是看不见。没有"重置位置"的入口，只能清 localStorage。
- **同类**：窗口 resize 时也不重新夹，正在显示的面板会跟着跑到屏幕外。
- **改法**：恢复时夹一次（`Math.min(Math.max(6, left), innerWidth - w - 6)` 之类），再挂一个 `resize` 监听做同样的夹取；顺手加个"双击标题栏归位"。

### D5 抽屉和交接行键盘不可达

- **位置**：`src/client/drawer.js:23`（`role="dialog"` 但无 `aria-modal`、无 Escape、无焦点转移）；`src/client/handoffs.js:11-21`（`div` + `onClick`，无 `tabIndex` / `role`）
- **现象**：
  - 工位做对了（`station.js:236-244` 有 `role="button"`、`tabIndex`、Enter/Space），但**打开抽屉后焦点还留在被盖住的那个工位上**，Tab 会继续走面板底下的工位，而不是抽屉里的按钮。
  - 交接列表整行是个不可聚焦的 `div`，键盘用户点不进去。同一个文件里两种标准，不一致。
- **改法**：抽屉挂 `aria-modal="true"` + 打开时 `focus()` 第一个按钮 + `Escape` 关闭；交接行加 `role="button" tabIndex={0}` 和 `onKeyDown`。三处都是十几行。

### D6 报错红灯挂 15 分钟，比"黄灯误报"更容易被忽略

- **位置**：`src/host/index.js:17`（`FAILURE_TTL = 15 * 60 * 1000`）、`src/client/rows.js:104-106`（只有"新的一轮开始"才会清掉旧 failure）
- **现象**：一个 Bot 报错后彻底安静下来（没有新 turn），`since` 拿不到，`isWorking` 为 false → failure 不算 stale → 工位红 15 分钟。
- **为什么值得改**：README 花了一整段论证"黄灯误报会让你开始忽略它"，红灯笼挂 15 分钟是同一个病。而且通知已经弹过一次了，红灯继续亮只是在教你别看。真正需要红的是"现在卡住"，不是"十分钟前卡过"。
- **改法**：加一条衰减——无活动超过 2~3 分钟后降级为 `idle` + 右上角 `!` 徽标（消息留在抽屉里）。TTL 只用来回收内存，不用来决定灯色。

### D7 抽屉的"最近一次交活结果"可能张冠李戴

- **位置**：`src/host/index.js:160`（`last: text(results.at(-1)?.text)`）、`src/client/rows.js:136`（`works.find(item => item.toId === bot.id)?.last`）
- **现象**：`work.results[]` 是**整条派活**的结果列表，每条形如 `{ name, text }`（`handoffs.js:80-86` 的 `answerText` 就是按 `result.name` 拼的）。宿主只取了最后一条，抽屉却把它当作"这个 Bot 交回来的结果"。一次 `Bot1 → Bot2` 派 4 项，最后一条可能是 Bot4 的。
- **改法**：宿主多发一点——`results: results.slice(-6).map(r => ({ name: text(r.name), text: text(r.text).slice(0,240) }))`，抽屉按 `row.bot.name` 挑自己那条，挑不到再退回最后一条。数据本来就在手上。

### D8 `WORKS_MAX` 截断会吃掉更早的待交

- **位置**：`src/host/index.js:148-164` —— 先 `sort(by at desc)` 再 `.slice(0, 24)`，`open > 0` 的过滤在客户端（`handoffs.js:7`）
- **现象**：活跃的派活超过 24 条时，一条**还开着**但时间较早的交接会被截掉，"正在交接"里就看不见了。而它恰恰是最该看的（挂了一天没人接）。
- **改法**：先按 `open > 0` 排序（`open > 0` 优先，再按 `at` desc）再截断；或者干脆不截断 open 的那些，只对 `open === 0` 的做上限。

---

## 二、上游已经给了、但被丢掉的数据

这些不是 bug，是"信息明明在手上却没显示"，改起来都是几行，收益直接体现在抽屉里。

| 字段 | 上游出处 | 现在 | 建议 |
|---|---|---|---|
| `questions[].detail` | `tools.js:522,544`（"one-line context shown under the question"） | 只渲染 `question`，`detail` 丢弃 | 抽屉里 `question` 下面加一行灰字。歧义问题全靠这一行 |
| `questions[].multiSelect` | `tools.js:545` | 丢弃 | 为 true 时选项前缀别用 `1. 2.`（暗示单选），改成 `☐`/`☑` 或加一句"可多选" |
| `questions[].allowCustom` | `tools.js:546` | 丢弃 | 为 true 时末尾加一行"也可以自己说"，否则用户不知道有这个口子 |
| `work.bots[botId].roomId` | `turns.js:291` | 丢弃 | 这一轮其实发生在群聊里时，工位/抽屉应该标一句"在群里"，否则你会奇怪它为什么在跟别人说话 |
| `work.results[].name` | `handoffs.js:80-86` | 只取最后一条 | 见 D7 |
| `bot.waiting` | `channel.js:40` | 丢弃 | 见 D2 |

`doingOf()` 返回的 `tool / said / note / target` 四个字段现在用得是对的（`rows.js:115-117` 的 `tool → said → note → target` 降级链），这块不用动。

---

## 三、性能：1.5 秒是常量，但它应该是状态的函数

这是我认为**剩下最值钱的一处改动**。

- **位置**：`src/client/const.js:2`（`POLL_MS = 1500`）、`pollLoop.js:10-14`
- **现状**：折叠/隐藏降到 30s，失败指数退避，单飞也修了——该做的都做了。但**展开状态下无论有没有人在干活，都是 1.5 秒**。
- **代价**：`channel.js:106-115` 的 `state` 分支在 `switch` 之前就 `await rt.refresh()`，进了分支还有 `bootstrap + catalog + loadSecrets`。也就是说**哪怕所有 Bot 都闲着、没有任何审批，你每分钟仍然让上游跑 40 次这几件事**。`unchanged` 只省了响应体积，没省这些。
- **改法**：`createPollLoop` 已经接受 `delayFor` 了，只需让 `poll.js` 传入一个读当前快照的函数：
  ```
  有 busy/alert/waiting  → 1500
  有 done/刚交接         → 1500（这 7 秒要跟住）
  全 idle 且无审批        → 6000
  折叠 / 隐藏             → 30000
  ```
  改完之后，白天真正在派活时体验一模一样，晚上挂机时的上游负载降一个数量级。
- **顺手**：加 ±10% 抖动。DS Bot 自己的前端也在轮这个接口，两边定频会锁相，抖动能把尖峰抹平。

另外一个小的：`panel.js:257` 的 `tone` 和 `counts` 是每次轮询重算的，没问题；但 `longest`（`panel.js:120-125`）依赖 `rows` 变化才更新，折叠再展开后最多 1.5 秒是旧值。可以忽略，或者挂到 `useNow` 上。

---

## 四、工程与文档

### E1 没有版本控制（最重要）

`git log` 直接 `exit 128`——这个目录**不是 git 仓库**。现场证据：一个手工复制出来的 `.backup-v0.2.0/`（6 个文件，18:08），一个 `package.jsond8wmag`（npm 写到一半留下的临时文件，内容是 v0.3.0 的 `package.json`）。

4.2k 行、刚经历过一次 8 个 P0 的重写、还在持续迭代——没有 diff、没有历史、没法 bisect。**建议第一件事就是 `git init`**，把 `.backup-v0.2.0/`、`package.jsond8wmag`、`preview*.png` 挡在 `.gitignore` 里（或者 preview 挪到 `docs/`）。

### E2 杂项清理

- `package.jsond8wmag` —— 删（v0.3.0 的残留，和 `package.json` 只差 version 和 scripts）
- `.backup-v0.2.0/` —— 有了 git 之后删
- `preview.png` 2.6MB + `preview-class.png` 116KB —— 挪 `docs/` 或 Git LFS

### E3 README 有两处明显的手滑

- **第 24 行和第 26 行是同一段话，逐字重复**（"状态不只靠颜色：卡住是菱形…"）
- **第 140-141 行把 `pollLoop.js` 列了两遍**（一行带"（钩子）"后缀一行不带）

### E4 死字段

- `rows.js:130` 的 `sinceKnown` 只在 `station.js:289` 的 memo 比较里出现，**从来没被渲染**。要么用起来（未知时长时显示 `—` 而不是空白，现在 `Elapsed` 返回 null，那一格是空的），要么删掉。
- `rows.js:75-76` 的 `names` / `patrons` 只用于拼 `action`，拼完就没人读了，可以就地不返回。

### E5 两处健壮性小尾巴

- `host/index.js:47` 的淘汰是 `failures.keys().next().value`（**插入序**）。`Map` 里重复 set 不改变位置，所以一个反复失败的 Bot 会保持最早的位置、先被淘汰，而它恰恰最该留着。改成按 `at` 排序淘汰。
- `scene.js:28-31`：`activity` 是未知字符串时原样返回，`sceneOf` 落到 `busy`，`STATUS_KEY[status]` 找不到就把原始英文 token 打到工位上（`station.js:233`）。上游加一个活动类型就会露出来。建议 `STATUS_KEY` 兜底到 `status.working`。

---

## 五、建议动手顺序

| 批次 | 内容 | 量 | 理由 |
|---|---|---|---|
| 1 | `git init` + 清杂项（E1/E2） | XS | 后面所有改动都要能回滚 |
| 2 | D1、D3、D4 | XS | 三处"看得见的错"，各一两行 |
| 3 | D2、D7、D8 + 第二节那批字段 | S | 抽屉和工位的信息密度一次性补齐 |
| 4 | 第三节的自适应轮询 | S | 结构已经就位，改一个 `delayFor` |
| 5 | D5 无障碍、D6 红灯衰减、E3/E4/E5 | S | 收尾 |

批次 2 做完，面板"看得准"；批次 3 做完，面板"说得清"；批次 4 做完，挂机不烧上游。

---

## 六、已修

### v0.3.2（批次 1 + 2）

| 项 | 改动 | 位置 |
|---|---|---|
| E1 | `git init` + 初始提交（39 个文件），之后每一步都可 diff / 回滚 | 仓库根 |
| E2 | 删 `package.jsond8wmag`、`.backup-v0.2.0/`；`preview*.png` 挪进 `docs/`（三者都在初始提交里） | 仓库根 |
| D1 | `sceneOf` 里 `done` 只在 `status === 'idle'` 时生效，交接落地同一秒接了下一轮的 Bot 不再被画成干完 | `scene.js:38-49` |
| D3 | 把每秒跳动的时长节点抽成 `elapsed.js`，工位和抽屉共用；抽屉的「已跑」不再冻在打开那一刻 | `elapsed.js`（新）、`station.js`、`drawer.js:42` |
| D4 | 新增 `clampPos()`：恢复位置时夹回视口、`window.resize` 时重新夹、拖拽缩放结束时也夹一次 | `panel.js:44-62,92-99,262-273` |
| E3 | README 删掉逐字重复的段落、`pollLoop.js` 不再列两遍、开发文件清单补齐缺的 5 个模块 | `README.md` |

### v0.3.3（批次 3 + 4）

| 项 | 改动 | 位置 |
|---|---|---|
| D2 | `bot.waiting`（`state.json` 里是 `kickoff`）接入 `alerting`，新建 Bot 等你选模型时亮黄灯、写明「等你选模型」；宿主快照也补了这个字段 | `rows.js:110-116,34-92`、`host/index.js:175-180` |
| D7 | `work.results[]` 带 `name` 下发（最多 6 条），抽屉按 Bot 名挑自己那条，挑不到才退回 `last` | `host/index.js:148-172`、`rows.js:138-141` |
| D8 | works 先按 `open > 0` 分区再截断，老但没交完的活不会被新的已结束记录挤掉 | `host/index.js:173-178` |
| 上游字段 | `question.detail`（说明行）、`multiSelect`（编号换 `☐`）、`allowCustom`（「也可以自己说」）、`work.bots[].roomId`（抽屉「在哪」） | `rows.js:47-64`、`drawer.js:45,56-72` |
| 第三节 | 轮询节奏改为状态的函数：有活在跑 1.5s，全队闲着 90s 后 6s，`pollLoop` 支持函数式 `base`，加 ±10% 抖动 | `cadence.js`（新）、`pollLoop.js:25-32`、`poll.js:8-14,65-95` |

断言从 156 条增到 **193 条**，全部绿：

- `sceneOf('working', true) === 'busy'` / `thinking`
- `clampPos` 四边界 + 空值 + 脏值
- 抽屉会订阅时钟（`Drawer` 自身没有 effect，所以"排进了一个 effect"就证明计时器接上了）
- 宿主快照：`waiting` 字段、`results[].name`、`open` 优先于 `at` 排序（`w1,w3,w4,w2`）
- `teamActive` 七例、`liveCadence` 五例、函数式 `base` 每次 arm 都重读

### v0.3.4（批次 5）

| 项 | 改动 | 位置 |
|---|---|---|
| D5 | 抽屉加 `aria-modal`；打开时焦点移入、Tab 在抽屉内循环、Esc 关闭、关闭后焦点回到原工位。交接行补 `role="button"` / `tabIndex` / Enter·Space。所有控件补 `:focus-visible` 焦点环 | `panel.js:110-151`、`drawer.js:23-30`、`handoffs.js:11-29`、`style.js:43-47` |
| D6 | 报错红灯只表示「现在」：安静超过 3 分钟降级成 `idle` + `!` 徽标，消息仍在行上和抽屉里 | `const.js:12-17`、`rows.js:99-115` |
| E4 | 删掉 `sinceKnown`（只被 memo 比较、从未渲染） | `rows.js`、`station.js:289` |
| E5 | 失败表按 `at` 淘汰而不是 `Map` 插入序；字典里没有的 activity 兜底成「干活中」，不再把原始 token 打到工位上 | `host/index.js:46-58`、`const.js:36-53`、`station.js`、`drawer.js` |

---

## 附：这次复审的验证方式

- `npm run check`（build + smoke + render）—— **全绿**，46 条 smoke + 60 条 render 断言
- 逐条核对 `ds-bot@0.1.7` 的实际字段：`channel.js` 的 `view()/live()/handle()`、`turns.js` 的 `activityView/workView/doingOf`、`handoffs.js` 的 `waitingView/answerText`、`approvals.js` 的 entry 结构、`tools.js` 的 question 结构、`roster.js` 的 kickoff 语义
- 结论：**数据契约这一层是对的**，`activity` 的五种值、`waiting` 的三个子字段、`approvals[].id/botId`、`questions` 按 session 存、`unchanged` 只回 `live()`——看板全部处理正确。上一版报的 `room` 查错表、切段丢报错、`locale` 副作用都没复发。
