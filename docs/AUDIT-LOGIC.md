# 纯函数对抗式审查 · v0.4.2

**审查对象**：`src/client/layers.js`（`attentionOf` / `topologyOf` / `idleLine`）、`src/client/rows.js`（`buildRows`）
**基线**：`bdd2e6d`（v0.4.2），Node v22.22.2，darwin arm64
**方法**：裸 Node import 真实模块（`layers.js` 无 React 依赖；`rows.js` 只拉 `scene/const/format/locale`，同样无 React），用 `/tmp/bb-fuzz/` 下的 6 个脚本灌极端输入。**未改动任何源码。**
**判定口径**：
- `崩溃` = 抛异常
- `错值` = 返回了 NaN / Infinity / 负数 / 字符串 / 违反自述不变量
- `未定义` = 行为依赖规范细节或上游未承诺的约定
- `OK` = 正确

---

## 0. 结论摘要

| 级别 | 数量 | 一句话 |
|---|---|---|
| **P1** | 1 | `idleLine` 的宽度预算没算 `padding` 和 `+N` chip，最小面板宽度下**名字被静默裁掉、`+N` 自己也被裁** |
| **P2** | 3 | `max < 0` 时 `attentionOf` 违反 `items+overflow===n`；`max=NaN` 时 `overflow=NaN`；`bots` 缺 `id` 时 9 行 key 全 `undefined` |
| **P3** | 4 | 两条自环被误标 `mutual`；`waiting` 灯配「报错」文案；`lastResult` 依赖数组顺序；`null` 参数绕过默认值 |
| **P4** | 5 | 重复 `edge.id`、`Infinity`/`0.5` 泄漏到「共 N 项」、`idleLine` O(n²)、`failureAt` 字符串泄漏、非数组入参 throw |

**最严重的一条**（P1）：`idleLine` 声称「溢出降级成 `+N`，绝不裁名字」，但在 420px（`SIZE_MIN.w`）下，9 个三字中文名的估算宽度 379 ≤ 预算 380，函数返回 `overflow: 0`，而真实渲染宽度 409px > 可用 398px —— 第 9 个名字被 `.bb-idle{overflow:hidden}` 切掉 11px，**既没有 `+N` 也没有省略号，用户不会知道少了一个人**。

---

## 1. 用例表 · `attentionOf`

`row(name, scene, since, failureAt)`。n=9 时用 a…i，`since = 1000 - 10i`。

| # | 输入 | 实际输出 | 判定 |
|---|---|---|---|
| 1 | `rows = []` | `{items:[],overflow:0}` | OK |
| 2 | `rows = undefined` | `{items:[],overflow:0}` | OK |
| 3 | `rows = null` | `{items:[],overflow:0}` | OK |
| 4 | `rows = {}` | `TypeError: (rows ?? []).filter is not a function` | 崩溃 |
| 5 | `rows = "abc"` | 同上 | 崩溃 |
| 6 | `rows = 0`（falsy 非数组） | 同上 —— **`??` 只兜 null/undefined** | 崩溃 |
| 7 | `max = 0`，9 alert | `items=[]`，`overflow=9`，`0+9===9` | OK |
| 8 | `max = -1`，9 alert | `items=a..h`（**8 条**），`overflow=10`，`8+10=18≠9` | **错值** |
| 9 | `max = -5`，9 alert | `items=a..d`（4 条），`overflow=14`，和 = 18 | **错值** |
| 10 | `max = -100`，9 alert | `items=[]`，`overflow=109` | **错值** |
| 11 | `max = Infinity` | 9 条，`overflow=0` | OK |
| 12 | `max = NaN` | `items=[]`，`overflow=NaN` | **错值** |
| 13 | `max = "3"` | 3 条，`overflow=6` | OK（隐式转换） |
| 14 | 9 全 alert，since 递减 | `a,b,c,d,e,f,g,h,i` | OK |
| 15 | 9 全 error，since 递减 | `a,b,c,d,e,f,g,h,i` | OK |
| 16 | alert/error 交错 | `a,c,e,g,i,b,d,f,h`（全 alert 在前） | OK |
| 17 | 9 alert，键全 0 | `a..i`（名册序） | OK |
| 18 | 同上，跑 200 次 | `distinct = 1` | OK · 稳定 |
| 19 | 两行 `since` 都 500 | `x,y`（原序） | OK · 稳定 |
| 20 | `since = NaN` | 落到 `failureAt`，键 0 | OK |
| 21 | `since = "123"` | 123，排在 100 前 | OK |
| 22 | `since = -1` | 保留 -1（`-1 \|\| 0` 是 truthy），排最后 | OK（语义可疑，不崩） |
| 23 | `since = Infinity` | 排最前 | OK |
| 24 | `since = "abc"` / `{}` / `null` / `undefined` / `true` | 全收敛到 `failureAt` 或 0 | OK |
| 25 | 两行 `since` 都 `Infinity` → 比较函数返回 `NaN` | `p,q,r` 50 次不变 | OK · **见 §4-1** |
| 26 | `Infinity` 与 `-Infinity` 混排 | `a(∞),c(0),b(-∞)` | OK |
| 27 | `scene = "weird"`（键 999） | 不进层 1；`layerOf` → `idle` | OK |
| 28 | `scene` 缺失 | 不进层 1 | OK |
| 29 | 全是 idle/busy/waiting/done | `{items:[],overflow:0}` | OK |
| 30 | 输入是否被改写 | 未改写（`[...hot]` 复制后 sort） | OK |

