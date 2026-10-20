// render-check.mjs — renders the real components once and walks the tree.
//
// The smoke test proves the data and the CSS; this proves the markup does not
// throw and actually contains what the board promises (elapsed time, approval
// command, six-state legend, stable workstation order).
//
// Run: node --import ./tools/register-shim.mjs tools/render-check.mjs
import { findAll, render, textOf, effects } from './react-shim.mjs'

let failed = 0
const check = (ok, label) => {
  if (ok) {
    console.log(`  ok  ${label}`)
  } else {
    failed += 1
    console.error(`FAIL  ${label}`)
  }
}

// The panel touches these globals at render time (persisted UI state only).
globalThis.localStorage = { getItem: () => null, setItem: () => {} }
globalThis.document = {
  hidden: false, getElementById: () => null, createElement: () => ({ style: {} }),
  head: { appendChild: () => {} }, addEventListener: () => {}, removeEventListener: () => {},
}
globalThis.window = { innerWidth: 1440, innerHeight: 900 }

const { buildRows } = await import('../src/client/rows.js')
const { fallbackT } = await import('../src/client/locale.js')
const { Station } = await import('../src/client/station.js')
const { Drawer } = await import('../src/client/drawer.js')
const { Board, clampPos } = await import('../src/client/panel.js')
const { Handoffs } = await import('../src/client/handoffs.js')

const t = fallbackT('zh')
const now = Date.now()

const bots = [
  { id: 'session-chief', name: 'Chief', role: '主理人', model: 'deepseek-v4', sessionId: 'session-chief' },
  { id: 'session-math', name: '数学', role: '算题', model: 'deepseek-v4', sessionId: 'session-math' },
  { id: 'session-phy', name: '物理', role: '', model: null, sessionId: 'session-phy' },
  { id: 'session-chem', name: '化学', role: '', model: null, sessionId: 'session-chem' },
  { id: 'session-bio', name: '生物', role: '', model: null, sessionId: 'session-bio' },
  { id: 'session-cn', name: '语文', role: '', model: null, sessionId: 'session-cn' },
  { id: 'session-en', name: '英语', role: '', model: null, sessionId: 'session-en' },
]
const nameOf = id => bots.find(bot => bot.id === id)?.name ?? id

const rows = buildRows({
  bots,
  activity: { 'session-chief': 'working' },
  workBots: { 'session-chief': { since: now - 252_000, tool: 'Bash' } },
  waiting: {
    'session-phy': { bots: ['session-chief'], rooms: [], for: ['session-chief'] },
    'session-en': { bots: ['session-math'], rooms: ['r1'], for: ['session-chief'] },
  },
  approvals: [{
    id: 'ap1', botId: 'session-math', tool: 'Bash', reason: '需要清理构建产物',
    detail: { code: 'rm -rf dist && npm run build' },
  }],
  questions: {
    'session-cn': { id: 'q1', question: '这段用哪个语气？', options: [{ label: '正式' }, { label: '轻松', description: '更像口语' }] },
  },
  errors: [
    { botId: 'session-chem', at: now - 60_000, message: '模型超时' },
    // Older than Chief's current turn: it belongs to a turn already left behind.
    { botId: 'session-chief', at: now - 900_000, message: '上一轮的失败' },
  ],
  works: [{ id: 'w1', toId: 'session-bio', open: 0, at: now - 5000, last: '生物交回：三种叶型' }],
  rooms: { r1: '群聊' },
  waveMap: { 'session-bio': true },
  noteMap: { 'session-bio': true },
  t,
  nameOf,
})

console.log('-- rows --')
check(rows.length === 7, `one row per Bot (${rows.length})`)
check(rows.map(row => row.bot.name).join(',') === 'Chief,数学,物理,化学,生物,语文,英语',
  'rows follow roster order, not status order (workstations never move)')
const byName = Object.fromEntries(rows.map(row => [row.bot.name, row]))

check(byName['Chief'].scene === 'busy', 'a working Bot with an old failure stays busy')
check(byName['Chief'].badge === false, 'a failure from a previous turn is dropped, not carried as a badge')
check(byName['Chief'].failure === '', 'and it does not linger in the drawer either')
check(byName['Chief'].action === '调用 Bash', 'a busy Bot shows its current tool')
check(byName['Chief'].since === now - 252_000, 'a busy Bot carries its turn start')
check(byName['Chief'].stalled === false, 'four minutes is not stalled yet')

check(byName['数学'].scene === 'alert' && byName['数学'].detail.kind === 'approval', 'an approval is alert')
check(byName['数学'].action === '等你批 Bash', 'the approval line names the tool')
check(byName['数学'].detail.code.includes('rm -rf dist'), 'the approval carries the full command')

