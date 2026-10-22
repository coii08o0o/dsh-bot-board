// The three-layer attention axis, as pure functions.
//
// The panel shows one monotonically decreasing axis: 「需要你」(0–3 rows) →
// 「在动」(the whole classroom) → 「闲着」(one line of names). Which layer a Bot
// belongs to is a *view* decision taken at render time — `buildRows` keeps its
// roster order untouched, so a workstation never moves because a status changed.
// Everything in this file is React-free so it can be exercised without a DOM.
import { PANEL_BORDER, SIZE_MIN } from './const.js'

// Layer membership. Note `waiting` and `done` are "in the room", not idle:
//   - `waiting` is neither running nor free (it is blocked on another Bot), so
//     filing it under 闲着 would be a lie;
//   - `done` only lasts 7 seconds and the Bot has just handed work back, so it is
//     still visibly in the room. Dropping it would erase the one moment worth
//     glancing at, and would leave a waving name in the quiet line.
export const LAYER_ATTENTION = 'attention'
export const LAYER_RUNNING = 'running'
export const LAYER_IDLE = 'idle'

export function layerOf(row) {
  const scene = row?.scene
  if (scene === 'alert' || scene === 'error') return LAYER_ATTENTION
  if (scene === 'busy' || scene === 'waiting' || scene === 'done') return LAYER_RUNNING
  return LAYER_IDLE
}

// 「需要你」 is at most three rows. The overflow count is returned separately so
// the renderer can say 还有 N 个 instead of silently dropping the rest — the count
// is information, the rows are just the budget.
export const ATTENTION_MAX = 3

// Sorting rule, and the reason for it: an `alert` is cleared by one click and
// gives the whole team its throughput back, while an `error` needs a decision
// about what went wrong. So every alert outranks every error. Inside a group the
// one that has been waiting longest comes first — it is the one that has been
// costing the most.
//
// The key is `approvalAt || since || failure.at`: an approval is a request that
// arrived at a moment, and that moment is what "how long have I been ignoring
// this" means. `since` is the turn's start, which is a different question — using
// it made a 3-second-old approval on a 12-minute turn read as 12m34s.
// A failure that has not started a turn yet has no `since`, and its own timestamp
// is the honest "how long has this been broken".
// Because an older timestamp means a longer wait, the comparison is ASCENDING.
// It used to be descending (newest first), which put a Bot that broke ten seconds
// ago above one that has been stuck for three hours — the exact inverse of the
// rule this list exists to apply, and the smoke test had baked the wrong
// direction in as 'daibe'.
const waitKey = row => Number(row?.approvalAt) || Number(row?.since) || Number(row?.failureAt) || 0
const groupRank = row => (row?.scene === 'alert' ? 0 : 1)

export function attentionOf(rows, max = ATTENTION_MAX) {
  const hot = (rows ?? []).filter(row => row.scene === 'alert' || row.scene === 'error')
  // `Infinity` is a legitimate budget (the expanded list shows everything); a
  // negative or NaN budget is not, and `slice(0, -1)` would silently drop the
  // last row *and* over-count the overflow, showing the same Bot twice.
  const limit = max === Number.POSITIVE_INFINITY
    ? max
    : Number.isFinite(max) ? Math.max(0, Math.floor(max)) : ATTENTION_MAX
  // Array#sort is stable, so equal timestamps keep roster order.
  const sorted = [...hot].sort((a, b) => {
    const rank = groupRank(a) - groupRank(b)
    return rank !== 0 ? rank : waitKey(a) - waitKey(b)
  })
  const items = sorted.slice(0, limit)
  // An alert is cleared by one click; an error needs a decision about what went
  // wrong. So alerts outrank errors — but not to the point of erasing them: with
  // three approvals and one failure the failing Bot vanished from the panel
  // entirely (layer 2 and 3 do not take `error`), leaving only a 「1 卡住」 count
  // in the header. Reserve one slot for the oldest error whenever there is room
  // for two rows (v0.4.2 audit, finding #4).
  if (items.length >= 2 && !items.some(row => row.scene === 'error')) {
    const oldestError = sorted.find(row => row.scene === 'error')
    if (oldestError) items[items.length - 1] = oldestError
  }
  return { items, overflow: Math.max(0, sorted.length - items.length) }
}

// ── Hand-offs ───────────────────────────────────────────────────────────────
// `from → to` is the direction work was *dispatched*; the debt runs the other
// way (`to` owes `from`). The arrow says dispatch, the words say debt.
//
// Grouped by sender because the group total answers the only question worth
// asking of this table: who is the bottleneck. A node-link graph cannot answer it
// in a 420px scrollable column (edges would cross cells and be clipped), and it
// costs an order of magnitude more to draw.
//
// Mutually-open pairs: A→B and B→A both open means the two are waiting on each
// other. Each direction stays in its own sender's group — that keeps every group
// total an honest sum of *that* sender's open items — but both edges are flagged
// `mutual` and paired by `pair`, so the cycle is named on both sides instead of
// being drawn as two unrelated flows. Merging them into a single row would have
// to hide one side's count, and a count that disappears is worse than a cycle
// that appears twice.
export function topologyOf(works) {
  const open = (works ?? []).filter(work => Number(work?.open) > 0)
  if (!open.length) return []

  const idOf = work => String(work.fromId ?? work.from ?? '')
  const toOf = work => String(work.toId ?? work.to ?? '')
  const keyOf = (from, to) => `${from}\u0000${to}`
  const byPair = new Map()
  for (const work of open) byPair.set(keyOf(idOf(work), toOf(work)), work)

  const groups = new Map()
  for (const work of open) {
    const fromId = idOf(work)
    const toId = toOf(work)
    const reverse = byPair.get(keyOf(toId, fromId))
    // A self-loop (a Bot that handed work to itself, which the upstream record
    // can produce when `from` and `to` resolve to the same session) has only one
    // direction, so it can never be "waiting on each other". Without the first
    // clause two separate a→a records would pair with each other and get flagged
    // `mutual`, printing 「⇄ 互相等」 for a Bot waiting on nobody.
    const mutual = fromId !== toId && Boolean(reverse) && reverse !== work
    const edge = {
      id: work.id ?? keyOf(fromId, toId),
      fromId,
      toId,
      from: work.from || fromId,
      to: work.to || toId,
      open: Number(work.open) || 0,
      at: Number(work.at) || 0,
      last: work.last ?? null,
      mutual,
      pair: mutual ? [fromId, toId].sort().join('\u0000') : null,
    }
    if (!groups.has(fromId)) {
      groups.set(fromId, { fromId, from: edge.from, total: 0, edges: [] })
    }
    const group = groups.get(fromId)
    group.edges.push(edge)
    group.total += edge.open
  }

  for (const group of groups.values()) {
    // Biggest debt first inside a group, oldest first on a tie: the top row is
    // always the worst thing in that group.
    group.edges.sort((a, b) => b.open - a.open || a.at - b.at)
  }
  // Biggest group first — the bottleneck is the answer, so it is at the top.
  return [...groups.values()].sort((a, b) => b.total - a.total || a.fromId.localeCompare(b.fromId))
}

