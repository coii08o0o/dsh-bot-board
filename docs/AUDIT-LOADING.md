# 可加载性审计 · dsh-bot-board v0.4.2

**结论先行：面板确实会被 DSH 加载，而且已经在运行中的 DSH 里被加载过 143 次。**
这一条不再是「待验证」，是「已确认」——依据是运行时留下的物证，不是代码推断。见 §3。

**审查对象**：`/Users/admin/Documents/dsh-bot-board`
**基线**：审计开始时 HEAD `bdd2e6d`（v0.4.2）。审计过程中 HEAD 前进到 `04cea17`
（`fix: 排序方向与注释相反 + 闲着行宽度预算漏算盒模型 + 自环误标互相等`），
**本文所有数字与结论都在 `04cea17` 上重新跑过一遍**，不是拿旧产物下的结论。

**被测产物**：`client.js` 111923 B，mtime `2026-10-22 23:38:16`，`artifactRev = 1e29c7b5d09d`
**方法**：静态读 DSH 运行时源码（`app.asar` 内的 `@deepseek-ai/dsh-client-modules`、
`@deepseek-ai/cordis`、`@deepseek-ai/dsh-agent-loop`、`@deepseek-ai/cordis-plugin-loader`）
+ 在 Node 里驱动真实产物与真实宿主半边 + 读 Electron 运行时缓存。
**没有重启用户的 DSH，没有 `killall`，没有改源码。**

---

## 1. 链路逐段结论表

