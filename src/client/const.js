// Tunables, the six classroom states, and the seat roster.
export const POLL_MS = 1500
export const BOARD_MS = 5000
export const SLOW_POLL_MS = 30000
export const STALL_MS = 5 * 60 * 1000
// A team where nothing moves does not need a 1.5s feed: `api/bot`'s `state` runs
// refresh + bootstrap + catalog + loadSecrets before it answers, so an idle board
// is still paying for ~40 of those a minute. After a turn ends the feed stays fast
// for a while, so the tail of the work is not missed, then backs off.
export const IDLE_POLL_MS = 6000
export const ACTIVE_TAIL_MS = 90 * 1000
// How long a failure keeps the lamp red once the Bot has gone quiet. Past this it
// is a badge and a line in the drawer, not the current state: a Bot that failed
// ten minutes ago and has been idle since is not stuck *now*. Kept well under the
// host's 15-minute failure TTL, which only exists to bound the store.
export const ERROR_LAMP_MS = 3 * 60 * 1000

// ── Three-layer attention axis (v0.4.0, re-derived in v0.4.1) ───────────────
// These are the contract the CSS has to honour, and the CSS is generated from
// them (style.js interpolates the four numbers marked "bound"), so a row cannot
// quietly grow past its budget. The arithmetic lives in tools/smoke.mjs as
// C4a/b/c — with every term, including the ones v0.4.0 forgot: the grid gap and
// `.bb-run`'s bottom padding.
export const HEAD_H = 39              // 7 + 24 (icon) + 7 + 1 (border)
export const ATTENTION_ROW_H = 44     // also the WCAG 2.5.5 pointer target — bound
export const ATTENTION_GAP = 3        // bound
export const ATTENTION_PAD_V = 10     // 6 top + 4 bottom, the `.bb-attention` padding
export const IDLE_ROW_H = 24          // bound
// `.bb-panel` is 1px on each side and border-box, so the inside of a 480px panel
// is 478px. v0.4.1's first pass forgot this and the static preview measured the
// consequence: at the C4c worst case `.bb-run` had 267px, not the 269px the
// budget assumed, and the second row of workstations overflowed by 1px.
export const PANEL_BORDER = 2
// The classroom scene's own coordinate system. `station.js` builds the SVG from
// this and `cellHeight` divides by it, so the aspect ratio exists once. It used
// to be hand-copied into `station.js:294`, `const.js:38` and `smoke.mjs:407`;
// changing only the SVG then left the budget green while the panel really
// scrolled 45px (v0.4.2 audit, finding #3).
export const SCENE_VB = { w: 170, h: 132 }
// How tall one workstation actually renders, as a function of its width: the
// scene scaled down, plus the 20px name row (1 margin + 18 line + 1 pad).
// Exported as a function rather than a number so the budget cannot be computed
// from a rounded-up constant and then be off by a pixel.
export const cellHeight = (width = RUNNING_CELL_W) => width * SCENE_VB.h / SCENE_VB.w + 20
// Cell width 138 is not a preference, it is the largest integer that satisfies
// "560×480, 3 rows of 需要你, 6 Bots running, 闲着, zero scroll":
//   480 - 2 (panel border) - 39 (head) - 148 (3×44 + 2×3 + 10) - 24 (闲着) = 267
//   2 × (0.7765W + 20) + 8 (grid gap) + 4 (run padding) ≤ 267  →  W ≤ 138.4
// v0.4.0 shipped 148 and C4c asserted 479 ≤ 480, which was a lie in three ways:
// it omitted the grid gap, the run padding and the panel border, and the real
// need was 492.8. 139 then failed by 0.9px, which the static preview caught.
export const RUNNING_CELL_W = 138     // bound
// Derived, not typed: 132/170 lived in five places and two of them (this one and
// smoke.mjs:407) copied the same literal, so C4 and C4c agreed with each other
// no matter what the drawing did. Math.ceil(cellHeight()) is exactly 128.
export const RUNNING_CELL_H = Math.ceil(cellHeight())
export const RUN_GRID_GAP = 8         // `.bb-run-grid` gap — bound
export const RUN_PAD_B = 4            // `.bb-run` bottom padding — bound
export const RUNNING_MIN_H = 96       // visible floor: the dumpling's face + the desk
// How long a Bot has to hold a new layer before it moves there. Shorter than
// POLL_MS on purpose: a status that flips for one tick must not relocate anybody,
// while a real "started / finished a turn" still lands on the next poll.
// Applies to the 在动 ↔ 闲着 boundary ONLY. 需要你 is a live channel — see
// useStableLayers in panel.js for why debouncing it made the panel contradict
// its own header.
export const LAYER_STABLE_MS = 1200

