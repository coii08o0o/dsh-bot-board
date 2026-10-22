# dsh-bot-board v0.4.0 设计令牌与视觉规范

- 作者：设计系统专家 彩格调（Cai）
- 依据：`docs/REQUIREMENTS-0.4.0.md`（全文）、`src/client/{style,station,const,handoffs,panel,rows,scene,format,locale}.js`、`tools/{smoke,render-check}.mjs`、`docs/preview-class.png`
- 定位：把「三层注意力轴」落成可直接粘贴的 CSS 数值。**本文不改任何 `src/` 文件。**
- 设计基因：**Default (Neutral Modern) + 现有奶油教室的局部语汇**。不引入新设计系统——这块面板的身份是教室，教室承担「这是谁」，本次只补「要不要我管」的面积。视觉预算只花在尺寸、字重、缩进、计数、边界、底色层级上（需求 §8-B 的正向预算）。

---

## 0. 设计决策摘要

三层不是三个区，是一条单调递减的轴，靠**四个通道同时递减**编码：身份图像的**存在**（30px 团子 → 138px 教室 → 无）、**行高**（44 → 128 → 24）、**字重**（600 → 500 → 400）、**表面**（白卡 + 左侧状态条 → 房间地面 → 无表面）。禁止用色块分割：层级由「有没有图像、有没有表面、占多高」表达，颜色只表达状态。层 1 的形状灯对齐成一条右侧竖轨，三个形状可纵向比较，而不是满屏去找。层 2 只承载「在动」的人，交接边表缩进 14px 长在它内部。层 3 只剩名字与 `!` 徽标，是唯一没有图像、没有表面、没有灯的一层。

> 一个必须先说的实测结论：`#FFFFFF` 对 `#FAF7F1` 只有 **1.07:1**。**白色卡片的"抬升"在奶油底上不可见**，所以层 1 的层级感不能靠底色——靠的是 44px 的行节律、3px 左侧状态条（5.02:1 / 6.47:1）、以及右侧竖轨。这一条决定了 Q1 的全部做法。

---

## 1. 令牌表

### 1.1 色彩

| 令牌 | 值 | 用在哪 | 备注 |
|---|---|---|---|
| `--bb-room` | `#FAF7F1` | 房间地面（`.bb-body` 底） | **不变**，smoke 锁定 |
| `--bb-ink` | `#2C2C2A` | 房间显式深墨 | **不变**，smoke 锁定 |
| `--bb-ink-2` | `#4A4438` | 层 1 动作原文、交接分组头 | 新增（9.65:1 / 9.03:1） |
| `--bb-ink-3` | `#6B6558` | 时长、层 3 前缀、未标记的边计数 | 已有色，扩大用途（5.41–5.79:1） |
| `--bb-ink-4` | `#8A8577` | 箭头、装饰分隔 | 已有色（图形 3.44:1） |
| `--bb-ink-5` | `#5F594D` | 层 3 名字 | 新增（6.50:1） |
| `--bb-card` | `#FFFFFF` | 层 1 行底 | 对地面仅 1.07:1，**不承担层级编码** |
| `--bb-rule` | `#DDD6C8` | 层 2/层 3 之间的 1px 发丝线、交接表**底**线（表在网格之前，线在下沿） | 装饰性（1.35:1），不承担语义 |
| `--bb-edge-strong` | `#8F8776` | 需要 3:1 边界时（hover 内环、可选卡片描边） | 3.33:1 对地面 / 3.56:1 对白 |
| `--bb-amber` | `#8A5B00` | 交接「共 N 项」、被堵的边计数 | 已有色（5.49:1） |
| `--bb-amber-ink` | `#B45309` | 层 1 alert 左侧条、`被堵`/`互相等` 字样 | 已有 `.bb-stalled` 色（5.02:1 / 4.70:1） |
| `--bb-red-ink` | `#B91C1C` | 层 1 error 左侧条、`!` 徽标底 | 已有色（6.47:1） |
| `--bb-teal` | `#0F766E` | 空态摘要的 `✓` | 已有 `done` 色（5.12:1） |
| `--bb-focus` | `#378ADD` | 焦点环 | **不变**（3.59:1 / 3.09:1） |
| `LAMP.*` | 见 `const.js` | 六态灯填充 | **不改**，硬约束 |

**新增的层级底色：没有。** 层 1 用 `#FFFFFF`（弱），层 2 用房间地面本身（无表面），层 3 用无表面 + 发丝线。三层都不引入新的色块。

### 1.2 字号阶梯

| 令牌 | 值 | 行高 | 用在哪 |
|---|---|---|---|
| `fs-1` | `12.5px` | `1.4` | 层 1 名字（唯一比 12 大的字） |
| `fs-2` | `12px` | `18px`（层 2 名字，钉死） | 层 2 名字、层 1 动作原文 |
| `fs-3` | `11px` | `16px` | 时长、交接表全部、层 3 全部、头部计数 |
| `fs-4` | `10.5px` | `18px`（与名字同行） | 层 2 行内时长 |
| `fs-5` | `9px` | `12px` | 层 3 的 `!` 徽标字 |
| `fs-empty` | `11.5px` | `1.4` | 层 1 空态摘要（整层唯一内容，所以比动作原文大半档） |

阶梯只有 **4 档在用**（12.5 / 12 / 11 / 10.5），相邻两档差 ≥0.5px。**层与层之间不靠字号区分**（12.5 vs 12 vs 11 差得太小，单独不足以编码层级）；字号只承担「谁更重要一点点」，层级由 Q1 的四通道承担。

### 1.3 字重

| 令牌 | 值 | 用在哪 |
|---|---|---|
| `fw-1` | `600` | 层 1 名字、交接分组头、`共 N 项`、层 3 前缀、头部 `N 等你/N 卡住`（>0 时 700） |
| `fw-2` | `500` | 层 2 名字 |
| `fw-3` | `400` | 层 1 动作原文、时长、层 3 名字、交接边、未标记的边计数 |

**只有三档，且每一档对应一层。** 这是 Q1 的第二个通道。

### 1.4 间距刻度

基数 2，实际用到的只有：`2 / 3 / 4 / 6 / 8 / 10 / 14 / 44`。

| 令牌 | 值 | 用在哪 |
|---|---|---|
| `sp-layer-x` | `10px` | 三层的左右内边距（统一，让三层左边缘对齐） |
| `sp-att-gap` | `3px` | 层 1 行间距（**必须 ≤3**：再大就装不进 480 高度预算，见 Q7） |
| `sp-att-pad` | `6px 10px 4px` | 层 1 容器内边距（上 6 / 下 4） |
| `sp-run-gap` | `8px` | 层 2 网格间距 |
| `sp-ho-indent` | `14px` | 交接边相对分组头的缩进（>1em=11px，<箭头前进量） |
| `sp-att-inner` | `8px` | 层 1 行内各列间距（gap） |

### 1.5 圆角

| 令牌 | 值 | 用在哪 |
|---|---|---|
| `r-card` | `9px` | 层 1 行（比工位的 10px 小 1px：卡片比房间道具"硬"一点） |
| `r-chip` | `4px` | 层 3 名字的 hover/focus 底、`+N` |
| `r-edge` | `6px` | 交接边的 hover 底 |
| `r-pill` | `999px` | 徽标 |

### 1.6 行高

| 令牌 | 值 | 用在哪 |
|---|---|---|
| `lh-pin` | `18px` / `16px` / `12px` | 层 2 名字与时长 / 11px 文本 / 9px 徽标字。**全部钉成 px，不用倍数**——高度预算是算术断言，倍数会随字体族漂移。 |

### 1.7 三个高度常量（Q7 的答案，先给结论）

```js
// const.js 的现有导出（v0.4.3 已用 node --input-type=module -e 逐项复核，见 §13）
export const HEAD_H = 39              // 7 + 24(icon) + 7 + 1(border)
export const ATTENTION_ROW_H = 44
export const ATTENTION_GAP = 3
export const ATTENTION_PAD_V = 10     // 6 top + 4 bottom
export const IDLE_ROW_H = 24
export const PANEL_BORDER = 2         // .bb-panel 1px × 2，border-box：480 的面板里面是 478
export const SCENE_VB = { w: 170, h: 132 }
export const RUNNING_CELL_W = 138
export const RUNNING_CELL_H = 128     // = Math.ceil(cellHeight())，cellHeight = 0.7765*138 + 20 = 127.153
export const RUN_GRID_GAP = 8         // .bb-run-grid gap
export const RUN_PAD_B = 4            // .bb-run 下内边距（在滚动区内，计入 scrollHeight）
export const RUNNING_MIN_H = 96       // 层 2 的可见下限：整幅场景（团子+桌椅+显示器+灯）
export const LAYER_STABLE_MS = 1200   // < POLL_MS(1500)
```

| 断言 | 算式（每一项都能指到 `const.js` 的一行或一行 CSS） | 结果 |
|---|---|---|
| **C4a** 三行「需要你」+ 层 3 + 层 2 可见下限 ≤ 320 | `2 + 39 + (3*44 + 2*3 + 10) + 24 + 96` | **309 ≤ 320 ✓**（余 11） |
| **C4b** 两行「需要你」+ 一整行工位 + 层 3 ≤ 320 | `2 + 39 + (2*44 + 3 + 10) + 128 + 4 + 24` | **298 ≤ 320 ✓**（余 22） |
| **C4c** 三行「需要你」+ 两整行工位 + 层 3 ≤ 480（默认尺寸） | `2 + 39 + 132 + 6 + 10 + 2*127.153 + 8 + 4 + 24` | **479.31 ≤ 480 ✓**（余 0.694） |
| 需求原文 C4 `HEAD_H + 3*ROW + 2*CELL ≤ 320` | `39 + 148 + 256` | **443 > 320 ✗ 不可满足** |

需求原文那条**算术上不可能成立**，理由见 Q7。上面三条是可满足的替代断言，且分别对应三个真实场景。

**三条都含 `PANEL_BORDER = 2`。** 这是 v0.4.0 与 v0.4.1 初稿都漏掉的一项，也是「预算说层 2 有 269px、浏览器只给 267px」的全部原因：`.bb-panel` 是 `border-box` + 每边 1px，480 的面板里面是 478，不是 480。

**C4c 必须同时扣掉面板边框、grid gap 与 `.bb-run` 下内边距**——2 / 8 / 4px，漏掉任何一项就会得到一条「绿着的假话」（见 §8.2 与 §13）。C4c 用分数 `cellHeight() = 127.153` 而不是整数 128，是为了让 0.9px 级的溢出藏不住；C4b 用声明值 `RUNNING_CELL_H = 128`，因为那一行是按整格渲染的。