| # | 环节 | 期望 | 实际 | 判定 |
|---|---|---|---|---|
| 1 | `client.js` 的 loader id | `===` 包名 `dsh-bot-board` | `window.__ModuleLoader__.load({ id: 'dsh-bot-board', factory })`（`client.js:2-4`） | **通** |
| 2 | 产物外部依赖 | 只 `require('react')` | 全产物只有 1 处 `require("react")`（`client.js:38`）；`react-dom` 0 处、`react/jsx-runtime` 0 处 | **通** |
| 3 | 产物回归闸门 | 无 `dangerouslySetInnerHTML`、无 `locale: 'zh-CN'` | 两者均 0 处 | **通** |
| 4 | 产物与 `src/` 同步 | 重新 build 后 `git diff` 为空 | 在 `/tmp` 副本里 `node tools/build.mjs` 后与仓库 `client.js` 逐字节相同（diff 0 行） | **通** |
| 5 | slot 注册点 | `shell.overlay` | `src/client/index.js:20-26` 注册 `name: 'shell.overlay'` | **通** |
| 6 | slot 叠放次序 | `order ≥ 500`，避开 ds-bot 的 50/55/60 | `order: 500`（`src/client/index.js:23`） | **通** |
| 7 | slot 唯一性 | `id` 不与 ds-bot 冲突 | `id: 'bot-board'`；ds-bot 用 `bot` / `bot-signin` / `bot-toast` | **通** |
| 8 | 路由路径 | 带前导斜杠、精确匹配 | `ROUTE = '/api/bot-board'`（`src/host/index.js:16`），`path: ROUTE`（`:216`） | **通** |
| 9 | 路由方法/体 | 与客户端一致 | 宿主 `methods: ['POST']`、`requestBody: 'buffered'`（`:217-218`）；客户端 `POST`（`src/client/poll.js:28-33`） | **通** |
| 10 | `connection` 就绪时机 | 不能 `if (!ctx.connection) return` | 用 `export const inject = ['connection']`（`src/host/index.js:11`），cordis 保证 apply 在服务就绪后才跑；全文无 `if (!ctx.connection)` | **通** |
| 11 | `inject` 重复注册 | 不能既声明 inject 又 `ctx.inject` 同一个服务 | 宿主只声明不调用；客户端 `inject=['slots']` + `ctx.inject(['uiWorkspace'])` 是两个不同服务 | **通** |
| 12 | `agent/error` 监听 | 包在 `ctx.effect` 里、disposer 解绑 | `src/host/index.js:61-64`；`ctx.on` 在 cordis 4.0.5 返回 disposer（`cordis/lib/index.js:372-383`），已实测解绑后监听器数归 0 | **通** |
| 13 | 事件 payload 契约 | 能拿到 `agent.session.id` | `agentEvents()` 会 `fused(payload) => ({...payload, agent})`（`dsh-agent/lib/index.js:243-248`），`dsh-api-session-controller/lib/index.js:2994` 同样读 `{agent, error}` | **通** |
| 14 | 未清理的 timer | 无泄漏 | 宿主只有一个 12ms `sleep`（`:22`）；客户端 `clock.js:16-20` 在最后一个订阅者离开时 `clearInterval`；`panel.js:522-527` 在卸载时清掉 wave/note 两组 timer | **通** |
| 15 | 缓存失效键 | `mtime + size` | `key = \`${info.mtimeMs}:${info.size}\``（`src/host/index.js:133`），实测第二次读命中缓存且仍刷新 `updatedAt` | **通** |
| 16 | state.json 路径/可读 | `~/.dsh/bot/state.json` 存在可读 | 存在，643267 B，`-rw-r--r--`；`DSH_HOME` 未设时回落 `~/.dsh`（`:13-14`） | **通** |
| 17 | 宿主读真实数据 | 能解析出快照 | 对真实文件跑 `route.fetch()`：`ok:true`、`stale:false`、**9 个 bot**、3 条 work、rooms 名字映射 | **通** |
| 18 | `package.json` dsh 字段 | `client.platform: "web"` + `bundle.patch` | `package.json:31-38`；与 ds-bot 的 `dsh` 字段**逐字段相同** | **通** |
| 19 | `cordis.patch.yml` | `insert` 出 `id` + `name` | `id: bot-board` / `name: dsh-bot-board`；`EntryOptions` 里 `id`+`name` 必填、`config` 可选（`cordis-plugin-loader/src/config/entry.ts:13-27`） | **通** |
| 20 | profile `dependencies` | 含 `dsh-bot-board` | `~/.dsh/profiles/desktop/package.json:8` → `file:/Users/admin/Documents/dsh-bot-board` | **通** |
| 21 | profile `dsh.profile.bundles` | 含 `dsh-bot-board` | 同文件 `:33`，位于列表末尾 | **通** |
| 22 | 软链完整性 | 指向仓库、未断 | `node_modules/dsh-bot-board -> /Users/admin/Documents/dsh-bot-board`，可解析 | **通** |
| 23 | 版本一致性 | 0.4.2 全线一致 | `package.json:3` 是 0.4.2；`client.js` **无版本标记**；README **无版本段**；`tools/export-preview.mjs` 仍写 v0.4.1 | **存疑** |
| 24 | 宿主入口可导入 | 三个具名导出 | `import('index.js')` → `['apply','inject','name']`，`inject=["connection"]`，`isApplicable=true` | **通** |
| 25 | 真机加载（客户端） | 被 DSH 拉取并执行 | **143 条 V8 code cache 物证**，含当前产物 rev，见 §3 | **通（运行时实证）** |
| 26 | 真机加载（宿主路由） | `/api/bot-board` 200 | 无法从外部探测（见 §4）；静态 + 真实数据驱动均通 | **存疑** |

**断点数：0 个会导致「加载不出来」的断点。** §5 列的 4 条都不是加载阻断项。

---

## 2. DSH 的加载契约（读源码得到的判据，用于支撑上表）

不是猜的，是 `app.asar` 里的实现：

1. **宿主侧扫描**（`@deepseek-ai/dsh-client-modules/lib/index.js`）
   - `resolveMeta()`：读包 `package.json`，要求 `dsh.client.platform === 'web'`，
     否则 `return null`（**静默跳过，无报错**）。这正是「改名/改字段后不加载也不报错」的机制。
   - 然后要求 `exports["./client"]` 存在且是字符串（`clientExportOf`，:172-182），
     否则 **抛错**：`declares dsh.client but exports no "./client" bundle`。
   - `reconcilePackage()`：**模块表键 = 包的 `name` 字段**，注释原文 "entry id (package name)"。
     所以产物里的 `id` 必须等于 `dsh-bot-board`——这一点本仓库是对的。
