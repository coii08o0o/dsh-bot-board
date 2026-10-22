// One workstation: chair + desk + monitor + lamp + dumpling + prop + name, plus
// the one-line meta strip that answers "what is it doing and for how long".
import { memo, createElement as h } from 'react'
import { LAMP, NAME_INK, seatOf, statusLabel } from './const.js'
import { Elapsed } from './elapsed.js'

const DARK = '#2C2C2A'
const FACE_X = 86
const FACE_Y = 62
const BODY_R = 26

// Head accessories that sit on top of the blob body.
function headGear(kind) {
  const cx = FACE_X
  const top = FACE_Y - BODY_R
  if (kind === 'crown') {
    return h('path', {
      d: `M ${cx - 13} ${top + 2} L ${cx - 9} ${top - 8} L ${cx - 4} ${top - 1} L ${cx} ${top - 10} L ${cx + 4} ${top - 1} L ${cx + 9} ${top - 8} L ${cx + 13} ${top + 2} Z`,
      fill: '#FBBF24', stroke: '#D97706', strokeWidth: 1.5, strokeLinejoin: 'round',
    })
  }
  if (kind === 'bowRed' || kind === 'bowCream') {
    const fill = kind === 'bowRed' ? '#DC2626' : '#FDE68A'
    return h('g', null,
      h('path', { d: `M ${cx + 14} ${top + 4} l -9 -6 v 12 z`, fill }),
      h('path', { d: `M ${cx + 14} ${top + 4} l 9 -6 v 12 z`, fill }),
      h('circle', { cx: cx + 14, cy: top + 4, r: 3, fill }))
  }
  if (kind === 'hat') {
    return h('g', null,
      h('path', { d: `M ${cx - 15} ${top + 1} a 15 13 0 0 1 30 0 z`, fill: '#15803D' }),
      h('rect', { x: cx - 19, y: top, width: 38, height: 5, rx: 2.5, fill: '#166534' }))
  }
  if (kind === 'sprout') {
    return h('g', null,
      h('line', { x1: cx, y1: top + 2, x2: cx, y2: top - 8, stroke: '#15803D', strokeWidth: 2, strokeLinecap: 'round' }),
      h('ellipse', { cx: cx - 6, cy: top - 10, rx: 6, ry: 3.5, fill: '#16A34A', transform: `rotate(-24 ${cx - 6} ${top - 10})` }),
      h('ellipse', { cx: cx + 6, cy: top - 10, rx: 6, ry: 3.5, fill: '#22C55E', transform: `rotate(24 ${cx + 6} ${top - 10})` }))
  }
  return null
}

// Face-level accessories drawn over the face disc.
function faceGear(kind) {
  if (kind === 'glasses') {
    return h('g', { fill: 'none', stroke: DARK, strokeWidth: 2 },
      h('circle', { cx: FACE_X - 9, cy: FACE_Y - 4, r: 6.5 }),
      h('circle', { cx: FACE_X + 9, cy: FACE_Y - 4, r: 6.5 }),
      h('line', { x1: FACE_X - 2.5, y1: FACE_Y - 4, x2: FACE_X + 2.5, y2: FACE_Y - 4 }))
  }
  if (kind === 'headphones') {
    return h('g', null,
      h('path', {
        d: `M ${FACE_X - 20} ${FACE_Y - 2} a 20 20 0 0 1 40 0`,
        fill: 'none', stroke: DARK, strokeWidth: 4, strokeLinecap: 'round',
      }),
      h('rect', { x: FACE_X - 23, y: FACE_Y - 5, width: 8, height: 13, rx: 4, fill: DARK }),
      h('rect', { x: FACE_X + 15, y: FACE_Y - 5, width: 8, height: 13, rx: 4, fill: DARK }))
  }
  return null
}