---

## 2. Q1 — 三层之间的视觉落差怎么编码

### 2.1 四通道递减表

| 通道 | 层 1「需要你」 | 层 2「在动」 | 层 3「闲着」 | 这处编码了什么 |
|---|---|---|---|---|
| **身份图像** | 30×30 团子头像（裁剪自同一 `blobSeat`） | 138×107 完整教室场景（桌椅+显示器+团子+道具） | **没有图像** | 「这个人值不值得占一张画」。图像面积比 900 : 14,787 : 0，是三层里最大的落差 |
| **行高** | 44px / 项 | 128px / 格 | 24px / 整层（9 个人共 24px） | 每单位信息分到的垂直预算。层 1 一项 = 44，层 3 一个人 = 2.7 |
| **字重** | 600（名字） | 500 | 400 | 声明强度。600 是「这条要你处理」，400 是「这条你只需知道存在」 |
| **表面** | 白卡 + 3px 左侧状态条 + 1px 阴影 | **房间地面本身**（无表面） | 无表面 + 一条 1px 发丝线 | 「这是不是一张卡片」。只有层 1 有卡片，所以卡片 = 有事情 |
| 行距 | 3px | 8px | 6px | 3px 让三行黏成一个对象（一次扫完），8px 让工位彼此独立（各自一间） |
| 边界 | 3px 状态条（深墨，5.02 / 6.47:1） | 无边框，仅 hover 内环 | 1px `#DDD6C8` 发丝线（仅层顶） | 只有层 1 有「硬边」。硬边 = 需要动作 |
| 缩进 | 0（左对齐 `sp-layer-x`） | 0 | 0；交接边 14px | 缩进只用在层 2 内部（边从属于人），不用于层间 |
| 计数 | 头部 `N 等你 · N 卡住`（常驻，0 也显示） | 无（看见几个就是几个） | `+N` 仅在溢出时出现 | 计数只出现在「看不见全量」的地方 |

**为什么不是重色块**：三块不同颜色的底（红/绿/灰）会把面板变成仪表盘套仪表盘，而且奶油岛里任何饱和底都是外来语（红底白字 6.47:1 看着"对"，但那是告警组件的语汇，不是教室的）。上表 8 个通道里 **6 个不依赖颜色**，颜色只出现在状态条和灯上（状态，不是层级）。

### 2.2 层的物理边界（怎么"分割"而不"切块"）

- 层 1 与层 2 之间：**层 1 容器的 4px 下内边距**。没有线。理由是层 1 的白卡自带投影，卡片的下边缘就是边界。
- 层 2 与层 3 之间：**一条 1px `#DDD6C8` 发丝线**（层 3 的 `border-top`）。这条线是必需的：层 3 没有表面，没有它名字会"漂"在教室的桌面下方，读起来像教室的图注。
- 层 2 内部：无边界。教室是一整幅。

### 2.3 右侧竖轨（层 1 的形状灯对齐）

层 1 三行的 12px 灯全部贴右边缘（action 列的 `flex:1` 把它们顶到右侧），形成一条**竖直的形状列**。这处编码的是「比较」：三个形状纵向对齐后，菱形 vs 方形是一次眼球不动的比较；而 0.3.4 里它们散落在 9 个格子里，比较需要 9 次扫视。

---

## 3. Q2 — 层 1 列表行在 420px 宽下怎么排

### 3.1 可用宽度推导

```
面板宽                        420
− .bb-panel 左右边框           −2    (PANEL_BORDER，border-box)
− .bb-attention 左右内边距     −20   (sp-layer-x = 10 × 2)
= 行外框                      398
− 行左内边距 7 + 左侧条 3      −10
− 行右内边距                   −8
= 行内容宽                    380
```

### 3.2 列宽分配（flex 具体值）

| # | 列 | 声明 | 420 下实占 | 说明 |
|---|---|---|---|---|
| 1 | 团子头像 | `flex:0 0 30px; width:30px; height:30px` | 30 | 不可压缩 |
| — | gap | `8px` | 8 | |
| 2 | 名字 | `flex:0 0 auto; max-width:68px` | ≤68 | 3 个中文 = 37.5px（12.5px 字）；`Researcher` 10 拉丁 ≈ 67px，正好撞上 68 上限 |
| — | gap | `8px` | 8 | |
| 3 | **动作原文** | `flex:1 1 auto; min-width:0` | **202** | **唯一可伸缩、唯一可被裁的列** |
| — | gap | `8px` | 8 | |
| 4 | 已跑时长 | `flex:0 0 auto; min-width:44px; text-align:right` | 44 | `12m34s` = 6 字符 × 6.6 ≈ 40；`1h03m` ≈ 33 |
| — | gap | `8px` | 8 | |
| 5 | 形状灯 | `flex:0 0 12px` | 12 | 竖轨锚点 |
| | **固定合计** | | **178** | |
| | **动作原文净宽** | `380 − 178` | **202** | 202 / 12.5 ≈ **16.2 个中文字** |

### 3.3 超长时谁让位

**只有第 3 列让位**，规则写在 `flex` 上，不写在 JS 里：

- 第 1、2、4、5 列全是 `flex:0 0 auto`（`flex-shrink:0`）→ **永不收缩**。
- 第 3 列 `flex:1 1 auto; min-width:0` → 吃剩余、并在超长时被裁。

优先级理由（这处编码了什么信息）：**身份（头像+名字）和时长是结构性的，动作原文是散文**。散文有抽屉作为出口（`title` + 抽屉正文），结构没有。所以散文让位。

**与 `rows.js` 的巧合验证**：`PHRASE = 16`，即动作原文最长 17 字（含省略号）≈ 204px，比可用宽 202px 多 2px——**两者在同一数量级上吻合（差不到一个字）**：正常状态下动作原文不会被裁，只有 `clip(failure.message, 22)` 这种异常长的报错才会出现 `…`。这是可接受的设计：异常长的东西本来就该去抽屉看。

### 3.4 44px 行里 28–32px 的小像够不够呼吸

- 44 − 30 = **14px，上下各 7px**。
- 判据：行的视觉重心由「头像块 + 文本块」共同构成，两者都是 30px 级高度，行内无第二行文本（动作原文与时长同基线），所以 7px 的余量读起来是「一块内容 + 一点留白」，不是「一个头像悬在空行里」。
- 上限：44px 行里小像最大 **32px**（44 − 2×6）。取 30 而不是 32，是为了给头像右上角留 2px 安全区（徽标在层 1 不显示，但留位以免未来加徽标时破相）。
- 下限：28px 时眼睛只有 2.1px 宽、嘴弧线 0.94px，**会糊**。所以 **28 是不可用的下限**，30 是实际最小值。
- 44px 同时满足 WCAG 2.5.5（指针目标 44×44 AAA）。这是取 44 而不是 40 的第二个理由：40 只剩 5px 呼吸，且低于 44 的指针目标。

### 3.5 头像怎么来（不新增资产）

层 1 的头像是**同一个 `blobSeat` 的裁剪**，不是新画法：

```jsx
<svg width="30" height="30" viewBox="56 24 60 60" aria-hidden="true">
  {blobSeat(scene, seatOf(bot))}
</svg>
```

- `viewBox="56 24 60 60"`：x 56–116 覆盖团子（60–112）与两只手（59–113）；y 24–84 覆盖头顶饰品顶点（26）到团子下缘上方 6px。脸盘（y 44–80）完整。
- 缩放 30/60 = 0.5：团子身 Ø26、脸盘 Ø18、眼睛 2.5×4.5px、嘴弧 1px —— 30px 下可辨。
- **不包含**桌子、椅子、显示器、道具（它们在 `Station` 的兄弟节点里，不在 `blobSeat` 内，所以天然被排除）。
- 这处编码了什么：**同一张脸**。列表行和教室里的团子是同一个角色，用户不需要建立新的映射。这也是为什么不能换一套"头像画法"。

**层 1 的头像必须是静止的**（两条 CSS，不加 keyframe）：

```css
.bb-att-avatar .bb-blob,.bb-att-avatar .bb-eyes{animation:none}
```

理由：层 1 的任务是「读」，呼吸+眨眼在最重要的三行里是竞争注意力的噪声；且活跃度已由灯编码。

---

## 4. Q3 — 六态形状灯在三档尺寸下的规格

### 4.1 先给一个必须先承认的事实

现有六态里 **error = 菱形、alert = 方形、busy/waiting/done/idle 四种都是圆**。所以：

- **形状只能区分 2 组**（菱形 / 方形 / 圆）。
- 四个圆态之间的区分**只能靠填充色**，而绿(`#22C55E`) / 黄(`#EAB308`) / 灰(`#D3D1C7`) 在奶油底上的亮度对比只有 2.28 / 1.92 / 1.53:1，**互相之间的 ΔL 极小**——对红绿色盲和低视力用户，这四个圆是同一个灰点。

**结论：灯不可能单独承担六态可辨。** 这不是灯的尺寸问题，是通道数量问题。所以三档尺寸的任务不是「让灯自己说清六态」，而是「让灯在自己的层里完成它该完成的那一份」，其余由别的通道补。

> **v0.4.2 审计修正（2026-10-22）**：本节原先写「层 2 出现六态全部」，并据此说「层 2 的 5.23px 菱形 vs 圆形可比」。**这是错的。** `layerOf()` 把 `alert`/`error` 全部提到层 1，层 2 只剩 `busy ∪ waiting ∪ done` —— **这三种全是圆**。所以层 2 里不存在菱形、也不存在形状比较：那一档的灯只是「这个人现在不是闲着」的一个色点，形状通道在层 2 **完全不起作用**。5.23px 这个数字仍然是有效的（它保证灯本身可见），但它不再是「形状可辨」的尺寸，而是「色点可辨」的尺寸。原来那句「菱形 vs 圆形可比」是拿层 1 的性质去描述层 2，属于跨层套用。

### 4.2 三档规格

