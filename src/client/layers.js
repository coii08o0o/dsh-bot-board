// The three-layer attention axis, as pure functions.
//
// The panel shows one monotonically decreasing axis: 「需要你」(0–3 rows) →
// 「在动」(the whole classroom) → 「闲着」(one line of names). Which layer a Bot
// belongs to is a *view* decision taken at render time — `buildRows` keeps its
// roster order untouched, so a workstation never moves because a status changed.
// Everything in this file is React-free so it can be exercised without a DOM.

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
// longest-running one comes first — it is the one that has been costing the most.
// The key is `since || failure.at`: a failure that has not started a turn yet has
// no `since`, and its own timestamp is the honest "how long has this been broken".
const waitKey = row => Number(row?.since) || Number(row?.failureAt) || 0
const groupRank = row => (row?.scene === 'alert' ? 0 : 1)

export function attentionOf(rows, max = ATTENTION_MAX) {
  const hot = (rows ?? []).filter(row => row.scene === 'alert' || row.scene === 'error')
  // Array#sort is stable, so equal timestamps keep roster order.
  const sorted = [...hot].sort((a, b) => {
    const rank = groupRank(a) - groupRank(b)
    return rank !== 0 ? rank : waitKey(b) - waitKey(a)
  })
  return { items: sorted.slice(0, max), overflow: Math.max(0, sorted.length - max) }
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
    const mutual = Boolean(reverse) && reverse !== work
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
// measured (no layout engine in the checks, and the panel is fixed-width anyway):
// CJK 11px/char, Latin 6.2px/char, a badge 12+2, a gap 6, the 闲着 prefix 22+6.
const IDLE_BUDGET = 380
const CJK = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/

const nameWidth = name => {
  let width = 0
  for (const char of String(name ?? '')) width += CJK.test(char) ? 11 : 6.2
  return width
}
const itemWidth = row => nameWidth(row?.bot?.name) + (row?.badge ? 14 : 0)

// Overflow degrades by *dropping from the tail*, and it drops the first item
// without a badge. Never by re-sorting: the quiet line is part of how this user
// remembers who is who ("位置是你记人的方式"), so roster order survives even when
// the line has to shrink. The badge is the one thing that must never be dropped —
// a Bot that failed and went quiet is idle-with-a-badge, and losing the badge in
// the compressed form would silently undo that.
export function idleLine(rows, budget = IDLE_BUDGET) {
  const kept = [...(rows ?? [])]
  let overflow = 0
  const total = items => {
    if (!items.length) return 0
    return 28 + items.reduce((sum, row) => sum + itemWidth(row) + 6, 0)
  }
  while (kept.length && total(kept) > budget) {
    let index = -1
    for (let i = kept.length - 1; i >= 0; i -= 1) {
      if (!kept[i].badge) { index = i; break }
    }
    // Everything left carries a badge: the badges win, the tail still goes.
    if (index < 0) index = kept.length - 1
    kept.splice(index, 1)
    overflow += 1
  }
  return { items: kept, overflow }
}