---

## 2. 用例表 · `topologyOf`

`w(id, fromId, toId, open, at)`。

| # | 输入 | 实际输出 | 判定 |
|---|---|---|---|
| 1–3 | `[]` / `undefined` / `null` | `[]` | OK |
| 4 | `{}` | `TypeError: (works ?? []).filter is not a function` | 崩溃 |
| 5 | `0` | 同上 | 崩溃 |
| 6 | `open = "4"` | `total=4`，边 `open=4` | OK |
| 7 | `open = "abc"` / `NaN` / `null` / `undefined` / `""` / `-3` | 整条被滤掉，`[]` | OK |
| 8 | `open = Infinity` | `total = Infinity` → 渲染「共 **Infinity** 项」 | **错值**（非宿主可达） |
| 9 | `open = 0.5` | `total = 0.5` → 渲染「0.5 项」 | 错值（非宿主可达） |
| 10 | `open = true` | `1` | OK |
| 11 | 同 `from→to` 两条 open（4 和 3） | **两条边**，`total=7 === 4+3` | OK（B1 明写的行为） |
| 12 | 同上但两条都没有 `id` | `edgeIds = ["a\0b","a\0b"]` → **重复 React key** | **错值**（非宿主可达） |
| 13 | `fromId` 缺、`from="Chief"` | `fromId="Chief"`（回落到显示名） | OK |
| 14 | `fromId`/`toId` 都 `null` | 组键 `""`，标签 `""`（渲染 `？`） | OK |
| 15 | `fromId = ""` 且 `from = "Chief"` | **组键 `""`，标签 `"Chief"`** —— `??` 不兜空串 | 错值（键/标签不同源） |
| 16 | 自环 `a→a` | `total=2`，`mutual=false` | OK |
| 17 | **两条自环 `a→a`（2 和 3）** | 第二条 `mutual=true`，`pair="a\0a"` → 渲染「⇄ a 互相等」 | **错值** |
| 18 | 三角环 a→b, b→c, c→a | 三组各 1 条，`mutual` 全 false | OK |
| 19 | A→B(4) + B→A(3) | 两侧各 1 条，都 `mutual`，`pair` 相同，`total` 各 4/3 | OK |
| 20 | A→B 两条(4,5) + B→A 一条(3) | A 组 2 条边都 `mutual`，`total=9`；B 组 1 条 `total=3`；3 个 `pair` 全等 | OK |
| 21 | 组排序 total 相同 | 按 `fromId` 升序 | OK |
| 22 | 两组 total 都 `Infinity` | 比较函数 `NaN` → 退化为 0，仍按 `fromId` | OK |
| 23 | 组内 open 相同按 `at` 升序 | `y,x` | OK |
| 24 | 输入是否被改写 | 未改写 | OK |
| 25 | 100 / 1000 / 5000 / 20000 条 | 0.99 / 1.84 / 4.91 / 24.94 ms | OK · **无 O(n²)** |
| 26 | 5000 条同 `from` 同 `to` | 0.88 ms，5000 条边，`total=5000` | OK |
| 27 | `total === Σ edges.open` | 上述**全部**用例恒成立 | OK · **安全** |

---

## 3. 用例表 · `idleLine`

默认 `budget = 380`。