| | 层 1（44px 行） | 层 2（138px 工位） | 层 3（24px 行） |
|---|---|---|---|
| 灯的尺寸 | **12×12**（CSS px） | 5.2 × (138/170) = **4.22px** | **不放灯** |
| 描边 | 1.5px（12 单位坐标系内） | `strokeWidth` 0.8→**1.2**（渲染后 0.97px） | — |
| 轮廓外接盒（含描边） | **13.5px** | **5.19px**（6.4 × 138/170 = 5.195，截断） | — |
| 出现哪些态 | 只有 alert（方形）/ error（菱形） | **只有 busy / waiting / done —— 三种全是圆，形状不承担任何区分** | 无 |
| 非颜色通道 | ①形状（2 种，13.5px 无歧义）②动作原文里的**词**（`等你批` / `报错`） | ①**显示器屏幕图形**（36×21px：进度条 / 红条 / 勾 / 箭头 / 叹号 / 空屏）②名字色 `NAME_INK`（**没有形状通道可用**） | ①`!` **字形**（12px 实心圆 + 字形）②名字色 |
| 这处编码了什么 | 「这一行是哪一类要你动手」（一次点击能恢复吞吐 vs 已经跑不动） | 「这个人现在在干什么」——屏幕是**唯一**的主通道，灯只是「非闲着」的色点 | 「这个闲人有历史包袱」——`!` 是形状不是颜色 |

### 4.3 形状识别的最小尺寸依据

- **判据：轮廓外接盒（含描边）≥ 4px。** 依据：菱形的顶点要在栅格上落成一个可辨的角，需要顶点两侧各有 ≥2 个未抗锯齿的设备像素；菱形 4px 时填充面积 8px²，圆形 12.6px²，差值 4.6px² 分摊到 4 个角是每角 1.15px²——已低于 1 个像素，所以 4px 是硬下限。这是需求里「4px 以下分不出来」的量化来源。
- 层 1 的 13.5px = 下限的 **3.4 倍**，宽裕。
- 层 2 的 5.19px = 下限的 **1.30 倍**（5.195 / 4）。**注意两件事**：① 格宽不是被灯反推出来的，是被高度预算决定的（§8.3），灯只是校验项不是约束项；② 层 2 里三种灯**全是圆**，所以这个 5.19px 验的是「色点可见」，不是「形状可辨」——层 2 真正的图形通道是显示器屏幕（36×21px）。
- **描边必须 ≥0.95 渲染像素。** 判据：1× DPR 下一条 0.95px 的线仍覆盖 95% 的像素行，读作连续实线；低于 ~0.8px 覆盖率掉到 8 成以下，被抗锯齿摊成一层浅灰。这是现有实现的真实缺陷：`strokeWidth:0.8` 在 138 宽下只有 **0.65px**（0.8 × 138/170 = 0.649），`idle` 灯（填充 1.53:1）几乎消失。改 `1.2` 后是 **0.97px**（0.974），达标（2× DPR 下 1.95 设备像素）。
- **测的是轮廓，不是填充。** 六个灯的形状可辨性来自 `#5B5648` 的轮廓剪影（6.84–7.32:1），填充只提供色相。这条让 `idle` 灯在低对比填充下依然是一个可见的圆。

### 4.4 格宽 138 是怎么定的（只有一个约束在起作用）

```
约束 A（高度预算，唯一有效约束）：
  层 2 可用 = 480 − 2(面板边框) − 39(头) − 148(3 行需要你) − 24(闲着) = 267
  2 × 格高 + gap 8 + pad 4 ≤ 267，格高 = 0.7765 W + 20
  → 2 × (0.7765W + 20) + 12 ≤ 267  →  W ≤ 138.4  →  取 138
约束 B（灯可辨，校验项）：轮廓 = (5.2 + 1.2) × W/170 ≥ 4  →  W ≥ 106.3
校验 W = 138：A 满足（2 × 127.153 + 12 = 266.31，余 0.694px；浏览器实测 0.72px，见 §13）
              B 满足（5.19px，1.30 倍）
```

三个容易算错的地方，写在这里防止再犯：

1. **`+20` 不是 `+19`**：格高 = 场景 + `margin-top:1px` + 18px 名字行 + `padding-bottom:1px`。
2. **`W ≥ 130.8` 是错的**：那是把「填充 5.2 单元 ≥4px」当成判据（`4×170/5.2`）。而 4.3 已经明确「测轮廓不测填充」，正确下限是 `4×170/6.4 = 106.3`。v0.4.0 初稿把这个数写成了 130.8，于是误以为格宽会撞下限——实际它离下限还有 1.30 倍。
3. **`269` 是错的**：`480 − 39 − 148 − 24` 漏了 `PANEL_BORDER = 2`。`.bb-panel` 是 `border-box`，480 的面板里面只有 478，所以层 2 拿到的是 267px，不是 269px。v0.4.0 用 269 反推出 `W ≤ 139.8` 并取了 139，于是 C4c 在真实浏览器里溢出 0.9px——这是同一处漏算的两个后果（预算偏乐观 2px，格宽多取 1px）。

> 结论：**灯的尺寸不是这道题的自由变量，高度预算是。** 一旦把灯当成约束，就会为了"保住灯"而放过一条假绿的高度断言（v0.4.0 初稿的 C4c 正是这么来的）。

### 4.5 灯的实现：一个 `Lamp` 组件，三个尺寸

不要用 CSS 画（`transform:rotate(45deg)` 会让菱形的外接盒涨到 17px，撞到邻居，且描边宽度不可控）。用一个 12 单位的 SVG，`size` 缩放：

```jsx
// 新增，12 单位坐标系；size ∈ {12, 14, 16}
// error → diamond；alert → square；busy/waiting/idle/done → circle
// fill = LAMP[scene]，stroke = '#5B5648'，strokeWidth = 1.5（12 单位坐标系内）
const SHAPE = {
  circle:  { tag: 'circle', cx: 6, cy: 6, r: 4.5 },
  square:  { tag: 'rect', x: 1.7, y: 1.7, width: 8.6, height: 8.6, rx: 1.3 },
  diamond: { tag: 'rect', x: 2.4, y: 2.4, width: 7.2, height: 7.2, rx: 0.8,
             transform: 'rotate(45 6 6)' },
}
```

| 用途 | size | 轮廓 |
|---|---|---|
| 层 1 竖轨 | 12 | 13.5/12 单位 = 13.5px（菱形对角线 7.2×1.414 + 1.5 = 11.68 单位 ✓ 不溢出） |
| 图例抽屉 | 16 | 18px |
| 抽屉头部 | 14 | 15.75px（**顺手修掉现有 8px 纯色圆点的可访问性缺陷**） |

同一个组件供三处使用 → **图例和现场的灯永不漂移**，这是图例降级（Q6）能安全成立的前提。

---

## 5. Q4 — 交接分组边表怎么画

### 5.1 位置

放在 `.bb-run` **内部、网格之前**（`.bb-run` 是唯一的滚动区；`panel.js:251-254` 的 DOM 顺序是先 `Handoffs` 后 `.bb-run-grid`，导出预览实测 `hoBeforeGrid = true`）。这处编码了什么：这张表解释的就是它**下面**那些人，所以它在同一个滚动区里；它不是面板的页脚（0.3.4 的错误是把它做成 `.bb-body` 的兄弟节点、贴在面板最底）。

**为什么是「之前」而不是「之后」**：6 个 Bot 全在跑时，两行工位 = `2 × 127.153 + gap 8 + pad 4 = 266.31px`，而 `.bb-run` 在 560×480 下正好给 `480 − 2 − 39 − 148 − 24 = 267px`，余 **0.694px**。**所以交接表和两整行工位不可能同时完整可见**，必须选一个先看。选交接表，理由有两条：① 工位位置有肌肉记忆（README「位置是你记人的方式」），滚下去看格子代价小；② 「哪些账还开着」是每次都要重新读的新信息，而交接关系恰恰是这块面板新增的那一半答案。

另一条缓解是**把总数提到头部**：`.bb-sum` 增加 `N 项在交接`（头部那一行本来就要重写，零新增像素）。这样完全不滚动时「有没有交接」仍然在视线第一行，「谁压着谁」才需要滚动。

3 个 Bot 在跑时（1 行 = 127.153 + pad 4 = 131.15px），层 2 的 267px 里表可以占到 135.85px，两个分组（各 20px 组头 + 18px/边）完整可见——而交接表存在的前提通常就是「有人在等」，那种状态下在跑的人往往不多，所以这不是罕见的退化路径。

### 5.2 结构

```
.bb-handoffs
  .bb-ho-group                      ← 分组，margin-bottom:6px
    .bb-ho-group-head               班主任 · 共 7 项
    .bb-handoff[role=button]        → 数学 4 项 · 12 分钟前
    .bb-handoff[role=button]        → 物理 3 项 · 8 分钟前
  .bb-ho-group
    .bb-ho-group-head               数学 · 共 4 项
    .bb-handoff[data-mutual=true]   ⇄ 班主任 3 项 · 5 分钟前 · 互相等
```

### 5.3 数值

| 元素 | 规格 | 这处编码了什么 |
|---|---|---|
| `.bb-handoffs` | `margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #DDD6C8; font-size:11px` | 一条发丝线 = 「上面是注释，下面是正文」。不加底色、不加面板边框。线在**下**沿，因为表在网格之前 |
| `.bb-ho-group` | `margin-bottom:6px`（`last-child` 为 0） | 组间距 > 边间距，分组边界靠呼吸而不是靠线 |
| `.bb-ho-group-head` | `font-size:11px; font-weight:600; color:#4A4438; line-height:16px; padding:2px 0` | 600 + 深墨 = **结构性**（谁是瓶颈）。与边同字号，只用字重和颜色区分 |
| `.bb-ho-total`（`共 N 项`） | `color:#8A5B00; font-variant-numeric:tabular-nums` | 琥珀色只给「数量」。**「共 N 项」是整张表的答案**：组最大 = 瓶颈 |
| `.bb-handoff` | `height:18px; padding:0 0 0 14px; display:flex; gap:6px; align-items:center; font-size:11px; border-radius:6px` | 缩进 14px = 从属。14 > 1em(11px) 所以左边缘明显内收；14 < 箭头前进量所以箭头不挂到外面 |
| `.bb-ho-arrow` | 用字符 `→`，`font-size:12px; color:#8A8577; flex:none` | **不用 CSS 画线。** 理由：①`→` 本身是**方向语义**（派活方向），这正是需求要钉死的歧义，画一条线反而丢掉方向；②一个字形在任何宽度、任何换行下都不破；③已在 DOM 里，零成本。这处编码的是「谁派给谁」 |
| `.bb-ho-name` | `color:#2C2C2A; flex:0 0 auto; max-width:72px; 省略号` | 深墨 = 实体（接收方是人）。比分组头更深、更轻（400） |
| `.bb-ho-count` | 默认 `color:#6B6558; font-weight:400`；`data-blocked="true"` 时 `#8A5B00; font-weight:600` | 见 5.4 |
| `.bb-ho-time` | `margin-left:auto; flex:none; min-width:56px; text-align:right; color:#6B6558; tabular-nums` | 右对齐成列 = 可纵向比较"多久了" |
| 上限 | 3 个分组、每组 3 条边；溢出渲染 `还有 N 人` / `还有 N 项`（`.bb-ho-more`，11px，`#6B6558`） | 有界高度，且**溢出保留计数**（不丢信息）。`topologyOf()` 本身返回全量，上限只在渲染层 |

