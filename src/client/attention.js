// Layer 1 「需要你」 and layer 3 「闲着」.
//
// Both are deliberately thin. Layer 1 is the only place in the panel that carries
// a 30px face, a 600-weight name and an action *sentence* — that is where the
// attention budget goes. Layer 3 has no image, no surface and no lamp: an idle Bot
// should be readable in one glance and cost nothing.
import { createElement as h } from 'react'
import { seatOf } from './const.js'
import { Elapsed } from './elapsed.js'
import { Lamp, blobSeat } from './station.js'

// A crop of the same dumpling the classroom draws, not a second avatar style:
// `viewBox="56 24 60 60"` covers the body (60–112) plus both hands (59–113), and
// 24–84 covers the head accessory's top (26) down to just under the body. The
// desk, chair and monitor are siblings of `blobSeat` in Station, so cropping it
// excludes them for free. 30/60 = 0.5, which keeps the eyes at 2.5×4.5px.
function Avatar({ scene, bot }) {
  return h('span', { className: 'bb-att-avatar' },
    h('svg', { width: 30, height: 30, viewBox: '56 24 60 60', 'aria-hidden': 'true', focusable: 'false' },
      blobSeat(scene, seatOf(bot))))
}

// One row per Bot that needs the user, max three, sorted by `attentionOf`.
// The 12px lamps all sit flush right (the action column is the only flexible one
// and it pushes them there), which turns them into a vertical shape rail: diamond
// vs square becomes a comparison without moving your eyes, where in 0.3.4 they
// were scattered across nine cells and needed nine saccades.
export function Attention({ items, overflow = 0, t, onOpen }) {
  const rows = items ?? []
  if (!rows.length) {
    // Not blank. A panel that says nothing has not told you whether it looked.
    return h('div', { className: 'bb-attention' },
      h('div', { className: 'bb-att-empty' },
        h('b', null, '✓'),
        h('span', null, t('attention.empty'))))
  }
  return h('div', { className: 'bb-attention' },
    rows.map(row => h('div', {
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
      h(Avatar, { scene: row.scene, bot: row.bot }),
      // No NAME_INK here on purpose: in this layer the alert/error split is
      // already carried by the 3px left bar, the lamp's shape and the words of the
      // action. A coloured name would be a fourth copy of the same fact, and it
      // would break the vertical rail into two colours to compare.
      h('span', { className: 'bb-att-name' }, row.bot.name),
      h('span', { className: 'bb-att-act' }, row.action),
      // Always rendered, even when there is no turn start to count from: the
      // column keeps its 44px so the lamps stay on one vertical rail.
      h('span', { className: 'bb-att-time' }, h(Elapsed, { since: row.since })),
      h('span', { className: 'bb-att-lamp' }, h(Lamp, { scene: row.scene, size: 12 })))),
    overflow > 0
      ? h('div', { className: 'bb-att-more' }, t('attention.overflow').replace('{n}', String(overflow)))
      : null)
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