export const COLLAPSE_KEY = 'dsh-bot-board:collapsed:v5'
export const POS_KEY = 'dsh-bot-board:pos:v5'
export const SIZE_KEY = 'dsh-bot-board:size:v5'

export const SIZE_DEFAULT = { w: 560, h: 480 }
export const SIZE_MIN = { w: 420, h: 320 }
export const SIZE_MAX = { w: 980, h: 700 }

// Six states. `waiting` is its own state on purpose: it means "this Bot is
// waiting for another Bot to hand work back", which is not "the user has to do
// something". Folding it into `alert` made the yellow lamp cry wolf.
export const LAMP = {
  busy: '#22C55E',
  alert: '#EAB308',
  waiting: '#3B82F6',
  error: '#EF4444',
  idle: '#D3D1C7',
  done: '#0F766E',
}
// The lamp is the one graphic in the scene drawn on a dark backdrop. Every other
// line sits on cream (worst case 3.79:1 for the outline), but the lamp straddles
// the monitor bezel's lower edge: 64% of its 7-unit footprint is on #3A3F45, 29%
// on the floor, 7% on the desk. The outline #5B5648 clears 3:1 everywhere except
// the bezel (1.45), so the channel that carries `idle` vanished exactly where the
// shape channel is weakest — and it failed *partially*, which reads as a drawing
// glitch rather than a contrast problem, which is why four audits missed it.
// A cream disc under the lamp gives it one backdrop of its own: 7.20:1.
// The radius only has to cover the lamp's outer radius, 2.9 + 1.2/2 = 3.5.
export const LAMP_STROKE = '#5B5648'
export const LAMP_STROKE_W = 1.2
export const LAMP_R = 2.9
export const LAMP_BASE = '#FFFDF8'
export const LAMP_BASE_R = 3.8
export const LEGEND = [
  ['busy', 'legend.busy'],
  ['alert', 'legend.alert'],
  ['waiting', 'legend.waiting'],
  ['error', 'legend.error'],
  ['idle', 'legend.idle'],
  ['done', 'legend.done'],
]
export const NAME_INK = { error: '#B91C1C', done: '#0F766E', waiting: '#1D4ED8' }

export const STATUS_KEY = {
  working: 'status.working',
  thinking: 'status.thinking',
  searching: 'status.searching',
  sending: 'status.sending',
  orbit: 'status.orbit',
  alert: 'status.alert',
  error: 'status.error',
  waiting: 'status.waiting',
  idle: 'status.idle',
}

// An activity value ds-bot adds in a later release has no dictionary entry. The
// card must still read as a sentence: falling back to "working" is honest (that
// is what an unrecognised live activity means to sceneOf), while printing the raw
// token onto the workstation is not.
export const statusLabel = (status, t) => t(STATUS_KEY[status] ?? 'status.working')

