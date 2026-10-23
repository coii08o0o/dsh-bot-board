// One workstation: chair + desk + monitor + lamp + dumpling + prop + name, plus
// the one-line meta strip that answers "what is it doing and for how long".
import { memo, createElement as h } from 'react'
import { CHARACTERS, LAMP, LAMP_BASE, LAMP_BASE_R, LAMP_R, LAMP_STROKE, LAMP_STROKE_W, LAMP_STROKE_W_SMALL, NAME_INK, SCENE_VB, seatOf, statusLabel } from './const.js'
import { Elapsed } from './elapsed.js'

const DARK = '#2C2C2A'
const FACE_X = 86
const FACE_Y = 62

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
  const common = { fill, stroke: LAMP_STROKE, strokeWidth: LAMP_STROKE_W }
  // The base disc is not decoration: it is the only backdrop the lamp has. Drawn
  // first so the lamp sits on it, and big enough (3.8 > 2.9 + 1.2/2) that no part
  // of the outline can hang off it — the invariant is asserted in smoke.mjs.
  const base = h('circle', { cx: 151, cy: 85, r: LAMP_BASE_R, fill: LAMP_BASE })
  if (scene === 'error') {
    return h('g', null, base,
      h('rect', { x: 148.4, y: 82.4, width: 5.2, height: 5.2, transform: 'rotate(45 151 85)', ...common }))
  }
  if (scene === 'alert') {
    return h('g', null, base,
      h('rect', { x: 148.4, y: 82.4, width: 5.2, height: 5.2, rx: 1, ...common }))
  }
  return h('g', null, base,
    h('circle', { cx: 151, cy: 85, r: LAMP_R, ...common }))
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
    // Same ink and a proportional width as the classroom lamp, from const.js —
    // not a second hand-typed copy that can drift out of sync.
    stroke: LAMP_STROKE,
    strokeWidth: LAMP_STROKE_W_SMALL,
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

// The dumpling. Its **body outline is DS Bot's character** (`avatar.shape`): the
// whale, star, moon, wave, squircle, bull and blossom silhouettes are the same
// seven shapes the user picked upstream, so a Bot reads as the same character in
// both places. The face disc and every feature on it scale with that character's
// `faceR`, because a star's concave points cannot hold an 18px disc; `hands` is off
// for the two silhouettes with no round edge to put a hand on.
//
// Exported because the 「需要你」 list crops this same face with
// `viewBox="54 32 64 64"` — it must be the same drawing, or the person in the
// list stops being the dumpling in the classroom and the user has to learn the
// mapping twice.
export function blobSeat(scene, seat) {
  const ch = CHARACTERS[seat.shape] ?? CHARACTERS.squircle
  const cx = FACE_X
  const cy = FACE_Y + 2
  const s = ch.fit / 100
  const fx = FACE_X + ch.dx
  const fy = FACE_Y + ch.dy
  const r = ch.faceR
  const k = r / 18
  const moon = scene === 'done'
  const squint = scene === 'error'
  const oMouth = scene === 'alert' || scene === 'waiting'
  const eyes = squint
    ? h('g', null,
        h('rect', { x: fx - 12 * k, y: fy - 5.5 * k, width: 6 * k, height: 2.5 * k, rx: 1.25 * k, fill: DARK }),
        h('rect', { x: fx + 6 * k, y: fy - 5.5 * k, width: 6 * k, height: 2.5 * k, rx: 1.25 * k, fill: DARK }))
    : moon
      ? h('g', { fill: 'none', stroke: DARK, strokeWidth: 2.5 * k, strokeLinecap: 'round' },
          h('path', { d: `M ${fx - 13 * k} ${fy - k} q ${4 * k} ${-6 * k} ${8 * k} 0` }),
          h('path', { d: `M ${fx + 5 * k} ${fy - k} q ${4 * k} ${-6 * k} ${8 * k} 0` }))
      : h('g', {
          className: scene === 'busy' ? 'bb-eyes' : scene === 'idle' ? 'bb-eyes bb-eyes-slow' : undefined,
          fill: DARK,
        },
          h('rect', { x: fx - 11.5 * k, y: fy - 8.5 * k, width: 5 * k, height: 9 * k, rx: 2.5 * k }),
          h('rect', { x: fx + 6.5 * k, y: fy - 8.5 * k, width: 5 * k, height: 9 * k, rx: 2.5 * k }))
  const mouth = oMouth
    ? h('circle', { cx: fx, cy: fy + 9 * k, r: 3 * k, fill: DARK })
    : squint
      ? h('path', {
          d: `M ${fx - 4 * k} ${fy + 10 * k} q ${4 * k} ${-3 * k} ${8 * k} 0`,
          fill: 'none', stroke: DARK, strokeWidth: 2 * k, strokeLinecap: 'round',
        })
      : h('path', {
          d: `M ${fx - 4 * k} ${fy + 6 * k} q ${4 * k} ${5 * k} ${8 * k} 0`,
          fill: 'none', stroke: DARK, strokeWidth: 2 * k, strokeLinecap: 'round',
        })
  // 等你 and 干完 wave; 等交活 keeps a plain hand so the two waiting states read
  // differently at a glance.
  const wavingNow = scene === 'done' || scene === 'alert'
  const hands = ch.hands
    ? [
        h('circle', {
          key: 'l', cx: cx - ch.handDX, cy: cy + ch.handDY, r: 4, fill: seat.color,
          className: scene === 'busy' ? 'bb-hand bb-tap' : 'bb-hand',
        }),
        h('circle', {
          key: 'r', cx: cx + ch.handDX, cy: cy + ch.handDY, r: 4, fill: seat.color,
          className: wavingNow ? 'bb-hand bb-wave' : scene === 'busy' ? 'bb-hand bb-tap' : 'bb-hand',
        }),
      ]
    : null
  return h('g', { className: 'bb-blob' },
    h('path', {
      d: ch.d,
      fill: seat.color,
      transform: `translate(${cx - s * 50} ${cy - s * 50}) scale(${s})`,
    }),
    h('circle', { cx: fx, cy: fy, r, fill: seat.face }),
    h('ellipse', { cx: fx - 14 * k, cy: fy + 7 * k, rx: 4.5 * k, ry: 2.8 * k, fill: seat.color, opacity: .3 }),
    h('ellipse', { cx: fx + 14 * k, cy: fy + 7 * k, rx: 4.5 * k, ry: 2.8 * k, fill: seat.color, opacity: .3 }),
    eyes,
    mouth,
    hands)
}