### 5.4 「接收方正在忙」与「真被堵」的区分（语义正确性）

`data-blocked` 三值，由**接收方当前的 `scene`** 决定，不由 `works` 决定：

| 接收方 scene | `data-blocked` | 计数样式 | 附加词 | 读作 |
|---|---|---|---|---|
| `alert` / `error` | `"true"` | `#8A5B00` + `600` | `被堵`（`.bb-ho-flag`，`#B45309`，600） | 这个人现在动不了，这笔账在等 |
| `busy` | `"false"` | `#6B6558` + `400` | 无 | 这个人正在还账，别去催 |
| `waiting` | `"false"` | `#6B6558` + `400` | 无 | 他也在等别人，链条在转 |
| `idle` / 未知 | `"idle"` | `#6B6558` + `400` | `未开工`（`#6B6558`，400） | 有账但没人管（该看一眼，但不是"堵"） |

三条设计要点：

1. **默认态是「无强调」**。六态里只有两态会加像素（`被堵` / `未开工` 两个词）。这处编码了什么：**被标记 = 异常，没标记 = 正常**。反过来的做法（正常态加"进行中"标记）会让每一行都在喊。
2. **`busy` 绝不给 `data-blocked="true"`**，直接满足 B4。而且因为「无强调」是默认，实现时**最省事的写法就是正确的写法**——不需要额外判断。
3. **`⇄` + `互相等` 双通道**：`⇄` 替换 `→`（形状变了），`互相等` 是词（语义）。`⇄` 单独出现是谜语，所以必须配词。`data-mutual="true"` 时箭头色提到 `#B45309`。

---

## 6. Q5 — 层 3 的「一行名字」具体长什么样

### 6.1 420px 下装得下 9 个名字吗：算一遍

```
可用宽 = 420 − 2(面板边框) − 20(层左右内边距) = 398
预算 = 398 − 18(IDLE_SLOP，吸收估算误差) = 380（= layers.js 的 IDLE_BUDGET，推导不是手写）
前缀「闲着」 = 2 × 11 = 22，+ gap 6 = 28（IDLE_PREFIX）
9 个名字 = 班主任 33 + 数学 22 + 物理 22 + 化学 22 + 生物 22 + 语文 22 + 英语 22
          + Chief 31 + Researcher 62  = 258（nameWidth：CJK 11px/字，拉丁 6.2px/字）
每个名字的 `.bb-idle-name` 左右内边距 = 4 × 9 = 36（NAME_PAD）
8 个 item 之间的 gap = 8 × 6 = 48（gap 只在项之间，不在末尾）
合计（无徽标）= 28 + 258 + 36 + 48 = 370 ≤ 380 ✓（余 10）
+ 1 个徽标（14）= 384 > 380 ✗ → 从尾部删掉第一个不带徽标的项（Chief），`overflow = 1`
```

**结论：不换行、不加分隔点，用 6px gap。9 个名字刚好装得下（余 10px）；只要有 1 个 `!` 徽标，第 9 个名字就会让位给 `+1`。**

（v0.4.3 按 `layers.js` 重算过这一段：旧版写的 337px 既漏了每个名字 4px 的内边距，又把 gap 算成了 9 个——两处误差方向相反，于是"9 个名字装得下"这个结论碰巧是对的，"4 个徽标才溢出"是错的。见 §13。）

- **不加分隔点**（`·`）：加 8 个点 + 8×2 gap 就是 +128px，直接爆。用 gap 代替分隔，靠 6px 的白空间分组——11px 中文之间 6px 已足够断开。
- 这处编码了什么：**层 3 是"名字的集合"，不是"名字的列表"**。没有分隔符、没有灯、没有图像，只有名字本身，所以它读起来是一句话而不是一行控件。

### 6.2 溢出降级规则（`idleLine()`，纯函数，可单测）

```js
// 输入：层 3 的 rows（名册序）；输出：{ items, overflow }
// 宽度估算表：CJK 11px/字，拉丁 6.2px/字，名字内边距 4，徽标 14，gap 6，前缀 28
// 预算 380 = IDLE_USABLE(398) − IDLE_SLOP(18)，两个数都从 SIZE_MIN.w 推出来，不手写
```

1. 按**名册序**全部纳入，累加宽度。
2. 超预算时，**从尾部删掉第一个不带徽标的项**，重复直到装下。
3. 若剩下的全是带徽标的项仍超预算，继续从尾部删，`overflow += 1`。
4. `overflow > 0` 时渲染 `+N`（`.bb-idle-more`，11px/600 `#6B6558`，`role="button"`）。

为什么是「从尾部删不带徽标的」而不是「徽标优先排序」：**排序会让名字移动**，而层 3 的名字是位置记忆的一部分（README：「位置是你记人的方式」）。这条规则保住名册序，同时保住 0.3.4 的成果（徽标永不丢，满足 D1）。

### 6.3 `+N` 的出口（可点击、可键盘）

点 `+N` → `.bb-idle` 加 `data-expanded="true"`：`height:auto; max-height:44px; flex-wrap:wrap; padding:4px 10px`，展开成最多两行、显示全部名字。这是**用户主动触发的布局变化**，不受"静置不跳"（F3）约束。`+N` 是 `role="button"` + `tabIndex=0` + Enter/Space + 焦点环。

### 6.4 可点击性与 tab 序

- 每个名字是 `role="button"` + `tabIndex=0` + Enter/Space → 打开该 Bot 的抽屉。
- Tab 序：层 1（≤3）→ 层 2 工位（≤9）→ 层 3 名字（≤9 + `+N`）。合计 ≤22 个 tab stop。层 3 排最后符合注意力轴。
- 名字 hover/focus 用 `r-chip` 4px 圆角 + `rgba(44,44,42,.06)` 底，不改变行高（24px 预算）。

### 6.5 全闲时的完整形态

```
[✓] 没有需要你的事                                  ← 层 1 空态，28px
（层 2 不存在）
闲着  数学  物理  化学  生物  语文  英语  Chief  Researcher   ← 层 3，24px
```

主体区 52px，其余是房间的空白。这处编码了什么：**「我查过了，没事」**。安静本身是内容，不是缺失。

---

## 7. Q6 — 图例降级后的六态可辨性

### 7.1 三层替代（零常驻像素）

| 通道 | 做法 | 常驻成本 |
|---|---|---|
| **① 形状 + 词** | 层 1 的动作原文已经把状态写成词（`等你批 Bash` / `报错：模型超时`）；层 2 的工位 `title` 已含状态名；层 3 的 `!` 是字形 | **0** |
| **② 图例抽屉** | 头部新增一个 `?` 图标按钮（复用 `.bb-icon`，24×24），点开复用现有 `.bb-drawer` 组件（`role=dialog`、`aria-modal`、焦点陷阱、Esc、焦点回归全部免费继承），六行 = `Lamp(size=16)` + 状态名 + 一句人话 | **0**（宽 24px，且替换掉的 27px 常驻图例行净省 3px 高度） |
| **③ hover 提示** | 每盏灯 `title` + `aria-label` 带状态名；每个工位 `title` 已含状态名 | **0** |

**不做「首次出现时短暂显示」**：那会在首帧插入一个 20px 区块（一次布局跳动），而 F3（静置不跳）是本项目的底线；且用户每天扫几百次，只收益第一次。抽屉是常驻可达的、按需的、零像素的，比一次性提示好。

### 7.2 为什么必须是同一个 `Lamp` 组件

图例抽屉里的 16px 灯、层 1 的 12px 灯、层 2 的 SVG 灯**必须同源**。否则半年后有人调了现场的灯、忘了图例，图例就开始撒谎——而图例是用户唯一的参考系。所以 §4.5 的 `Lamp` 组件是 Q6 的技术前提。

### 7.3 C2 的替代断言（不要直接删旧断言）

```js
// 打开图例抽屉，遍历六态，断言每一态的名字都出现
const sheet = render(LegendSheet({ t }))
for (const key of ['busy','alert','waiting','error','idle','done'])
  check(textOf(sheet).includes(t(`legend.${key}`)), `${key} is still named`)
// 并断言六态各有形状节点
check(findAll(sheet, n => n.props?.className === 'bb-lg-lamp').length === 6, 'six shapes')
```

### 7.4 新增 i18n 键（zh/en 必须成对，smoke 会拦）

```
legend.help            六态说明 / What the six states mean
legend.hint.busy       正在跑一轮，不用你管 / Running a turn — nothing for you
legend.hint.alert      等你批或等你答 / Waiting for your approval or answer
legend.hint.waiting    在等另一个 Bot 交活 / Waiting for another Bot to hand back
legend.hint.error      出错了，跑不动 / Failed — it cannot continue
legend.hint.idle       闲着，没有活 / Idle, nothing running
legend.hint.done       刚交完活（7 秒后回落到闲着）/ Just handed back (idle after 7s)
attention.empty        没有需要你的事 / Nothing needs you
attention.overflow     还有 {n} 个 / {n} more
layer.idle             闲着 / Idle
ho.groupTotal          共 {n} 项 / {n} open
ho.blocked             被堵 / blocked
ho.notStarted          未开工 / not started
ho.mutual              互相等 / waiting on each other
ho.morePeople          还有 {n} 人 / {n} more
ho.moreItems           还有 {n} 项 / {n} more
panel.sumHandoff       {n} 项在交接 / {n} open hand-offs
```

---

## 8. Q7 — 高度预算常量

### 8.1 需求原文那条断言不成立（算术）

```
HEAD_H + ATTENTION_ROW_H*3 + RUNNING_CELL_H*2 ≤ 320
```

要让 `RUNNING_CELL_H*2` 塞进 `320 − 39 − 148 = 133`，需要 `RUNNING_CELL_H ≤ 66.5`。

而工位格高 = `0.776 × 格宽 + 20`（场景 132/170 的比例 + 1px margin + 18px 名字行 + 1px 内边距）。`RUNNING_CELL_H = 66.5` → 格宽 = 60px。60px 的工位：灯 = `5.2 × 60/170 = 1.84px`，眼镜描边 = `2 × 0.35 = 0.71px`，屏幕进度条 = `3 × 0.35 = 1.06px`。**这不是"小一点"，这是缩略图，教室的细节全部糊掉。**

