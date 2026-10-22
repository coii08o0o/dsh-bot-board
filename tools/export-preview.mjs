// export-preview.mjs — renders the real panel into a static HTML file.
//
// Why this exists: the check harness has no layout engine, so every "does it fit"
// claim is arithmetic over constants. A browser has a layout engine, so opening
// this file turns those arithmetic claims into something you can look at — and,
// just as importantly, disprove. It is not a mockup: the markup comes from the
// same Head / Body / LegendSheet / Drawer components the plugin ships, and the
// stylesheet is the same CSS string, so it cannot show a panel that does not
// exist.
//
// What it can settle: whether a 30px face is cramped in a 44px row, whether a
// 5.23px lamp is legible, whether the header clips 最久 at 420px, whether the
// second row of workstations is clipped at 560×480.
// What it cannot settle: where the eye lands first. That needs a person.
//
// Run: node --import ./tools/register-shim.mjs tools/export-preview.mjs
// Out: docs/preview-<version>.html (version read from package.json)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement as h, mount, render, resetRefs, textOf } from './react-shim.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
// Read from package.json rather than typed here: the previous version hard-coded
// 0.4.1 in four places and kept emitting a file called preview-0.4.1.html from a
// 0.4.2 tree, so the deliverable disagreed with the product it was previewing.
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version

// The components touch these at render time.
globalThis.localStorage = { getItem: () => null, setItem: () => {} }
globalThis.document = {
  hidden: false, getElementById: () => null, createElement: () => ({ style: {} }),
  head: { appendChild: () => {} }, addEventListener: () => {}, removeEventListener: () => {},
}
globalThis.window = { innerWidth: 1440, innerHeight: 900 }

const { CSS } = await import('../src/client/style.js')
const { Head, Body, summarize } = await import('../src/client/panel.js')
const { LegendSheet } = await import('../src/client/legend.js')
const { Drawer } = await import('../src/client/drawer.js')
const { buildRows } = await import('../src/client/rows.js')
const { fallbackT } = await import('../src/client/locale.js')
const { RUNNING_CELL_W, RUNNING_CELL_H, SIZE_MIN, SIZE_DEFAULT } = await import('../src/client/const.js')

const t = fallbackT('zh')
const NOW = Date.now()
const MIN = 60 * 1000

// ── the tree → HTML serialiser ──────────────────────────────────────────────
// The shim produces {type, props, children}; this turns that into markup. Only
// what the panel actually emits is handled: attributes are passed through, with
// handlers dropped and `style` objects turned into declarations.
//
// Attribute casing is NOT free-form. This file is parsed as HTML, so anything
// camelCase that the HTML parser does not know is lowercased into an unknown
// attribute and thrown away — silently, at parse time, with no error anywhere.
// The v0.4.2 audit found exactly that: 113 `strokeWidth` attributes in the
// exported page, 0 `stroke-width`, every stroke falling back to the SVG default
// `stroke-width:1`. Layer 2's lamp went 1.2 → 1.0 (0.81px rendered, under the
// design's own ≥0.95 threshold) and the classroom desk lines were halved 2 → 1.
// This page is the only visual evidence behind four audit reports, so the
// mistake was invisible in the artifact and visible only in a browser.
//
// The previous comment here claimed the HTML spec's foreign-content table would
// fix SVG's camelCase. It only fixes the names on the spec's SVG attribute
// adjustment list (viewBox, markerWidth, …) — `strokewidth` is not on it.
const VOID = new Set(['circle', 'rect', 'line', 'ellipse', 'path', 'polygon', 'polyline', 'use', 'stop', 'br'])
const SKIP = new Set(['children', 'key', 'ref', 'style'])
// HTML-side camelCase names, which have a real lowercase attribute.
const RENAME = { className: 'class', tabIndex: 'tabindex', htmlFor: 'for' }
// Names that ARE on the spec's SVG attribute adjustment list, i.e. the parser
// maps their lowercased form back to this casing by itself. Kebab-casing these
// would be wrong: `marker-width` is not an attribute, so it gets dropped just
// like the unadjusted camelCase did.
const ADJUSTED = new Set([
  'viewBox', 'textLength', 'glyphRef',
  'markerHeight', 'markerUnits', 'markerWidth',
  'clipPathUnits', 'maskContentUnits', 'maskUnits',
])
// Everything else in SVG's camelCase vocabulary gets a real kebab attribute.
// The prefix list is the set of SVG presentation attributes that are
// hyphenated in the spec: stroke-width, fill-opacity, font-size, text-anchor,
// clip-rule, mask-type, marker-end, paint-order, vector-effect,
// shape-rendering, glyph-orientation-horizontal, stop-color, flood-color,
// lighting-color. `viewBox` never matches (its prefix is `view`), and the
// ADJUSTED set guards the rest of that family.
const KEBAB = /^(stroke|fill|font|text|marker|clip|mask|paint|vector|shape|glyph|stop|flood|lighting)[A-Z]/
const kebab = name => name.replace(/[A-Z]/g, ch => `-${ch.toLowerCase()}`)

