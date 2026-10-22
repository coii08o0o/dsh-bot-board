// render-check.mjs — renders the real components once and walks the tree.
//
// The smoke test proves the data and the CSS; this proves the markup does not
// throw and actually contains what the board promises (elapsed time, approval
// command, six-state legend, stable workstation order).
//
// Run: node --import ./tools/register-shim.mjs tools/render-check.mjs
import { findAll, mount, render, resetRefs, textOf, effects } from './react-shim.mjs'

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
const { ERROR_LAMP_MS, SCENE_VB } = await import('../src/client/const.js')
const { fallbackT } = await import('../src/client/locale.js')
const { Station } = await import('../src/client/station.js')
const { Drawer } = await import('../src/client/drawer.js')
const { Board, Body, clampPos } = await import('../src/client/panel.js')
const { Handoffs } = await import('../src/client/handoffs.js')
const { LegendSheet } = await import('../src/client/legend.js')
const { Attention, IdleLine } = await import('../src/client/attention.js')
const { attentionOf } = await import('../src/client/layers.js')

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

console.log('\n-- upstream fields --')
{
  const base = {
    activity: {}, workBots: {}, waiting: {}, approvals: [], works: [], questions: {},
    t, nameOf, now,
  }

  // A Bot created without a model holds its setup greeting and never speaks. Every
  // other signal says "idle", so this has to be read from bot.waiting explicitly.
  const held = buildRows({ ...base, bots: [{ id: 'b1', name: '化学', waiting: true }], errors: [] })
  check(held[0].scene === 'alert', 'a Bot holding its setup greeting asks for you')
  check(held[0].action === '等你选模型', 'and says what it is waiting for')

  // ds-bot's question cards carry a detail line, multiSelect and allowCustom; the
  // board used to keep only the question text and a numbered option list.
  const asked = buildRows({
    ...base,
    bots: [{ id: 'b2', name: '语文' }],
    errors: [],
    questions: {
      b2: {
        question: '这段用哪个语气？',
        detail: '正文会读给用户听',
        options: [{ label: '正式' }, { label: '轻松' }],
        multiSelect: true,
        allowCustom: true,
      },
    },
  })
  check(asked[0].detail.hint === '正文会读给用户听', 'the question keeps its detail line')
  check(asked[0].detail.multiSelect === true, 'the question keeps multiSelect')
  check(asked[0].detail.allowCustom === true, 'the question keeps allowCustom')

  // results[] holds one entry per Bot that handed something back, so its last entry
  // may belong to somebody else entirely.
  const handed = buildRows({
    ...base,
    bots: [{ id: 'b3', name: '数学' }],
    errors: [],
    works: [{
      id: 'w1', toId: 'b3', open: 0, at: now, last: '物理交回：三种叶型',
      results: [{ name: '数学', text: '数学交回：四则运算' }, { name: '物理', text: '物理交回：三种叶型' }],
    }],
  })
  check(handed[0].lastResult === '数学交回：四则运算',
    'the hand-off result is the one this Bot handed back, not the last in the list')

  // A turn running in a group, not in the Bot's own chat.
  const placed = buildRows({
    ...base,
    bots: [{ id: 'b4', name: '英语' }],
    activity: { b4: 'working' },
    workBots: { b4: { since: now - 1000, tool: 'Bash', roomId: 'r1' } },
    rooms: { r1: '群聊' },
    errors: [],
  })
  check(placed[0].place === '群 群聊', 'a turn running in a group says where it runs')

  const rich = render(Drawer({ row: asked[0], t, onClose: () => {}, onOpenChat: () => {} }))
  check(textOf(rich).includes('正文会读给用户听'), 'the drawer shows the question detail')
  check(textOf(rich).includes('可多选'), 'the drawer marks a multi-select question')
  check(textOf(rich).includes('也可以自己说'), 'the drawer mentions the free-text answer')
  const placedDrawer = render(Drawer({ row: placed[0], t, onClose: () => {}, onOpenChat: () => {} }))
  check(textOf(placedDrawer).includes('群 群聊'), 'the drawer says where the turn runs')
}