反过来：让灯守住 4px 轮廓下限需要格宽 ≥106 → 格高 ≥103；两行 = 206；加上头部和层 1 = `39 + 148 + 206 = 393 > 320`。

**所以「三行需要你 + 两整行教室 + 320px 高」在物理上装不进去。** 需求文档自己在 §2 算过 420 宽下一个工位 192px，C4 的算式和它自己的表格矛盾。这不是要否定需求——是要把一条**永远红着的断言**换成三条**永远绿着且对应真实场景**的断言，否则实现阶段会为了让它变绿而去压死教室（或者干脆把断言注释掉，那更糟）。

### 8.2 常量与三条断言

```js
export const HEAD_H = 39            // 7 + 24(icon) + 7 + 1(border)
export const ATTENTION_ROW_H = 44
export const ATTENTION_GAP = 3
export const ATTENTION_PAD_V = 10   // 6 top + 4 bottom
export const IDLE_ROW_H = 24
export const PANEL_BORDER = 2       // .bb-panel 1px × 2
export const RUNNING_CELL_W = 138
export const RUNNING_CELL_H = 128   // Math.ceil(0.7765*138 + 20) = Math.ceil(127.153)
export const RUN_GRID_GAP = 8       // .bb-run-grid gap
export const RUN_PAD_B = 4          // .bb-run 下内边距（在滚动区内，计入 scrollHeight）
export const RUNNING_MIN_H = 96     // 层 2 的可见下限
```

| 断言 | 覆盖的场景 | 算式 | 结果 | 层 2 实得 |
|---|---|---|---|---|
| **C4a** `PANEL_BORDER + HEAD_H + 3*ROW + 2*GAP + ATT_PAD_V + IDLE_ROW_H + RUNNING_MIN_H ≤ 320` | 最坏情况：3 件需要你 | `2+39+132+6+10+24+96` | **309 ≤ 320 ✓**（余 11） | 107px（场景 107.15px，底部 0.15px 落在地影上；名字行需下滚 20.15px） |
| **C4b** `PANEL_BORDER + HEAD_H + 2*ROW + GAP + ATT_PAD_V + RUNNING_CELL_H + RUN_PAD_B + IDLE_ROW_H ≤ 320` | 常见情况：2 件需要你 + 1 行在跑（F2 就是这条） | `2+39+88+3+10+128+4+24` | **298 ≤ 320 ✓**（余 22） | 154px（一整行工位 131.15px，含名字，余 22.85px） |
| **C4c** `PANEL_BORDER + HEAD_H + 3*ROW + 2*GAP + ATT_PAD_V + 2*cellHeight() + RUN_GRID_GAP + RUN_PAD_B + IDLE_ROW_H ≤ 480` | 默认尺寸：3 件需要你 + 6 个在跑 | `2+39+132+6+10+254.306+8+4+24` | **479.31 ≤ 480 ✓**（余 0.694） | 267px（**正好两整行** 266.31px，余 0.694px） |

三条都要在断言标签里写「预算，非实测」。另加两条守护断言：

- **`RUNNING_CELL_H ≥ ceil(RUNNING_CELL_W × 132/170) + 20`** —— 格高必须覆盖 132:170 的场景加 20px 名字行。**没有这条，单独缩格高会裁掉名字而 C4c 依然绿**。当前 `128 ≥ 128`，**余量 0px**：这条是刻意的紧箍——名字行从 18px 变成 19px、或格宽再涨 1px，都会立刻红。想动任何一边，必须同时重算 C4c。
- **溢出 chip 住在第 3 行内部**（`height:18px < ATTENTION_ROW_H`），所以「4 件以上需要你」的高度代价是 **0**，C4a 不需要第四条断言。代价转移到宽度上：chip 在场时动作原文从 202px 降到 **169px（≈13.5 个中文字）**，见 Q2。

> **修订记录（v0.4.0 → v0.4.1）。** 初稿的 C4c 写成 `39+148+268+24 = 479 ≤ 480`，是**绿着的假话**：漏了 `RUN_GRID_GAP`(8) 和 `RUN_PAD_B`(4)，且把 134.92 写成 134。真实需要 492.8px，超 12.8px——「默认尺寸不用滚」这个卖点是假的。同时 §4.4 的灯下限 130.8 也算错了（应为 106.3）。修正后 `139/128` 让 C4c 在纸面上零滚动（当时以为），且灯仍有 1.31 倍边际。**教训：预算断言里每一个 px 都要能指到一行 CSS，否则它只是注释。**
>
> **修订记录（v0.4.1 → v0.4.3）。** 上一条自己也还漏了一项：`PANEL_BORDER`(2)。所以 `139/128` 并没有真正零滚动——浏览器实测 `.bb-run` 只有 267px，第二行工位溢出 1px。格宽改为 138 后 C4c = 479.31 ≤ 480，余 **0.694px**（浏览器实测 0.72px）。三条断言现在都显式含这 2px。详见 §13。

### 8.3 为什么是 138/128 而不是"保持 176"

`RUNNING_CELL_H` 从 176 降到 128（−27%）不是审美选择，是被**一个**约束夹出来的（不是三个）：

1. **高度预算（唯一有效约束）**：`2 × 格高 + gap 8 + pad 4 ≤ 480 − 2(面板边框) − 39 − 148 − 24 = 267` → `2 × (0.7765W + 20) + 12 ≤ 267` → **W ≤ 138.4**。
2. **比例约束**：格高 = `0.7765 × 格宽 + 20`（场景 132/170 + 1 margin + 18 名字 + 1 pad）。
3. **灯可辨（校验项，不是约束项）**：轮廓 ≥4px → W ≥ 106.3。138 满足，1.30 倍。

取 **格宽 138 / 格高 128**：`2×127.153 + 12 = 266.31 ≤ 267`，余 **0.694px**（浏览器实测 0.72px）。

**缩小后 SVG 细节还读得清吗**——按 138/170 = 0.8118 缩放逐项核（单位值全部取自 `station.js`）：

| 细节 | 138 宽 | 判据 | 是否承载状态 |
|---|---|---|---|
| 灯轮廓（含描边，6.4 单位） | **5.19px** | ≥4 ✓ | **否**——层 2 只有 busy / waiting / done 三态，**全是圆**，形状通道在层 2 不起作用；轮廓只承担「边界」 |
| 眼睛（5×9 单位） | 4.06×7.31 | ≥3 ✓ | 是（情绪） |
| 眼镜描边（2 单位） | 1.62px | ≥0.8 ✓ | 身份 |
| 屏幕进度条（3 单位） | 2.44px | ≥2 ✓ | 是 |
| 勾（3 单位）/ 叹号（2.6 单位） | 2.44 / 2.11 | ≥2 ✓ | 是 |
| 道具最小描边（叶脉 1.2 单位） | 0.97px | 边际 | 否（纯装饰） |
| 桌椅 / 显示器 | 实心填充 | 无描边依赖 ✓ | — |

> **这一格曾经是错的，值得记下来。** 表里「灯轮廓…是否承载状态」原先写「**是（层 2 的形状通道）**」，而 §4.2 早已修正过同一句话：`layerOf()` 把 `alert`/`error` 全部提到层 1，层 2 只剩 `busy ∪ waiting ∪ done`，三种全是圆，层 2 里根本不存在形状比较。两处不一致的原因是**同一句话被抄了两份**——§4.2 修正时只改了它自己那一份，§8.3 的手抄本留在了旧版本上。这也是本文件唯一一处「结论级」错误（不是数字漂移），所以它比 0.9px 更危险：数字错会被浏览器抓住，结论错只有人会读出来。
>
> 同时删掉了原来的「原尺寸（173 宽）」一列：那一列里灯的 5.29 算的是**填充**（5.2 单位），而 138 一列的 5.19 算的是**轮廓**（6.4 单位），两列口径不同，放在一起会得出「灯几乎没变小」的假结论。现在只有一列，口径统一为「单位 × 138/170」。

**结论：128 是格高的声明值（= `Math.ceil(127.153)`），实际渲染高度是 127.153px**——C4c 装得下靠的是这个小数，不是 128（真按 128 排会是 `2×128 + 12 = 268 > 267`，超 1px）。所以这道余量只有 0.694px（Chromium 149 实测 `.bb-run` 267/267、`maxScroll = 0`），**格宽再涨 1px 就立刻红**（139 宽 = 127.933/格，两行 267.87，超 0.87px）。唯一跌破 1px 的细节是叶片叶脉那条 1.2 单元的装饰线（0.97px），它不编码任何状态。

### 8.4 高度不足时的行为（不重排、只滚动）

- `.bb-body` 是 flex 三带：层 1 `flex:none`、层 2 `flex:1; min-height:0; overflow:auto`、层 3 `flex:none`。
- **只有层 2 滚动。** 层 1 和层 3 永远在视口内 → 「有没有事要我动手」和「谁闲着」不需要滚动。
- 层 2 在 320px 高、3 件需要你时实得 107px（`320 − 2 − 39 − 148 − 24`）：场景高 107.15px，**整幅场景几乎全见**（差 0.15px，落在最底部的地影上），裁掉的 20.15px 是名字行（18 + margin 1 + pad 1 + 0.15），下滚可见。**不做任何"自适应缩小工位"**——缩小会让 C4c 与比例约束脱钩，比裁剪更糟。
- 层 3 严格 `height:24px; overflow:hidden; flex-wrap:nowrap`：**一旦换行就破 C4c 的 0.694px 余量**。溢出走 Q5 的 `+N` 降级，不走换行。

---

## 9. CSS 片段（可直接粘贴进 `style.js`）

> 全部替换/新增。**没有新增 `@keyframes`**；`prefers-reduced-motion` 块仍在文件末尾；四条既有焦点环断言全部保留并扩充。
>
> **数值来源**：下面写的是字面值，便于阅读与审查；**落地时必须从 `const.js` 插值**（`ATTENTION_GAP` / `ATTENTION_ROW_H` / `IDLE_ROW_H` / `RUNNING_CELL_W` / `RUN_GRID_GAP` / `RUN_PAD_B`），否则 CSS 就是高度预算的第二份手抄本——`.bb-attention-row{40px}` 这种改动会让 C4a 继续绿着说谎。