const escapeText = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttr = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')


function styleOf(value) {
  if (!value || typeof value !== 'object') return ''
  return Object.entries(value)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      const name = k.replace(/[A-Z]/g, ch => `-${ch.toLowerCase()}`)
      const unit = typeof v === 'number' && !['fontWeight', 'opacity', 'zIndex', 'flex', 'lineHeight'].includes(k) ? 'px' : ''
      return `${name}:${v}${unit}`
    })
    .join(';')
}

// `createElement` parks children in props; `render` moves them to `children`,
// which is the shape the serialiser and textOf both read.
const flatten = node => render(node)

// Exported so a check can assert on the serialised markup directly instead of
// scraping the generated file: the attribute-casing bug above was invisible to
// every existing check because none of them looked at the output string.
export function toHtml(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (Array.isArray(node)) return node.map(toHtml).join('')
  if (typeof node === 'string' || typeof node === 'number') return escapeText(node)
  const { type, props = {}, children } = node
  const attrs = []
  for (const [key, value] of Object.entries(props)) {
    if (SKIP.has(key)) continue
    if (typeof value === 'function' || value === undefined || value === null || value === false) continue
    const name = RENAME[key] ?? (KEBAB.test(key) && !ADJUSTED.has(key) ? kebab(key) : key)
    attrs.push(`${name}="${escapeAttr(value === true ? '' : value)}"`)
  }
  const style = styleOf(props.style)
  if (style) attrs.push(`style="${escapeAttr(style)}"`)
  const open = `<${type}${attrs.length ? ` ${attrs.join(' ')}` : ''}`
  if (VOID.has(type)) return `${open} />`
  return `${open}>${toHtml(children)}</${type}>`
}

// ── fixtures ────────────────────────────────────────────────────────────────
const ROSTER = ['Chief', 'Researcher', '班主任', '数学', '物理', '化学', '生物', '语文', '英语']
const bots = ROSTER.map((name, index) => ({ id: `b${index}`, name, sessionId: `b${index}` }))
const nameOf = id => bots.find(bot => bot.id === id)?.name ?? id

function snapshot({
  activity = {}, workBots = {}, waiting = {}, approvals = [], questions = {},
  errors = [], works = [], waveMap = {}, noteMap = {}, rooms = {},
} = {}) {
  const rows = buildRows({
    bots, activity, workBots, waiting, approvals, questions, errors, works,
    rooms, waveMap, noteMap, t, nameOf, now: NOW,
  })
  return { rows, works }
}

const working = (id, minutes, tool) => ({ activity: { [id]: 'working' }, workBots: { [id]: { since: NOW - minutes * MIN, tool } } })

const EMPTY = { activity: {}, workBots: {}, waiting: {}, approvals: [], questions: {}, errors: [], works: [], waveMap: {}, noteMap: {}, rooms: {} }

const merge = (...parts) => parts.reduce((acc, part) => ({
  activity: { ...acc.activity, ...part.activity },
  workBots: { ...acc.workBots, ...part.workBots },
  waiting: { ...acc.waiting, ...part.waiting },
  approvals: [...acc.approvals, ...(part.approvals ?? [])],
  questions: { ...acc.questions, ...part.questions },
  errors: [...acc.errors, ...(part.errors ?? [])],
  works: [...acc.works, ...(part.works ?? [])],
  waveMap: { ...acc.waveMap, ...part.waveMap },
  noteMap: { ...acc.noteMap, ...part.noteMap },
  rooms: { ...acc.rooms, ...part.rooms },
}), EMPTY)