| # | 输入 | 实际输出 | 判定 |
|---|---|---|---|
| 1–3 | `[]` / `undefined` / `null` | `{items:[],overflow:0}` | OK |
| 4 | `{}` | `TypeError: (rows ?? []) is not iterable` | 崩溃 |
| 5 | `"abc"` | `items = ['a','b','c']`（字符被当成行） | 错值（非宿主可达） |
| 6 | `[null]`（默认预算） | `{items:[null],overflow:0}` —— 循环没进，**侥幸不崩** | OK（侥幸） |
| 7 | **`[null]`, `budget = 0`** | `TypeError: Cannot read properties of null (reading 'badge')` | **崩溃** |
| 8 | `[undefined]`, `budget = 0` | 同上 | 崩溃 |
| 9 | `budget = 0`，9 名 | `kept=0`，`overflow=9` | OK |
| 10 | `budget = -100`，9 名 | `kept=0`，`overflow=9` | OK |
| 11 | `budget = NaN`，9 个 20 字名 | **全部保留**（`overflow=0`，实宽 2117px） | 错值（静默不裁） |
| 12 | `budget = Infinity` | 全留 | OK |
| 13 | 9 个 20 字中文名 | `kept=1`，`overflow=8`，和 = 9 | OK |
| 14 | 9 个全带 badge，`budget=100` | `kept=2`，`overflow=7`，0.02 ms —— **不死循环** | OK |
| 15 | 全 badge，`budget=0` | `kept=0`，**badge 全被删** | 与注释冲突（预算不可能为 0，P4） |
| 16 | 尾部 3 个带 badge，`budget=150` | `kept=a,b,c,d,e,f` —— 没触发裁减（估算 143） | OK |
| 17 | `overflow` 与实际删除数 | 恒等（`kept + overflow === n`） | OK |
| 18 | **9 个三字中文名** | `kept=9, overflow=0`，估算 **379 ≤ 380**；真实 CSS 占位 **409 > 398** | **错值 → P1** |
| 19 | **9 个四字中文名** | `kept=7, overflow=2`，估算 378；真实 **422.6 > 398**（`+2` chip 自己溢出 24.6px） | **错值 → P1** |
| 20 | 9 个 5–7 字母英文名 | `kept=9, overflow=0`，估算 373.4；真实 **403.4 > 398** | **错值 → P1** |
| 21 | 9 个韩文 5 字名 | 每个按 6.2px/字估（实际 ~11px/字） | 错值（低估 ~44%） |
| 22 | emoji 名 `😀×5` | 估 31px/名，实际 ~66px/名 | 错值（低估 53%） |
| 23 | 非 BMP 汉字 `𠀀×5` | 估 31px/名（落进 `6.2` 分支） | 错值 |
| 24 | 组合字符 `é`（`e`+U+0301） | 估 12.4px/字，实际 6.2 —— **高估**（安全方向，但提前丢名字） | 未定义 |
| 25 | 全角英文 `ＡＢＣＤＥ` | 55px/名 | OK |
| 26 | `name = 123` / `null` / 无 `bot` | 不崩，宽度 0 | OK |
| 27 | 1000 / 5000 行 | 89 ms / **2239 ms**（5× 输入 → 25× 时间） | 错值 · **O(n²)** |
| 28 | 输入是否被改写 | 未改写（`[...rows]`） | OK |

---

## 4. 用例表 · `buildRows`

`base` 带 `now = 1.7e12`、3 个 bot。