// ── 闲着 ────────────────────────────────────────────────────────────────────
// One line, no wrapping, no separators. Widths are estimated rather than
// measured (no layout engine in the checks, and the panel is fixed-width anyway).
//
// Every term below has to match `style.js`, because a budget that under-counts
// does not shrink the line — `.bb-idle` is `overflow:hidden`, so the overflow
// just gets sliced off the right edge with no ellipsis and no `+N`. The first
// version counted only the glyphs and one trailing gap it never used, so nine
// three-character names "fit" at 379px while actually taking 409px: the ninth
// name was clipped, and with four-character names the thing clipped was the `+2`
// itself — the only control that could have revealed the two hidden names.
// The budget is derived from the smallest panel instead of typed. `SIZE_MIN.w`
// minus the panel border and the horizontal padding is 398; `IDLE_SLOP` is the
// 18px that absorbs the estimator's own error. It used to be a bare `380` with no
// upper bound at all: raising it to 600 stayed green, and at 420px that clips the
// ninth name *and* the `+N` chip that would have revealed it — the exact bug
// v0.4.1 fixed, back through a different door (v0.4.2 audit, finding #7).
export const IDLE_SLOP = 18
export const IDLE_USABLE = SIZE_MIN.w - PANEL_BORDER - 20
export const IDLE_BUDGET = IDLE_USABLE - IDLE_SLOP
// `.bb-idle` gap, between names and before the chip.
const IDLE_GAP = 6
// `.bb-idle-k` is 「闲着」 (22) plus the flex gap (6).
const IDLE_PREFIX = 28
// `.bb-idle-name` is `padding:1px 2px`, so 4px of horizontal box the glyph
// estimate never sees.
const NAME_PAD = 4
// `.bb-badge-inline` is 12px wide plus the name's inner 2px gap.
const BADGE_W = 14
// `.bb-idle-more` is `padding:1px 3px` around `+N` — about 18px at 11px type.
const CHIP_W = 18
// Hangul and the emoji planes render at CJK width, not at the 6.2px Latin
// estimate. Without them a Korean or emoji name is under-counted by ~45%, which
// is the same class of error as the missing padding. CJK Extension B (U+20000+)
// was the one plane `AUDIT-LOGIC:240` asked for and nobody added: a name of three
// such characters estimated 279px while really taking 409px, so the line kept all
// nine names, reported `overflow = 0`, rendered no `+N`, and clipped the tail.
export const CJK = /[\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]|[\u{1f300}-\u{1faff}]|[\u{20000}-\u{2fa1f}]/u

export const nameWidth = name => {
  let width = 0
  for (const char of String(name ?? '')) width += CJK.test(char) ? 11 : 6.2
  return width
}
const itemWidth = row => nameWidth(row?.bot?.name) + (row?.badge ? BADGE_W : 0) + NAME_PAD

// Overflow degrades by *dropping from the tail*, and it drops the first item
// without a badge. Never by re-sorting: the quiet line is part of how this user
// remembers who is who ("位置是你记人的方式"), so roster order survives even when
// the line has to shrink. The badge is the one thing that must never be dropped —
// a Bot that failed and went quiet is idle-with-a-badge, and losing the badge in
// the compressed form would silently undo that.
export function idleLine(rows, budget = IDLE_BUDGET) {
  const kept = [...(rows ?? [])]
  let overflow = 0
  const total = (items, withChip) => {
    if (!items.length) return 0
    const names = items.reduce((sum, row) => sum + itemWidth(row), 0)
    // Gaps sit *between* items; the old version charged one after the last name
    // as well, which is width the line never occupies.
    const gaps = IDLE_GAP * (items.length - 1)
    return IDLE_PREFIX + names + gaps + (withChip ? IDLE_GAP + CHIP_W : 0)
  }
  const dropOne = () => {
    let index = -1
    for (let i = kept.length - 1; i >= 0; i -= 1) {
      if (!kept[i].badge) { index = i; break }
    }
    // Everything left carries a badge: the badges win, the tail still goes.
    if (index < 0) index = kept.length - 1
    kept.splice(index, 1)
    overflow += 1
  }
  // Two passes, because dropping names *creates* the chip that then needs room.
  while (kept.length && total(kept, false) > budget) dropOne()
  while (kept.length && overflow > 0 && total(kept, true) > budget) dropOne()
  return { items: kept, overflow }
}