console.log('\n-- failure decay --')
{
  const base = {
    bots: [{ id: 'b1', name: '化学' }],
    activity: {}, workBots: {}, waiting: {}, approvals: [], works: [], questions: {},
    t, nameOf, now,
  }
  // The lamp is about now. A Bot that failed and then went quiet is idle with a
  // badge, not still stuck — a red lamp nobody can clear trains you to ignore red.
  const quiet = buildRows({ ...base, errors: [{ botId: 'b1', at: now - ERROR_LAMP_MS - 1000, message: '模型超时' }] })
  check(quiet[0].scene === 'idle', 'a failure from minutes ago does not keep the lamp red')
  check(quiet[0].badge === true, 'it becomes a badge instead')
  check(quiet[0].failure === '模型超时', 'the message is still on the row')
  check(quiet[0].detail.kind === 'error', 'and the drawer still shows it')
  check(quiet[0].action.includes('报错'), 'the card still says what went wrong')

  const fresh = buildRows({ ...base, errors: [{ botId: 'b1', at: now - 1000, message: '模型超时' }] })
  check(fresh[0].scene === 'error', 'a fresh failure is still the status')
  check(fresh[0].badge === false, 'and needs no badge')
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
check(approvalDrawer?.props?.['aria-modal'] === 'true',
  'the drawer is a modal dialog, so the workstations under it are not announced')
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
  board = mount(Board, { t })
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
{
  const [row] = findAll(handoffs, node => node.props?.className === 'bb-handoff')
  check(row?.props?.role === 'button' && row?.props?.tabIndex === 0,
    'a hand-off row is reachable by keyboard, like a workstation is')
  check(typeof row?.props?.onKeyDown === 'function', 'and answers Enter/Space')
}
check(textOf(handoffs).includes('班主任') && textOf(handoffs).includes('数学'), 'the strip names both ends')
check(textOf(handoffs).includes('4 项待交'), 'the strip counts the open items')
check(textOf(handoffs).includes('12 分钟前'), 'the strip says how long ago it started')
check(render(Handoffs({ t, works: [] })) === null, 'a quiet board renders no strip at all')

// The cap keeps the table inside 420px, but it used to be a dead end: 「还有 5 项」
// was a plain div, so the five answers to "who picked it up" were on neither the
// panel nor the drawer. The one scenario the table exists for — one sender, eight
// subjects — was the one it truncated. Expanding is a user action, so it may cost
// height; being unreachable is what it may not do.
{
  const eight = Array.from({ length: 8 }, (_, index) => ({
    id: `e${index}`, fromId: 'layer-2', from: '班主任',
    toId: `layer-${index}`, to: `同学${index}`, open: 1, at: now - index * 60_000,
  }))
  const tree = render(Handoffs({ t, works: eight, onPick: () => {} }))
  const more = findAll(tree, node => node.props?.className === 'bb-ho-more')[0]
  check(more?.props?.role === 'button' && more?.props?.tabIndex === 0
    && typeof more?.props?.onClick === 'function' && typeof more?.props?.onKeyDown === 'function',
    'the truncation notice is a control (role=button + tabIndex=0 + click/keydown)')
  check(textOf(more).includes('5'),
    `and it counts the five edges it hid, not the eight it grouped (${textOf(more)})`)
  check(findAll(tree, node => node.props?.className === 'bb-handoff').length === 3,
    'while the collapsed table still shows only three edges')
}

console.log('\n-- three layers --')
// The harness runs no effects, so Board can never finish a poll here. The body is
// rendered directly with a snapshot instead: that is the whole reason it is its
// own exported component.
const ROSTER_NAMES = ['Chief', 'Researcher', '班主任', '数学', '物理', '化学', '生物', '语文', '英语']
const layerBots = ROSTER_NAMES.map((name, index) => ({ id: `layer-${index}`, name, sessionId: `layer-${index}` }))
const layerName = id => layerBots.find(bot => bot.id === id)?.name ?? id
const layerRows = signals => buildRows({
  bots: layerBots, activity: {}, workBots: {}, waiting: {}, approvals: [], errors: [],
  questions: {}, works: [], rooms: {}, waveMap: {}, noteMap: {}, t, nameOf: layerName, now,
  ...signals,
})
const bodyProps = (rows, works = [], scenes = {}) => ({
  rows, works, notices: [], empty: null, t,
  onOpen: () => {}, onPick: () => {},
  sceneOf: id => scenes[id],
})
// A fresh mount: refs now persist per component (like React), so an unrelated
// snapshot must not inherit the previous test's layer memory.
const renderBody = (rows, works, scenes) => {
  resetRefs()
  return mount(Body, bodyProps(rows, works, scenes))
}
// Successive polls of the SAME mounted panel — the only way to observe anything
// that remembers state across renders.
const renderPolls = snapshots => {
  resetRefs()
  return snapshots.map(([rows, works, scenes]) => mount(Body, bodyProps(rows, works, scenes)))
}
const bandsOf = tree => {
  const body = findAll(tree, node => node.props?.className === 'bb-body')[0]
  return (body?.children ?? []).filter(Boolean)
}
const hasClass = (tree, name) => findAll(tree, node => String(node.props?.className ?? '').split(' ').includes(name))

console.log('\n-- the classroom draws the scene it declares --')
// Read off the RENDERED tree, not compared against a literal typed here: the
// 132:170 ratio used to live in station.js, const.js and smoke.mjs, so changing
// only the drawing left every budget green. The failure this catches is
// "SCENE_VB moved and station.js did not follow" — i.e. the numbers typed back
// into station.js the next time the viewBox is touched.
{
  const running = layerRows({
    activity: { 'layer-0': 'working' },
    workBots: { 'layer-0': { since: now - 1000, tool: 'Bash' } },
  })
  const scenes = hasClass(renderBody(running), 'bb-scene')
  const expected = `0 0 ${SCENE_VB.w} ${SCENE_VB.h}`
  check(scenes.length === 1, `one classroom cell, one scene (${scenes.length})`)
  check(scenes.every(node => node.props?.viewBox === expected),
    `the scene's viewBox comes from SCENE_VB (${scenes[0]?.props?.viewBox} vs ${expected})`)
}

console.log('\n-- the hand-off table reads before the cells --')
// Six Bots running already fill the band (two rows of 128px cells + gap + padding
// = 268 of 269px), so the table and the grid cannot both be on screen. The moment
// that happens is the one where the table matters most: right after handing work
// to the whole team. When a scroll is unavoidable, the relation has to be read
// before the individuals — workstations never move and are remembered by
// position, while which debts are open is new information every time. Moving the
// table back below the grid would restore the old "the one thing you just did is
// off-screen" behaviour without failing any other assertion.
{
  const sixRunning = layerRows({
    activity: Object.fromEntries(layerBots.slice(0, 6).map(bot => [bot.id, 'working'])),
    workBots: Object.fromEntries(layerBots.slice(0, 6).map(bot => [bot.id, { since: now - 60_000, tool: 'Bash' }])),
  })
  const body = renderBody(sixRunning, [
    { id: 'w-order', from: '班主任', to: '数学', open: 4, at: now - 720_000, last: null },
  ])
  const run = hasClass(body, 'bb-run')[0]
  const kids = (run?.children ?? []).flat().filter(Boolean)
  const tableAt = kids.findIndex(node => String(node.props?.className ?? '').includes('bb-handoffs'))
  const gridAt = kids.findIndex(node => String(node.props?.className ?? '').includes('bb-run-grid'))
  check(tableAt >= 0 && gridAt >= 0 && tableAt < gridAt,
    `the hand-off table comes before the workstation grid (${tableAt} < ${gridAt})`)
}

// C1: when something needs the user, it is the first thing with text on it.
const hotRows = layerRows({
  activity: { 'layer-0': 'working' },
  workBots: { 'layer-0': { since: now - 100_000, tool: 'Bash' } },
  approvals: [{ id: 'ap', botId: 'layer-1', tool: 'Bash' }],
})
const hotBody = renderBody(hotRows)
{
  const firstWithText = bandsOf(hotBody).find(band => textOf(band).trim().length > 0)
  check(firstWithText?.props?.className === 'bb-attention',
    `C1 需要你 is the first band with text when it is non-empty (got ${firstWithText?.props?.className})`)
  const rowsInBand = hasClass(hotBody, 'bb-attention-row')
  check(rowsInBand.length === 1, `C1 only the alert/error Bots are in it (${rowsInBand.length})`)
  check(textOf(rowsInBand[0]).includes('Researcher') && textOf(rowsInBand[0]).includes('等你批 Bash'),
    'C1 a row is a face + a name + the action in its own words')
  check(hasClass(rowsInBand[0], 'bb-lamp').length === 1, 'C1 the row carries exactly one lamp')
  check(findAll(rowsInBand[0], node => node.type === 'svg' && node.props?.viewBox === '56 24 60 60').length === 1,
    'C1 the face is a crop of the same dumpling, not a second avatar drawing')
  check(hasClass(rowsInBand[0], 'bb-att-avatar').length === 1, 'C1 and it sits in the avatar slot')
  check(hasClass(hotBody, 'bb-run').length === 1, 'C1 在动 still renders below it')
}

// E1: every row in the list is operable without a mouse.
{
  const rowsInBand = hasClass(hotBody, 'bb-attention-row')
  check(rowsInBand.every(row => row.props?.role === 'button' && row.props?.tabIndex === 0
    && typeof row.props?.onKeyDown === 'function'), 'E1 every 需要你 row is role=button + tabIndex=0 + onKeyDown')
}

// C3: the two degenerate ends of the axis.
{
  const quietBody = renderBody(layerRows({}))
  check(bandsOf(quietBody).length <= 2, `C3 all idle leaves at most two bands (${bandsOf(quietBody).length})`)
  check(hasClass(quietBody, 'bb-run').length === 0, 'C3 all idle draws no classroom at all')
  check(hasClass(quietBody, 'bb-att-empty').length === 1, 'C3 the empty list is one summary line, not nothing')
  check(textOf(quietBody).includes(t('attention.empty')), 'C3 and it says the board looked and found nothing')
  check(hasClass(quietBody, 'bb-idle').length === 1, 'C3 闲着 is one line')

  const allBusy = layerRows({ activity: Object.fromEntries(layerBots.map(bot => [bot.id, 'working'])) })
  const allBusyBody = renderBody(allBusy)
  check(hasClass(allBusyBody, 'bb-idle').length === 0, 'C3 all busy draws no 闲着 line')
  check(hasClass(allBusyBody, 'bb-station').length === 9, 'C3 all busy puts all nine in the classroom')
  check(hasClass(allBusyBody, 'bb-meta').length === 0, 'C3 the compact workstation drops the meta strip')
}

// The unreadable-snapshot path. `Board` owns the `board.ok === false` → reason
// mapping, but its `board` comes from useTeam's poll effect, which this harness
// never runs, so that half is not reachable here. What IS reachable — and is the
// half that can silently regress — is Body's decision to keep the notices when
// there are no rows. Dropping them would print 还没有 Bot in the one place this
// tool must not lie: the truth there is 状态文件读不了.
{
  resetRefs()
  const unreadable = {
    type: 'div',
    props: { className: 'bb-notice bb-notice-warn', children: t('panel.unreadable') },
  }
  const empty = { type: 'div', props: { className: 'bb-text', children: t('panel.empty') } }
  const tree = mount(Body, {
    rows: [], works: [], notices: [unreadable], empty, t,
    onOpen: () => {}, onPick: () => {}, sceneOf: () => undefined,
  })
  const notices = hasClass(tree, 'bb-notice')
  check(notices.length === 1 && textOf(notices[0]) === t('panel.unreadable'),
    `an empty board still prints why it is empty (${textOf(notices[0] ?? '')})`)
  check(notices[0]?.props?.className.includes('bb-notice-warn'),
    'and marks it as a warning, not as ordinary chrome')
  check(t('panel.unreadable') !== t('panel.empty'),
    'the reason and the empty state are different sentences, not one sentence twice')
}

console.log('\n-- P0: the layer window must not fight the live filter --')
// The bug this pins down: 需要你 was debounced like the other two layers, while
// the header counts live scenes and `attentionOf` filters by live scene. For one
// poll after an approval arrived the header said "1 等你" and layer 1 said
// "✓ 没有需要你的事"; when an approval was cleared the Bot was filtered out of all
// three layers and a nine-Bot panel counted eight. Both windows open exactly when
// the user has just clicked approve. Untestable until useRef became persistent.
{
  const allIdle = layerRows({})
  const oneAlert = layerRows({ approvals: [{ id: 'ap', botId: 'layer-1', tool: 'Bash' }] })
  const oneBusy = layerRows({
    activity: { 'layer-1': 'working' },
    workBots: { 'layer-1': { since: now - 1000, tool: 'Bash' } },
  })
  const fiveHot = layerRows({
    approvals: [{ id: 'a1', botId: 'layer-1', tool: 'Bash' }],
    questions: { 'layer-2': { id: 'q1', question: '用哪个语气？', options: [] } },
    errors: [
      { botId: 'layer-3', at: now - 1000, message: 'x' },
      { botId: 'layer-4', at: now - 2000, message: 'y' },
      { botId: 'layer-5', at: now - 3000, message: 'z' },
    ],
  })

  // ① idle → alert: the FIRST render after the approval lands.
  {
    const [, after] = renderPolls([[allIdle], [oneAlert]])
    check(hasClass(after, 'bb-attention-row').length === 1,
      `P0 ① an approval reaches 需要你 on the first render, not one poll later (${hasClass(after, 'bb-attention-row').length})`)
    check(hasClass(after, 'bb-att-empty').length === 0,
      'P0 ① and the "nothing needs you" summary is gone in that same render')
    check(textOf(after).includes('Researcher'), 'P0 ① the Bot that needs you is named, not left in 闲着')
  }

  // ② alert → busy: the Bot must land in 在动, not vanish.
  {
    const [, after] = renderPolls([[oneAlert], [oneBusy]])
    check(hasClass(after, 'bb-attention-row').length === 0, 'P0 ② clearing the approval empties 需要你 at once')
    check(hasClass(after, 'bb-station').length === 1,
      `P0 ② and that Bot is in 在动 on the first render (${hasClass(after, 'bb-station').length})`)
    check(hasClass(after, 'bb-idle-name').length === 8, 'P0 ② the other eight are still in 闲着')
    check(textOf(after).includes('Researcher'),
      'P0 ② nobody falls through the gap between the three layers')
  }

  // ③ one render, one truth — and every Bot is accounted for.
  for (const [label, snapshot] of [['all idle', allIdle], ['one alert', oneAlert], ['one busy', oneBusy], ['five hot', fiveHot]]) {
    const body = renderBody(snapshot)
    const live = snapshot.filter(row => row.scene === 'alert' || row.scene === 'error').length
    const inBand = hasClass(body, 'bb-attention-row').length
    check(inBand === Math.min(live, 3),
      `P0 ③ ${label}: 需要你 rows === min(live hot count, 3) (${inBand} vs min(${live},3))`)
    const chip = hasClass(body, 'bb-att-more')[0]
    const hidden = chip ? Number(textOf(chip).replace('+', '')) || 0 : 0
    const shown = inBand + hasClass(body, 'bb-station').length + hasClass(body, 'bb-idle-name').length
    check(shown + hidden === snapshot.length,
      `P0 ③ ${label}: every Bot is in exactly one place (${shown} shown + ${hidden} behind the chip = ${snapshot.length})`)
  }
}

console.log('\n-- P1-1: overflow in 需要你 is reachable --')
{
  const fiveHot = layerRows({
    approvals: [{ id: 'a1', botId: 'layer-1', tool: 'Bash' }],
    questions: { 'layer-2': { id: 'q1', question: '用哪个语气？', options: [] } },
    errors: [
      { botId: 'layer-3', at: now - 1000, message: 'x' },
      { botId: 'layer-4', at: now - 2000, message: 'y' },
      { botId: 'layer-5', at: now - 3000, message: 'z' },
    ],
  })
  const capped = renderBody(fiveHot)
  const chip = hasClass(capped, 'bb-att-more')[0]
  check(chip?.props?.role === 'button' && chip?.props?.tabIndex === 0
    && typeof chip?.props?.onKeyDown === 'function' && typeof chip?.props?.onClick === 'function',
    'P1-1 the overflow chip is a control, not a caption (role/tabIndex/onKeyDown/onClick)')
  check(textOf(chip) === '+2', `P1-1 and it says how many are hidden (${textOf(chip)})`)
  check(hasClass(capped, 'bb-attention-row').length === 3, 'P1-1 collapsed: three rows, as budgeted')

  const opened = render(Attention({
    items: attentionOf(fiveHot, Number.POSITIVE_INFINITY).items,
    overflow: 0, expanded: true, t, onOpen: () => {}, onExpand: () => {},
  }))
  const revealed = hasClass(opened, 'bb-attention-row')
  check(revealed.length === 5, `P1-1 expanded: all five rows (${revealed.length})`)
  check(revealed.every(row => row.props?.role === 'button' && row.props?.tabIndex === 0
    && typeof row.props?.onKeyDown === 'function'), 'P1-1 every revealed row is operable')
  check(['物理', '化学'].every(name => textOf(opened).includes(name)),
    'P1-1 the names that used to exist nowhere on the panel are now on it')
  check(textOf(hasClass(opened, 'bb-att-more')[0]) === '−',
    'P1-1 and the chip flips into a collapse control (unbounded expansion needs an undo)')
}

console.log('\n-- the − chip rides the FIRST row when expanded --')
// Nine expanded rows are ~430px inside a 279px body and `.bb-body` is
// `overflow:hidden`, so a `−` that lived on the last row was clipped away: the
// expanded state could not be undone at 420×320. Collapsed it belongs where the
// list ends (`+N`), expanded it has to be at the top where it is still painted.
{
  const nineHot = layerRows({
    approvals: layerBots.map((bot, index) => ({ id: `n${index}`, botId: bot.id, tool: 'Bash' })),
  })
  const items = attentionOf(nineHot, Number.POSITIVE_INFINITY).items
  check(items.length === 9, `nine Bots need you (${items.length})`)
  const tree = render(Attention({
    items, overflow: 0, expanded: true, t, onOpen: () => {}, onExpand: () => {},
  }))
  const rowsInList = hasClass(tree, 'bb-attention-row')
  check(rowsInList.length === 9, `expanded draws all nine rows (${rowsInList.length})`)
  const onFirst = hasClass(rowsInList[0], 'bb-att-more')
  check(onFirst.length === 1 && textOf(onFirst[0]) === '−',
    `the collapse control is on row 1, where it cannot be clipped (${textOf(onFirst[0])})`)
  check(hasClass(rowsInList.at(-1), 'bb-att-more').length === 0,
    'and no longer on the last row, which is the one that scrolls out of view')
  check(rowsInList.filter(row => hasClass(row, 'bb-att-more').length > 0).length === 1,
    'exactly one chip — the toggle is not duplicated per row')
}

console.log('\n-- compact station keeps its action in the title --')
// Layer 2 dropped the meta strip to buy the 128px cell. That leaves `title` as the
// only standing clue for what a running Bot is doing — and for `waiting` the clue
// is 等谁, which is decision-relevant: the hand-off table is derived from `works`
// (debt), not from `waiting` (who is blocked right now). Deleting `${action}` from
// the title would quietly make a waiting Bot anonymous.
{
  const rowsFor = layerRows({
    activity: { 'layer-0': 'working' },
    workBots: { 'layer-0': { since: now - 1000, tool: 'Bash' } },
    waiting: { 'layer-4': { bots: ['layer-0'] } },
  })
  const titles = hasClass(renderBody(rowsFor), 'bb-station').map(node => String(node.props?.title ?? ''))
  check(titles.some(title => title.includes('调用 Bash')),
    'P1-2b a compact busy station keeps its action in the title')
  check(titles.some(title => title.includes('等 Chief')),
    'P1-2b and a compact waiting station keeps 等谁 in the title')
  check(hasClass(renderBody(rowsFor), 'bb-meta').length === 0,
    'P1-2b which is only acceptable because the compact card really has no meta strip')
}

console.log('\n-- P0b: the 在动/闲着 window still absorbs a single tick --')
// The only logic touched by the P0 fix that had no coverage: the window itself.
// Renders are driven with a shifted clock so a poll boundary can be simulated.
{
  const allIdle = layerRows({})
  const allBusy = layerRows({ activity: Object.fromEntries(layerBots.map(bot => [bot.id, 'working'])) })
  const withClock = (offset, fn) => {
    const real = Date.now
    Date.now = () => real() + offset
    try { return fn() } finally { Date.now = real }
  }
  const frame = (rows, offset) => withClock(offset, () => mount(Body, bodyProps(rows)))

  resetRefs()
  frame(allIdle, 0)
  const early = frame(allBusy, 0)
  check(hasClass(early, 'bb-station').length === 0,
    'G1 one poll of busy does not relocate anybody yet (the window is open)')
  check(hasClass(early, 'bb-idle-name').length === 9, 'G1 and the nine names are still in 闲着')
  const landed = frame(allBusy, 1500)
  check(hasClass(landed, 'bb-station').length === 9, 'G1 once the window has held, the move lands')

  // idle → busy → idle inside one window: the grid must never move at all.
  resetRefs()
  frame(allIdle, 0)
  frame(allBusy, 0)
  const back = frame(allIdle, 0)
  check(hasClass(back, 'bb-station').length === 0 && hasClass(back, 'bb-idle-name').length === 9,
    'G2 a one-tick flip never relocates the grid (that is what the window is for)')
}

console.log('\n-- P0c: the chip must not double-fire into the row it sits in --')
// The chip is a child of a row that is itself a button, so React's synthetic
// events bubble. Without stopPropagation, clicking `+2` also opened the drawer of
// the Bot on that row — and the drawer covers the panel, so the list appeared to
// jump to somebody else's details.
{
  const fiveHot = layerRows({
    approvals: [{ id: 'a1', botId: 'layer-1', tool: 'Bash' }, { id: 'a2', botId: 'layer-2', tool: 'Read' }],
    errors: [
      { botId: 'layer-3', at: now - 1000, message: 'x' },
      { botId: 'layer-4', at: now - 2000, message: 'y' },
      { botId: 'layer-5', at: now - 3000, message: 'z' },
    ],
  })
  let opened = 0
  let expanded = 0
  resetRefs()
  const tree = mount(Body, {
    ...bodyProps(fiveHot),
    onOpen: () => { opened += 1 },
    // Body owns the toggle; the assertion below only needs to know the click
    // reached it, which the chip's own handler proves.
  })
  const chip = hasClass(tree, 'bb-att-more')[0]
  let stopped = 0
  chip.props.onClick({ stopPropagation: () => { stopped += 1 } })
  check(stopped === 1, 'P0c the chip stops the click before it reaches the row')
  let stoppedKey = 0
  let defaulted = 0
  chip.props.onKeyDown({
    key: 'Enter',
    preventDefault: () => { defaulted += 1 },
    stopPropagation: () => { stoppedKey += 1 },
  })
  check(stoppedKey === 1 && defaulted === 1,
    'P0c and it stops Enter/Space too (preventDefault alone is not enough — the row only looks at event.key)')
  check(opened === 0, 'P0c the chip\'s own handler only toggles; it never opens a drawer')
  check(typeof chip.props['aria-label'] === 'string' && chip.props['aria-label'].length > 0,
    'P0c the chip announces what it does (it is a nested control, so it needs its own name)')
}

console.log('\n-- P1b: the expanded flag must not outlive the overflow --')
// When the count drops to ≤3 the chip disappears, so there is no `−` left to
// press. A sticky flag would silently re-expand the list the next time five Bots
// needed you — a different five, minutes later, and layer 2 would lose its height.
{
  const make = (count) => layerRows({
    approvals: layerBots.slice(0, count).map((bot, index) => ({ id: `s${index}`, botId: bot.id, tool: 'Bash' })),
  })
  resetRefs()
  const five = make(5)
  const two = make(2)
  const props = rows => ({ ...bodyProps(rows) })

  const collapsed = mount(Body, props(five))
  check(hasClass(collapsed, 'bb-attention-row').length === 3, 'P1b five hot starts collapsed at three rows')
  const chip = hasClass(collapsed, 'bb-att-more')[0]
  chip.props.onClick({ stopPropagation: () => {} })
  const opened = mount(Body, props(five))
  check(hasClass(opened, 'bb-attention-row').length === 5,
    'P1b the click expands to all five (the toggle reached Body)')

  const shrunk = mount(Body, props(two))
  check(hasClass(shrunk, 'bb-attention-row').length === 2 && hasClass(shrunk, 'bb-att-more').length === 0,
    'P1b the overflow is gone, so the chip is gone')
  const regrown = mount(Body, props(five))
  check(hasClass(regrown, 'bb-attention-row').length === 3,
    'P1b and coming back to five hot is COLLAPSED again, not silently re-expanded')
  check(hasClass(regrown, 'bb-att-more').length === 1, 'P1b with its +2 chip back')
}

// D1: compressing a Bot into 闲着 must not drop its failure badge.
{
  const stale = layerRows({ errors: [{ botId: 'layer-4', at: now - ERROR_LAMP_MS - 1000, message: '模型超时' }] })
  const staleBody = renderBody(stale)
  const names = hasClass(staleBody, 'bb-idle-name')
  const badged = names.filter(name => findAll(name, node => String(node.props?.className ?? '').split(' ').includes('bb-badge')).length === 1)
  check(badged.length === 1, `D1 exactly one compressed name carries the badge (${badged.length})`)
  check(textOf(badged[0]).includes('物理'), 'D1 and it is the Bot that failed, not somebody else')
  check(textOf(badged[0]).includes('!'), 'D1 the badge is a glyph, so it survives without colour')

  // The +N escape hatch: one click must actually reveal the names it hid, and it
  // is the only path allowed to make layer 3 taller.
  const cramped = render(IdleLine({
    items: stale.slice(0, 3), overflow: 6, expanded: false, t, onOpen: () => {}, onExpand: () => {},
  }))
  check(cramped?.props?.['data-expanded'] === 'false' && textOf(cramped).includes('+6'),
    'D1 +N reports how many names are hidden')
  const opened = render(IdleLine({
    items: stale, overflow: 0, expanded: true, t, onOpen: () => {}, onExpand: () => {},
  }))
  check(opened?.props?.['data-expanded'] === 'true', 'D1 expanding marks the line as expanded')
  check(hasClass(opened, 'bb-idle-name').length === stale.length,
    `D1 expanding shows every name, not the same trimmed set in a taller box (${hasClass(opened, 'bb-idle-name').length})`)
  check(!textOf(opened).includes('+'), 'D1 and the +N disappears once nothing is hidden')
}

// B4: an edge must never call a working Bot "blocked".
{
  const edgeWorks = [{
    id: 'w1', fromId: 'layer-2', from: '班主任', toId: 'layer-3', to: '数学', open: 4, at: now - 60_000,
  }]
  const rowsFor = scene => layerRows({
    activity: scene === 'busy' ? { 'layer-3': 'working' } : {},
    waiting: scene === 'waiting' ? { 'layer-3': { bots: ['layer-0'] } } : {},
    approvals: scene === 'alert' ? [{ id: 'x', botId: 'layer-3', tool: 'Bash' }] : [],
  })
  const edgeFor = scene => findAll(
    renderBody(rowsFor(scene), edgeWorks, { 'layer-3': scene }), node => node.props?.className === 'bb-handoff',
  )[0]

  const busyEdge = edgeFor('busy')
  check(busyEdge?.props?.['data-blocked'] === 'false', 'B4 a busy receiver is data-blocked="false", never "true"')
  check(!textOf(busyEdge).includes('被堵'), 'B4 and it does not print 被堵 — you do not chase somebody already paying the debt')
  check(edgeFor('waiting')?.props?.['data-blocked'] === 'false', 'B4 a waiting receiver is not blocked either (the chain is turning)')
  check(edgeFor('alert')?.props?.['data-blocked'] === 'true', 'B4 an alert receiver is blocked')
  check(textOf(edgeFor('alert')).includes('被堵'), 'B4 and says so in words, not only in colour')
  const idleEdge = edgeFor('idle')
  check(idleEdge?.props?.['data-blocked'] === 'idle', 'B4 an idle receiver is a third state, not blocked')
  check(textOf(idleEdge).includes('未开工'), 'B4 未开工: there is debt and nobody on it')
  check(!textOf(idleEdge).includes('被堵'), 'B4 idle is not 被堵 — nothing is holding it up')
}

// B5: the grouped edge table.
{
  const groupedWorks = [
    { id: 'g1', fromId: 'layer-2', from: '班主任', toId: 'layer-3', to: '数学', open: 4, at: now - 720_000 },
    { id: 'g2', fromId: 'layer-2', from: '班主任', toId: 'layer-4', to: '物理', open: 3, at: now - 480_000 },
    { id: 'g3', fromId: 'layer-3', from: '数学', toId: 'layer-2', to: '班主任', open: 2, at: now - 300_000 },
  ]
  const groupedBody = renderBody(layerRows({}), groupedWorks, {})
  const groups = hasClass(groupedBody, 'bb-ho-group')
  const edges = hasClass(groupedBody, 'bb-handoff')
  check(groups.length === 2, `B5 one group per sender (${groups.length})`)
  check(hasClass(groupedBody, 'bb-ho-group-head').length === 2, 'B5 every group has a head')
  check(edges.length === 3, `B5 every open work is one edge (${edges.length})`)
  check(textOf(groups[0]).includes('共 7 项'), 'B5 the biggest sender heads the table, with its own sum')
  check(edges.every(edge => edge.props?.role === 'button' && edge.props?.tabIndex === 0
    && typeof edge.props?.onKeyDown === 'function'), 'B5 every edge is reachable by keyboard, like a workstation')
  check(textOf(groupedBody).includes('4 项待交'), 'B5 the open count keeps its wording')
  check(textOf(groupedBody).includes('12 分钟前'), 'B5 and the edge still says how long ago it started')
  const mutual = edges.filter(edge => edge.props?.['data-mutual'] === 'true')
  check(mutual.length === 2, `B5 a mutually-open pair is marked on both sides (${mutual.length})`)
  check(mutual.every(edge => textOf(edge).includes('⇄') && textOf(edge).includes('互相等')),
    'B5 ⇄ and the word 互相等 together — the glyph alone would be a riddle')
  check(edges.filter(edge => !edge.props?.['data-mutual']).every(edge => textOf(edge).includes('→')),
    'B5 an ordinary edge keeps the dispatch arrow')
  check(hasClass(renderBody(layerRows({}), [], {}), 'bb-handoffs').length === 0,
    'B5 no open work renders no table, not an empty shell')
}

// C2: the legend left the first screen but the six states are still named.
{
  check(hasClass(board, 'bb-legend').length === 0 && hasClass(board, 'bb-lg').length === 0,
    'C2 no permanent legend strip on the board any more')
  const sheet = render(LegendSheet({ t, onClose: () => {} }))
  for (const key of ['busy', 'alert', 'waiting', 'error', 'idle', 'done']) {
    check(textOf(sheet).includes(t(`legend.${key}`)), `C2 ${key} is still named`)
  }
  for (const key of ['busy', 'alert', 'waiting', 'error', 'idle', 'done']) {
    check(textOf(sheet).includes(t(`legend.hint.${key}`)), `C2 ${key} still explains itself in one sentence`)
  }
  const lamps = hasClass(sheet, 'bb-lg-lamp')
  check(lamps.length === 6, `C2 six shape nodes in the legend (${lamps.length})`)
  const circles = lamps.filter(lamp => findAll(lamp, node => node.type === 'circle').length === 1).length
  const rects = lamps.filter(lamp => findAll(lamp, node => node.type === 'rect').length === 1).length
  check(circles === 4 && rects === 2, `C2 four circles plus the square and the diamond (${circles}/${rects})`)
  check(sheet?.props?.className === 'bb-drawer' && sheet?.props?.['aria-modal'] === 'true',
    'C2 the legend reuses the drawer, so it inherits the focus trap instead of adding a second one')

  const help = findAll(board, node => node.props?.['aria-label'] === t('legend.help'))[0]
  check(help?.props?.className === 'bb-icon' && textOf(help) === '?',
    'C2 the legend is one ? button in the head — 24px wide, and it replaces a 27px permanent strip')
  const sum = findAll(board, node => node.props?.className === 'bb-sum')[0]
  check(textOf(sum).trim().startsWith(`0 ${t('legend.alert')}`),
    'C2 the header counts 等你 before anything else (weight, not colour, so a dark theme cannot swallow it)')
}

console.log('\n-- preview serialiser: attribute casing --')
// docs/preview-*.html is parsed as HTML, so an unknown camelCase attribute is
// lowercased and thrown away at parse time, silently. That shipped: 113
// `strokeWidth` and 0 `stroke-width`, so every stroke fell back to the SVG
// default of 1 — layer 2's lamp went 1.2 → 1.0 (0.81px rendered, under the
// design's own ≥0.95 threshold) and the desk lines halved 2 → 1. It was
// invisible in the artifact and visible only in a browser, because no check ever
// looked at the serialised string. Imported for its `toHtml` export only: the
// module guards its file write behind an `isMain` check, so nothing is written.
{
  const { toHtml } = await import('./export-preview.mjs')
  const stroked = toHtml({ type: 'rect', props: { strokeWidth: 1.5 } })
  check(stroked.includes('stroke-width="1.5"'),
    `an SVG presentation attribute is kebab-cased on the way out (${stroked})`)
  check(!stroked.includes('strokeWidth'), 'and the camelCase spelling is not what ships')

  // viewBox is on the HTML spec's SVG attribute adjustment list, so kebab-casing
  // it would produce `view-box`, which is not an attribute and gets dropped just
  // like the unadjusted camelCase did.
  const view = toHtml({ type: 'svg', props: { viewBox: '0 0 12 12' } })
  check(view.includes('viewBox="0 0 12 12"') && !view.includes('view-box'),
    `viewBox keeps its spec casing, it is not kebab-cased (${view})`)

  // The real drawing, not a fixture: the lamp and desk strokes only exist here.
  const markup = toHtml(stations['Chief'])
  check(markup.includes('stroke-width') && !markup.includes('strokeWidth'),
    'and the workstation that ships serialises with no camelCase stroke at all')
}

if (failed) {
  console.error(`\nrender-check FAILED: ${failed} assertion(s)`)
  process.exit(1)
}
console.log('\nrender-check OK')
