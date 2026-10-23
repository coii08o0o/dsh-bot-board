// Layer 1 「需要你」 and layer 3 「闲着」.
//
// Both are deliberately thin. Layer 1 is the only place in the panel that carries
// a 30px face, a 600-weight name and an action *sentence* — that is where the
// attention budget goes. Layer 3 has no image, no surface and no lamp: an idle Bot
// should be readable in one glance and cost nothing.
import { createElement as h, memo } from 'react'
import { seatOf } from './const.js'
import { Elapsed } from './elapsed.js'
import { ATTENTION_MAX } from './layers.js'
import { Lamp, blobSeat } from './station.js'

// A crop of the same dumpling the classroom draws, not a second avatar style.
// `viewBox="54 32 64 64"` covers the widest character (58 units) plus both hands,
// and the tallest (56 units) top to bottom — the silhouettes are not all the same
// size any more, so the crop is sized for the largest one. The desk, chair and
// monitor are siblings of `blobSeat` in Station, so cropping it excludes them for
// free. 30/64 ≈ 0.47, which keeps the eyes at ~2.3×4.2px.
function Avatar({ scene, bot, seat, className = 'bb-att-avatar' }) {
  return h('span', { className },
    h('svg', { width: 30, height: 30, viewBox: '54 32 64 64', 'aria-hidden': 'true', focusable: 'false' },
      blobSeat(scene, seat ?? seatOf(bot))))
}

// One row per Bot that needs the user, max three, sorted by `attentionOf`.
// The 12px lamps all sit flush right (the action column is the only flexible one
// and it pushes them there), which turns them into a vertical shape rail: diamond
// vs square becomes a comparison without moving your eyes, where in 0.3.4 they
// were scattered across nine cells and needed nine saccades.
//
// Overflow is a chip *inside* the last row, not a line below it: zero height, and
// — the part that matters — it is a real control, so the 4th Bot onwards is
// reachable instead of being a name that exists nowhere on the panel.
export function Attention({ items, overflow = 0, expanded = false, t, onOpen, onExpand }) {
  const rows = items ?? []
  if (!rows.length) {
    // Not blank. A panel that says nothing has not told you whether it looked.
    return h('div', { className: 'bb-attention' },
      h('div', { className: 'bb-att-empty' },
        h('b', null, '✓'),
        h('span', null, t('attention.empty'))))
  }
  const last = rows.length - 1
  // Expanded with nothing left to hide (the count dropped) draws no chip at all,
  // so the state heals itself instead of leaving a stray control behind.
  const chip = overflow > 0 || (expanded && rows.length > ATTENTION_MAX)
  return h('div', { className: 'bb-attention' },
    rows.map((row, index) => h('div', {
      className: 'bb-attention-row',
      key: row.bot.id,
      role: 'button',
      tabIndex: 0,
      'data-scene': row.scene,
      title: row.action || row.bot.name,
      onClick: () => onOpen(row),
      onKeyDown: event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(row) }
      },
    },
      h(Avatar, { scene: row.scene, bot: row.bot, seat: row.seat }),
      // No NAME_INK here on purpose: in this layer the alert/error split is
      // already carried by the 3px left bar, the lamp's shape and the words of the
      // action. A coloured name would be a fourth copy of the same fact, and it
      // would break the vertical rail into two colours to compare.
      h('span', { className: 'bb-att-name' }, row.bot.name),
      h('span', { className: 'bb-att-act' }, row.action),
      // When collapsed the chip rides the last row (`+N` belongs where the list
      // ends). When expanded it moves to the FIRST row: nine expanded rows are
      // 430px inside a 279px body, and `.bb-body` is `overflow:hidden`, so the
      // `−` that lived on the last row was clipped away and the expanded state
      // could not be undone at 420×320 (v0.4.2 audit, finding #6).
      chip && (expanded ? index === 0 : index === last)
        ? h('span', {
            className: 'bb-att-more',
            role: 'button',
            tabIndex: 0,
            'data-expanded': expanded ? 'true' : 'false',
            title: expanded
              ? t('attention.collapse')
              : t('attention.overflow').replace('{n}', String(overflow)),
            'aria-label': expanded
              ? t('attention.collapse')
              : t('attention.overflow').replace('{n}', String(overflow)),
            // The chip lives inside a row that is itself a button, so every
            // activation bubbles: without stopPropagation, clicking `+2` opened
            // the drawer of the Bot on that row (the drawer covers the panel, so
            // the list looked like it had jumped to someone else's details).
            // `preventDefault` is not enough on the keyboard path — the row's
            // handler only looks at `event.key`, not at whether it was handled.
            onClick: event => {
              event.stopPropagation()
              onExpand?.()
            },
            onKeyDown: event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                event.stopPropagation()
                onExpand?.()
              }
            },
          }, expanded ? '−' : `+${overflow}`)
        : null,
      // Always rendered, even when there is no turn start to count from: the
      // column keeps its 44px so the lamps stay on one vertical rail.
      // `waitSince` is the moment the request arrived — `approval.at` when there
      // is one, else the turn start, else the failure. This column answers "how
      // long have I been ignoring this", and using the turn start made a
      // three-second-old approval read as 12m34s (v0.4.2 audit, finding #3).
      h('span', { className: 'bb-att-time' }, h(Elapsed, {
        since: row.waitSince ?? (row.since || row.failureAt),
        until: row.freezeAt,
      })),
      h('span', { className: 'bb-att-lamp' }, h(Lamp, { scene: row.scene, size: 12 })))))
}