// ── panel composition ───────────────────────────────────────────────────────
function panel({ w, h: height, snap, sheet = null, initialAttExpanded = false, badge = '' }) {
  const { counts, openHandoffs, tone } = summarize(snap.rows, snap.works)
  resetRefs()
  const tree = mount(Body, {
    rows: snap.rows,
    works: snap.works,
    notices: [],
    empty: null,
    t,
    onOpen: () => {},
    onPick: () => {},
    sceneOf: id => snap.rows.find(row => row.bot.id === id)?.scene,
    initialAttExpanded,
  })
  const overlay = sheet === 'legend'
    ? mount(LegendSheet, { t, onClose: () => {} })
    : sheet
      ? mount(Drawer, {
          row: snap.rows.find(row => row.bot.id === sheet),
          t,
          canOpenChat: true,
          onClose: () => {},
          onOpenChat: () => {},
        })
      : null
  const panelTree = h('div', { className: 'bb-panel', style: { width: w, height } },
    h(Head, {
      counts, openHandoffs, tone, t,
      onHelp: () => {}, onCollapse: () => {},
      drag: {},
    }),
    tree,
    overlay,
    h('div', { className: 'bb-rz' }))
  return h('figure', { className: 'pv-fig' },
    h('figcaption', { className: 'pv-cap' },
      h('b', null, badge || `${w}×${height}`),
      h('span', { className: 'pv-meta' }, `${w}×${height}`)),
    h('div', { className: 'pv-frame', style: { width: w, height } }, panelTree))
}

// ── scenarios: the degenerate ones, not the happy path ──────────────────────
// Review §5.4: exporting "3 need-you + 2 running" would prove nothing.
const cases = []

// 1. The C4c case: exactly 3 need-you + 6 running + the idle line, and NO open
//    hand-offs, so the 480px budget is the only thing under test. This is the
//    layout that used to overflow by 12.8px and show a scrollbar.
cases.push({
  title: '默认尺寸 · 3 件需要你 + 6 个在动（C4c 临界）',
  note: 'C4c 的全部项：2(面板边框) + 39 + 3×44 + 2×3 + 10 + 2×127.15 + 8 + 4 + 24 = 479.31 ≤ 480。v0.4.0 在这里超 12.8px 出滚动条；v0.4.1 第一版按 139 收窄仍然超 0.9px，是这份导出量出来的。现在 267/267，第二行名字完整、零滚动。',
  panels: [panel({
    w: SIZE_DEFAULT.w, h: SIZE_DEFAULT.h, badge: '560×480 · C4c',
    snap: snapshot(merge(
      working('b0', 4.2, 'Bash'), working('b1', 0.5, 'Read'), working('b2', 1, 'Grep'),
      working('b3', 2, 'Bash'), working('b4', 0.2, 'Write'),
      { approvals: [{ id: 'a1', botId: 'b6', tool: 'Bash' }] },
      { questions: { b7: { id: 'q1', question: '这段用哪个语气？', options: [{ label: '正式' }, { label: '轻松' }] } } },
      { errors: [{ botId: 'b8', at: NOW - 40 * 1000, message: '模型超时' }] },
    )),
  })],
})

// 1b. The same grid plus the hand-off table. The table lives inside `.bb-run`,
//     which is the panel's only scroll area, so it may extend below the fold —
//     that is the design, not a budget break, and the note says so.
cases.push({
  title: '默认尺寸 · 同样 6 个在动，但带交接边表',
  note: '⚠ 的 70px 全部来自交接边表。`.bb-run` 是面板唯一的滚动区，边表向下延伸需要滚才看全——这是有意的：它解释的是上面那些人，不必常驻。工位网格本身完整。',
  panels: [panel({
    w: SIZE_DEFAULT.w, h: SIZE_DEFAULT.h, badge: '560×480 · 带边表',
    snap: snapshot(merge(
      working('b0', 4.2, 'Bash'), working('b1', 0.5, 'Read'), working('b2', 1, 'Grep'),
      working('b3', 2, 'Bash'), working('b4', 0.2, 'Write'),
      { approvals: [{ id: 'a1', botId: 'b6', tool: 'Bash' }] },
      { questions: { b7: { id: 'q1', question: '这段用哪个语气？', options: [{ label: '正式' }, { label: '轻松' }] } } },
      { errors: [{ botId: 'b8', at: NOW - 40 * 1000, message: '模型超时' }] },
      { works: [
        { id: 'w1', fromId: 'b6', from: '语文', toId: 'b0', to: 'Chief', open: 4, at: NOW - 12 * MIN, last: '第 3 题没算完' },
        { id: 'w2', fromId: 'b6', from: '语文', toId: 'b3', to: '数学', open: 3, at: NOW - 8 * MIN },
      ] },
    )),
  })],
})