2. **浏览器侧装配**（`.../lib/client.js`）
   - `register()` → `stripClientSuffix(registration.id)`，`dsh-bot-board` 原样保留。
   - `arrive(row)` 之后必须 `this.factories.has(row.id)`，否则抛
     `loaded without registering "<id>" via __ModuleLoader__.load`。
   - `factory(require)` 的 `require` 解析顺序：seed（react 等静态模块）→ 已记忆 → 图行 → 已注册 factory → 抛错。
3. **bundle 路由**：`/plugins/??<id>/client.js&rev=<artifactRev>`。
   `artifactRev = framedHash("plugin-artifact", [String(mtimeMs), String(ctimeMs), String(size)])`，
   其中 `framedHash` 是 `sha1(domain ‖ "\0" ‖ 每段"<byteLength>:" ‖ 段)`，取前 12 位十六进制
   （`dsh-client-modules/lib/index.js:187-199`）。**这个公式是 §3 里「rev 对得上」的判据**——
   它把产物钉死到某一个 `stat` 上，不依赖内容哈希。
4. **bundle 层装配**（`@deepseek-ai/dsh-app-boot/lib/index.js:489-503`）
   profile 的 `dsh.profile.bundles` 依序应用每个 bundle 的 `dsh.bundle.patch`，
   再应用 profile 自己的 `cordis.patch.yml`。**`dsh-bot-board` 只在 bundles 里，不在 profile patch 里——这是对的，
   和 ds-bot 完全同构。**

---

## 3. 「面板真的能加载吗」——能，且已有运行时物证

### 3.1 客户端半边：已确认加载并执行（不是推断）

DSH 桌面端用自定义协议 `dsh-app://` 提供渲染进程资源。Electron 的 V8 code cache
（`~/Library/Application Support/@deepseek-ai/dsh-desktop/Code Cache/js/`）
会为**每一个被拉取并编译过的脚本**写一条记录，键就是脚本 URL。

实测：

```
$ xxd -l 64 "Code Cache/js/181e386b12fdb1c0_0"
00000000: 305c 72a7 1b6d fbfc 0500 0000 5400 0000  0\r..m......T...
00000010: 19e8 2394 0000 0000 5f6b 6579 6473 682d  ..#....._keydsh-
00000020: 6170 703a 2f2f 6170 702f 706c 7567 696e  app://app/plugin
00000030: 732f 3f3f 6473 682d 626f 742d 626f 6172  s/??dsh-bot-boar
        → _key = dsh-app://app/plugins/??dsh-bot-board/client.js&rev=1e29c7b5d09d
```

三件事同时对上：

| 项 | 值 |
|---|---|
| 缓存文件的 mtime | `2026-10-22 23:38:16` |
| 仓库 `client.js` 的 mtime | `2026-10-22 23:38:16`（同一秒） |
| 我按 DSH 的 `artifactRevision` 公式从当前 `stat` 算出的 rev | `1e29c7b5d09d`（与 URL 里的 rev 完全一致） |

也就是说：**23:38:16 那一刻，运行中的 DSH 渲染进程把当前这份产物从
`dsh-app://app/plugins/??dsh-bot-board/client.js&rev=1e29c7b5d09d` 拉了下来并交给 V8 编译。**
（V8 只对真正被编译过的脚本写 code cache 条目；这一条 264 B、只有 key 没有字节码，
说明 Chrome 记了这次编译但没保留字节码——不影响「被编译过」这个结论。）

「被编译」到「被 `apply()`」之间还差一步，而下一步有独立证据：
`arrive()` 在脚本执行后必须 `factories.has(id)`，否则抛错；同时
`ClientModuleRegistry.rebuilt(id)` 只在 `this.table.get(id)` 存在时才发 HMR 通知
（`dsh-client-modules/lib/index.js:624-628`），`table` 的键是已扫描到的 `dsh.client` 包。
**能收到 HMR 重载 ⇒ 已在模块图里且已物化。**

对照组：`plugins/??ds-bot/client.js` 的 code cache 条目是 **0 条**——因为 ds-bot 没有被重建过，
它永远走合并 batch，不会单独取单资源 URL。这反过来证明下面这 143 条不是噪声。

**计数**：`Code Cache/js` 里带 `dsh-bot-board/client.js` 的条目共 **143 条，143 个互不相同的 rev**，
每个 rev 对应一次 `client.js` 重写。这是 DSH 的 HMR（`@deepseek-ai/dsh-client-hmr`）逐次重载留下的。

