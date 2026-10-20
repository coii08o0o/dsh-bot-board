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

export function seatOf(bot) {
  const name = typeof bot?.name === 'string' ? bot.name : ''
  const fixed = ROSTER.find(item => item.name === name)
  if (fixed) return fixed
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