// One line of names. No separators (eight of them would cost 128px and blow the
// 400px budget), no lamps, no colour coding — the `!` badge is a *shape*, and it
// is the only mark allowed here. Wrapping is forbidden: a second line breaks the
// height budget outright, so overflow degrades to `+N` instead.
export function IdleLine({ items, overflow = 0, expanded = false, t, onOpen, onExpand }) {
  const rows = items ?? []
  if (!rows.length && !overflow) return null
  return h('div', {
    className: 'bb-idle',
    'data-expanded': expanded ? 'true' : 'false',
  },
    h('span', { className: 'bb-idle-k' }, t('layer.idle')),
    rows.map(row => h('span', {
      className: 'bb-idle-name',
      key: row.bot.id,
      role: 'button',
      tabIndex: 0,
      title: row.bot.name,
      onClick: () => onOpen(row),
      onKeyDown: event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(row) }
      },
    },
      h('span', null, row.bot.name),
      // The badge travels with the name in every compressed form. 0.3.4 made a
      // quiet failure a badge instead of a red lamp; dropping it here would
      // silently revert that.
      row.badge
        ? h('span', { className: 'bb-badge bb-badge-inline', title: row.failure ?? '' }, '!')
        : null)),
    overflow > 0
      ? h('span', {
          className: 'bb-idle-more',
          role: 'button',
          tabIndex: 0,
          title: t('attention.overflow').replace('{n}', String(overflow)),
          onClick: () => onExpand?.(),
          onKeyDown: event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onExpand?.() }
          },
        }, `+${overflow}`)
      : null)
}