// DS Bot's seven characters (`CHARACTERS` in its client bundle, Apache-2.0), redrawn here as
// dumplings: the body outline is the character, the face disc and features shrink
// to fit inside it, and the desk prop stays the board's own language. This is the
// whole identity vocabulary — a Bot's look upstream is `avatar.shape` x `color`,
// 7 x 19, and the board renders the same seven shapes rather than inventing its
// own heads and props per name. `fit` is the character's larger side in board
// units (the old round body was 52), `faceR` the face disc that fits inside the
// silhouette, and `hands` is off where a silhouette has no round edge to put a
// hand on (a star's lower points would leave the hand floating).
export const CHARACTERS = {
  whale: {
    label: 'Whale',
    fit: 58, faceR: 12, dx: 4, dy: 0,
    hands: true, handDX: 17, handDY: 12,
    d: 'M65.3 20.9l5.1 .1 4.8 .9 4.8 1.7 4.3 2.3 3.8 3.1 3 3.4 2.3 3.8 1.6 4.3 .9 4.3 0 4.8-.8 4.8-1.4 4.3-2.3 4.3-3.2 4.3-3.4 3.3-4.3 3.1-7.2 3.5-7.6 1.7-7.2 .1-9.6-1.6-3.3-1-2.9-1.7-8.8-8.9-6-4.7-3.3-.5-7.7 1.1-4.8-.1-4.7-1.2-1.9-1.2-1-1-.5-1.5 .4-1.4 1.1-1.3 1.9-1.3 4.7-1.5 7.7-.6 1.1-.5 .7-1 0-1.4-2.8-7.2-1.2-5.3-.1-4.3 .4-1.4 .9-1.2 1.9-.2 2 1 2.2 2.3 2.2 3.4 3.2 7.6 1.9 9.7 .5-.1 1.1-7.2 1.8-4.8 3.2-5.2 3.9-4.3 4.9-3.9 5.6-2.9 5.8-1.9z',
  },
  star: {
    label: 'Star',
    fit: 56, faceR: 10, dx: 0, dy: 0,
    hands: false,
    d: 'M40.1 4.4l1.5-.4 1.9 .1 5.2 1.1 1.9 .9 13.2 14.9 17.1-.8 5.2 1.1 1.8 .9 1.7 1.6 .7 2.4-.4 1.9-9.7 23.6 5.6 23.7 .1 1.9-.6 1.4-2.1 1.8-2.3 .5-19.9-1.8-16.6 15.5-1.9 1-1.9 .3-7-1.5-2.6-2.1-.9-2.4-2.8-24.1-16-13.6-1.1-1.5-.5-1.9 .4-1.9 1.2-1.5 18.9-13.6 7.1-24.6 1-1.7z',
  },
  moon: {
    label: 'Moon',
    fit: 54, faceR: 15, dx: -2, dy: 2,
    hands: true, handDX: 17, handDY: 14,
    d: 'M45.8 4.2l4.7-.2 4.2 .4 10.2 2.4 3.7 1.6 3.6 2.1 3.3 2.5 3 3.1 4.6 6.7 3.4 8.3 1.5 8.8 .1 4.6-.8 7.8-2.6 8.8-3.9 7.7-5.1 6.7-6.1 5.3-4.1 2.6-3.6 1.6-27.2 10.2-2.8 .7-2.6 0-5.7-1.3-2-.8-1.9-1.7-1.1-2.6-6.5-37.7-.2-5.2 .8-7.7 1.3-5.2 3.1-7.8 4.2-6.7 3-3.6 3.9-3.6 6.3-4.2 4.1-1.8z',
  },
  wave: {
    label: 'Wave',
    fit: 54, faceR: 15, dx: 0, dy: -1,
    hands: true, handDX: 18, handDY: 14,
    d: 'M46.1 4l6.1 .3 9.6 2.1 4.5 1.8 4.1 2.4 3.5 2.8 4.4 4.8 2.6 4 2.1 4.1 2.2 6 4.8 26 .5 5.3-.3 4.1-1.2 3.8-1.5 2.8-2.4 2.5-2.1 1.4-3.1 1-3 .3-8.1-1.5-3.2 5.3-2.1 2.1-2.5 1.5-2.8 1-3 .4-9.1-1.6-2.7 4.2-3.4 3.1-4 1.7-4.6 .1-7-1.5-3.5-1.9-3.4-3.5-2.1-4-1.5-5.6-3.7-20.7-.6-5.6-.1-5 .5-6.1 2.3-9.6 2.3-5.5 2.7-4.9 2.7-3.7 3.2-3.6 4.2-3.6 4.7-2.9 4.4-2 4-1.2z',
  },
  squircle: {
    label: 'Squircle',
    fit: 52, faceR: 16, dx: 0, dy: 0,
    hands: true, handDX: 21, handDY: 15,
    d: 'M54.5 4.2l3.9-.2 3.7 .3 11.6 2.7 3.1 1.6 2.8 1.9 2.6 2.7 2.2 3.1 2.4 4.8 1.9 5.8 3.7 19.4 .8 11.1-.4 4.7-1 4.7-1.3 3.5-1.8 3.4-4.8 5.8-6.4 4.7-8 4-14.2 5.3-9.5 2.2-7.4 .1-10.5-2.2-5.3-2.5-4.3-3.7-3.3-4.8-2.7-6.3-2.4-9.5-2.8-17.9-.2-7.8 1.3-7.9 2.2-5.3 2.8-4.2 4.1-4.2 4.3-3.1 6.3-3.4 11.6-4.6 7.9-2.7z',
  },
  zed: {
    label: 'Bull',
    fit: 54, faceR: 13, dx: 0, dy: 2,
    hands: true, handDX: 15, handDY: 14,
    d: 'M77 4.4l1.1-.4 1.1 .2 1.2 1.3 2 9.8 2.2 5.9 .4 2.8-.3 2.1-.8 1.7-4.7 5.1-1.3 1.9-.4 1.7 .1 1.6 1 1.7 4.4 .2 3.8 1.3 2 1.7 .6 1.6-.3 1.7-.7 1.1-3.5 2.7 1.7 6 .4 5.9-.8 6.6-1.9 6-3.4 5.9-4.4 5.3-5.5 4.4-6 3.1-6.5 2-7.1 .7-6.5-.7-6.5-2.1-6-3.4-4.8-4.4-3.5-4.9-3.1-6.7-3.3 1.1-2.7 .3-2-.6-1.1-1.1-.3-2.2 .9-2.7 2.9-3.8 4.6-3.8 1.8-7.1-6.3-1.8-1.6-1.3-1.3-1.8-.6-2.7 0-6.6-1.4-8.7 .2-1.1 1.5-1.4 1.1-.1 1 .5 5.5 7.9 2.2 2.2 2.7 1.4 4.9 .4 .5-.1 6.5-5.1 6.6-3.2 6-1.6 8.7-.7 3.8-.9 2.7-1.5 3.9-3.2 3-3.8 2.4-4.9 2.1-10z',
  },
  hex: {
    label: 'Blossom',
    fit: 54, faceR: 12, dx: 0, dy: 0,
    hands: false,
    d: 'M38.8 4.2l2.6-.1 6 1.3 2 1.3 3 3.3 12-4.5 2-.5 6.5 1.1 2.9 1.6 4.9 6 .8 2 .3 2-.2 2.5-1.9 7-1.3 2.2-1.9 1.8 2.9 1.3 1.8 1.7 10.1 12.5 1.5 3 .1 4-1.8 7-.9 2-2.8 2.7-7.1 2.7-5.2 20-.8 2-1.4 1.9-1.5 1.1-6.5 2.6-3 .2-6.5-1.6-2-1.4-4-4.9-16 5.7-2 .1-4.5-1-3-1.2-5.2-6-1.3-3 0-3.5 2-8.5-10.8-13.4-1.4-3-.3-2 .3-2.5 1.7-6.5 1.8-3 2.2-1.8 5.9-2.2 2.1-.4 2.5 .3 .4-.4-.7-2.5 .1-2.5 4.8-18.5 1-2.5 2.9-2.9z',
  },
}