// The desk prop, sitting on the desk top (surface y = 88).
function deskProp(kind) {
  if (kind === 'flag') {
    return h('g', null,
      h('line', { x1: 60, y1: 70, x2: 60, y2: 88, stroke: '#A16207', strokeWidth: 2.5, strokeLinecap: 'round' }),
      h('path', { d: 'M 60 70 h 16 l -4 5 4 5 h -16 z', fill: '#378ADD' }))
  }
  if (kind === 'magnifier') {
    return h('g', null,
      h('circle', { cx: 63, cy: 80, r: 6, fill: 'none', stroke: DARK, strokeWidth: 2 }),
      h('line', { x1: 67.5, y1: 84.5, x2: 73, y2: 89, stroke: DARK, strokeWidth: 3, strokeLinecap: 'round' }))
  }
  if (kind === 'pointer') {
    return h('line', { x1: 56, y1: 88, x2: 76, y2: 71, stroke: '#A16207', strokeWidth: 2.5, strokeLinecap: 'round' })
  }
  if (kind === 'abacus') {
    return h('g', null,
      h('rect', { x: 54, y: 75, width: 22, height: 13, rx: 2, fill: '#F1E3C6', stroke: '#A16207', strokeWidth: 1.5 }),
      h('circle', { cx: 59, cy: 81.5, r: 2, fill: '#B45309' }),
      h('circle', { cx: 65, cy: 81.5, r: 2, fill: '#B45309' }),
      h('circle', { cx: 71, cy: 81.5, r: 2, fill: '#B45309' }))
  }
  if (kind === 'bolt') {
    return h('path', { d: 'M 66 71 l -8 12 h 6 l -3 8 9 -12 h -6 z', fill: '#FBBF24', stroke: '#D97706', strokeWidth: 1, strokeLinejoin: 'round' })
  }
  if (kind === 'flask') {
    return h('g', null,
      h('path', { d: 'M 60 71 v 6 l -7 11 h 16 l -7 -11 v -6 z', fill: '#BBF7D0', stroke: '#166534', strokeWidth: 1.5, strokeLinejoin: 'round' }),
      h('rect', { x: 58, y: 70, width: 6, height: 2.5, rx: 1, fill: '#166534' }))
  }
  if (kind === 'leaf') {
    return h('g', null,
      h('ellipse', { cx: 63, cy: 83, rx: 8, ry: 4.5, fill: '#22C55E', transform: 'rotate(-18 63 83)' }),
      h('line', { x1: 57, y1: 86, x2: 69, y2: 80, stroke: '#15803D', strokeWidth: 1.2 }))
  }
  if (kind === 'books') {
    return h('g', null,
      h('rect', { x: 54, y: 83, width: 24, height: 5, rx: 1, fill: '#EF4444' }),
      h('rect', { x: 56, y: 78, width: 22, height: 5, rx: 1, fill: '#3B82F6' }),
      h('rect', { x: 55, y: 73, width: 21, height: 5, rx: 1, fill: '#FBBF24' }))
  }
  if (kind === 'mic') {
    return h('g', null,
      h('rect', { x: 59, y: 72, width: 9, height: 13, rx: 4.5, fill: DARK }),
      h('line', { x1: 63.5, y1: 85, x2: 63.5, y2: 88, stroke: DARK, strokeWidth: 2 }))
  }
  return null
}

// The status lamp. Colour alone fails two ways here: the green/red pair is
// nearly identical under deuteranopia (ΔE 13.6), and green/yellow/grey sit at
// 1.4–2.1:1 on the cream desk. So the shape carries the state too, and a thin
// outline gives every lamp a boundary that clears 3:1.
//
// The outline is the *only* visible channel for `idle` (fill 1.53:1), which is
// why it is 1.2 and not 0.8: at the 148px cell width a 0.8 stroke inside the
// 170-unit viewBox renders as 0.70px and gets smeared into a pale grey line by
// anti-aliasing — the lamp effectively disappeared.
function lampShape(scene) {
  const fill = LAMP[scene] ?? LAMP.idle
  const common = { fill, stroke: '#5B5648', strokeWidth: 1.2 }
  if (scene === 'error') {
    return h('rect', { x: 148.4, y: 82.4, width: 5.2, height: 5.2, transform: 'rotate(45 151 85)', ...common })
  }
  if (scene === 'alert') {
    return h('rect', { x: 148.4, y: 82.4, width: 5.2, height: 5.2, rx: 1, ...common })
  }
  return h('circle', { cx: 151, cy: 85, r: 2.9, ...common })
}

