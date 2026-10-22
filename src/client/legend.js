// The legend, demoted from a permanent strip to a drawer.
//
// The old strip was 27px of the most valuable pixels on the panel, rendered every
// tick, and it never changed: zero information sitting exactly where the eye
// lands first. It is now behind a `?` button and costs nothing until asked for.
//
// What replaces it, at zero standing cost: the layer-1 action text already spells
// the state out as words (等你批 Bash / 报错：模型超时), every workstation carries
// the state name in its `title`, and the shapes themselves are the third channel.
// The drawer is the reference you can open, not a billboard you cannot close.
//
// It renders the same `Lamp` component the floor uses. That is the whole reason
// demoting the legend is safe: if somebody tunes the lamp on the floor and
// forgets the legend, the legend would start lying — and the legend is the only
// frame of reference the user has.
import { createElement as h } from 'react'
import { LEGEND } from './const.js'
import { Lamp } from './station.js'

export function LegendSheet({ t, onClose }) {
  return h('div', {
    className: 'bb-drawer',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': t('legend.help'),
  },
    h('div', { className: 'bb-drawer-head' },
      h('span', { className: 'bb-drawer-title' }, t('legend.help')),
      h('span', { className: 'bb-grow' }),
      h('button', {
        className: 'bb-icon',
        type: 'button',
        onClick: onClose,
        title: t('drawer.close'),
      }, '×')),

    h('div', { className: 'bb-drawer-body' },
      LEGEND.map(([key, labelKey]) => h('div', { className: 'bb-lg-row', key },
        h('span', { className: 'bb-lg-lamp' }, h(Lamp, { scene: key, size: 16 })),
        h('span', { className: 'bb-lg-name' }, t(labelKey)),
        h('span', { className: 'bb-lg-hint' }, t(`legend.hint.${key}`))))))
}
