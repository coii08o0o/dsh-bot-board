// The in-flight hand-off strip: only works with open items, so it stays empty on
// a quiet board and never lists the orphan records ds-bot leaves behind.
import { createElement as h } from 'react'
import { ago } from './format.js'

export function Handoffs({ works, t, onPick }) {
  const open = (works ?? []).filter(work => work.open > 0).slice(0, 3)
  if (!open.length) return null
  return h('div', { className: 'bb-handoffs' },
    h('div', { className: 'bb-ho-title' }, t('handoff.title')),
    open.map(work => h('div', {
      className: 'bb-handoff',
      key: work.id,
      // The workstations are reachable by keyboard; the strip used to be a plain
      // clickable div, so a keyboard user could not open a hand-off at all.
      role: 'button',
      tabIndex: 0,
      onClick: () => onPick?.(work),
      onKeyDown: event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onPick?.(work)
        }
      },
      title: work.last ?? '',
    },
      h('span', { className: 'bb-ho-name' }, work.from || '？'),
      h('span', { className: 'bb-ho-arrow' }, '→'),
      h('span', { className: 'bb-ho-name' }, work.to || '？'),
      h('span', { className: 'bb-ho-count' }, `${work.open} ${t('handoff.open')}`),
      h('span', { className: 'bb-ho-time' }, ago(work.at, Date.now(), t)))))
}