| # | 输入 | 实际输出 | 判定 |
|---|---|---|---|
| 1 | `bots = []` | `[]` | OK |
| 2 | `bots = undefined` | `[]` | OK |
| 3 | `bots = null` | `TypeError: ... reading 'map'` | 崩溃（panel 已兜） |
| 4 | `bots = {}` | `TypeError: bots.map is not a function` | 崩溃 |
| 5 | bot 缺 `id` | 建出 1 行，`bot.id === undefined` | 错值 → P2-3 |
| 6 | **9 个 bot 全缺 `id`** | 9 行，`ids = ["undefined"]`，**key 全重复** | **错值 → P2-3** |
| 7 | 两个 bot 同 `id` | 2 行同 key | 错值（宿主不可达） |
| 8 | 两个 bot 同名 | 两行，名册序不变 | OK |
| 9 | `activity = null` | `TypeError: ... reading 'b1'` | 崩溃（panel 已兜） |
| 10 | `workBots = null` / `waiting = null` / `waveMap = null` / `noteMap = null` | 同上 | 崩溃（panel 已兜） |
| 11 | `questions = null` | `TypeError: ... reading 's1'` | 崩溃（panel 已兜） |
| 12 | `rooms = null` | 不崩（仅 `wait.rooms` 非空时才读） | OK（侥幸） |
| 13 | `works = null` | `TypeError: ... reading 'find'` | 崩溃（panel 已兜） |
| 14 | `approvals = {}` / `null` | `Array.isArray` 兜住 → `[]` | OK · 安全 |
| 15 | `errors = null` | 同上 | OK · 安全 |
| 16 | `questions = "abc"` | 不崩（按字符索引，查不到） | OK（侥幸） |
| 17 | `questions[s1] = null` | 不崩 | OK |
| 18 | `t` / `nameOf` 缺失 | 不崩（`wait` 分支才会调用 `t`） | OK（侥幸） |
| 19 | `now = 0` | `Chief: error/error`（`now-at` 为负，不判 quiet） | OK |
| 20 | `now = NaN` | `stalled` 全 false，`scene` 正常 —— **NaN 没泄漏到 UI** | OK · 安全 |
| 21 | approval+question+failure+waiting 同时 | `scene=alert, status=alert, kind=approval, badge=true, failure=boom` | OK · 优先级正确 |
| 22 | approval + question | `kind=approval` | OK |
| 23 | question + failure | `kind=question, scene=alert, badge=true` | OK |
| 24 | **failure + waiting** | `scene=waiting`（蓝灯）但 `action="报错 boom"` | **错值 → P3-2** |
| 25 | failure 过期（>3min）且不在跑 | `scene=idle, badge=true`，`failure` 保留 | OK |
| 26 | failure 很旧但正在跑 | `scene=busy, badge=false, failure=''`（recovered） | OK |
| 27 | `errors.at = "1000"` | `failureAt: "1000"`（**字符串**）→ `Elapsed` 不渲染 | 错值 → P4-4 |
| 28 | `errors.at` 缺失 / `NaN` | `failureAt = 0` / `NaN ?? 0` | OK（NaN 未被 `??` 兜住，见 P4-4） |
| 29 | `errors.at` 是未来时间 | `scene=error`（不判 quiet，方向安全） | OK |
| 30 | `errors.message` 缺失 | `action="报错"`，`failure=""` | OK |
| 31 | 多条 works 指向同一 bot，新在前 | `lastResult = NEW-own` | OK |
| 32 | **同上但旧在前** | `lastResult = OLD-own`（**静默取到过期结果**） | **未定义 → P3-3** |
| 33 | `results[].text = ""` | `lastResult = ""`（空串穿透 `??`） | 错值（轻微） |
| 34 | `wait.bots` 是对象 / 字符串 | `TypeError: (wait.bots ?? []).map is not a function` | 崩溃（宿主不可达） |
| 35 | `wait.for` 含 `undefined` | 被 `filter(name => name && ...)` 滤掉 | OK |
| 36 | 未知 Bot 排序 | `Chief,Bot2,aaa,zzz`（名册序 → 100 → id 字典序） | OK |
| 37 | 重复跑 100 次 | `distinct = 1` | OK · 稳定 |
| 38 | 输入 `bots` 是否被改写 | 未改写 | OK |

---

## 5. 缺陷清单

### P1-1 · `idleLine` 的宽度预算漏算 `padding` 与 `+N` chip，最小面板下静默裁名字

**位置**：`src/client/layers.js:115`（`IDLE_BUDGET = 380`）、`:118-123`（`nameWidth` / `itemWidth`）、`:134-137`（`total`）、`:138-147`（删减循环）
**关联**：`src/client/style.js:155-171`（`.bb-idle{overflow:hidden}`、`.bb-idle-name{flex:0 0 auto;padding:1px 2px}`）

**最小复现**
```js
idleLine(['前端组','后端组','测试组','设计组','运营组','数据组','算法组','运维组','安全组']
  .map(n => ({ bot: { id: n, name: n }, badge: false })))
// => { items: [9 条], overflow: 0 }
```

**实际 vs 期望**

| 量 | 值 |
|---|---|
| `total()` 估算 | `28 + 9×(33+6) = 379` |
| 函数判定 | `379 ≤ 380` → **`overflow: 0`，不裁** |
| 真实 CSS 占位 | `22 + 6 + Σ(33+4) + 8×6 = 409` |
| 420px 面板可用宽 | `420 − 2（.bb-panel border）− 20（.bb-idle padding）= 398` |
| 结果 | **溢出 11px，第 9 个名字被 `overflow:hidden` 切掉** |