// 2. The design baseline: 420×320. This is where the header starts dropping
//    items, and it is not a degraded state.
cases.push({
  title: '最小尺寸 · 2 件需要你（设计基准，不是降级态）',
  note: 'F2：两行都完整可见（工位网格 131px ≤ 在动 154px）。头部原来在这里裁掉 33px（实测需要 288 / 可用 255，「最久 4m12s」被切一半），v0.4.1 把那一项移除了，现在 222/222。⚠ 的 30px 来自交接边表，不是网格。',
  panels: [panel({
    w: SIZE_MIN.w, h: SIZE_MIN.h, badge: '420×320 · F2',
    snap: snapshot(merge(
      working('b0', 4.2, 'Bash'), working('b3', 1, 'Read'),
      { approvals: [{ id: 'a1', botId: 'b1', tool: 'Bash' }] },
      { errors: [{ botId: 'b7', at: NOW - 40 * 1000, message: '模型超时' }] },
      { works: [{ id: 'w1', fromId: 'b1', from: 'Researcher', toId: 'b3', to: '数学', open: 4, at: NOW - 12 * MIN }] },
    )),
  })],
})

// 3. Nine alerts: layer 1 is capped at 3 and the other six hide behind +6.
cases.push({
  title: '退化态 · 9 个全 alert（层 1 封顶 + 溢出 chip）',
  note: '3 行 + `+6` chip。以前第 4 个人在整个面板里没有名字、点不开；现在 chip 是 role=button，点开就是全部 9 行。',
  panels: [panel({
    w: SIZE_DEFAULT.w, h: SIZE_DEFAULT.h, badge: '560×480 · 9 alert',
    snap: snapshot({
      approvals: bots.map((bot, index) => ({ id: `a${index}`, botId: bot.id, tool: index % 2 ? 'Bash' : 'Read' })),
    }),
  })],
})

// 4. The same five, before and after the chip is clicked.
const fiveHot = snapshot({
  approvals: [{ id: 'a1', botId: 'b1', tool: 'Bash' }, { id: 'a2', botId: 'b2', tool: 'Read' }],
  questions: { b3: { id: 'q1', question: '这段用哪个语气？', options: [{ label: '正式' }, { label: '轻松' }] } },
  errors: [{ botId: 'b7', at: NOW - 30 * 1000, message: '模型超时' }, { botId: 'b8', at: NOW - 90 * 1000, message: '工具调用失败' }],
})
cases.push({
  title: '溢出态 · 收起 / 展开（同一个快照）',
  note: '左：3 行 + `+2`。右：点过 chip 之后，5 行全在，chip 变成 `−` 可以收回。高度代价在收起态是 0。',
  panels: [
    panel({ w: SIZE_DEFAULT.w, h: SIZE_DEFAULT.h, badge: '560×480 · 收起', snap: fiveHot }),
    panel({ w: SIZE_DEFAULT.w, h: SIZE_DEFAULT.h, badge: '560×480 · 展开', snap: fiveHot, initialAttExpanded: true }),
  ],
})

// 5. All idle: the "敢不看" case. Body should be 52px of content and silence.
cases.push({
  title: '退化态 · 全 idle（「没事」这个方向）',
  note: '主体只剩一行摘要 + 一行名字，其余是房间的空白。静置 60 秒不应该有任何变化——这是盯盘工具的底线。',
  panels: [
    panel({ w: SIZE_DEFAULT.w, h: SIZE_DEFAULT.h, badge: '560×480 · 全 idle', snap: snapshot() }),
    panel({ w: SIZE_MIN.w, h: SIZE_MIN.h, badge: '420×320 · 全 idle', snap: snapshot() }),
  ],
})

// 6. The semantic red line: an edge whose receiver is busy must not say 被堵.
const mutual = snapshot(merge(
  working('b2', 5, 'Bash'), working('b3', 3, 'Read'),
  { waiting: { b5: { bots: ['b2'], rooms: [], for: [] } } },
  { works: [
    { id: 'w1', fromId: 'b2', from: '班主任', toId: 'b3', to: '数学', open: 4, at: NOW - 12 * MIN },
    { id: 'w2', fromId: 'b3', from: '数学', toId: 'b2', to: '班主任', open: 3, at: NOW - 5 * MIN },
  ] },
))
cases.push({
  title: '语义红线 · 接收方 busy 的边 + A↔B 互相等',
  note: '班主任→数学 的接收方在干活 → 不带「被堵」（去催一个正在还账的人是错的）。两条边都标 `⇄ 互相等`，两侧各保留自己的计数。',
  panels: [panel({ w: SIZE_DEFAULT.w, h: SIZE_DEFAULT.h, badge: '560×480 · 互相等', snap: mutual })],
})