check(byName['物理'].scene === 'waiting', 'waiting for another Bot is its own scene')
check(byName['物理'].action.includes('等 Chief'), 'the waiting line names who it waits for')
check(!byName['物理'].action.includes('替 Chief'), 'the waiting line does not repeat the same name')
check(byName['英语'].action.includes('替 Chief'), 'the waiting line names who it is working for')
check(byName['英语'].action.includes('群 群聊'), 'a room it waits on is shown by name, not by id')

check(byName['化学'].scene === 'error' && byName['化学'].badge === false, 'an idle failure is the status, not a badge')
check(byName['化学'].action.startsWith('报错'), 'the error line carries the message')

check(byName['生物'].scene === 'done', 'a clean hand-off shows done')
check(byName['生物'].lastResult === '生物交回：三种叶型', 'the drawer has the hand-off result')

check(byName['语文'].scene === 'alert' && byName['语文'].detail.kind === 'question', 'a question is alert')
check(byName['语文'].detail.options.length === 2, 'the question keeps its options')

console.log('\n-- rows: recovered failures and stale question keys --')
{
  const base = {
    bots: [{ id: 'b1', name: 'Chief', sessionId: 'p1' }],
    activity: { b1: 'working' },
    workBots: {}, waiting: {}, approvals: [], works: [], t, now,
    nameOf: id => id,
  }
  const withFailure = at => buildRows({ ...base, questions: {}, errors: [{ botId: 'b1', at, message: 'x' }] })

  // No turn start is known here, so the only signal is "it is working again".
  const old = withFailure(now - 120_000)
  check(old[0].badge === false, 'a failure older than a minute is dropped once the Bot works again')
  check(old[0].scene === 'busy', 'and the station reads as working')
  check(old[0].failure === '', 'and the message does not linger in the drawer')

  const fresh = withFailure(now - 5_000)
  check(fresh[0].badge === true, 'a fresh failure still shows as a badge while it works')
  check(fresh[0].failure === 'x', 'and the drawer still has the message')

  // questions is keyed by session id; a Bot that rolled over a part may only be
  // matchable by a previous part in a stale snapshot.
  const rolled = buildRows({
    ...base,
    bots: [{ id: 'b1', name: 'Chief', sessionId: 'p2', parts: ['p1'] }],
    activity: {},
    errors: [],
    questions: { p1: { id: 'q1', question: '旧分段的问题', options: [] } },
  })
  check(rolled[0].detail.kind === 'question', 'a question keyed by an older part is still found')
  check(rolled[0].scene === 'alert', 'and it still raises the alert state')
}

console.log('\n-- panel position --')
// The harness pins the viewport at 1440x900 (see globalThis.window above).
check(clampPos({ left: 120, top: 80 }, { w: 560, h: 480 })?.left === 120, 'an on-screen position is kept as-is')
const parked = clampPos({ left: 2000, top: 1400 }, { w: 560, h: 480 })
check(parked?.left === 1440 - 560 - 6, 'a position past the right edge is pulled back inside')
check(parked?.top === 900 - 60, 'a position past the bottom edge is pulled back inside')
check(clampPos({ left: -80, top: -80 }, { w: 560, h: 480 })?.left === 6, 'a negative position is pulled back too')
check(clampPos(null, { w: 560, h: 480 }) === null, 'no saved position stays no position')
check(clampPos({ left: 'x', top: 1 }, { w: 560, h: 480 }) === null, 'a corrupt saved position is discarded, not rendered')

console.log('\n-- Station --')
let stationThrew = null
const stations = {}
try {
  for (const row of rows) {
    stations[row.bot.name] = render(Station({ row, onOpen: () => {}, note: row.note, t }))
  }
} catch (error) {
  stationThrew = error
}
check(!stationThrew, `every station renders without throwing${stationThrew ? `: ${stationThrew.message}` : ''}`)

const chief = stations['Chief']
check(chief?.props?.['data-scene'] === 'busy', 'the station root carries data-scene')
check(textOf(chief).includes('Chief'), 'the station shows the Bot name')
check(textOf(chief).includes('调用 Bash'), 'the station shows what it is doing')
check(/4m1\d s|4m1\ds/.test(textOf(chief).replace(/\s+/g, '')), 'the station shows how long it has been running')
check(findAll(chief, node => node.props?.className === 'bb-blob').length === 1, 'the station draws exactly one dumpling')
check(findAll(chief, node => String(node.props?.className ?? '').includes('bb-wave')).length === 0,
  'a busy station does not wave')
