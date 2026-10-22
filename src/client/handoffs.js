// The in-flight hand-off table, grouped by sender.
//
// 0.3.4 rendered one line per work, capped at three, sorted by time, and buried
// at the very bottom of the panel. That shape could not answer "who is the
// bottleneck": two separate records from the same sender looked like two
// unrelated flows, a mutually-blocked pair looked like ordinary traffic, and the
// only place you could read it was the last place your eye went.
//
// The arrow is `→` (a character, not a CSS line) because the direction is the
// whole point: `from → to` is who *dispatched*, and the debt runs the other way.
// A drawn line would lose the direction, and it would also break at narrow
// widths; a glyph never does.
import { createElement as h } from 'react'
import { ago } from './format.js'
import { topologyOf } from './layers.js'

// Bounded height, bounded by *rows* rather than by a nested scroll box: two
// scrollbars fighting inside a 420px column is worse than a truncated list, and
// both overflow paths keep a count so nothing is silently lost.
const GROUPS_MAX = 3
const EDGES_MAX = 3

// `data-blocked` is decided by the receiver's *current* scene, never by `works`.
// `works` means "this many items are still owed", not "this Bot is stuck" — a Bot
// can owe four items and be sprinting through them. Calling that blocked would
// send the user to chase somebody who is already paying the debt down.
//
// Default is "no emphasis": only two of the four cases add pixels, so an
// unmarked row reads as normal and a marked row reads as abnormal. The cheapest
// implementation is therefore also the correct one.
const blockedOf = scene => {
  if (scene === 'alert' || scene === 'error') return 'true'
  if (!scene || scene === 'idle') return 'idle'
  return 'false'
}

export function Handoffs({ works, t, onPick, sceneOf }) {
  const groups = topologyOf(works)
  if (!groups.length) return null
  const shown = groups.slice(0, GROUPS_MAX)
  const hiddenGroups = groups.length - shown.length
  return h('div', { className: 'bb-handoffs', role: 'group', 'aria-label': t('handoff.title') },
    shown.map(group => {
      const edges = group.edges.slice(0, EDGES_MAX)
      const hiddenItems = group.edges.slice(EDGES_MAX).reduce((sum, edge) => sum + edge.open, 0)
      return h('div', { className: 'bb-ho-group', key: group.fromId },
        h('div', { className: 'bb-ho-group-head' },
          h('span', { className: 'bb-ho-from' }, group.from || '？'),
          h('span', { className: 'bb-ho-total' }, t('ho.groupTotal').replace('{n}', String(group.total)))),
        edges.map(edge => {
          const blocked = blockedOf(sceneOf?.(edge.toId))
          return h('div', {
            className: 'bb-handoff',
            key: edge.id,
            // Keyboard parity with the workstations: this used to be a plain
            // clickable div, so a keyboard user could not open a hand-off at all.
            role: 'button',
            tabIndex: 0,
            'data-blocked': blocked,
            'data-mutual': edge.mutual ? 'true' : undefined,
            onClick: () => onPick?.(edge),
            onKeyDown: event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onPick?.(edge)
              }
            },
            title: edge.last ?? '',
          },
            // Shape change *and* a word: `⇄` alone is a riddle, so the mutual
            // case also prints 互相等.
            h('span', { className: 'bb-ho-arrow' }, edge.mutual ? '⇄' : '→'),
            h('span', { className: 'bb-ho-name' }, edge.to || '？'),
            h('span', { className: 'bb-ho-count' }, `${edge.open} ${t('handoff.open')}`),
            blocked === 'true' ? h('span', { className: 'bb-ho-flag' }, t('ho.blocked')) : null,
            blocked === 'idle' ? h('span', { className: 'bb-ho-flag' }, t('ho.notStarted')) : null,
            edge.mutual ? h('span', { className: 'bb-ho-flag' }, t('ho.mutual')) : null,
            h('span', { className: 'bb-ho-time' }, ago(edge.at, Date.now(), t)))
        }),
        hiddenItems > 0
          ? h('div', { className: 'bb-ho-more' }, t('ho.moreItems').replace('{n}', String(hiddenItems)))
          : null)
    }),
    hiddenGroups > 0
      ? h('div', { className: 'bb-ho-more' }, t('ho.morePeople').replace('{n}', String(hiddenGroups)))
      : null)
}