`total()` 与真实渲染的差额是恒定的：

```
real = estimate + 4×n（.bb-idle-name 的 1px 2px padding，n 项都没算）
              + 2×badges（badge 12 + margin-left 2 + inline-flex gap 2 = 16，只算了 14）
              + chip（溢出时才有：gap 6 + padding 6 + 文本 ≈ 18–30）
              − 6（每项都加了 gap，但最后一项后面没有 gap）
```

n=9 时净差 **+30px**；一旦触发删减还要再加 24–30px 的 chip。四字名那组（`kept=7, overflow=2`）实测真实宽 422.6，被裁掉 24.6px —— **裁掉的正好是末尾的 `+2`**，即「唯一能把剩下 2 个名字叫出来」的控件本身看不见。三字名那组更糟：`overflow=0`，连 chip 都没有，用户不可能知道少了人。

`+N` 的宽度还随 N 的位数增长（`+10` 比 `+2` 宽 6px），预算模型完全没有这一项。

**修法**（`layers.js:115-137`）
```js
const IDLE_PREFIX = 28
const NAME_PAD = 4        // .bb-idle-name padding:1px 2px
const BADGE_W = 16        // 12 + margin-left 2 + inline-flex gap 2
const CHIP_W = 24         // gap 6 + padding 1px 3px + "+N"（2 位数；+10 以上再 +6）

const itemWidth = row => nameWidth(row?.bot?.name) + NAME_PAD + (row?.badge ? BADGE_W : 0)
const total = items => items.length
  ? IDLE_PREFIX + items.reduce((s, r) => s + itemWidth(r), 0) + 6 * (items.length - 1)
  : 0

export function idleLine(rows, budget = IDLE_BUDGET) {
  const kept = [...(rows ?? [])]
  const n = kept.length
  let overflow = 0
  // 一旦要裁，末尾会多一个 +N，它自己也在预算里
  const fits = items => total(items) + (items.length < n ? CHIP_W : 0) <= budget
  while (kept.length && !fits(kept)) { … }
}
```
`IDLE_BUDGET` 保持 380 即可（此时真实占用 ≤ 380，420px 下有 18px 余量）。**同时** `nameWidth` 需要补 Hangul（`\uac00-\ud7af`）与非 BMP（`/[\u{20000}-\u{2fa1f}]/u`），否则韩文/emoji 名仍然低估 40–50%。

---

### P2-1 · `attentionOf` 的 `max < 0` 把 `slice` 变成负索引，破坏 `items+overflow===n`

**位置**：`src/client/layers.js:47`
```js
return { items: sorted.slice(0, max), overflow: Math.max(0, sorted.length - max) }
```

**复现**：`attentionOf(9 条 alert, -1)`
**实际**：`items = 前 8 条`，`overflow = 10`，`8 + 10 = 18 ≠ 9`
**期望**：`items = []`，`overflow = 9`（或 `max` 被钳到 0）
**为什么是 bug**：`slice(0, -1)` 是「去掉最后 1 个」而不是「取前 -1 个」，于是 items 从尾部被多算一次、overflow 又从另一头多算一次，同一条记录被计了两次。REQUIREMENTS A3 的不变量（`items.length + overflow === n`）在这里直接不成立，`Attention` 会渲染 `+10` 而列表里只有 8 行。

**修法**
```js
// Infinity 要保留（展开态靠它）；NaN / 负数 / 小数 收敛到整数
const cap = Number.isFinite(max) ? Math.max(0, Math.trunc(max)) : Infinity
return { items: sorted.slice(0, cap), overflow: Math.max(0, sorted.length - cap) }
```
这样 `max = -1` → `items=[]`、`overflow=9`；`max = NaN` → 全量返回、`overflow=0`（而不是 `[]` + `NaN`）；`max = Infinity` 行为不变。

### P2-2 · `max = NaN` 时 `overflow = NaN`

**位置**：同上（`Math.max(0, n - NaN)` → `NaN`）
**实际**：`{ items: [], overflow: NaN }`
**后果**：`Attention` 的 `chip = overflow > 0` 为 false，chip 消失；`IdleLine` 同理。不崩，但「还有 N 个」整条信息没了，且 `+NaN` 会出现在 `title` 里（`String(NaN)`）。归到 P2-1 的同一个 `cap` 归一化里一起修。

