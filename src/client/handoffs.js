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
import { createElement as h, useState } from 'react'
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
  // The cap keeps the table inside 420px, but it used to be a dead end: the row
  // that said 「还有 5 项」 was a plain div, so the five answers to "who picked it
  // up" were not on the panel and not in the drawer either — the one scenario the
  // table exists for (one sender, eight subjects) was the one it truncated
  // (v0.4.2 audit, finding #15). Expanding is a user action, so it can cost height.
  const [all, setAll] = useState(false)
  const groups = topologyOf(works)
  if (!groups.length) return null
  const shown = all ? groups : groups.slice(0, GROUPS_MAX)
  const hiddenGroups = groups.length - Math.min(groups.length, GROUPS_MAX)
  const more = (label, count) => h('div', {
    className: 'bb-ho-more',
    role: 'button',
    tabIndex: 0,
    onClick: event => {
      event.stopPropagation()
      setAll(value => !value)
    },
    onKeyDown: event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        setAll(value => !value)
      }
    },
  }, all ? t('ho.collapse') : label.replace('{n}', String(count)))
  return h('div', { className: 'bb-handoffs', role: 'group', 'aria-label': t('handoff.title') },
    shown.map(group => {
      const edges = all ? group.edges : group.edges.slice(0, EDGES_MAX)
      const hiddenItems = group.edges.slice(EDGES_MAX).reduce((sum, edge) => sum + edge.open, 0)
      return h('div', { className: 'bb-ho-group', key: group.fromId },
        h('div', { className: 'bb-ho-group-head' },
          h('span', { className: 'bb-ho-from' }, group.from || '？'),
          h('span', { className: 'bb-ho-total' }, t('ho.groupTotal').replace('{n}', String(group.total)))),
        edges.map(edge => {
          const blocked = blockedOf(sceneOf?.(edge.toId))
          // A cycle where both sides are visibly working is not a deadlock: each
          // is paying the other's debt down. Printing 互相等 there sends the user
          // to chase two Bots that are already running — the same "debt is not a
          // stall" mistake `blockedOf` already avoids for single edges.
          const bothBusy = sceneOf?.(edge.fromId) === 'busy' && sceneOf?.(edge.toId) === 'busy'
          const mutual = edge.mutual && !bothBusy
          return h('div', {
            className: 'bb-handoff',
            key: edge.id,
            // Keyboard parity with the workstations: this used to be a plain
            // clickable div, so a keyboard user could not open a hand-off at all.
            role: 'button',
            tabIndex: 0,
            'data-blocked': blocked,
            'data-mutual': mutual ? 'true' : undefined,
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
            h('span', { className: 'bb-ho-arrow' }, mutual ? '⇄' : '→'),
            h('span', { className: 'bb-ho-name' }, edge.to || '？'),
            h('span', { className: 'bb-ho-count' }, `${edge.open} ${t('handoff.open')}`),
            blocked === 'true' ? h('span', { className: 'bb-ho-flag' }, t('ho.blocked')) : null,
            blocked === 'idle' ? h('span', { className: 'bb-ho-flag' }, t('ho.notStarted')) : null,
            mutual ? h('span', { className: 'bb-ho-flag' }, t('ho.mutual')) : null,
            h('span', { className: 'bb-ho-time' }, ago(edge.at, Date.now(), t)))
        }),
        hiddenItems > 0 ? more(t('ho.moreItems'), hiddenItems) : null)
    }),
    hiddenGroups > 0 ? more(t('ho.morePeople'), hiddenGroups) : null)
}