// ── Layer 3, roster form (v0.7.0) ────────────────────────────────────────────
// Drawn only in the degenerate state Body calls `rest`: nothing needs you,
// nobody is running, no hand-off is open, and at least one Bot is resting. That
// state used to be a 24px line of names at the bottom of 400px of cream, which
// read as a panel that never finished loading.
//
// It is deliberately not layer 1 in grey:
//   - no white card and no 3px status bar. The card measures 1.07:1 on cream, so
//     it encodes nothing; spending it a second time only blurs which rows want
//     something from you.
//   - no lamp. Nine identical grey circles are wallpaper, not a channel — the
//     shape vocabulary only means something next to a row that is *not* idle. A
//     quiet failure keeps its `!`, which is the one mark that carries news.
//   - the name is weight 500, one step under layer 1's 600.
// What it keeps is the 44px rhythm, the 30px face crop and the column order, so
// the two bands read as one table rather than two drawings.
const IdleRowView = ({ row, t, onOpen }) => {
  const { bot, seat, badge, failure } = row
  // role → model → nothing. The second column answers "who could take this"; a
  // Bot with neither leaves it empty rather than repeating the state word, which
  // has a column of its own on the right.
  const sub = bot.role || bot.model || ''
  return h('div', {
    className: 'bb-roster-row',
    role: 'button',
    tabIndex: 0,
    title: `${bot.name}${sub ? ` · ${sub}` : ''} · ${t('status.idle')}`,
    onClick: () => onOpen(row),
    onKeyDown: event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(row) }
    },
  },
    h(Avatar, { scene: row.scene, bot, seat, className: 'bb-roster-av' }),
    h('span', { className: 'bb-roster-nm' }, bot.name),
    h('span', { className: 'bb-roster-sub', 'data-kind': sub ? 'role' : 'none' }, sub),
    // The state word sits where layer 1 puts the duration: flush right, one
    // column, so a row reads across the whole panel instead of stopping after
    // the name. It is also the only column that is never empty.
    h('span', { className: 'bb-roster-state' }, t('status.idle')),
    // `bb-badge bb-badge-inline` — the same node the compressed name line uses,
    // not a second red dot: style.js promises that class name is the contract
    // D1 asserts on, and two badges that tune independently are two badges that
    // drift. The roster only adds a slot for it to sit in — layer 1's lamp slot.
    badge ? h('span', { className: 'bb-badge bb-badge-inline', title: failure ?? '' }, '!') : null)
}

// The 1.5s poll rebuilds every row object, so identity cannot be compared. Same
// field-by-field memo as Station, for the same reason: nine faces must not be
// rebuilt on every tick.
const IdleRow = memo(IdleRowView, (prev, next) => {
  const a = prev.row
  const b = next.row
  return a.bot.id === b.bot.id
    && a.bot.name === b.bot.name
    && a.bot.role === b.bot.role
    && a.bot.model === b.bot.model
    && a.scene === b.scene
    && a.badge === b.badge
    && a.failure === b.failure
    && a.seat?.color === b.seat?.color
    && a.seat?.shape === b.seat?.shape
    && a.seat?.prop === b.seat?.prop
    && prev.t === next.t
    && prev.onOpen === next.onOpen
})

// `cols` and `capacity` come from Body, which derives them from the panel's own
// height and width: the column count is a function of how much room is left, not
// a breakpoint, because the panel is resizable and the room is whatever the user
// made. `capacity` is how many rows fit; anything past it is reported rather than
// silently clipped. Both are integer arithmetic — no DOM measurement, so the
// promise holds in the check harness too.
export function IdleRoster({ items, cols = 1, capacity = Number.POSITIVE_INFINITY, tight = false, align = 'center', t, onOpen }) {
  const rows = items ?? []
  if (!rows.length) return null
  const hidden = Number.isFinite(capacity) ? Math.max(0, rows.length - capacity) : 0
  return h('div', { className: 'bb-roster', 'data-density': tight ? 'tight' : 'full', 'data-align': align },
    h('div', { className: 'bb-roster-scroll' },
      h('div', {
        className: 'bb-roster-grid',
        style: { gridTemplateColumns: `repeat(${Math.max(1, cols)}, minmax(0, 1fr))` },
      }, rows.map(row => h(IdleRow, { key: row.bot.id, row, t, onOpen })))),
    hidden > 0
      ? h('div', { className: 'bb-roster-more', role: 'status' },
          t('run.overflow').replace('{n}', String(hidden)))
      : null)
}
