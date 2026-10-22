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

// Nine Bots = nine flat body colours + lighter face disc + one head accessory +
// one desk prop. Identity is fixed by Bot name so a Bot keeps its face across
// refreshes; strangers hash into the palette instead of colliding with a named
// seat, and the three axes are independent so the tenth Bot still looks unique.
export const ROSTER = [
  { name: 'Chief', color: '#378ADD', face: '#7FB4E8', head: 'crown', prop: 'flag' },
  { name: 'Researcher', color: '#EC4899', face: '#F5A3CD', head: 'glasses', prop: 'magnifier' },
  { name: '班主任', color: '#F59E0B', face: '#FBCB74', head: 'bowRed', prop: 'pointer' },
  { name: '数学', color: '#8B5CF6', face: '#BCA5F8', head: 'glasses', prop: 'abacus' },
  { name: '物理', color: '#14B8A6', face: '#7FD8CE', head: 'headphones', prop: 'bolt' },
  { name: '化学', color: '#22C55E', face: '#86E5A3', head: 'hat', prop: 'flask' },
  { name: '生物', color: '#84CC16', face: '#BDE873', head: 'sprout', prop: 'leaf' },
  { name: '语文', color: '#EF4444', face: '#F59C9C', head: 'bowCream', prop: 'books' },
  { name: '英语', color: '#F97316', face: '#FBB277', head: 'headphones', prop: 'mic' },
]

const PALETTE = [
  '#378ADD', '#EC4899', '#F59E0B', '#8B5CF6', '#14B8A6', '#22C55E',
  '#84CC16', '#EF4444', '#F97316', '#0EA5E9', '#A855F7', '#D97706',
]
const HEADS = ['crown', 'glasses', 'bowRed', 'bowCream', 'hat', 'sprout', 'headphones', null]
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

// `taken` is the set of named seats already claimed in this render. A Bot's name
// is upstream-controlled free text, so a second Bot that renames itself to
// 'Chief' used to draw a byte-identical Chief: two look-alikes, one working and
// one failing, with no way to tell them apart (v0.4.2 audit, finding #12). A
// duplicate now falls through to the hashed palette instead of impersonating.
export function seatOf(bot, taken) {
  const name = typeof bot?.name === 'string' ? bot.name : ''
  const fixed = ROSTER.find(item => item.name === name)
  if (fixed && !taken?.has(fixed.name)) {
    taken?.add(fixed.name)
    return fixed
  }
  const id = String(bot?.id ?? name)
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const color = PALETTE[hash % PALETTE.length]
  return {
    name,
    color,
    face: faceOf(color),
    head: HEADS[Math.floor(hash / PALETTE.length) % HEADS.length],
    prop: PROPS[Math.floor(hash / (PALETTE.length * HEADS.length)) % PROPS.length],
  }
}