### P2-3 · `bots` 缺 `id` 时 9 行 key 全为 `undefined`

**位置**：`src/client/rows.js:106-173`（`bot.id` 直接透传）、`src/host/index.js:148`（`Object.values(state.bots)` 丢掉了对象键）、`:191`（`id: bot.id`）
**复现**：`buildRows({ bots: [{name:'Chief'}, …9 个], … })`
**实际**：9 行，`new Set(rows.map(r => r.bot.id))` 只有一个值 `undefined`
**后果**：`panel.js:256` 的 `key: row.bot.id`、`attention.js:49`、`attention.js:122` 全部拿到同一个 key → React 复用同一个 `Station` 实例，9 个工位渲染成 1 个；`failureOf` 里 `item.botId === bot.id` 也会让一条 `botId: undefined` 的错误同时点亮全部 9 个 Bot（实测 `a:error | b:error | c:error`）。

**可达性**：`state.json` 的 bot 记录若只把 id 放在对象键上（`bots: { "session-x": { name: "Chief" } }`），宿主这一层就会丢掉它。smoke fixture 里写了 `id`，所以现在没炸 —— 但宿主明明手里有键（`:148`）却不用，是白丢的保险。

**修法**（`src/host/index.js:148`）
```js
const bots = Object.entries(state.bots ?? {}).map(([id, bot]) => ({ ...bot, id: bot.id ?? id }))
```

---

### P3-1 · 两条自环被误标 `mutual`（「⇄ 互相等」）

**位置**：`src/client/layers.js:80-81`
```js
const reverse = byPair.get(keyOf(toId, fromId))
const mutual = Boolean(reverse) && reverse !== work
```
**复现**
```js
topologyOf([
  { id: 'w1', fromId: 'a', toId: 'a', open: 2, at: 10 },
  { id: 'w2', fromId: 'a', toId: 'a', open: 3, at: 20 },
])
```
**实际**：第二条边 `mutual: true`，`pair: "a\0a"` → 渲染「⇄ a 3 项 · 互相等」
**期望**：两条都 `mutual: false` —— 一个 Bot 不可能在等自己。
**原因**：`byPair` 是 `Map`，后写覆盖先写，所以 `a→a` 的 reverse 查到了**另一条** `a→a`，`reverse !== work` 成立。单条自环（用例 16）恰好不触发，所以这个洞只在「同一对自环出现两次」时露出来。
**修法**
```js
const mutual = Boolean(reverse) && reverse !== work && fromId !== toId
```

### P3-2 · `waiting` 的蓝灯配「报错 xxx」的文案

**位置**：`src/client/rows.js:62-68`（`describe` 里 `failure` 分支在 `wait` 之前）、`:128-133`（`statusOf` 里 `waiting` 在 `failed` 之前）
**复现**
```js
buildRows({ bots: [{id:'b1',name:'Chief'}], waiting: { b1: { bots: ['b2'] } },
            errors: [{ botId: 'b1', at: now - 1000, message: 'boom' }] })
```
**实际**：`scene = 'waiting'`（蓝灯），`action = "报错 boom"`
**期望**：灯和文案说同一件事。要么 `waiting` 时 `action = "等 Bot2"` 并把 failure 降级成 badge，要么反过来。
**为什么算 bug**：`statusOf` 的注释明写「a failure never outranks live work」，`waiting` 属于 live work；`describe` 的优先级却把 failure 排在 wait 前面。同一个格子里，颜色说「不卡」、文字说「卡住了」。
**修法**：`describe` 里把 `if (wait)` 提到 `if (failure)` 之前（failure 仍由 `badge` 保留），或让 `buildRows` 在 `scene === 'waiting'` 时把 `detail` 换成 wait 分支。

### P3-3 · `lastResult` 依赖 `works` 数组顺序，而不是 `at`

**位置**：`src/client/rows.js:147`
```js
const handed = works.find(item => item.toId === bot.id)
```
**复现**：同样两条 works，只把数组顺序反过来 → `lastResult` 从 `NEW-own` 变成 `OLD-own`
**为什么是 bug**：宿主 `src/host/index.js:180-185` 恰好按 `at` 降序 + open 优先排序，所以生产上是对的 —— 但这是**没有任何地方写下来的耦合**。`buildRows` 自称纯函数、`works` 是入参，任何一处上游改排序（或浏览器侧换个来源）都会静默显示过期结果，而且没有任何断言会红。
**修法**
```js
const handed = works
  .filter(item => item.toId === bot.id)
  .reduce((best, item) => (!best || (Number(item.at) || 0) >= (Number(best.at) || 0) ? item : best), null)
```