check(findAll(chief, node => node.props?.className === 'bb-badge').length === 0, 'a healthy station has no badge')

const math = stations['数学']
check(textOf(math).includes('等你批 Bash'), 'an approval station says what it wants')
check(findAll(math, node => String(node.props?.className ?? '').includes('bb-wave')).length === 1,
  'an approval station waves')

const phy = stations['物理']
check(phy?.props?.['data-scene'] === 'waiting', 'the waiting station uses the waiting scene')
check(findAll(phy, node => String(node.props?.className ?? '').includes('bb-wave')).length === 0,
  'the waiting station does not wave (it is not asking you for anything)')

const bio = stations['生物']
check(String(bio?.props?.title ?? '').includes('干完'), 'a handed-off station titles itself 干完')
check(findAll(bio, node => node.props?.className === 'bb-note').length === 1, 'a handed-off station flies a note')

console.log('\n-- Drawer --')
let drawerThrew = null
let approvalDrawer = null
try {
  approvalDrawer = render(Drawer({ row: byName['数学'], t, onClose: () => {}, onOpenChat: () => {} }))
} catch (error) {
  drawerThrew = error
}
check(!drawerThrew, `the drawer renders without throwing${drawerThrew ? `: ${drawerThrew.message}` : ''}`)
const codeBlocks = findAll(approvalDrawer, node => node.props?.className === 'bb-code')
check(codeBlocks.length === 1, 'the drawer shows one command block')
check(textOf(codeBlocks[0]).includes('rm -rf dist'), 'the drawer shows the exact command to approve')
check(textOf(approvalDrawer).includes('需要清理构建产物'), 'the drawer shows the approval reason')
check(textOf(approvalDrawer).includes('打开聊天'), 'the drawer offers the jump to chat')

const questionDrawer = render(Drawer({ row: byName['语文'], t, onClose: () => {}, onOpenChat: () => {} }))
check(findAll(questionDrawer, node => node.props?.className === 'bb-opt').length === 2, 'the drawer lists the question options')
check(textOf(questionDrawer).includes('更像口语'), 'the drawer keeps option descriptions')

const errorDrawer = render(Drawer({ row: byName['化学'], t, onClose: () => {}, onOpenChat: () => {} }))
check(textOf(errorDrawer).includes('模型超时'), 'the drawer shows the failure message')

// The drawer's elapsed value must come from the ticking node, not a value read
// once at open time. Subscribing to the clock is what makes that observable here:
// Drawer itself runs no effects, so a queued effect means the timer is wired up.
const effectsBefore = effects.length
const chiefDrawer = render(Drawer({ row: byName['Chief'], t, onClose: () => {}, onOpenChat: () => {} }))
check(effects.length > effectsBefore, 'the drawer subscribes to the clock (its elapsed time keeps counting)')
check(/4m1\ds/.test(textOf(chiefDrawer).replace(/\s+/g, '')), 'the drawer shows the running duration, not 未知')

console.log('\n-- Board shell --')
let boardThrew = null
let board = null
try {
  board = render(Board({ t }))
} catch (error) {
  boardThrew = error
}
check(!boardThrew, `the panel shell renders without throwing${boardThrew ? `: ${boardThrew.message}` : ''}`)
check(textOf(board).includes('Bot 看板'), 'the panel renders its title')
check(textOf(board).includes('等你') && textOf(board).includes('等交活'), 'the legend carries the new waiting state')
check(textOf(board).includes('载入中'), 'before the first poll the panel says it is loading, not empty')
check(findAll(board, node => node.props?.className === 'bb-rz').length === 1, 'the resize grip is present')

console.log('\n-- Handoffs --')
const handoffs = render(Handoffs({
  t,
  works: [
    { id: 'w-open', from: '班主任', to: '数学', open: 4, at: now - 720_000, last: '第 3 题没算完' },
    { id: 'w-zombie', from: '班主任', to: '生物', open: 0, at: now - 59_000_000, last: null },
  ],
  onPick: () => {},
}))
check(findAll(handoffs, node => node.props?.className === 'bb-handoff').length === 1,
  'only works with open items are listed (the 16h orphan record is skipped)')
check(textOf(handoffs).includes('班主任') && textOf(handoffs).includes('数学'), 'the strip names both ends')
check(textOf(handoffs).includes('4 项待交'), 'the strip counts the open items')
check(textOf(handoffs).includes('12 分钟前'), 'the strip says how long ago it started')
check(render(Handoffs({ t, works: [] })) === null, 'a quiet board renders no strip at all')

if (failed) {
  console.error(`\nrender-check FAILED: ${failed} assertion(s)`)
  process.exit(1)
}
console.log('\nrender-check OK')
