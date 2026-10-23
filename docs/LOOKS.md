# 给你的 Bot 挑长相（一次性，在 DS Bot 里点）

看板的身份完全来自 DS Bot，所以想让教室看起来是「你设计的那套」，得在 **DS Bot 的 Bot 设置里**给每个 Bot 选一次角色和颜色。看板只读，不会替你写。

七个角色：`whale`（鲸）`star`（星）`moon`（月）`wave`（浪）`squircle`（圆角方）`zed`（牛）`hex`（花）。
颜色用 DS Bot 的 ink 名（`deepseek` `blue` `violet` `orange` `green` `magenta` `cyan` `red` `yellow` `brown` `gray` `black` `aurora` `charcoal` `graphite` `rose` `sky` `tangerine` `cobalt`）或任意 `#rrggbb`。

下面是一套可以直接抄的分配：形状和颜色都拉开距离，九个 Bot 在同一屏里互不撞脸。名字只是占位，换成你自己的。

| Bot | 角色 | 颜色 | 为什么是它 |
|---|---|---|---|
| Chief | `whale` | `deepseek` | DS Bot 新建团队时给主 Bot 的默认长相，保持原样即可 |
| Bob | `star` | `magenta` | 星形最跳，配品红，和主 Bot 的蓝鲸离得最远 |
| Bot3 | `squircle` | `orange` | 圆角方最稳，橙色是「管事」的颜色 |
| Bot4 | `hex` | `violet` | 花形 + 紫，和星形区分得开（星是尖角、花是圆瓣） |
| Bot5 | `wave` | `cyan` | 浪 + 青，冷色里最亮的一档 |
| Bot6 | `zed` | `green` | 牛角最容易被记住，配绿 |
| Bot7 | `hex` | `green` | 和 Bot4 同形不同色——嫌撞就换 `moon` + `yellow` |
| Bot8 | `moon` | `red` | 月形 + 红，暖色里最沉的一档 |
| Bot9 | `star` | `sky` | 和 Bob 同形不同色；想彻底分开就换 `squircle` + `brown` |

改完之后看板会在下一次轮询（约 5 秒）里跟着变，不用重启 DSH。

**没有设的会怎样**：按 Bot id 哈希出一张稳定的脸（12 色 × 7 轮廓 × 10 道具 = 840 种），同一个 Bot 每次刷新都一样，撞车会自动换一套。所以「不设」也能用，只是不一定是你会挑的那张。

**名字与长相无关**：看板不按名字分配任何东西。一个叫 `Chief` 的 Bot 不会因为名字得到鲸鱼——只有 `avatar.shape` 会。