### P3-4 · `?? {}` 只兜 `undefined`，`null` 直接穿透成崩溃

**位置**：`src/client/rows.js:96`（解构默认值）、`:109`、`:110`、`:120`、`:134`、`:170`
**实测**：`questions` / `activity` / `workBots` / `waiting` / `waveMap` / `noteMap` / `works` 传 `null` → 全部 `TypeError`
**现状**：`panel.js:417-424` 用 `?? {}` 和 `Array.isArray` 全部兜住了，所以**生产路径安全**（见 §6-7）。但 `tools/render-check.mjs:53` 与 `tools/export-preview.mjs:103` 直接调 `buildRows`，且注释把这三个函数当「可单测的纯函数」卖。契约是「缺省即空」，`null` 是缺省的合法表示，现在不成立。
**修法**：解构后再归一化，别依赖默认值。
```js
const asObj = v => (v && typeof v === 'object' ? v : {})
const asArr = v => (Array.isArray(v) ? v : [])
// activity = asObj(activity), questions = asObj(questions), bots = asArr(bots) …
```

---

### P4（低优先，记录在案）

| # | 位置 | 现象 | 修法 |
|---|---|---|---|
| P4-1 | `layers.js:83` | 无 `id` 的重复 `from→to` 生成相同 `edge.id`（`"a\0b"`），`handoffs.js:54` 的 React key 重复 | `id: work.id ?? keyOf(fromId, toId) + ':' + 序号` |
| P4-2 | `layers.js:88` | `open: Infinity` → 「共 Infinity 项」；`open: 0.5` → 「0.5 项」 | `Number.isFinite` 过滤 + `Math.trunc` |
| P4-3 | `layers.js:138` | 每次删一项都重算 `total()` → O(n²)：1000 行 89 ms，5000 行 2239 ms | 维护增量宽度，或先算总宽再逐项减 |
| P4-4 | `rows.js:163` | `failureAt: failure?.at ?? 0` 不做 `Number()`：`at = "1000"` 时字符串穿透，`Elapsed` 的 `Number.isFinite` 直接不渲染；`at = NaN` 时 `?? ` 兜不住 | `failureAt: Number(failure?.at) \|\| 0` |
| P4-5 | 三个函数 | 非数组 truthy 入参（`{}`）直接 throw；`idleLine("abc")` 把字符当行 | 入口 `Array.isArray` 归一化 |
| P4-6 | `layers.js:143` | `budget = 0` 且全带 badge 时 badge 也被删，与「the badges win」的注释冲突 | 注释已承认「the tail still goes」，可接受；但 `budget` 应在入口 `Math.max(0, …)` |

---

## 6. 看起来危险、实测安全的路径（以及为什么）

1. **`Array#sort` 的同分稳定性 —— 注释的结论对，理由不完整。**
   `layers.js:42` 写「Array#sort is stable, so equal timestamps keep roster order」。真正的保证是两步：ES2019+ 的 `SortCompare` 规定**比较函数返回 `NaN` 时按 `+0` 处理**，`+0` 意味着「相等」，再由稳定排序保住原序。所以 `since = Infinity` 的两行（`Infinity - Infinity = NaN`）不会抖动 —— 实测 50/200 次顺序唯一。若只依赖「sort 稳定」而不依赖「NaN→+0」，`Infinity` 这一格就会变成真正的未定义行为。**结论安全，注释可以补一句理由。**

2. **`since` / `failureAt` 的全部脏值都不崩。**
   `Number(x) || Number(y) || 0` 这条链把 `NaN` / `"abc"` / `{}` / `null` / `undefined` 全部收敛到 0，`"123"` 正常转成 123。唯一"活下来"的异常值是 `Infinity`（排序最前）和负数（排序最后），两者都只影响位置、不影响长度。

3. **`topologyOf` 的 `total === Σ edges.open` 在所有输入下恒成立。**
   因为过滤用 `Number(work?.open) > 0`、累加用 `Number(work.open) || 0`，两者对同一个值的判断一致；`group.total += edge.open` 又是字面累加。重复 pair、自环、脏 `open`、三角环 —— 27 个用例无一例外。