// 7/8. The two sheets.
const withApproval = snapshot({
  approvals: [{
    id: 'a1', botId: 'b6', tool: 'Bash', reason: '要清理构建产物，然后再跑一遍构建确认',
    detail: { code: 'rm -rf dist && npm run build' },
  }],
})
cases.push({
  title: '抽屉 · 审批原文',
  note: '头部那个灯和现场是同一个 Lamp 组件（14px）。以前是 8px 纯色点，没有形状，读者没法把它和学过的形状对上。',
  panels: [
    panel({ w: SIZE_DEFAULT.w, h: SIZE_DEFAULT.h, badge: '560×480 · 审批抽屉', snap: withApproval, sheet: 'b6' }),
    panel({ w: SIZE_DEFAULT.w, h: SIZE_DEFAULT.h, badge: '560×480 · 图例抽屉', snap: mutual, sheet: 'legend' }),
  ],
})

// ── page ────────────────────────────────────────────────────────────────────
// Preview chrome only. None of this is in src/client/style.js, because none of it
// ships.
const SHELL = `
*{box-sizing:border-box}
body{margin:0;padding:28px;background:#EEEAE1;color:#2C2C2A;
  font:13px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
h1{margin:0 0 4px;font-size:17px;font-weight:600;letter-spacing:-.01em}
.pv-lead{margin:0 0 6px;max-width:74ch;color:#4A4438}
.pv-warn{margin:0 0 26px;max-width:74ch;padding:8px 10px;border-left:3px solid #B45309;background:#FBF3E4;
  color:#6B4A08;font-size:12px}
.pv-sec{margin:0 0 34px}
.pv-h{display:flex;align-items:baseline;gap:10px;margin:0 0 3px;font-size:13.5px;font-weight:600}
.pv-n{flex:none;display:inline-grid;place-items:center;width:19px;height:19px;border-radius:5px;
  background:#2C2C2A;color:#FAF7F1;font-size:11px;font-weight:600}
.pv-note{margin:0 0 12px 29px;max-width:78ch;color:#5F594D;font-size:12px}
.pv-row{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-start;margin-left:29px}
.pv-fig{margin:0}
.pv-cap{display:flex;align-items:baseline;gap:8px;margin:0 0 6px;font-size:11.5px;font-weight:600;color:#3A352C}
.pv-meta{font-weight:400;color:#6B6558;font-variant-numeric:tabular-nums}
/* The frame has to reproduce what .bb-wrap would have given its children, or the
   preview measures a different panel:
     - .bb-wrap * { box-sizing:border-box } — without it .bb-panel is 562px wide
       and .bb-idle is 25px tall, so every number in the C4 budget shifts.
     - the inherited 12px/1.5 base — the bands have explicit heights, but text
       inside them would wrap at a different size.
   .bb-wrap itself is position:fixed and cannot be reused here, so this is the
   honest stand-in rather than a second stylesheet. Chrome follows the host theme
   in the product; the preview uses the light-theme values. */
.pv-frame{font-size:12px;line-height:1.5;text-align:left;font-family:inherit}
.pv-frame,.pv-frame *{box-sizing:border-box}
.pv-frame{position:relative;flex:none}
.pv-foot{margin:34px 0 0;padding-top:14px;border-top:1px solid #D8D1C2;color:#6B6558;font-size:11.5px;max-width:80ch}
.pv-metrics{margin:6px 0 0;font-size:10.5px;line-height:1.5;color:#5F594D;font-variant-numeric:tabular-nums;
  max-width:${SIZE_DEFAULT.w}px}
.pv-metrics .bad{color:#B91C1C;font-weight:600}
#pv-report{margin:10px 0 0;padding:10px 12px;background:#2C2C2A;color:#F7F5F0;font-size:10.5px;
  line-height:1.55;border-radius:8px;overflow:auto;max-width:100%;white-space:pre;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
`