// The same six states, at a size the caller picks, in a 12-unit box. Three
// call sites share it on purpose: the layer-1 rail (12), the legend drawer (16)
// and the drawer header (14). One component means the legend can never drift
// away from what is actually on the floor — and the legend is the user's only
// frame of reference for the shapes.
//
// Drawn as SVG rather than CSS: `transform:rotate(45deg)` would grow the
// diamond's bounding box to 17px and collide with its neighbours, and the stroke
// width would stop being controllable.
const LAMP_SHAPE = {
  circle: { tag: 'circle', props: { cx: 6, cy: 6, r: 4.5 } },
  square: { tag: 'rect', props: { x: 1.7, y: 1.7, width: 8.6, height: 8.6, rx: 1.3 } },
  // 7.2 × 1.414 + 1.5 = 11.68 units of diagonal, so the diamond stays inside 12.
  diamond: {
    tag: 'rect',
    props: { x: 2.4, y: 2.4, width: 7.2, height: 7.2, rx: 0.8, transform: 'rotate(45 6 6)' },
  },
}

export function Lamp({ scene, size = 12 }) {
  const kind = scene === 'error' ? 'diamond' : scene === 'alert' ? 'square' : 'circle'
  const shape = LAMP_SHAPE[kind]
  return h('svg', {
    className: 'bb-lamp',
    width: size,
    height: size,
    viewBox: '0 0 12 12',
    // Decorative: every call site prints the state as a word next to it, and a
    // second announcement of the same fact is noise in a screen reader.
    'aria-hidden': 'true',
    focusable: 'false',
  }, h(shape.tag, {
    ...shape.props,
    fill: LAMP[scene] ?? LAMP.idle,
    stroke: '#5B5648',
    strokeWidth: 1.5,
  }))
}

// Monitor screen content per scene: bars / red bar / blank / checkmark.
function screenContent(scene) {
  if (scene === 'error') {
    return h('g', null,
      h('rect', { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: '#E7E5E1' }),
      h('rect', { x: 113, y: 67, width: 34, height: 4, rx: 2, fill: '#EF4444' }))
  }
  if (scene === 'idle') {
    return h('rect', { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: '#EDEBE7' })
  }
  if (scene === 'done') {
    return h('g', null,
      h('rect', { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: '#CDEFD9' }),
      h('path', {
        d: 'M 120 69 l 5 5 9 -11',
        fill: 'none', stroke: '#0F766E', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round',
      }))
  }
  if (scene === 'alert') {
    return h('g', null,
      h('rect', { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: '#FDF0C8' }),
      h('path', { d: 'M 130 61 v 9', stroke: '#B45309', strokeWidth: 2.6, strokeLinecap: 'round' }),
      h('circle', { cx: 130, cy: 75, r: 1.8, fill: '#B45309' }))
  }
  if (scene === 'waiting') {
    return h('g', null,
      h('rect', { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: '#D6E4F8' }),
      h('path', { d: 'M 118 69 h 16 m -5 -5 l 5 5 l -5 5', fill: 'none', stroke: '#1D4ED8', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }))
  }
  // busy: light blue screen with 3 small bars.
  return h('g', null,
    h('rect', { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: '#B9D8F2' }),
    h('rect', { x: 113, y: 61, width: 30, height: 3, rx: 1.5, fill: '#7FB4E8' }),
    h('rect', { x: 113, y: 67, width: 34, height: 3, rx: 1.5, fill: '#7FB4E8' }),
    h('rect', { x: 113, y: 73, width: 22, height: 3, rx: 1.5, fill: '#7FB4E8' }))
}

