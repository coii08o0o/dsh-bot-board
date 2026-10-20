// smoke.mjs — behaviour-level checks for both halves plus the pure logic.
//
// Run: node tools/smoke.mjs   (or: npm run check, which builds first)
//
// The old version asserted on source strings ("does client.js contain SIZE_KEY"),
// which breaks on any refactor and proves nothing. This version drives the real
// modules: the host snapshot against a hermetic DSH_HOME fixture, the status rules
// as plain functions, and the built bundle through the same loader contract DSH
// uses. CSS is asserted on the generated string, since that is what ships.
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
let failed = 0
const check = (ok, label) => {
  if (ok) {
    console.log(`  ok  ${label}`)
  } else {
    failed += 1
    console.error(`FAIL  ${label}`)
  }
}
const section = name => console.log(`\n-- ${name} --`)

// ------------------------------------------------------------------ host --
section('host: snapshot')
{
  const home = await mkdtemp(join(tmpdir(), 'bb-smoke-'))
  try {
    await mkdir(join(home, 'bot'))
    const statePath = join(home, 'bot', 'state.json')
    const fixture = {
      bots: {
        'session-aaa': {
          id: 'session-aaa', name: 'Chief', role: 'captain', model: 'deepseek-v4',
          sessionId: 'session-bbb', segments: [{ sessionId: 'session-ccc' }],
        },
        'session-ddd': { id: 'session-ddd', name: '数学', role: '', model: null, segments: [] },
      },
      works: {
        w1: { from: 'session-aaa', to: 'session-ddd', at: 1792490000000, open: ['x', 'y'], results: [{ text: 'done one' }] },
        w2: { from: 'session-ddd', to: 'session-aaa', at: 1792480000000, open: [], results: [] },
        // A Bot that rolled over a part hands work over as its CURRENT part id.
        w3: { from: 'session-bbb', to: 'session-ddd', at: 1792470000000, open: ['z'], results: [] },
      },
      rooms: { r1: { id: 'r1', name: '群聊', sessions: { 'session-ddd': 'session-room' }, segments: {} } },
    }
    await writeFile(statePath, JSON.stringify(fixture))
    process.env.DSH_HOME = home

    const { apply } = await import(new URL('../src/host/index.js', import.meta.url).href)

    const listeners = []
    const routes = []
    const ctx = {
      logger: { warn: () => {} },
      on: (name, cb) => { listeners.push({ name, cb }) },
      effect: fn => { const dispose = fn(); return typeof dispose === 'function' ? dispose : () => {} },
      inject: (deps, cb) => { cb(ctx) },
      connection: { fetch: { register: route => { routes.push(route); return () => {} } } },
    }
    apply(ctx)

    const worker = listeners.find(item => item.name === 'agent/error')
    check(typeof worker?.cb === 'function', 'agent/error listener registered')
    check(routes.length === 1, `exactly one route registered (got ${routes.length})`)
    const route = routes[0]
    check(route?.path === '/api/bot-board', 'route path keeps the leading slash')
    check(JSON.stringify(route?.methods) === '["POST"]', 'route methods is ["POST"]')
    check(route?.requestBody === 'buffered', 'route requestBody is buffered')

    const read = async () => (await route.fetch()).json()
    let body = await read()
    check(body.ok === true, 'snapshot ok')
    check(body.stale === false, 'healthy read is not marked stale')
    // Group chat is gone, but `work.waiting[].rooms` carries room ids — the
    // snapshot now ships a name-only map so the card can say 群 群聊, not 群 r1.
    check(JSON.stringify(body.rooms) === '{"r1":"群聊"}', 'rooms is a name-only map (no log, no members)')
    check(body.bots.every(bot => 'sessionId' in bot), 'each bot exposes its current sessionId')
    check(body.works.every(work => !('room' in work)), 'works carry no room field (the wrong-table lookup is gone)')
    check(body.works[0].id === 'w1' && body.works[0].open === 2, 'works are sorted by recency with open counts')
    check(body.works[0].last === 'done one', 'work carries its last result text')
    const rolled = body.works.find(work => work.id === 'w3')
    check(rolled?.from === 'Chief' && rolled?.fromId === 'session-aaa',
      'a hand-off sent from the current part resolves to its Bot')

    // P0-7: a failure raised in the CURRENT part must map back to the Bot, even
    // though that sessionId is not in segments[] yet.
    worker.cb({ agent: { session: { id: 'session-bbb' } }, error: { message: 'boom in current part' } })
    // ...and one raised in an ended part must still map.
    worker.cb({ agent: { session: { id: 'session-ccc' } }, error: { message: 'boom in old part' } })
    // ...and one raised in a hidden group Session.
    worker.cb({ agent: { session: { id: 'session-room' } }, error: { message: 'boom in group' } })
    body = await read()
    const mapped = body.errors.map(item => `${item.botId}:${item.message}`)
    check(mapped.includes('session-aaa:boom in current part'), 'error in the current part maps to its Bot')
    check(mapped.includes('session-aaa:boom in old part'), 'error in an ended part maps to its Bot')
    check(mapped.includes('session-ddd:boom in group'), 'error in a group session maps to its member Bot')

    // P1-2: a read that lands mid-write must not be reported as a fresh, empty
    // board — it keeps the last good snapshot and says so.
    await writeFile(statePath, '{"bots": {"trunc')
    body = await read()
    check(body.stale === true, 'unreadable state.json marks the snapshot stale')
    check(body.ok === true && body.bots.length === 2, 'unreadable state.json still serves the last good snapshot')

    // P1-3: a rewrite that changes the size must invalidate the cache.
    const good = JSON.stringify({
      ...fixture,
      bots: { ...fixture.bots, 'session-eee': { id: 'session-eee', name: '新增', segments: [] } },
    })
    await writeFile(statePath, good)
    body = await read()
    check(body.bots.length === 3 && body.stale === false, 'a rewrite with a new size is picked up')

    // A ctx without inject() or a connection service must not throw.
    let threw = false
    try {
      apply({ logger: { warn: () => {} }, on: () => {}, effect: () => () => {} })
    } catch { threw = true }
    check(!threw, 'apply() survives a ctx with no connection service')
  } finally {
    await rm(home, { recursive: true, force: true })
  }
}