// The preview measures itself. Arithmetic over constants says the panel fits;
// this says whether it actually does in a browser, which is the only place that
// can be answered. Every number below is read back from the laid-out DOM.
const MEASURE = `
(() => {
  const px = n => Math.round(n * 10) / 10
  const lines = []
  for (const fig of document.querySelectorAll('.pv-fig')) {
    const panel = fig.querySelector('.bb-panel')
    const att = fig.querySelector('.bb-attention')
    const run = fig.querySelector('.bb-run')
    const idle = fig.querySelector('.bb-idle')
    const sum = fig.querySelector('.bb-sum')
    const parts = []
    const bad = []
    parts.push('面板 ' + px(panel.clientWidth) + '×' + px(panel.clientHeight))
    if (att) parts.push('需要你 ' + px(att.getBoundingClientRect().height))
    if (run) {
      const over = run.scrollHeight - run.clientHeight
      parts.push('在动 ' + px(run.clientHeight) + '/' + px(run.scrollHeight))
      if (over > 1) bad.push('在动溢出 ' + px(over) + 'px')
    } else {
      parts.push('在动 —')
    }
    if (idle) parts.push('闲着 ' + px(idle.getBoundingClientRect().height))
    if (sum) {
      const clip = sum.scrollWidth - sum.clientWidth
      parts.push('头部 ' + px(sum.scrollWidth) + '/' + px(sum.clientWidth))
      if (clip > 1) bad.push('头部裁切 ' + px(clip) + 'px')
    }
    const label = fig.querySelector('.pv-cap b').textContent
    const node = document.createElement('p')
    node.className = 'pv-metrics'
    node.textContent = label + ' — ' + parts.join(' · ') + (bad.length ? ' ⚠ ' + bad.join('，') : ' ✓')
    if (bad.length) node.innerHTML = node.textContent.replace(/⚠[^<]*/, m => '<span class="bad">' + m + '</span>')
    fig.appendChild(node)
    lines.push(node.textContent)
  }
  const report = document.createElement('pre')
  report.id = 'pv-report'
  report.textContent = '实测（浏览器布局引擎，非预算）\\n' + lines.join('\\n')
  document.body.appendChild(report)
})()
`

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>dsh-bot-board v${VERSION} · 三层注意力轴预览</title>
<style>${CSS}</style>
<style>${SHELL}</style>
</head>
<body>
<h1>dsh-bot-board v${VERSION} · 三层注意力轴</h1>
<p class="pv-lead">下面每一块都是<b>真实组件渲染出来的</b>：同一个 <code>Head</code> / <code>Body</code> / <code>LegendSheet</code> / <code>Drawer</code>，同一份 <code>CSS</code> 字符串，同一套 <code>buildRows</code>。不是 mockup，所以它不会展示一个不存在的界面。</p>
<p class="pv-warn">这份导出的用途只有一个：<b>把「装得下」这件事从算术变成看得见</b>。检查环境没有布局引擎，C4a/b/c 全是预算断言；浏览器有布局引擎，所以这里能验、也能证伪。它验不了「第一眼落在哪」——那个要人看。</p>
${cases.map((item, index) => `<section class="pv-sec">
<h2 class="pv-h"><span class="pv-n">${index + 1}</span>${escapeText(item.title)}</h2>
<p class="pv-note">${escapeText(item.note)}</p>
<div class="pv-row">${item.panels.map(item => toHtml(flatten(item))).join('')}</div>
</section>`).join('\n')}
<p class="pv-foot">格宽 ${RUNNING_CELL_W} / 格高 ${RUNNING_CELL_H}（v0.4.1 从 148/134 收窄，因为 C4c 原来漏算了 grid gap 8 与 .bb-run 下内边距 4）。每个面板下方那行灰字是<b>浏览器实测</b>：面板尺寸 / 需要你 / 在动（可见/内容）/ 闲着 / 头部（内容/可见），出现 ⚠ 就是真的溢出或裁切。生成于 ${new Date(NOW).toISOString()}，由 <code>tools/export-preview.mjs</code> 输出。</p>
<script>${MEASURE}</script>
</body>
</html>
`

// Writing the file is skipped when this module is imported rather than run, so
// `import { toHtml }` from a check stays side-effect free (no docs/ churn).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  mkdirSync(join(ROOT, 'docs'), { recursive: true })
  const out = join(ROOT, 'docs', `preview-${VERSION}.html`)
  writeFileSync(out, html)
  console.log(`wrote ${out}`)
  console.log(`  ${cases.length} scenarios, ${cases.reduce((sum, item) => sum + item.panels.length, 0)} panels`)
  console.log(`  ${(html.length / 1024).toFixed(1)} KB`)
  // A sanity line: if a scenario accidentally renders an empty body, say so
  // instead of shipping a pretty picture of nothing.
  for (const item of cases) {
    const chars = textOf(flatten(item.panels)).replace(/\s+/g, '')
    if (chars.length < 40) console.error(`WARN scenario "${item.title}" rendered almost no text`)
  }
}
