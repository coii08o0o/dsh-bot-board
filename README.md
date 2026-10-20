# Bot 看板（dsh-bot-board）

给 DS Bot 加一块浮动的实时看板，专为「派完活盯进度」设计：**每个 Bot 现在在干什么、跑了多久、卡在哪一步、谁在等谁交活**，一眼看完，不用逐个点开会话。

这是一个 DSH 插件，配合 [DS Bot](https://github.com/Fei2411/DeepSeek-Bot)（包名 `ds-bot`）使用。它不改 DS Bot 的源码，只读它已有的接口和本地数据。

## 它显示什么

整体是**一间 Bot 教室**：奶油色房间（#FAF7F1），顶部一行图例，下面是工位网格（窄窗口自动变 2 列，可滚动）。每个工位从左到右是：椅子 + 木桌（桌上显示器、状态灯、桌面道具），桌后坐着一个圆圆的团子 Bot，工位下方是 Bot 名和一行元信息。

### 六种状态

| 状态 | 灯色 | 图例 | 含义 |
|---|---|---|---|
| 干活 | 绿 | 干活 | 正在跑（working / thinking / searching / sending / 转交中） |
| 等你 | 黄 | 等你 | 有审批或提问在等你 |
| 等交活 | 蓝 | 等交活 | 它在等**别的 Bot** 把活交回来，不是等你 |
| 卡住 | 红 | 卡住 | 报错了，且当前没有在干活 |
| 闲着 | 灰 | 闲着 | 什么都没干 |
| 干完 | 青 | 干完 | 刚接到一次干净的交接，7 秒后回落 |

「等你」和「等交活」是**两个状态**：一个要你动手，一个不用。混在一起会让黄灯天天误报，最后你就开始忽略它。

状态不只靠颜色：**卡住是菱形、等你方形、其余圆形**，每个灯还有 1px 描边。因为绿(#22C55E)和红(#EF4444)在红绿色盲下几乎是同一个点（ΔE 13.6），而它们在奶油底上的对比度只有 2.13:1 和 3.52:1——只靠颜色，最该分辨的一对反而最难分辨。显示器也分了三种画面：等你是一根竖线加感叹号，等交活是箭头，干活是三道进度条。

状态不只靠颜色：**卡住是菱形、等你方形、其余圆形**，每个灯还有 1px 描边。因为绿(#22C55E)和红(#EF4444)在红绿色盲下几乎是同一个点（ΔE 13.6），而它们在奶油底上的对比度只有 2.13:1 和 3.52:1——只靠颜色，最该分辨的一对反而最难分辨。显示器也分了三种画面：等你是一根竖线加感叹号，等交活是箭头，干活是三道进度条。

### 工位上的信息

```
[团子 + 显示器 + 状态灯]
数学
调用 Bash · 4m12s
```

- **当前动作**：正在调用的工具、正在说的话、或卡住的具体原因（`等你批 Bash` / `报错：模型超时` / `等 Chief、生物`）
- **已跑时长**：这一轮从什么时候开始，秒级刷新
- **超时变色**：干活超过 5 分钟，时长变琥珀色并加粗（可能卡住了，但还没报错）
- **失败徽标**：报错后又重新干活的 Bot，右上角留一个红色「!」，主状态回到绿色。这个徽标会自己消失：失败时间早于本轮起点，或 Bot 已连续干活超过 1 分钟，就判定为「已经恢复了」
- **hover** 看完整 title；**点击**打开详情抽屉

### 详情抽屉

点工位打开，不用跳会话就能看到：

- 角色、模型、状态、已跑时长、当前动作
- **等你审批时：这次调用要动的东西**（等宽代码块，可能是命令、文件路径或 URL——DS Bot 的 `detail.code` 取的是 `command|file_path|url|query` 里第一个非空值，所以标签写「具体内容」而不是「命令」）+ 审批原因
- **等你回答时：问题原文 + 所有可选项和说明**
- 最近一次报错的完整消息
- 最近一次交接回来的结果
- 底部「打开聊天 ↗」跳到那个 Bot 的会话

### 正在交接（面板底部）

只列出 `open > 0` 的活，通常 0–2 行：

```
正在交接
班主任 → 数学   4 项待交   12 分钟前
```

点一行跳到接收方的抽屉。空的时候整条不显示。

## 提醒

- 只在「等你审批/回答」和「报错」时弹系统通知，其他情况只变色，不打扰。
- 同一件事只弹一次；新的事才会再弹。
- 面板收起来时，胶囊上带「N 忙 · N 待 · N 等 · N 错」。

## 交互

- **拖动标题栏**移动面板，位置记住。
- **拖右下角**调整大小（默认 560×480，最小 420×320，最大 980×700），大小记住。
- **× 收起**成右下角胶囊，再点展开。
- **点工位**打开详情抽屉（抽屉里再点「打开聊天」跳会话）。
- 工位位置**按 Bot 固定**，状态变化不会让工位重排——位置是你记人的方式。

## 数据从哪来

| 数据 | 来源 |
|---|---|
| 每个 Bot 的实时状态、当前工具、已跑时长、审批与提问 | DS Bot 的 `POST api/bot`（`endpoint: "state"`），1.5 秒一次 |
| 派活记录（from/to/open/results）、房间名 | 宿主侧读 `~/.dsh/bot/state.json`，内存缓存，按 `mtime+size` 失效，5 秒一次 |
| 报错 | 宿主侧订阅 DSH 的 `agent/error`，按会话映射回 Bot，保留 15 分钟 |

只读取，不写任何文件，不改 DS Bot 的数据。

**轮询会降频**：面板收起或窗口隐藏时，两个轮询都降到 30 秒；连续失败时指数退避（最多 8 倍、上限 30 秒）。这不是省电，是因为 `api/bot` 的 `state` 端点在上游每次都会跑 `refresh + bootstrap + catalog + loadSecrets`，1.5 秒一次的代价比看起来大。

轮询循环是**单飞**的（`src/client/pollLoop.js`）：请求在途时收到 wake 会被忽略，由请求自己在落地后排下一个 tick。早期版本会去清一个已经触发过的 timer 然后再 fire，结果是每折叠/展开一次就多挂一条永久轮询链。

看板**不会**给 DS Bot 传 `locale`：那个字段在上游是全局 `uiLocale`，会改掉新建 Bot 的招呼语言和记忆语言。只读插件不该有这个副作用。

## 安装

插件目录就是本仓库，安装分四步：

1. 构建浏览器侧产物（源码在 `src/`，`client.js` 是生成的）：

```sh
npm install     # 只为 esbuild
npm run build
```

2. 在 profile 的 `package.json` 里登记（`~/.dsh/profiles/desktop/package.json`）：

```json
{
  "dependencies": {
    "dsh-bot-board": "file:/Users/admin/Documents/dsh-bot-board"
  },
  "dsh": {
    "profile": {
      "bundles": ["...", "dsh-bot-board"]
    }
  }
}
```

3. 建立依赖链接（本机网络不通时 pnpm 会卡在 GitHub 依赖上，软链最稳）：

```sh
ln -sfn ~/Documents/dsh-bot-board ~/.dsh/profiles/desktop/node_modules/dsh-bot-board
```

4. 完全退出 DeepSeek Harness 再打开，右下角出现「Bot 看板」面板。

## 开发

```
src/host/index.js      宿主侧：快照路由 + 失败存储
src/client/index.js    apply / slot 注册
src/client/rows.js     行构造（纯函数，可单测）
src/client/scene.js    状态优先级（纯函数，可单测）
src/client/station.js  工位 SVG + 元信息行
src/client/drawer.js   详情抽屉
src/client/handoffs.js 交接列表
src/client/panel.js    外壳、拖动、缩放、折叠
src/client/poll.js     两个轮询器（钩子）
src/client/pollLoop.js 轮询循环（纯对象，可用假时钟测试）（钩子）
src/client/pollLoop.js 轮询循环（纯对象，可用假时钟测试）
src/client/style.js    CSS
src/client/locale.js   中/英文案
tools/build.mjs        esbuild 打包成 __ModuleLoader__ 格式
tools/smoke.mjs        宿主快照 + 纯逻辑 + 产物契约 + CSS
tools/render-check.mjs 用 React 垫片真渲染一遍组件树
```

```sh
npm run build    # 改完 src/ 必须重新构建
npm run smoke
npm run render
npm run check    # 上面三步一起
npm run freeze   # 构建 + 打印 src/产物 两个指纹 + 跑两套检查（复核用）
```

复核时注意**指纹要说是算哪一批文件**：`src/` 单独算、`src+tools+产物` 一起算，得到的值完全不同。之前两个人对着报「哈希不一致」，其实是算法不同。

`react` / `react-dom` 在构建时保持 external，由 `__ModuleLoader__` 注入——打进 bundle 会产生第二份 React，hooks 直接报错。

## 已踩过的坑（给下次写插件的人）

- `connection.fetch.register` 的 `path` 必须**带前导斜杠**（`/api/bot-board`），不带斜杠会 404；路由是**精确路径名匹配**，不是前缀。
- `connection` 服务可能在 `apply()` 之后才就绪，必须用 `ctx.inject(['connection'], cb)` 等它，一次性 `if (!ctx.connection) return` 会让路由永不注册且毫无报错。
- 客户端 bundle 的 `__ModuleLoader__.load({id})` 里 id 必须等于包名，改名后不重打包会静默不加载。
- 面板挂在 `shell.overlay` 插槽，order 取 500 以上，避开 ds-bot 的 50/55/60。
- `rooms[].log[]` **没有时间字段**（只有 `seq`），想显示「几分钟前」得自己记。
- `works[].room` 是**房间 id**，不是 Bot id；用 Bot 表去查永远查不到名字。
- `bots[].sessionId` 是当前分段，`segments[]` 里只有已结束的分段——做会话→Bot 映射时两个都要收，否则 Bot 切过段之后新会话的报错会丢。
- `api/bot` 的 `state` 不是纯读接口，每次都跑 `refresh/bootstrap/catalog/loadSecrets`，别拿它做高频轮询。
- 桌面端改完插件必须**整个退出重开**；`osascript quit` 会触发系统自动化权限弹窗，直接 `killall -9 "DeepSeek Harness"` 最干净。

## 已知边界

- 面板常驻所有会话，不只在 DS Bot 里。
- 派活只显示 `state.json` 里还留着的记录；DS Bot 在子任务完成时会删掉子记录，历史链路会断，所以这里**不做链路图**，只做「正在交接」列表。
- 群聊面板没有做：`rooms[].log[]` 无时间字段，且本机实测群聊 0 使用率。
- 报错只能抓到 DSH `agent/error` 能覆盖的（模型/工具步骤失败）；网络层中断另说。
- 教室是刻意的浅色岛，文字固定深色。暗色主题下房间仍是奶油色——这是设计选择，不是漏改。
- DS Bot 升级后如果改了 `api/bot` 的字段，看板需要跟着调整。

## 卸载

从 profile 的 `bundles` 和 `dependencies` 里删掉 `dsh-bot-board`，删掉软链，重启。

## 版本

- `0.3.0` — 拆分源码 + 构建；修 8 个 P0（报错压制、暗色可读、工位跳动、waiting 语义、灯色、room 查错表、切段丢报错、群聊死代码）；新增已跑时长、审批详情、详情抽屉、交接列表；六态形状通道；轮询单飞 + 降频；i18n。
- `0.3.1` — 修 0.3.0 引入的轮询双链；去掉会改写上游 `uiLocale` 的 `locale` 字段；头部计数不再硬编码颜色；抽屉标签按真实契约改为「具体内容」；`ago()` 走 i18n；交接记录按 owners 表解析归属（切段后不再显示 session id）；失败徽标随恢复自动消失；默认高度 480。
- `0.2.0` — 教室场景、六种表情动作、拖动缩放。