// ----------------------------------------------------------- pure logic --
section('scene: status priority')
{
  const { statusOf, sceneOf, stalledOf, badgeOf } = await import(new URL('../src/client/scene.js', import.meta.url).href)
  const { STALL_MS } = await import(new URL('../src/client/const.js', import.meta.url).href)

  check(statusOf({ alerting: true, activity: 'working', waiting: true, failed: true }) === 'alert',
    'an approval outranks everything')
  // P0-1: the old board let a failure suppress live work for the full 15 minutes.
  check(statusOf({ activity: 'working', failed: true }) === 'working',
    'live work outranks a recorded failure')
  check(statusOf({ activity: 'thinking', failed: true }) === 'thinking',
    'thinking outranks a recorded failure too')
  check(statusOf({ waiting: true, failed: true }) === 'waiting',
    'waiting outranks a recorded failure')
  check(statusOf({ failed: true }) === 'error', 'a failure with no live signal is an error')
  check(statusOf({}) === 'idle', 'no signals at all is idle')
  check(statusOf({ activity: 'idle' }) === 'idle', 'an explicit idle activity is idle')

  // P0-4: waiting for another Bot is not waiting for the user.
  check(sceneOf('waiting', false) === 'waiting', 'waiting gets its own scene, not alert')
  check(sceneOf('alert', false) === 'alert', 'alert stays alert')
  check(sceneOf('error', true) === 'error', 'a failure is never masked by a hand-off wave')
  check(sceneOf('alert', true) === 'alert', 'an approval is never masked by a hand-off wave')
  check(sceneOf('idle', true) === 'done', 'a clean hand-off still shows done')
  check(sceneOf('working', false) === 'busy', 'working is busy')

  check(stalledOf(Date.now() - STALL_MS - 1000, 'busy') === true, 'a long busy turn reads as stalled')
  check(stalledOf(Date.now() - 1000, 'busy') === false, 'a fresh busy turn is not stalled')
  check(stalledOf(Date.now() - STALL_MS - 1000, 'idle') === false, 'idle is never stalled')

  check(badgeOf('busy', true) === true, 'a failure on a working Bot becomes a badge')
  check(badgeOf('error', true) === false, 'no badge when the failure is already the status')
}