// The dumpling: one big circle body, lighter face disc, capsule eyes, arc mouth,
// blush, two small hands. No legs. Breathing lives on .bb-blob.
//
// Exported because the 「需要你」 list crops this same face with
// `viewBox="56 24 60 60"` — it must be the same drawing, or the person in the
// list stops being the dumpling in the classroom and the user has to learn the
// mapping twice.
export function blobSeat(scene, seat) {
  const cx = FACE_X
  const cy = FACE_Y + 2
  const moon = scene === 'done'
  const squint = scene === 'error'
  const oMouth = scene === 'alert' || scene === 'waiting'
  const eyes = squint
    ? h('g', null,
        h('rect', { x: FACE_X - 12, y: FACE_Y - 5.5, width: 6, height: 2.5, rx: 1.25, fill: DARK }),
        h('rect', { x: FACE_X + 6, y: FACE_Y - 5.5, width: 6, height: 2.5, rx: 1.25, fill: DARK }))
    : moon
      ? h('g', { fill: 'none', stroke: DARK, strokeWidth: 2.5, strokeLinecap: 'round' },
          h('path', { d: `M ${FACE_X - 13} ${FACE_Y - 1} q 4 -6 8 0` }),
          h('path', { d: `M ${FACE_X + 5} ${FACE_Y - 1} q 4 -6 8 0` }))
      : h('g', {
          className: scene === 'busy' ? 'bb-eyes' : scene === 'idle' ? 'bb-eyes bb-eyes-slow' : undefined,
          fill: DARK,
        },
          h('rect', { x: FACE_X - 11.5, y: FACE_Y - 8.5, width: 5, height: 9, rx: 2.5 }),
          h('rect', { x: FACE_X + 6.5, y: FACE_Y - 8.5, width: 5, height: 9, rx: 2.5 }))
  const mouth = oMouth
    ? h('circle', { cx: FACE_X, cy: FACE_Y + 9, r: 3, fill: DARK })
    : squint
      ? h('path', {
          d: `M ${FACE_X - 4} ${FACE_Y + 10} q 4 -3 8 0`,
          fill: 'none', stroke: DARK, strokeWidth: 2, strokeLinecap: 'round',
        })
      : h('path', {
          d: `M ${FACE_X - 4} ${FACE_Y + 6} q 4 5 8 0`,
          fill: 'none', stroke: DARK, strokeWidth: 2, strokeLinecap: 'round',
        })
  // 等你 and 干完 wave; 等交活 keeps a plain hand so the two waiting states read
  // differently at a glance.
  const wavingNow = scene === 'done' || scene === 'alert'
  const handL = h('circle', {
    cx: cx - 23, cy: cy + 16, r: 4, fill: seat.color,
    className: scene === 'busy' ? 'bb-hand bb-tap' : 'bb-hand',
  })
  const handR = h('circle', {
    cx: cx + 23, cy: cy + 16, r: 4, fill: seat.color,
    className: wavingNow ? 'bb-hand bb-wave' : scene === 'busy' ? 'bb-hand bb-tap' : 'bb-hand',
  })
  return h('g', { className: 'bb-blob' },
    h('circle', { cx, cy, r: BODY_R, fill: seat.color }),
    h('circle', { cx: FACE_X, cy: FACE_Y, r: 18, fill: seat.face }),
    h('ellipse', { cx: FACE_X - 14, cy: FACE_Y + 7, rx: 4.5, ry: 2.8, fill: seat.color, opacity: .3 }),
    h('ellipse', { cx: FACE_X + 14, cy: FACE_Y + 7, rx: 4.5, ry: 2.8, fill: seat.color, opacity: .3 }),
    eyes,
    mouth,
    handL,
    handR,
    faceGear(seat.head),
    headGear(seat.head))
}