### 3.2 更硬的一条：它在**应用批次**里

合并 batch 的 URL（从同一缓存目录里取出）明确包含本包，且和 ds-bot 同批：

```
plugins/??@deepseek-ai/dsh-client-ui-user-questions/client.js,…,
  @deepseek-ai/dsh-experimental-session-inspector/client.js,
  dsh-bot-board/client.js,          ← 这里
  @deepseek-ai/dsh-api-remote-access/client.js,…,
  dsh-purge/client.js,@dsh-market/plugin/client.js,
  ds-bot/client.js,…&rev=cf58222a9f3d
```

这条 URL 是 `compose()` 从 `table` 生成的。`table` 有条目 ⇒ `resolveSource()`
拿到了 `entry.fiber !== undefined` 的 loader 条目（`processOne()` 的过滤条件，:849-853）
⇒ **宿主侧的 loader 条目确实被创建并挂上了 fiber**，即 `dsh-bot-board` 的宿主半边被 import 过。
`apply()` 体内只有 `ctx.effect` / `ctx.on` / `connection.fetch.register` 三条路径，
都不具备抛错条件（见 §1 #12/#17 的实测），因此宿主半边没有失败的理由。

### 3.3 宿主半边：功能已用真实数据跑通

我把 `index.js`（包 main，即 DSH 真正 import 的那个入口）导入 Node，用 cordis 形状的 ctx 驱动：

```
ok  route path has a leading slash (got "/api/bot-board")
ok  route methods is ["POST"] (got ["POST"])
ok  requestBody is buffered (got buffered)
ok  route.fetch returns a Response        → status 200, content-type application/json
ok  real state.json parsed ok (ok=true)
ok  snapshot carries bots from the live state file (9)
ok  works is an array (3)
ok  a healthy read is not stale
ok  second read still ok (cache path)
ok  disposer removes the listener (left 0)
ok  disposer removes the route (left 0)
```

用的是**用户真实的** `~/.dsh/bot/state.json`（只读），9 个 Bot 全部解析出来。

### 3.4 结论

| 问题 | 回答 |
|---|---|
| `client.js` 会被 DSH 拉取吗 | **会。143 次实证，含当前产物。** |
| 会注册进模块图并被 `apply()` 吗 | **会。** 能收到 HMR 重载就说明已注册且已物化。 |
| 宿主半边会被挂载吗 | **会。** loader 条目有 fiber，且批次 URL 由它的 `dsh.client` 声明生成。 |
| `/api/bot-board` 会 200 吗 | **静态与真实数据驱动都通**，但「运行中进程里的那一次 HTTP」我探测不到（§4）。 |

**唯一还需要用户动手确认的，只有最后一行。** 而它即使失败，面板也**照样渲染**
（`src/client/poll.js:111-114` 把 `boardError` 塞进 board 状态，只是「正在交接」区空着），
所以它不是加载阻断项。

---

## 4. 为什么第 26 项我只能标「存疑」

我尝试从外部探测运行中的 DSH，全部**不可用**，且都有对照证明是探测手段的问题，不是插件的问题：

| 探测 | 结果 | 对照 |
|---|---|---|
| `POST http://127.0.0.1:18488/api/bot-board` | 404 `{"ok":false,"error":"Not Found"}` | **ds-bot 的 `/api/bot` 同样 404** → 18488 不是 connection 路由所在的监听面（或是需要会话凭据） |
| `GET http://127.0.0.1:18488/plugins/dsh-bot-board/client.js` | 404 | 同上；UI 走 `dsh-app://` 自定义协议，不走 HTTP |
| 其余 Electron 监听端口 | 全是 404 或非 DSH 服务 | — |
| `~/.dsh/bot/logs/diagnostics.jsonl` | 只有 ds-bot 的 turn 错误，无插件加载记录 | — |
| `~/Library/Logs/DeepSeek Harness/` | 只有 2026-10-19 的 renderer killed 崩溃，早于本插件 | — |
| `.plugin-manager/logs/*/pnpm.log` | 空文件 | — |