```css
/* ─────────────────── 头部：39px，计数先说「要不要你」 ─────────────────── */
.bb-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(0,0,0,.06);
  cursor:grab;user-select:none;touch-action:none}
.bb-head:active{cursor:grabbing}
.bb-title{font-weight:600;font-size:12px;white-space:nowrap}
.bb-sum{display:flex;gap:7px;font-size:11px;opacity:.75;white-space:nowrap;overflow:hidden}
/* 强调只用字重，不用硬编码颜色：头部跟宿主主题，硬编码色在暗色主题下会瞎 */
.bb-sum-hot{font-weight:700;opacity:1}
.bb-sum-quiet{font-weight:400;opacity:.55}
.bb-grow{flex:1}
.bb-icon{width:24px;height:24px;border-radius:8px;border:0;background:transparent;color:inherit;opacity:.55;
  cursor:pointer;font-size:14px;line-height:1;flex:none}
.bb-icon:hover{opacity:1;background:rgba(0,0,0,.05)}

/* ─────────────────── 主体：flex 三带，只有层 2 滚动 ─────────────────── */
.bb-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;
  padding:0;background:#FAF7F1;color:#2C2C2A}
.bb-notices{flex:none;max-height:64px;overflow:auto;padding:6px 10px 0}

/* ─────────────────── 层 1「需要你」 ─────────────────── */
.bb-attention{flex:none;display:flex;flex-direction:column;gap:3px;padding:6px 10px 4px}
.bb-attention-row{position:relative;display:flex;align-items:center;gap:8px;height:44px;
  padding:0 8px 0 7px;border-left:3px solid transparent;border-radius:9px;
  background:#FFFFFF;box-shadow:0 1px 2px rgba(44,44,42,.10);
  cursor:pointer;outline:none;overflow:hidden}
.bb-attention-row[data-scene="alert"]{border-left-color:#B45309}
.bb-attention-row[data-scene="error"]{border-left-color:#B91C1C}
/* hover 用 1px 内环而不是加底色：奶油底上加底色只有 1.06:1，等于没有反馈 */
.bb-attention-row:hover{box-shadow:0 1px 2px rgba(44,44,42,.10),inset 0 0 0 1px #8F8776}
.bb-att-avatar{flex:0 0 30px;width:30px;height:30px;border-radius:50%;overflow:hidden;
  display:grid;place-items:center;background:#FAF7F1}
.bb-att-avatar svg{display:block;width:30px;height:30px}
/* 层 1 是「读」的地方，呼吸和眨眼在这里是噪声；且活跃度已由灯编码 */
.bb-att-avatar .bb-blob,.bb-att-avatar .bb-eyes{animation:none}
.bb-att-name{flex:0 0 auto;max-width:68px;font-size:12.5px;font-weight:600;color:#2C2C2A;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 唯一可伸缩、唯一可被裁的列。散文让位，结构不让位 */
.bb-att-act{flex:1 1 auto;min-width:0;font-size:12px;color:#4A4438;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bb-att-time{flex:0 0 auto;min-width:44px;font-size:11px;color:#6B6558;text-align:right;
  font-variant-numeric:tabular-nums}
.bb-att-lamp{flex:0 0 12px;width:12px;height:12px}
/* 空态：一行摘要，不是空白。面板必须说「我查过了，没事」 */
.bb-att-empty{display:flex;align-items:center;gap:6px;height:28px;padding:0 2px;
  font-size:11.5px;color:#6B6558}
.bb-att-empty b{color:#0F766E;font-weight:600}
.bb-att-more{flex:none;display:inline-flex;align-items:center;height:18px;padding:0 6px;
  border-radius:9px;background:#F3EDE2;color:#4A4438;font-size:10.5px;font-weight:600;
  line-height:18px;cursor:pointer;outline:none;white-space:nowrap;
  font-variant-numeric:tabular-nums}
/* chip 住在第 3 行内部（18px < 44px），所以「4 件以上需要你」的高度代价是 0；
   代价转移到动作原文宽度：202px → 169px（≈13.5 个中文字） */

/* ─────────────────── 层 2「在动」：唯一的滚动区 ─────────────────── */
.bb-run{flex:1;min-height:0;overflow:auto;padding:0 10px 4px}
.bb-run-grid{display:grid;grid-template-columns:repeat(auto-fit,138px);gap:8px;justify-content:center}
.bb-run .bb-station{padding:0 0 1px;border-radius:8px}
.bb-run .bb-station:hover{background:rgba(44,44,42,.05);box-shadow:inset 0 0 0 1px #8F8776}
/* 层 2 的名字行：名字 + 时长同行，钉死 18px（高度预算是算术断言，不能靠倍数漂移） */
.bb-run .bb-station-name{display:flex;align-items:baseline;justify-content:center;gap:4px;
  margin-top:1px;font-size:12px;font-weight:500;line-height:18px;color:#2C2C2A}
.bb-run .bb-station-nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bb-run .bb-station-time{flex:none;font-size:10.5px;line-height:18px;font-weight:400;color:#6B6558;
  font-variant-numeric:tabular-nums}

/* ─────────────────── 层 2 内部：交接分组边表（在网格之前） ─────────────────── */
.bb-handoffs{flex:none;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #DDD6C8;
  font-size:11px;color:#2C2C2A}
.bb-ho-group{margin-bottom:6px}
.bb-ho-group:last-child{margin-bottom:0}
.bb-ho-group-head{display:flex;align-items:baseline;gap:6px;font-size:11px;font-weight:600;
  line-height:16px;color:#4A4438;padding:2px 0}
.bb-ho-total{color:#8A5B00;font-variant-numeric:tabular-nums}
.bb-handoff{display:flex;align-items:center;gap:6px;height:18px;padding:0 0 0 14px;
  font-size:11px;border-radius:6px;cursor:pointer;outline:none}
.bb-handoff:hover{background:rgba(44,44,42,.05)}
.bb-ho-arrow{flex:none;font-size:12px;line-height:1;color:#8A8577}
.bb-ho-name{flex:0 0 auto;max-width:72px;color:#2C2C2A;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}
.bb-ho-count{flex:none;color:#6B6558;font-variant-numeric:tabular-nums}
.bb-ho-time{margin-left:auto;flex:none;min-width:56px;text-align:right;color:#6B6558;
  font-variant-numeric:tabular-nums}
.bb-ho-flag{flex:none;color:#6B6558}
/* 被堵：唯一的加像素分支。busy/waiting 走默认（无强调）——最省事的写法就是正确的写法 */
.bb-handoff[data-blocked="true"] .bb-ho-count{color:#8A5B00;font-weight:600}
.bb-handoff[data-blocked="true"] .bb-ho-flag{color:#B45309;font-weight:600}
.bb-handoff[data-mutual="true"] .bb-ho-arrow{color:#B45309}
.bb-ho-more{padding:0 0 0 14px;color:#6B6558;font-size:11px;line-height:16px}

/* ─────────────────── 层 3「闲着」：一行，无图像，无表面 ─────────────────── */
.bb-idle{flex:none;height:24px;display:flex;align-items:center;gap:6px;overflow:hidden;
  padding:0 10px;border-top:1px solid #DDD6C8;font-size:11px;background:transparent}
.bb-idle-k{flex:none;font-weight:600;color:#6B6558}
.bb-idle-name{flex:0 0 auto;display:inline-flex;align-items:center;gap:2px;padding:1px 2px;
  border-radius:4px;color:#5F594D;white-space:nowrap;cursor:pointer;outline:none}
.bb-idle-name:hover{color:#2C2C2A;background:rgba(44,44,42,.06)}
.bb-idle-more{flex:none;padding:1px 3px;border-radius:4px;font-weight:600;color:#6B6558;
  cursor:pointer;outline:none}
.bb-idle-more:hover{background:rgba(44,44,42,.06)}
/* 行内徽标：沿用 bb-badge 类名（D1 靠它断言），只改定位 */
.bb-badge-inline{position:static;flex:none;width:12px;height:12px;line-height:12px;font-size:9px;
  margin-left:2px}
/* 用户主动展开（点 +N）：这是唯一允许层 3 变高的路径 */
.bb-idle[data-expanded="true"]{height:auto;max-height:44px;flex-wrap:wrap;padding:4px 10px}

/* ─────────────────── 图例抽屉（复用 .bb-drawer 的全部机制） ─────────────────── */
.bb-lg-row{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:11.5px;
  border-bottom:1px solid rgba(0,0,0,.05)}
.bb-lg-row:last-child{border-bottom:0}
.bb-lg-lamp{flex:none;width:16px;height:16px}
.bb-lg-name{flex:0 0 62px;font-weight:600;color:#2C2C2A}
.bb-lg-hint{flex:1;min-width:0;color:#6B6558}

/* ─────────────────── 焦点环：选择器列表必须扩充，不是替换 ─────────────────── */
/* 既有四条（smoke 逐条断言）一个都不能少 */
.bb-pill:focus-visible,.bb-icon:focus-visible,.bb-btn:focus-visible,.bb-handoff:focus-visible,
.bb-station:focus-visible,.bb-attention-row:focus-visible,.bb-idle-name:focus-visible,
.bb-idle-more:focus-visible{outline:2px solid #378ADD;outline-offset:1px}
```

**要删掉的既有规则**（会被新结构取代，且 smoke 不引用）：

```css
.bb-legend{...}        /* 27px 常驻图例，整条删除 */
.bb-lg{...}            /* 与 .bb-lg i 一起删；形状改由 Lamp 组件画 */
.bb-grid{...}          /* 由 .bb-run-grid 取代 */
```

**必须保留的既有规则**（smoke / render-check 逐条断言）：

```css
.bb-body{... color:#2C2C2A; background:#FAF7F1 ...}   /* 双属性 */
.bb-station-name{... color:#2C2C2A ...}               /* 显式深墨 */
.bb-meta-time{... font-variant-numeric:tabular-nums}  /* 时长等宽 */
.bb-blob{... animation:bb-breathe 2.6s ...}           /* 呼吸 2.6s */
/* 四条 step-end 关键帧 + 四条 animation 规则 + prefers-reduced-motion 块位置 */
```

### 9.1 组件侧的改动（规范，不写代码）