// Upstream shape ids are a closed set; anything else (an older ds-bot, a typo, a
// hand-edited file) is treated as "no character given" and hashed instead.
export const SHAPES = Object.keys(CHARACTERS)
export const shapeOf = value => (typeof value === 'string' && Object.hasOwn(CHARACTERS, value) ? value : null)

// DS Bot's own ink vocabulary (`ds-bot/src/client/inks.js` in the bundle's
// client half): 13 named colours plus 6 deeper inks, and `bot.color` in
// state.json holds one of these ids whenever the user picked a colour in DS
// Bot's UI. A Bot the user never picked one for has no `color` key at all —
// `roster.js` stores it only on an explicit choice. Each upstream entry is
// [base, deeper]; the base is the body colour here and the face disc is derived
// by washing it toward white, exactly like the roster's own faces.
export const INKS = {
  deepseek: '#4D6BFE', charcoal: '#141416', graphite: '#2D2D2D', rose: '#EC2F6B',
  sky: '#0AA8D6', tangerine: '#FF6900', cobalt: '#082DFF', black: '#000000',
  brown: '#A27952', red: '#FF3E51', orange: '#FF781C', yellow: '#FFAF38',
  green: '#00C972', cyan: '#1CC3B0', blue: '#2A92FE', violet: '#A97EFE',
  magenta: '#FF5EB1', gray: '#959595', aurora: '#00B8D4',
}