section('format + roster')
{
  const { elapsed, ago, clip } = await import(new URL('../src/client/format.js', import.meta.url).href)
  const { seatOf, ROSTER } = await import(new URL('../src/client/const.js', import.meta.url).href)

  const now = 1_000_000_000
  check(elapsed(now - 42_000, now) === '42s', 'elapsed under a minute is seconds')
  check(elapsed(now - 252_000, now) === '4m12s', 'elapsed minutes keep seconds')
  check(elapsed(now - 3_780_000, now) === '1h03m', 'elapsed hours keep minutes')
  check(ago(now - 30_000, now) === '30 秒前', 'ago in seconds')
  check(ago(now - 900_000, now) === '15 分钟前', 'ago in minutes')
  check(clip('  a   b  ', 10) === 'a b', 'clip collapses whitespace')
  check(clip('abcdef', 3) === 'abc…', 'clip truncates with an ellipsis')
  check(elapsed('abc', now) === '' && ago('abc', now) === '', 'non-numeric timestamps print nothing, not NaN')

  const chief = seatOf({ name: 'Chief', id: 'x' })
  check(chief.color === ROSTER[0].color && chief.head === 'crown', 'a known Bot keeps its fixed seat')
  const stranger = seatOf({ name: '第十个', id: 'session-zzz' })
  check(stranger.face !== stranger.color && /^#[0-9a-f]{6}$/i.test(stranger.face), 'a stranger gets a two-tone face')
  check(['crown', 'glasses', 'bowRed', 'bowCream', 'hat', 'sprout', 'headphones', null].includes(stranger.head),
    'a stranger head comes from the allowed set')
}

// ------------------------------------------------------------- poll loop --
section('poll loop: single flight')
{
  const { createPollLoop, pollDelay } = await import(new URL('../src/client/pollLoop.js', import.meta.url).href)

  const flush = async () => { for (let i = 0; i < 4; i += 1) await new Promise(resolve => setTimeout(resolve, 0)) }
  const fakeClock = () => {
    let next = 1
    const jobs = new Map()
    return {
      setTimeout: fn => { const id = next; next += 1; jobs.set(id, fn); return id },
      clearTimeout: id => { jobs.delete(id) },
      pending: () => jobs.size,
    }
  }

  check(pollDelay(1500, { active: true, hidden: false, misses: 0 }) === 1500, 'delay is the base interval when active')
  check(pollDelay(1500, { active: false, hidden: false, misses: 0 }) === 30000, 'a collapsed panel polls every 30s')
  check(pollDelay(1500, { active: true, hidden: true, misses: 0 }) === 30000, 'a hidden window polls every 30s')
  check(pollDelay(1500, { active: true, hidden: false, misses: 1 }) === 3000, 'a failure doubles the delay')
  check(pollDelay(1500, { active: true, hidden: false, misses: 9 }) === 12000, 'backoff stops at 8x the base interval')
  check(pollDelay(5000, { active: true, hidden: false, misses: 9 }) === 30000, 'and never exceeds 30s')

  const clock = fakeClock()
  let runs = 0
  const loop = createPollLoop({
    base: 1000, timers: clock,
    isActive: () => true, isHidden: () => false,
    run: async () => { runs += 1; return runs },
    onValue: () => {}, onError: () => {},
  })
  loop.start()
  await flush()
  check(runs === 1 && clock.pending() === 1, 'a tick runs once and arms exactly one timer')
  loop.wake()
  await flush()
  check(runs === 2 && clock.pending() === 1, 'wake fires immediately and still leaves exactly one timer')
  loop.stop()

  // The regression that shipped in 0.3.0's first cut: hammering wake() while a
  // request is in the air used to start a second, permanent chain.
  const slowClock = fakeClock()
  let slowRuns = 0
  let release
  const slow = createPollLoop({
    base: 1000, timers: slowClock,
    isActive: () => true, isHidden: () => false,
    run: () => new Promise(resolve => { slowRuns += 1; release = resolve }),
    onValue: () => {}, onError: () => {},
  })
  slow.start()
  await flush()
  for (let i = 0; i < 5; i += 1) slow.wake()
  await flush()
  check(slowRuns === 1 && slowClock.pending() === 0, 'wake during an in-flight request is ignored (no second chain)')
  release(1)
  await flush()
  check(slowClock.pending() === 1, 'after the request settles exactly one timer is armed')
  slow.stop()
  check(slowClock.pending() === 0, 'stop() disarms the timer')

  const failClock = fakeClock()
  let attempts = 0
  const failing = createPollLoop({
    base: 1000, timers: failClock,
    isActive: () => true, isHidden: () => false,
    run: async () => { attempts += 1; throw new Error('boom') },
    onValue: () => {}, onError: () => {},
  })
  failing.start()
  await flush()
  check(attempts === 1 && failClock.pending() === 1, 'a failed request still arms the next tick')
  failing.stop()
}

// ---------------------------------------------------------------- bundle --
section('bundle: loader contract')
{
  const source = readFileSync(join(ROOT, 'client.js'), 'utf8')
  let loaded = null
  const registered = []
  const injected = []
  const ReactStub = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    memo: component => component,
    useState: value => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: value => ({ current: value }),
    useMemo: fn => fn(),
    useCallback: fn => fn(),
  }
  const sandbox = {
    window: { __ModuleLoader__: { load: spec => { loaded = spec } } },
    document: {
      hidden: false, getElementById: () => null, createElement: () => ({ style: {} }),
      head: { appendChild: () => {} }, addEventListener: () => {}, removeEventListener: () => {},
    },
    localStorage: { getItem: () => null, setItem: () => {} },
    fetch: async () => { throw new Error('offline in smoke') },
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    console,
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'client.js' })

  check(loaded?.id === 'dsh-bot-board', 'loader called with id dsh-bot-board')
  check(typeof loaded?.factory === 'function', 'loader spec carries a factory')

  const required = []
  const api = loaded.factory(name => {
    required.push(name)
    if (name === 'react') return ReactStub
    throw new Error(`unexpected require("${name}")`)
  })
  const unique = [...new Set(required)]
  check(JSON.stringify(unique) === '["react"]', `factory only requires react (got ${unique.join(',')})`)
  check(typeof api?.apply === 'function', 'factory returns apply()')
  check(JSON.stringify(api.inject) === '["slots"]', 'inject list is slots only')

  api.apply({
    slots: {
      inject: (name, cb) => { injected.push(name); if (typeof cb === 'function') cb() },
      register: (options, component) => { registered.push({ options, component }); return () => {} },
    },
    locale: { register: () => () => {}, bind: () => key => key },
  })
  check(injected.length === 1 && injected[0] === 'shell.overlay', 'slots.inject("shell.overlay")')
  check(registered.length === 1, 'slots.register called once')
  const slot = registered[0]
  check(slot?.options?.name === 'shell.overlay' && slot?.options?.id === 'bot-board', 'slot registered as shell.overlay/bot-board')
  check(slot?.options?.order === 500, 'slot order is 500 (above ds-bot 50/55/60)')
  check(typeof slot?.component === 'function', 'slot component is a function')

  // A build without the locale service must still apply.
  let threw = false
  try {
    api.apply({ slots: { inject: (name, cb) => cb(), register: () => () => {} } })
  } catch { threw = true }
  check(!threw, 'apply() survives a host without ctx.locale')

  check(!/petdex|PET_|\.gif/i.test(source), 'no petdex/sprite leftovers')
  // A read-only board must not send `locale`: ds-bot stores it in a process-wide
  // uiLocale that decides the language of new Bot greetings and memory.
  check(!/locale:\s*['"]zh-CN['"]/.test(source), 'never sends a locale to ds-bot')
  check(!/dangerouslySetInnerHTML/.test(source), 'no dangerouslySetInnerHTML')
}

// ------------------------------------------------------------------- css --
section('css')
{
  const { CSS } = await import(new URL('../src/client/style.js', import.meta.url).href)

  // P0-2: the room is a cream island; its ink must be explicit, not inherited.
  const bodyRule = CSS.match(/\.bb-body\{[^}]*\}/)?.[0] ?? ''
  check(/color:#2C2C2A/.test(bodyRule), 'the room body sets an explicit dark ink')
  check(/background:#FAF7F1/.test(bodyRule), 'the room body keeps the cream surface')
  check(/\.bb-station-name\{[^}]*color:#2C2C2A/.test(CSS), 'station names set an explicit dark ink')

  const parseStops = name => {
    const start = CSS.indexOf(`@keyframes ${name}{`)
    if (start < 0) return null
    const open = CSS.indexOf('{', start)
    let depth = 0
    let end = open
    for (; end < CSS.length; end += 1) {
      if (CSS[end] === '{') depth += 1
      else if (CSS[end] === '}') { depth -= 1; if (depth === 0) break }
    }
    return [...CSS.slice(open + 1, end).matchAll(/([\d.]+)%\{([^}]*)\}/g)]
      .map(match => ({ pct: parseFloat(match[1]), body: match[2] }))
  }
  const DISCRETE = ['bb-blink', 'bb-tap', 'bb-wave', 'bb-note']
  for (const name of DISCRETE) {
    const stops = parseStops(name)
    const monotonic = Boolean(stops) && stops.length >= 2 && stops[0].pct === 0
      && stops.every((stop, index) => index === 0 || stop.pct > stops[index - 1].pct)
    check(monotonic, `${name}: one stop per hold, strictly increasing from 0%`)
  }
  // The blink keyframes are driven by .bb-eyes, the rest by a same-named class.
  const OWNER = { 'bb-blink': 'bb-eyes', 'bb-tap': 'bb-tap', 'bb-wave': 'bb-wave', 'bb-note': 'bb-note' }
  for (const name of DISCRETE) {
    const rule = CSS.match(new RegExp(`\\.${OWNER[name]}\\{[^}]*\\}`))?.[0] ?? ''
    check(rule.includes(`animation:${name}`) && rule.includes('step-end'), `${name} uses step-end`)
  }
  check(/\.bb-blob\{[^}]*bb-breathe 2\.6s/.test(CSS), 'breathing runs bb-breathe over 2.6s')
  check(/\.bb-meta-time\{[^}]*tabular-nums/.test(CSS), 'elapsed time uses tabular numerals')

  const reduceAt = CSS.lastIndexOf('@media (prefers-reduced-motion:reduce)')
  check(reduceAt > CSS.lastIndexOf('@keyframes'), 'reduced-motion block comes after every keyframe')
  check(reduceAt > CSS.lastIndexOf('animation:bb-'), 'reduced-motion block comes after every animation rule')
  check(CSS.slice(reduceAt).includes('animation:none'), 'reduced-motion block disables the animations')
}

// ---------------------------------------------------------------- locale --
section('locale')
{
  const { zh, en } = await import(new URL('../src/client/locale.js', import.meta.url).href)
  const zhKeys = Object.keys(zh).sort()
  const enKeys = Object.keys(en).sort()
  check(zhKeys.length > 20, `dictionary has a real key set (${zhKeys.length})`)
  check(JSON.stringify(zhKeys) === JSON.stringify(enKeys), 'zh and en cover exactly the same keys')
}

if (failed) {
  console.error(`\nsmoke FAILED: ${failed} assertion(s)`)
  process.exit(1)
}
console.log('\nsmoke OK')