1. **`Lamp({scene, size})`** 新增（`station.js` 导出，`panel.js` 与图例抽屉共用）。§4.5 的几何。
2. **`station.js` 的 `lampShape` 内部 `strokeWidth: 0.8 → 1.2`**（其余几何不动）。
3. **`Station` 新增 `compact` prop（默认 `false`）**：`true` 时不渲染 `.bb-meta`，把时长内联到名字行（`.bb-station-time`）。默认 `false` 让 `render-check` 里 `Station({row,onOpen,note,t})` 的全部既有断言原样存活。
4. **`Attention({items, overflow, t, onOpen})`** 新增。
5. **`IdleLine({items, overflow, expanded, t, onOpen, onExpand})`** 新增。
6. **`attentionOf(rows)` / `topologyOf(works)` / `idleLine(rows)`** 三个纯函数（`rows.js` 或新 `layers.js`），可单测。
7. **`Handoffs` 改为分组形态**：保留 `.bb-handoff` 作为「每条边」的行类名（`role/tabIndex/onKeyDown/4 项待交/12 分钟前` 四条断言原样存活），分组头另用 `.bb-ho-group-head`。
8. **`panel.js` 的 `drawerId` 改为 `sheet`**：`{kind:'bot', id}` | `{kind:'legend'}` | `null`。焦点陷阱只挂一个 `.bb-drawer`（现有 effect 复用，`previous.focus()` 自动回到 `?` 按钮或列表行）。
9. **层归属的稳定窗**：`attentionOf` / `running` / `idle` 三个集合各自经过 `LAYER_STABLE_MS = 1200` 的防抖（`< POLL_MS = 1500`）。这处编码了什么：**跨层移动只在真实事件（开始/结束一轮）时发生，一次 tick 的抖动不搬家**。这是从被否掉的「两区」方案里唯一借来的东西（需求 §8-A 约束 2）。
10. **`buildRows` 的排序一个字都不改**（`render-check:81` 零成本存活）。
11. **层 2 的成员口径**：`busy ∪ waiting ∪ done`。理由：`waiting` 的 Bot 既不在跑也不闲着，若归到层 3 就是撒谎；`done` 只有 7 秒，且它刚交完活，仍在房间里。需求里的「正在跑」应按「在动」读。这处编码了什么：**教室 = 有人有事的房间，不是 CPU 占用列表**。

---

## 10. 对比度实测表（WCAG 公式实算，非估算）

`L = 0.2126R + 0.7152G + 0.0722B`，`R/G/B` 经 sRGB 线性化；`ratio = (L₁+0.05)/(L₂+0.05)`。

### 10.1 文字（阈值 4.5:1）

| 前景 | 背景 | 比值 | 判定 | 用在哪 |
|---|---|---|---|---|
| `#2C2C2A` | `#FAF7F1` | **13.09:1** | ✓ | 房间显式深墨（既有） |
| `#2C2C2A` | `#FFFFFF` | **13.99:1** | ✓ | 层 1 名字 |
| `#4A4438` | `#FFFFFF` | **9.65:1** | ✓ | 层 1 动作原文 |
| `#6B6558` | `#FFFFFF` | **5.79:1** | ✓ | 层 1 时长 |
| `#6B6558` | `#FAF7F1` | **5.41:1** | ✓ | 层 1 空态摘要 / 层 2 时长 / 交接计数（未标记）/ `未开工` / `还有 N 项` |
| `#0F766E` | `#FAF7F1` | **5.12:1** | ✓ | 空态 `✓` |
| `#5F594D` | `#FAF7F1` | **6.50:1** | ✓ | 层 3 名字 |
| `#6B6558` | `#FAF7F1` | **5.41:1** | ✓ | 层 3 前缀 `闲着`、`+N` |
| `#4A4438` | `#FAF7F1` | **9.03:1** | ✓ | 交接分组头 |
| `#2C2C2A` | `#FAF7F1` | **13.09:1** | ✓ | 交接边接收方名 |
| `#8A5B00` | `#FAF7F1` | **5.49:1** | ✓ | `共 N 项`、被堵的计数 |
| `#B45309` | `#FAF7F1` | **4.70:1** | ✓ | `被堵` / `互相等` |
| `#FFFFFF` | `#B91C1C` | **6.47:1** | ✓ | `!` 徽标字 |
| `#4A4438` | `#F3EDE2` | **8.29:1** | ✓ | 层 1 溢出 chip `+N`（v0.4.1 新增） |

**文字项全部通过。无低于 4.5:1 的文字。**

### 10.2 图形与 UI 边界（阈值 3:1）

| 前景 | 背景 | 比值 | 判定 | 说明 / 替代方案 |
|---|---|---|---|---|
| `#B45309`（alert 左条） | `#FFFFFF` | **5.02:1** | ✓ | 层 1 左侧状态条 |
| `#B91C1C`（error 左条） | `#FFFFFF` | **6.47:1** | ✓ | 同上 |
| `#8F8776`（hover 内环） | `#FFFFFF` | **3.56:1** | ✓ | 层 1/层 2 hover 反馈 |
| `#8F8776` | `#FAF7F1` | **3.33:1** | ✓ | 同上（层 2 在房间底上） |
| `#378ADD`（焦点环） | `#FFFFFF` | **3.59:1** | ✓ | 焦点环 |
| `#378ADD` | `#FAF7F1` | **3.09:1** | ✓ | 焦点环（房间底上） |
| `#5B5648`（灯描边） | `#FFFFFF` | **7.32:1** | ✓ | 灯的轮廓剪影 |
| `#5B5648` | `#FAF7F1` | **6.84:1** | ✓ | 同上 |
| `#8A8577`（`→` 箭头） | `#FAF7F1` | **3.44:1** | ✓ | 方向连接符 |
| `#B91C1C`（徽标底） | `#FAF7F1` | **6.05:1** | ✓ | 徽标对房间底 |
| `#0F766E`（done 灯） | `#FFFFFF` | **5.47:1** | ✓ | 灯填充 |
| `#EF4444`（error 灯） | `#FFFFFF` | **3.76:1** | ✓ | 灯填充 |
| `#3B82F6`（waiting 灯） | `#FFFFFF` | **3.68:1** | ✓ | 灯填充 |
| `#EAB308`（alert 灯填充） | `#FFFFFF` | 1.92:1 | ✗ | **填充不达 3:1。不依赖它**：方形轮廓（7.32:1）+ 动作原文的「等你批」承担识别。若审查要求填充也达标，改 `#CA8A04`（4.03:1）——但那会改动「六态色值已定」的硬约束，**不建议**，用轮廓 |
| `#22C55E`（busy 灯填充） | `#FFFFFF` | 2.28:1 | ✗ | 同上：圆轮廓 + 显示器屏幕的进度条图形承担识别 |
| `#D3D1C7`（idle 灯填充） | `#FFFFFF` | 1.53:1 | ✗ | 同上：**轮廓是唯一的可见通道**（这就是为什么描边必须从 0.8 加到 1.2） |
| `#D3D1C7` | `#FAF7F1` | 1.43:1 | ✗ | 同上 |
| `#FFFFFF`（层 1 卡片底） | `#FAF7F1` | 1.07:1 | ✗ | **已知且刻意**：白色卡片在奶油底上不可见。层 1 的层级感由 44px 行节律 + 5.02/6.47:1 的左侧条 + 1px 阴影提供，**底色不承担任何编码**。若要一个达标的卡片边界：`1px solid #8F8776`（3.56:1），但视觉上会变成"表单"——不推荐 |
| `#DDD6C8`（发丝线） | `#FAF7F1` | 1.35:1 | ✗ | **装饰性分隔**，不承担语义（层 2/层 3 的区分由"有无图像"承担）。若要达标：`#8F8776`（3.33:1） |
| `#F3EDE2`（溢出 chip 底） | `#FFFFFF` | 1.17:1 | ✗ | 装饰性：chip 由**文字**（8.29:1）和圆角形状识别，底色只提供"这是一块 chip"的分组暗示。与层 1 白卡的关系和发丝线同类 |
| `#F3EDE2`（原图例带色，已弃用做层 3 底） | `#FAF7F1` | 1.09:1 | ✗ | 这就是层 3 **不用底色**的实测依据：等于没有底，只会引入一块无意义的色块 |
| `#EAB308` vs `#5B5648`（填充 vs 自身描边） | — | 3.82:1 | — | 非 WCAG 项，仅说明 alert 灯填充与描边分离度足够 |
| `#EF4444` vs `#5B5648` | — | 1.94:1 | — | 非 WCAG 项；红色菱形读起来是一个实心深块，对剪影有利 |

### 10.3 逐条替代方案（针对 4 个 ✗）

1. **灯填充（alert/busy/idle）不达 3:1** → 不改色值（硬约束）。改为：**轮廓承担 3:1**（描边 1.2 / `#5B5648` / 6.84–7.32:1），**形状与屏幕图形承担六态区分**。这是 0.3.4 已经做对的事，本次只把描边从 0.65px 提到 0.97px 让它真的可见。
2. **层 1 卡片底 1.07:1** → 不承担编码。层级 = 行高 + 字重 + 左侧条 + 图像存在。
3. **发丝线 1.35:1** → 装饰性。若审查坚持，换 `#8F8776`（3.33:1），代价是层 3 看起来像一条表格分隔线而不是"轻描淡写的一行字"。
4. **层 3 若用 `#F3EDE2` 做底** → 1.09:1，等于没有底。所以层 3 不用底色，这就是 Q1 里"层 3 无表面"的实测依据。

---

## 11. 不要做什么（实现阶段最容易顺手做坏的地方）