// Only this node re-renders once a second; the SVG above stays put. (Moved to
// elapsed.js so the drawer shares it and ticks too.)
//
// `compact` is the layer-2 form: no meta strip, the elapsed time inlined into the
// name row. It buys the 23px that lets 134px hold a whole workstation. Default
// `false` is load-bearing — the existing render checks exercise the full card and
// must keep passing unchanged.
function StationView({ row, onOpen, note, t, compact = false }) {
  const { bot, status, scene, action, since, stalled, badge } = row
  const seat = seatOf(bot)
  const label = scene === 'done' ? t('status.done') : statusLabel(status, t)
  const title = `${bot.name} · ${label}${action ? ` · ${action}` : ''}${stalled ? ` · ${t('meta.stalled')}` : ''}`
  return h('div', {
    className: 'bb-station',
    role: 'button',
    tabIndex: 0,
    title,
    'data-scene': scene,
    onClick: () => onOpen(row),
    onKeyDown: event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(row) }
    },
  },
    h('svg', { className: 'bb-scene', viewBox: '0 0 170 132', 'aria-hidden': 'true' },
      h('ellipse', { cx: 88, cy: 122, rx: 42, ry: 5, fill: 'rgba(0,0,0,.06)' }),
      h('g', { fill: '#D9D4CB' },
        h('rect', { x: 22, y: 62, width: 11, height: 40, rx: 5 }),
        h('rect', { x: 22, y: 96, width: 38, height: 10, rx: 4 }),
        h('rect', { x: 36, y: 104, width: 7, height: 14, rx: 2 })),
      blobSeat(scene, seat),
      h('g', null,
        h('rect', { x: 50, y: 88, width: 104, height: 10, rx: 3, fill: '#E8D9C0' }),
        h('rect', { x: 58, y: 98, width: 9, height: 22, rx: 2, fill: '#CBB89A' }),
        h('rect', { x: 137, y: 98, width: 9, height: 22, rx: 2, fill: '#CBB89A' })),
      h('g', null,
        h('rect', { x: 104, y: 52, width: 52, height: 34, rx: 4, fill: '#3A3F45' }),
        h('rect', { x: 126, y: 86, width: 8, height: 3, fill: '#3A3F45' }),
        screenContent(scene)),
      lampShape(scene),
      deskProp(seat.prop)),
    badge ? h('span', { className: 'bb-badge', title: row.failure ?? '' }, '!') : null,
    h('div', {
      className: 'bb-station-name',
      style: NAME_INK[scene] ? { color: NAME_INK[scene] } : undefined,
    },
      compact
        ? [
            h('span', { className: 'bb-station-nm', key: 'nm' }, bot.name),
            h(Elapsed, {
              key: 'time',
              since,
              className: stalled ? 'bb-station-time bb-stalled' : 'bb-station-time',
            }),
          ]
        : bot.name),
    compact
      ? null
      : h('div', { className: 'bb-meta' },
          action ? h('span', { className: 'bb-meta-act', title: action }, action) : null,
          h(Elapsed, { since, className: stalled ? 'bb-meta-time bb-stalled' : 'bb-meta-time' })),
    note ? h('span', { className: 'bb-note' }) : null)
}

// A station only repaints when its own row actually changed. The 1.5s poll
// rebuilds the row objects, so comparing the fields (not the identity) is what
// keeps nine SVGs from being rebuilt on every tick.
export const Station = memo(StationView, (prev, next) => {
  const a = prev.row
  const b = next.row
  return a.bot.id === b.bot.id
    && a.bot.name === b.bot.name
    && a.status === b.status
    && a.scene === b.scene
    && a.action === b.action
    && a.since === b.since
    && a.stalled === b.stalled
    && a.badge === b.badge
    && a.failure === b.failure
    && prev.note === next.note
    && prev.t === next.t
})