// The only way `bot.color` is ever read: as a key into INKS, or as a #rrggbb
// literal (also a legal `bot.color` upstream). Anything else returns null and
// the Bot falls through to the next tier, so an unrecognised string out of
// another process's file can never reach a fill.
const HEX = /^#[0-9a-f]{6}$/i
export function inkOf(value) {
  const id = typeof value === 'string' ? value.trim() : ''
  if (Object.hasOwn(INKS, id)) return INKS[id]
  return HEX.test(id) ? id : null
}

const PALETTE = [
  '#378ADD', '#EC4899', '#F59E0B', '#8B5CF6', '#14B8A6', '#22C55E',
  '#84CC16', '#EF4444', '#F97316', '#0EA5E9', '#A855F7', '#D97706',
]
const PROPS = ['flag', 'magnifier', 'pointer', 'abacus', 'bolt', 'flask', 'leaf', 'books', 'mic', null]

// A face disc is the body colour washed toward white, so a stranger's palette
// entry still gets a readable two-tone dumpling.
function faceOf(color) {
  const n = parseInt(color.slice(1), 16)
  const mix = channel => Math.round(channel + (255 - channel) * 0.42)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// The three decoration axes come from disjoint slices of one id hash, so a
// stranger's look is stable across refreshes and two strangers differ. `attempt`
// re-salts the hash: 0 for the first try, and it only moves when a computed
// triple is already claimed — so every seat that existed before dedup is
// byte-for-byte unchanged.
function hashSeat(id, attempt) {
  const salted = attempt === 0 ? id : `${id}#${attempt}`
  let hash = 0
  for (let i = 0; i < salted.length; i += 1) hash = (hash * 31 + salted.charCodeAt(i)) >>> 0
  const color = PALETTE[hash % PALETTE.length]
  return {
    shape: SHAPES[Math.floor(hash / PALETTE.length) % SHAPES.length],
    color,
    prop: PROPS[Math.floor(hash / (PALETTE.length * SHAPES.length)) % PROPS.length],
  }
}

// Two axes come from DS Bot and one from the board:
//
//   shape  the character the user picked in DS Bot's UI (`avatar.shape`)
//   color  the ink the user picked in DS Bot's UI (`bot.color`)
//   prop   the board's own desk prop — nothing upstream describes it
//
// Each upstream axis overrides the hash independently, so a Bot that picked a
// character but no colour keeps its character and takes a stable colour from its
// id. Only the hash-derived parts are de-duplicated: two Bots that picked the
// same character and colour are *meant* to look alike, while two strangers
// landing on one triple by chance is the v0.4.2 finding #12 shape (two identical
// dumplings, one working and one failing).
//
// `taken` holds claimed triples for the whole render. A Bot's name is free text
// and is not used for identity at all any more — the name-based roster made every
// stranger a second-class citizen and put one person's team on everyone's board.
export function seatOf(bot, taken) {
  const name = typeof bot?.name === 'string' ? bot.name : ''
  const id = String(bot?.id ?? name)
  const ink = inkOf(bot?.color)
  const shape = shapeOf(bot?.shape)
  const free = !ink || !shape
  for (let attempt = 0; attempt < (free ? SHAPES.length * PALETTE.length * PROPS.length : 1); attempt += 1) {
    const base = hashSeat(id, attempt)
    const seat = {
      name,
      shape: shape ?? base.shape,
      color: ink ?? base.color,
      face: faceOf(ink ?? base.color),
      prop: base.prop,
    }
    const key = `${seat.shape}|${seat.color}|${seat.prop}`
    if (!free || !taken?.has(key)) {
      taken?.add(key)
      return seat
    }
  }
  const base = hashSeat(id, 0)
  return { name, shape: shape ?? base.shape, color: ink ?? base.color, face: faceOf(ink ?? base.color), prop: base.prop }
}