// Only this node re-renders once a second; the SVG above stays put. (Moved to
// elapsed.js so the drawer shares it and ticks too.)
//
// `compact` is the layer-2 form: no meta strip, the elapsed time inlined into the
// name row. It buys the 23px that lets 134px hold a whole workstation. Default
// `false` is load-bearing — the existing render checks exercise the full card and
// must keep passing unchanged.
function StationView({ row, onOpen, note, t, compact = false }) {
  const { bot, status, scene, action, since, stalled, badge, freezeAt = 0 } = row
  const seat = row.seat ?? seatOf(bot)
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
    h('svg', { className: 'bb-scene', viewBox: `0 0 ${SCENE_VB.w} ${SCENE_VB.h}`, 'aria-hidden': 'true' },
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
      h('g', { transform: 'translate(-4 0)' }, deskProp(seat.prop))),
    // The one place the badge overlays its container: the card is the positioned
    // ancestor, so it sits on the card's top-right corner. Everywhere else it is
    // a flex item (see `.bb-badge-inline` / `.bb-lg-badge` in style.js).
    badge ? h('span', { className: 'bb-badge bb-badge-abs', title: row.failure ?? '' }, '!') : null,
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
              until: freezeAt,
              className: stalled ? 'bb-station-time bb-stalled' : 'bb-station-time',
            }),
          ]
        : bot.name),
    compact
      ? null
      : h('div', { className: 'bb-meta' },
          action ? h('span', { className: 'bb-meta-act', title: action }, action) : null,
          h(Elapsed, { since, until: freezeAt, className: stalled ? 'bb-meta-time bb-stalled' : 'bb-meta-time' })),
    note ? h('span', { className: 'bb-note' }) : null)
}

// A station only repaints when its own row actually changed. The 1.5s poll
// rebuilds the row objects, so comparing the fields (not the identity) is what
// keeps nine SVGs from being rebuilt on every tick.
//
// `compact` and `onOpen` are compared too. Neither can change today (only layer 2
// passes compact, and openDrawer is a useCallback with no deps), but "cannot
// change today" is exactly the kind of assumption that quietly rots: a same-key
// instance switching compact would keep the old render, and a re-created onOpen
// would leave the card wired to a stale closure.
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
    // The seat is derived, not stored on `bot`: `seatOf` returns a fresh object
    // every render, so identity cannot be compared. Without these three fields a
    // colour/shape change in DS Bot's UI repainted layer 1 but left the
    // workstation on the old face — the panel contradicting itself.
    && a.seat?.color === b.seat?.color
    && a.seat?.shape === b.seat?.shape
    && a.seat?.prop === b.seat?.prop
    // Freezing the clock (stale feed) changes `freezeAt`; without this the memo
    // would keep the live ticker and the time would keep climbing.
    && a.freezeAt === b.freezeAt
    && prev.note === next.note
    && prev.t === next.t
    && prev.compact === next.compact
    && prev.onOpen === next.onOpen
})