1. **不要把层 1 做成三张彩色告示牌**（`background:LAMP[scene]` + 白字）。那会让「需要你」变成三块牌，层 2 的教室立刻失去重量；而且饱和底是告警组件的语汇，不是教室的。**3px 左侧条是上限。**
2. **不要给层 2 的工位加卡片化阴影/白底**。教室不是卡片网格；`box-shadow` 一加，`#FAF7F1` 的房间感就没了。
3. **不要因为 `#FFFFFF` 对 `#FAF7F1` 只有 1.07:1 就去"加强"它**（换深底、加边框、把阴影加到 4px）。层 1 的层级感不靠底色——靠 44px 节律、3px 左侧条、右侧竖轨。
4. **不要把 `ATTENTION_ROW_H` 改成 40 去省高度**。40 低于 44 的指针目标，且 30px 头像只剩 5px 呼吸。省下的 12px 会全部被层 2 吃掉，换不来任何东西。
5. **不要用 `position:sticky` 做层 3**。flex 三带（只有层 2 滚动）已经解决，且 `sticky` 在 `overflow:hidden` 的父级里会静默失效。
6. **不要在 `.bb-run` 里面再给 `.bb-handoffs` 加 `max-height`**。两层滚动条在 420px 宽下互相打架。要限高就限**边数**（3 组 × 3 条 + 溢出计数）。
7. **不要在层 2 的工位上保留 `.bb-meta` 两行**。`compact` 必须真的省掉那 23px，否则 128px 装不下、C4c 立刻红。
8. **不要给 `Lamp` 加任何 `@keyframes`**（比如 alert 闪烁）。六态已经够响；闪一个"等你"会把面板变成噪音源，且直接违反"不新增 keyframes"。
9. **不要把 `data-blocked` 写反**（`busy` 时给 `"true"`）。那正是需求要防的"边撒谎"——用户会去催一个正在飞快还账的人。
10. **不要删 `render-check.mjs:81`（workstations never move）**，也不要改 `buildRows` 的排序。分层只在渲染期 `filter`，不动行对象、不动 `key`（必须继续是 `row.bot.id`）。
11. **不要动 `Station` 的 `memo` 比较器**。1.5s 轮询每次重建行对象，任何按身份比较的改动会让 9 个 SVG 每 tick 全量重绘。
12. **不要把图例抽屉做成第二个 `.bb-drawer` 实例**。焦点陷阱只挂一个，两个实例会互相抢 `previous.focus()`。用单个 `sheet` 状态。
13. **不要给层 1 的头像换一套新画法**。必须是同一个 `blobSeat` 的 `viewBox="56 24 60 60"` 裁剪，否则"列表里的人和教室里的团子是同一个"这条关联断掉，用户要重新学一遍。
14. **不要在层 1 的头像上保留呼吸/眨眼**（`.bb-att-avatar .bb-blob{animation:none}` 两行必须有）。三行同时呼吸会把注意力从动作原文上拉走。
15. **不要让层 3 默认 `flex-wrap:wrap`**。一换行就破 C4c 的 0.694px 余量。溢出走 `+N`，不走换行。
16. **不要把 `prefers-reduced-motion` 块往前挪**，也不要把任何新 `animation:` 写在它后面。新增的只有 `animation:none` 覆盖，必须写在块**内**（块本身仍在文件末尾）。
17. **不要只给 `bb-attention` 加焦点环而漏掉 `bb-idle-name` / `bb-idle-more`**。层 3 是可点击的；没有环，键盘用户不知道自己在哪。
18. **不要在层 3 用颜色区分状态**（比如 `waiting` 的名字染蓝）。层 3 的语义是"闲着"，一个闲着的 Bot 不该有颜色；`!` 徽标是唯一允许的标记，因为它是**形状**。
19. **不要给交接边加"进行中"标记**。默认无强调就是"正在还账"，加了标记会让每一行都在喊。
20. **不要在 `works` 为空时渲染 `.bb-handoffs` 的空壳**（哪怕是 0 高的）。B3 要求整块不渲染。
21. **不要把 `done` 排除在层 2 之外**。它 7 秒后自己会走；排掉它会让"刚交完活"这个唯一值得看一眼的瞬间消失，且会让层 3 里出现一个正在挥手的名字。
22. **不要在层 1 的灯上加第二个图形**（比如给 `alert` 加个叹号）。灯只负责"形状"，语义在动作原文里；一个 12px 的灯塞两个符号就都不清楚了。
23. **不要只算「2 × 格高」，要算「2 × 格高 + gap + padding」，再减去面板边框**。v0.4.0 初稿漏了 gap + padding 这 12px，v0.4.1 又漏了 `PANEL_BORDER` 这 2px，两次都让 C4c 变成一条绿着的假话。**凡是"两个东西并排/堆叠"的预算，先写全所有相邻边距再求和，最后扣掉容器的边框。**
24. **不要把 CSS 里的高度写成第二份手抄的数字**。`ATTENTION_ROW_H` 等 6 个值必须从 `const.js` 插值进 `style.js`；否则改 CSS 一行就能让断言继续绿着而布局已经错了。断言与实现必须是同一个数，不是两个恰好相等的数。
25. **不要用「填充 ≥4px」当灯的判据**。4px 是**轮廓**（含描边）的下限，填充可以只有 4.22px 而轮廓 5.19px。混淆这两者会得出一个偏严 23% 的格宽下限（130.8 vs 106.3），进而为了"保住灯"放过一条错的预算。

---

## 12. 交付自检

- [x] 三层靠 4 个通道（图像存在 / 行高 / 字重 / 表面）递减编码，8 个通道里 6 个不依赖颜色
- [x] 420px 下列宽逐列给出（行内容宽 380 = 420 − 2 边框 − 20 内边距 − 18 行内边距），动作原文是唯一可裁列，可容 16.2 个中文字 ≈ `PHRASE=16` 的裁剪预算；溢出 chip 在场时降为 13.5 字（已声明代价）
- [x] 44px 行 / 30px 头像 = 上下各 7px；28 是不可用下限（眼睛 2.1px）
- [x] 灯三档：12 / 4.22（轮廓 5.19）/ 无；形状下限 4px 有推导；**格宽由高度预算决定，灯只是校验项**（138 宽 1.30 倍边际）
- [x] 描边 0.8→1.2 修掉 0.65px 亚像素缺陷（渲染后 0.97px）
- [x] 交接边缩进 14px、`→` 字符而非 CSS 线、`data-blocked` 三值、`busy` 永不"被堵"
- [x] 层 3 在 420 下算过 9 个名字 = 370px ≤ 380（`IDLE_BUDGET`）；有 1 个徽标时第 9 个名字让位给 `+1`，有 `+N` 降级且徽标永不丢
- [x] 图例降级为抽屉（零常驻像素，净省 3px 高度），六态靠形状 + 词 + 抽屉三重覆盖
- [x] 高度常量 13 个给出（含 `PANEL_BORDER` 与 `SCENE_VB`），三条可满足断言（**309 / 298 / 479.31**，均已扣除面板边框 2 + gap 8 + pad 4，真正零滚动），并证明需求原文的 C4 不可满足
- [x] 对比度全部实算：文字 14 项全过；图形 5 项不达 3:1，逐项给了替代或"不承担语义"的说明
- [x] 数值与 `const.js` 实际导出一致（已用 `node --input-type=module -e` 逐项核对：39 / 44 / 3 / 10 / 24 / 2 / 170×132 / 138 / 128 / 8 / 4 / 96 / 1200，以及 `cellHeight() = 127.153`）
- [x] 修订记录保留在 §8.2 与 §13：C4c 漏项、灯下限误算、格宽漏算边框、§8.3 跨层结论四处，写清原因而非只改数字
- [x] 无新增 `@keyframes`、无新增第三方依赖、无新增桌面道具、无主题适配
- [x] 既有 smoke 断言（`.bb-body` 双属性、四条 `step-end` 单调、reduced-motion 位置、四条焦点环、`.bb-meta-time` tabular-nums、`.bb-station-name` 深墨）全部保住

---

## 13. v0.4.3 修正记录（本轮审计）

本轮只做一件事：**把规范里的数字与代码对齐**。三处指定修正（13.1–13.3），外加两处同类漏算（13.4），最后是方法论（13.5）。

### 13.1 格宽 139 → 138（漏算了面板边框）

`480 − 39 − 148 − 24 = 269` 这个 269 是错的：`.bb-panel` 是 `border-box` + 每边 1px，480 的面板里面只有 478。所以层 2 拿到的是 **267px**，反推出的上限是 `W ≤ 138.4`，不是 139.8。

| 量 | 旧 | 新 | 依据 |
|---|---|---|---|
| 层 2 可用高 | 269 | **267** | `480 − PANEL_BORDER(2) − 39 − 148 − 24` |
| 格宽 `RUNNING_CELL_W` | 139 | **138** | `(267 − 8 − 4) / 2 = 127.5` → `W ≤ 138.4` |
| 格高 `RUNNING_CELL_H` | 128 | **128** | `Math.ceil(cellHeight())`：138 宽 = 127.153，139 宽 = 127.933，两者都进 128 |
| C4c | 479 | **479.31** | `2 + 39 + 132 + 6 + 10 + 254.306 + 8 + 4 + 24` |
| 灯轮廓 | 5.23 | **5.19px** | `(5.2 + 1.2) × 138/170 = 5.195` |
| 灯边际 | 1.31 倍 | **1.30 倍** | `5.195 / 4` |
| 描边渲染宽 | 0.98 | **0.97px** | `1.2 × 138/170 = 0.974` |

### 13.2 余量 1.1px → 0.72px（实测）/ 0.694px（算术）

两个数不冲突，它们量的不是同一件事：

| | 值 | 来源 |
|---|---|---|
| 算术 | **0.694px** | `480 − 479.306`，`cellHeight()` 取全精度 127.152941… |
| 浏览器实测 | **0.72px** | Chromium 149，560×480，`.bb-run` `clientHeight = scrollHeight = 267`，`maxScroll = 0` |

差额 0.026px 来自浏览器把格子渲染成 127.14 而不是 127.153（按设备像素取整）。**约定：预算用 0.694（保守），说「零滚动」时用 0.72 并注明是实测。**

### 13.3 §8.3 的跨层结论错误（不是数字错）

「灯轮廓是否承载状态」在 §8.3 写「是（层 2 的形状通道）」，与 §4.2 的修正直接矛盾。正确结论：**层 2 只有 busy / waiting / done 三态，全是圆；形状通道在层 2 不起作用，轮廓在层 2 只承担「边界」，不承担「状态」。**

原因不是算错，是**同一句话被抄了两份**：§4.2 修正时只改了自己那一份，§8.3 的副本留在了旧版本。已在表下写明。

### 13.4 顺带修掉的两处同类漏算

- **§3.1 的 420 宽度推导**：`420 − 20 = 400` 同样漏了 2px 面板边框 → 行外框 398、行内容宽 380、动作原文 **202**（不是 204）、**16.2** 字（不是 16.3）。
- **§6.1 的闲着行预算**：旧算式 337px 既漏了每个名字 4px 内边距，又把 gap 算成 9 个（代码只在项之间放 8 个）。按 `layers.js` 重算 = **370 ≤ 380**。连带一个结论也要改：不是「5 个以上徽标才溢出」，而是**9 个名字时 1 个徽标就溢出**（370 + 14 = 384 > 380）。

### 13.5 方法论

> **规范里的数字必须能从 `const.js` 重新算出来；算不出来的数字就是手抄，手抄会漂。**

具体到操作：写下一个数字时，同时写下它的算式，算式的每一项都要能指到 `const.js` 的一行或 `style.js` 的一行 CSS。做不到这一点的数字，宁可写成「实测值 + 量法」，也不要写成一个看起来精确的整数。

本轮四处漂移（269 / 139 / 1.1 / 337）全部来自同一个动作：**从上一次的数字往下推，而不是回到常量重算**。两次手抄之间隔了一个版本，中间改的是 `PANEL_BORDER` 这一件事，四处的误差却各自漂向了不同方向——这正说明手抄的误差不会被下一次校对自动纠正。