4. **三角环不会被误标 `mutual`。**
   只有「直接反向」才查得到 `reverse`，A→B→C→A 里没有任何一对互为反向，实测三条边 `mutual` 全 false。

5. **全 badge 不会死循环。**
   `index < 0` 时兜底 `index = kept.length - 1`，每轮必然 `splice` 掉 1 个，`kept.length` 严格递减，循环上界是 n。实测 9 项全 badge + `budget=100` → 2 轮结束，0.02 ms。

6. **`budget = 0 / 负数 / Infinity` 都收敛。**
   0 和负数 → 清空 + `overflow = n`；`Infinity` → `total > Infinity` 恒 false → 全留。只有 `NaN` 是坏的（恒不裁，静默溢出），但调用点只传 `undefined` 或 `Infinity`（`panel.js:202`）。

7. **`buildRows` 的 `null` 崩溃在唯一的生产调用点全部被兜住。**
   `panel.js:417-424` 对 `activity` / `workBots` / `waiting` / `rooms` / `questions` 用 `?? {}`，对 `approvals` / `errors` / `works` 用 `Array.isArray`，对 `bots` 用 `?? []`。所以 §4 的 9–13 号崩溃**在当前版本不可达**。它们仍然是缺陷，因为函数契约被写成「纯函数、可单测」，而 `render-check` / `export-preview` 是两个绕过 `panel.js` 的直接调用方。

8. **`now = NaN` 不会把 NaN 泄漏到 UI。**
   所有时间判断都是 `NaN > x`，恒 false：`stalled` 退化成 false、`recovered` 退化成 false、`quietLong` 退化成 false。结果是「不判卡住、不判恢复」，卡片仍显示原状态。方向安全。

9. **`approvals` / `errors` 非数组不会崩。**
   `rows.js:99-100` 的 `Array.isArray` 兜底覆盖了对象和 `null` 两种脏输入。

10. **`topologyOf` 没有 O(n²) 悬崖。**
    两趟线性 + 两个 `sort`：20000 条 25 ms，5000 条同一 pair 0.88 ms。`byPair` 的 `Map` 后写覆盖先写只会影响 `mutual` 判定（见 P3-1），不影响复杂度。

11. **`idleLine` 的 `overflow` 计数永远等于实际删除数。**
    每轮 `splice` 一次就 `overflow += 1`，没有第二条删除路径。实测 `kept + overflow === n` 恒成立。

12. **`attentionOf` 不改写输入。**
    `[...hot].sort()`，原数组顺序不变（实测 `ba → ba`）。

---

## 7. 复现脚本

```
/tmp/bb-fuzz/harness.mjs       # 统一 import + 输出格式化
/tmp/bb-fuzz/01-attention.mjs  # 37 例
/tmp/bb-fuzz/02-topology.mjs   # 35 例（含 20000 条性能）
/tmp/bb-fuzz/03-idle.mjs       # 29 例（含宽度模型与 O(n²)）
/tmp/bb-fuzz/04-rows.mjs       # 48 例
/tmp/bb-fuzz/05-edge.mjs       # 10 例（残余边界 + 宽度对照表）
/tmp/bb-fuzz/06-ids.mjs        # 3 例（缺 id 的爆炸半径）
```
运行：`cd /tmp/bb-fuzz && node 01-attention.mjs`（其余同理）。脚本只 import 项目源码，不写项目目录。

---

## 8. 未覆盖 / 需要布局引擎才能定的

- **P1-1 的最终像素值**依赖字体度量。上面的 `409px` 用的是 `layers.js` 自己的 11px/6.2px 估算 + CSS 盒模型（`padding:1px 2px`、`gap:6`、`.bb-panel` 1px border、`.bb-idle` `padding:0 10px`），是**下界**：真实字体里 `+`/数字更宽，中文名在某些字体下 > 11px/字。要拿到真值需要一次 `getBoundingClientRect()`，`tools/export-preview.mjs` 已经有渲染管线，可以在那里加一条断言。
- `waiting[botId].bots` 的真实形状由 ds-bot 的 `api/bot` 决定，本仓库无法验证；`null`/非数组的崩溃只按「防御性契约」记录。
- `attentionOf` 里 `since` 优先于 `failureAt` 的语义（一个跑了两小时、刚刚失败的 Bot 用「两小时前」当排序键）看起来是刻意的（注释：「longest-running first」），未计为缺陷，但值得在 §5 之外确认一次产品意图。