DSH 没有把插件加载日志落盘，所以我无法从日志侧确认路由。

---

## 5. 断点清单

按严重度排序。**没有 P0，没有一条会导致「面板加载不出来」。**

### P2-1 `tools/export-preview.mjs` 仍输出 v0.4.1

- **位置**：`tools/export-preview.mjs:17`（`Out: docs/preview-0.4.1.html`）、
  `:388`（`<title>dsh-bot-board v0.4.1 · 三层注意力轴预览</title>`）、
  `:393`（`<h1>… v0.4.1 …`）、`:408`（`join(ROOT,'docs','preview-0.4.1.html')`）
- **后果**：`npm run preview` 在 0.4.2 的仓库里生成一个自称 v0.4.1 的文件，
  并且 `docs/preview-0.4.1.html` 会被原地覆盖成 0.4.2 的内容——版本号与内容错配。
  不影响加载，但会让「这份预览是哪个版本」无法回答。
- **修法**：把版本提成一个常量 `const VERSION = '0.4.2'`（或从 `package.json` 读），
  三处字符串与输出文件名都用它。

### P2-2 产物里没有版本标记

- **位置**：`tools/build.mjs:29-38` 的 banner 只写 `// GENERATED FILE …`，无版本号。
- **后果**：§1 #23 这条「产物版本与 package.json 一致」**无法验证**——
  只能靠 mtime 猜。本次审计就是靠 `stat` + `artifactRev` 才把产物和 rev 对上，
  这个手段普通验收做不到。
- **修法**：banner 里加一行 `// ${name} v${version}`，由 `build.mjs` 读 `package.json` 注入。
  这样 `git diff client.js` 一旦跨版本就会带出这一行。

### P3-1 `pnpm-lock.yaml` 里没有 `dsh-bot-board`

- **位置**：`~/.dsh/profiles/desktop/pnpm-lock.yaml` 的 `importers['.'].dependencies`
  只有 5 个包，不含 `dsh-bot-board`；`node_modules/.modules.yaml` 的 `hoistedLocations` 同样没有。
- **说明**：`package.json:8` 声明了 `file:` 依赖，但软链是手工 `ln -sfn` 建的，
  pnpm 并不知道它。
- **后果**：不影响当前加载（loader 走 Node ESM 解析，不看 lockfile）。
  但插件管理器执行 `pnpm add <别的插件>` 时会按 `package.json` 重新解析并重建这个链接，
  届时软链会被换成 pnpm 风格的相对链接。**目标相同，所以不会断**；
  只是「手工软链」这个状态会消失，交接文档里那句「如果实际用的是软链方式」需要改写。
- **修法**：无需改代码。想彻底消除不确定性，跑一次 `pnpm install` 让 lockfile 收录它，
  或者接受「第一次 `pnpm add` 会把它正规化」。

### P3-2 `build.mjs` 打印的字节数是 UTF-16 长度

- **位置**：`tools/build.mjs:42` → `output.length`。中文注释使字符串长度比 UTF-8 字节数少 79。
- **后果**：`built client.js (111844 bytes)` 与 `wc -c` 的 `111923` 不符，
  用这个数字对账会以为产物被截断。
- **修法**：`Buffer.byteLength(output)`。

### 已确认**不是**问题的两处（避免后人重复怀疑）

1. **`ctx.on('agent/error')` 拿不到 `agent` 字段？** —— 拿得到。
   `dsh-agent-loop/lib/index.js:881` 只 `emit('agent/error', {turn, step, error})`，
   但 `agentEvents()` 的 `fused()` 会补上 `agent`（`dsh-agent/lib/index.js:243-248`），
   `dsh-api-session-controller` 正是这么用的（`:2994`）。
2. **`apply()` 被调两次会叠监听器？** —— 在同一个 ctx 上会（实测 2 个），
   但 cordis 每次 `apply` 都建一个新 fiber，`ctx.effect` 的 disposer 挂在那个 fiber 上，
   重载时旧 fiber 整体销毁。**不会泄漏。** 实测 disposer 跑完监听器与路由都归 0。

---

## 6. 特别检查：v0.4.2 新增的三样东西有没有破坏产物契约

| 新增项 | 是否进入产物 | 是否引入 Node-only import | 结论 |
|---|---|---|---|
| `tools/export-preview.mjs` | **不进入**。build 的唯一 entry 是 `src/client/index.js`（`tools/build.mjs:16`） | 它自己有 `node:fs`/`node:path`/`node:url`，但只在 Node 侧跑 | **无影响** |
| `panel.js` 的 `Head` / `summarize` 具名导出 | 进入（`Head` 被 `Board` 使用 `panel.js:609`；`summarize` 在 `:433`）。`export` 只是为了给 export-preview 复用 | 无 | **无影响**。注意它们**不在**插件对外的 `exports` 里——`client.js` 尾部的 `__export(index_exports,{apply,inject})` 只导出这两个 |
| `initialAttExpanded` prop | 进入，`Body` 的默认参数 `= false`（`panel.js:167`） | 无 | **无影响**。生产路径不传，走默认值 |

产物层面的硬证据：

- 全产物 `require` 目标集合 = `["react"]`（唯一一处，`client.js:38`）。
- 产物里 `node:fs` / `node:path` / `node:os` 出现 **0** 次。
- 产物在**只注册不执行**阶段不碰 DOM（我用一个「一读就置位」的 `document` getter 验证：
  注册阶段 `document` 从未被读）——符合 lazy-CJS 契约。
- `esbuild` 的 `platform: 'browser'` 本身就是闸门：任何 `node:` import 漏进
  `src/client/**` 都会在 `npm run build` 时直接构建失败，不会静默出货。

---

## 7. 真机验证的具体步骤（用户执行，我不执行）

只有一件事值得动手，约 30 秒。**不需要退出 DSH**——因为 §3 已经证明客户端在热重载，
真正没被外部观测到的只有那一个 HTTP 响应。

### 步骤 A：确认宿主路由（唯一待确认项）

1. 在 DSH 窗口按 `Cmd+Option+I` 打开 DevTools
   （profile 已开 `developerTools: true`，见 `~/.dsh/profiles/desktop/cordis.patch.yml:19`）。
2. Console 里粘贴：

   ```js
   await (await fetch('api/bot-board', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: '{}',
   })).json()
   ```

3. **期望**：一个对象，`ok: true`、`bots` 长度 9、`works` 长度 3、`stale: false`。
   - 若 `ok: true` → 第 26 项由「存疑」转「通」，全链路闭合。
   - 若 404 / HTML → 宿主路由没注册。此时再按 `Cmd+R` 重载一次窗口重试；
     仍 404 就说明 `connection` 服务在这个 build 里名字不同，需要回到 §2 复查。
4. 顺手在 Console 里看一眼有没有 `client-modules: could not load "dsh-bot-board"` 或
   `duplicate factory registration` 字样——有的话贴出来。

### 步骤 B（可选）：确认面板真的画出来了

Console 里：

```js
document.querySelectorAll('style[data-plugin="dsh-bot-board"], #bb-style').length
```

期望 `≥ 1`。`#bb-style` 由 `ensureStyle()` 在 `useEffect` 里注入（`style.js:269-276`），
有它就意味着 `Board` 组件已经挂载并跑完了 effect。

### 不需要做的事

- **不需要退出 DSH 重开**。v0.3.1 那条验收「退出 DSH 重开，确认面板加载」在客户端侧
  已经被 HMR 的 143 次实证覆盖。
- 但请注意：**HMR 只覆盖客户端半边**。改 `src/host/**` 之后必须重启 DSH 才生效
  （宿主没有 HMR，`ClientModuleRegistry.rebuilt` 只处理 client 产物）。
  这是团队工作流里值得写进交接文档的一条。

---

## 8. 一句话总结

产物契约、注册点、生命周期、安装配置四段全绿，**没有任何一条会阻止面板加载**；
而且这不是「代码看起来对」——运行中的 DSH 已经把当前这份 `client.js`
（rev `1e29c7b5d09d`，mtime 23:38:16）拉取并执行过 143 次。
唯一留白是运行进程内那一次 `/api/bot-board` 的 HTTP 响应，按 §7 的 30 秒步骤可闭合；
即便它失败，面板依然会渲染，只是「正在交接」区为空。
