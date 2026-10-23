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
          // The colour the user picked in DS Bot's own UI: a named ink there,
          // forwarded here so the browser half can outrank the local roster.
          color: 'deepseek',
        },
        // A Bot created without a model holds its setup greeting in `kickoff`.
        'session-ddd': { id: 'session-ddd', name: 'Bot4', role: '', model: null, segments: [], kickoff: { text: 'hi' } },
        // Nobody picked a colour for this one — which is what upstream stores
        // for most Bots — and its zero-width space must not survive the trip.
        'session-eee': { id: 'session-eee', name: 'Bot5', role: '', color: 'bl\u200Bue' },
      },
      works: {
        w1: { from: 'session-aaa', to: 'session-ddd', at: 1792490000000, open: ['x', 'y'], results: [{ name: 'Bot4', text: 'done one' }] },
        w2: { from: 'session-ddd', to: 'session-aaa', at: 1792480000000, open: [], results: [] },
        // A Bot that rolled over a part hands work over as its CURRENT part id.
        w3: { from: 'session-bbb', to: 'session-ddd', at: 1792470000000, open: ['z'], results: [] },
        // Older than w2 but still open: the strip must show it before the closed one.
        w4: { from: 'session-aaa', to: 'session-ddd', at: 1792400000000, open: ['q'], results: [] },
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
    check(body.works[0].results?.[0]?.name === 'Bot4', 'work results carry the name of the Bot that handed back')
    const rolled = body.works.find(work => work.id === 'w3')
    check(rolled?.from === 'Chief' && rolled?.fromId === 'session-aaa',
      'a hand-off sent from the current part resolves to its Bot')

    // A Bot whose setup greeting is still held will not speak until the user picks
    // a model; the snapshot has to say so, or the card reads as merely idle.
    check(body.bots.find(bot => bot.id === 'session-ddd')?.waiting === true,
      'a held setup greeting is exposed as waiting')
    check(body.bots.find(bot => bot.id === 'session-aaa')?.waiting === false,
      'a Bot that has spoken is not waiting')

    // `bot.color` is the identity the user picked in DS Bot's own UI, so it is
    // forwarded rather than dropped. The host sanitises and the browser half
    // validates — a string that is neither a known ink nor #rrggbb simply never
    // resolves, which is why forwarding it raw is safe.
    check(body.bots.find(bot => bot.id === 'session-aaa')?.color === 'deepseek',
      'a picked ink id is forwarded to the browser half')
    check(body.bots.find(bot => bot.id === 'session-ddd')?.color === null,
      'a Bot with no picked colour forwards null, not undefined')
    check(body.bots.find(bot => bot.id === 'session-eee')?.color === 'blue',
      'a colour with a zero-width space is sanitised on the way through')

    // An old hand-off that is still open must outrank a newer closed record.
    const order = body.works.map(work => work.id)
    check(order.indexOf('w4') >= 0 && order.indexOf('w4') < order.indexOf('w2'),
      `an older open hand-off outranks a newer closed one (${order.join(',')})`)

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
    check(body.ok === true && body.bots.length === 3, 'unreadable state.json still serves the last good snapshot')

    // P1-3: a rewrite that changes the size must invalidate the cache.
    const good = JSON.stringify({
      ...fixture,
      bots: { ...fixture.bots, 'session-eee': { id: 'session-eee', name: '新增', segments: [] } },
    })
    await writeFile(statePath, good)
    body = await read()
    check(body.bots.length === 3 && body.stale === false, 'a rewrite with a new size is picked up')

    // The open-work cap has to be a cap. `Math.max(WORKS_MAX, open.length)` made
    // it a no-op in exactly the case it exists for — 5000 open hand-offs went out
    // as a multi-megabyte payload on every poll of a 5-second feed.
    const manyWorks = Object.fromEntries(Array.from({ length: 5000 }, (_, index) => [
      `m${index}`,
      { from: 'session-aaa', to: 'session-ddd', at: 1792490000000 - index, open: ['x'], results: [] },
    ]))
    await writeFile(statePath, JSON.stringify({ ...fixture, works: manyWorks }))
    body = await read()
    check(body.works.length <= 24,
      `5000 open hand-offs are capped at WORKS_MAX, not shipped whole (${body.works.length})`)

    // A null or a string in `bots` is another process's file content, not a value
    // this code built. It used to throw on `bot.id` — and because the cache is
    // written at the END of snapshot(), the throw skipped the write, so the board
    // never healed and every poll failed the same way.
    await writeFile(statePath, JSON.stringify({
      bots: {
        ok: { id: 'session-aaa', name: 'Chief', segments: [] },
        bad: null,
        worse: 'junk',
      },
      works: {}, rooms: {},
    }))
    let junk = null
    try { junk = await read() } catch { junk = null }
    check(junk?.ok === true && junk.bots.length === 1,
      `a null or a string among the Bots is dropped, not fatal (${junk ? `${junk.bots.length} bots, ok=${junk.ok}` : 'the route threw'})`)

    // The name is the one field the user tells two Bots apart by. U+200B made
    // "Chief" and "Chief\u200B" look like two different Bots side by side, and
    // U+202E reversed the rest of the string on the card.
    await writeFile(statePath, JSON.stringify({
      bots: { z: { id: 'session-zzz', name: 'Ch\u200Bief\u202E', segments: [] } }, works: {}, rooms: {},
    }))
    const first = await read()
    check(first.bots[0]?.name === 'Chief',
      `a zero-width space and an RLO mark are removed from the name, not escaped (${JSON.stringify(first.bots[0]?.name)})`)
    check(!/[\u200b-\u200f\u202a-\u202e]/.test(first.bots[0]?.name ?? ''),
      'and nothing from the invisible/bidi range survives into the snapshot')

    // `readAt` is when state.json was last actually READ. A cache hit must not
    // refresh it, or a writer that stopped looks alive forever.
    const second = await read()
    check(typeof first.readAt === 'number' && first.readAt > 0, 'a good read stamps readAt')
    check(second.readAt === first.readAt,
      'a cache hit does not move readAt (the file did not change, so the age must not reset)')

    // …and 16s later, with the file still untouched, the snapshot has to say so.
    // Three missed 5s board polls is the point where "old" stops being a blip.
    const realNow = Date.now
    let aged = null
    try {
      Date.now = () => realNow() + 16_000
      aged = await read()
    } finally {
      Date.now = realNow
    }
    check(aged?.stale === true && aged.readAt === first.readAt,
      `an unchanged state.json older than READ_STALE_MS is reported stale (stale=${aged?.stale}, readAt kept=${aged?.readAt === first.readAt})`)

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
  // A hand-off lands in the same second the receiver picks up its next turn; the
  // 7-second celebration must not repaint a working Bot as 干完.
  check(sceneOf('working', true) === 'busy', 'a hand-off wave never paints a working Bot as done')
  check(sceneOf('thinking', true) === 'busy', 'and never paints a thinking Bot as done either')
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
  const { seatOf, statusLabel } = await import(new URL('../src/client/const.js', import.meta.url).href)
  const { fallbackT } = await import(new URL('../src/client/locale.js', import.meta.url).href)

  const now = 1_000_000_000
  check(elapsed(now - 42_000, now) === '42s', 'elapsed under a minute is seconds')
  check(elapsed(now - 252_000, now) === '4m12s', 'elapsed minutes keep seconds')
  check(elapsed(now - 3_780_000, now) === '1h03m', 'elapsed hours keep minutes')
  check(ago(now - 30_000, now) === '30 秒前', 'ago in seconds')
  check(ago(now - 900_000, now) === '15 分钟前', 'ago in minutes')
  check(clip('  a   b  ', 10) === 'a b', 'clip collapses whitespace')
  check(clip('abcdef', 3) === 'abc…', 'clip truncates with an ellipsis')
  check(elapsed('abc', now) === '' && ago('abc', now) === '', 'non-numeric timestamps print nothing, not NaN')

  const { INKS, inkOf, CHARACTERS, SHAPES, shapeOf } = await import(new URL('../src/client/const.js', import.meta.url).href)

  // Identity is `avatar.shape` x `color`, both owned by DS Bot, plus the board's
  // own desk prop. A Bot with neither upstream field hashes both axes.
  const stranger = seatOf({ name: '第十个', id: 'session-zzz' })
  check(SHAPES.includes(stranger.shape) && stranger.face !== stranger.color,
    'a Bot with no upstream look gets a character and a two-tone face from its id')
  check(/^#[0-9a-f]{6}$/i.test(stranger.color) && /^#[0-9a-f]{6}$/i.test(stranger.face),
    'both the body and the face are plain hex, never a named colour')
  const strangerAgain = seatOf({ name: '第十个', id: 'session-zzz' })
  check(strangerAgain.shape === stranger.shape && strangerAgain.color === stranger.color,
    'the hashed look is stable across renders')

  // The seven characters are DS Bot's own set; a name is not part of identity any
  // more, so a Bot called Chief gets no special treatment.
  check(SHAPES.length === 7 && Object.keys(CHARACTERS).join(',') === 'whale,star,moon,wave,squircle,zed,hex',
    'the character set is DS Bot\'s seven, in its own order')
  check(shapeOf('whale') === 'whale' && shapeOf('unicorn') === null && shapeOf(null) === null,
    'an unknown character id is null, so it falls through to the hash')

  const inked = seatOf({ name: 'Chief', id: 'x', color: 'deepseek', shape: 'whale' })
  check(inked.color === INKS.deepseek && inked.shape === 'whale',
    'the picked ink and the picked character both win over the hash')
  const shapeOnly = seatOf({ name: 'Bot4', id: 'x', shape: 'star' })
  check(shapeOnly.shape === 'star' && /^#[0-9a-f]{6}$/i.test(shapeOnly.color),
    'a picked character survives when no colour was picked, and the colour is hashed')
  const inkOnly = seatOf({ name: 'Bot4', id: 'x', color: 'blue' })
  check(inkOnly.color === INKS.blue && SHAPES.includes(inkOnly.shape),
    'a picked colour survives when no character was picked')
  check(seatOf({ name: '甲', id: 'x', color: 'chartreuse', shape: 'unicorn' }).color !== 'chartreuse',
    'unrecognised upstream values never reach a fill')

  // Two Bots that picked the same character and colour are meant to look alike —
  // that is the user's choice — so the pair is not de-duplicated. Only looks that
  // were hashed are.
  const chosen = new Set()
  const lookA = seatOf({ name: 'A', id: 'a', color: 'blue', shape: 'whale' }, chosen)
  const lookB = seatOf({ name: 'B', id: 'b', color: 'blue', shape: 'whale' }, chosen)
  check(lookA.shape === lookB.shape && lookA.color === lookB.color,
    'two Bots that picked the same look look the same, on purpose')

  // Two strangers can hash onto one triple by chance (12 x 7 x 10 = 840
  // combinations). This pair does; without dedup they would draw byte-identical
  // dumplings, one working and one failing — the v0.4.2 finding #12 shape.
  const clashTaken = new Set()
  const clashA = seatOf({ name: '甲', id: 'session-1n-xx' }, clashTaken)
  const clashB = seatOf({ name: '乙', id: 'session-30-xx' }, clashTaken)
  const same = s => `${s.shape}|${s.color}|${s.prop}`
  check(same(clashA) !== same(clashB),
    `two strangers on one hash triple get different seats (${same(clashA)} vs ${same(clashB)})`)
  check(same(seatOf({ name: '甲', id: 'session-1n-xx' })) === same(clashA),
    'dedup only re-salts a clash: an unclashed stranger keeps its original seat')

  // An activity ds-bot adds later has no dictionary entry; printing the raw token
  // onto the card is worse than reading it as "working".
  const t = fallbackT('zh')
  check(statusLabel('working', t) === '干活中', 'a known activity is translated')
  check(statusLabel('error', t) === '出错了', 'a known status keeps its own label')
  check(statusLabel('compacting', t) === '干活中',
    'an unknown activity reads as a sentence, not as a raw token')
}

// ------------------------------------------------------------------ lamp --
section('lamp: one backdrop, one outline')
{
  const {
    LAMP, LAMP_BASE, LAMP_BASE_R, LAMP_R, LAMP_STROKE, LAMP_STROKE_W,
  } = await import(new URL('../src/client/const.js', import.meta.url).href)

  // The cream disc exists because the lamp straddles three backdrops (64% monitor
  // bezel, 29% floor, 7% desk) and its outline fell to 1.45:1 on the darkest one.
  // This is a geometric invariant, not a measurement: no part of the outline may
  // hang off the disc, now or after anybody re-sizes either one. It is the one
  // assertion that makes "the lamp grows past its base" impossible to ship.
  check(LAMP_BASE_R >= LAMP_R + LAMP_STROKE_W / 2,
    `the disc covers the lamp's outer radius (${LAMP_BASE_R} ≥ ${LAMP_R} + ${LAMP_STROKE_W}/2)`)

  // WCAG relative luminance: sRGB → linear → (L1 + .05) / (L2 + .05).
  const linear = value => {
    const c = value / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance = hex => {
    const n = parseInt(String(hex).replace('#', ''), 16)
    return 0.2126 * linear((n >> 16) & 255) + 0.7152 * linear((n >> 8) & 255) + 0.0722 * linear(n & 255)
  }
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  // Outline only, never the fill. `busy` (2.24:1) and layer-1 `alert` (1.92:1) are
  // *designed* to sit below 3:1 against cream — shape and the written state carry
  // those, and a filled disc would be a second colour saying the same thing.
  // Asserting LAMP[scene] instead would fail the current design, and the cheapest
  // way to make that pass is to edit a colour in const.js, which collides with
  // the hard constraint at const.js:70. So: the outline is the measurable channel.
  check(contrast(LAMP_STROKE, LAMP_BASE) >= 3,
    `the lamp outline clears 3:1 on its own backdrop (${contrast(LAMP_STROKE, LAMP_BASE).toFixed(2)}:1)`)
  // The three states layer 2 can draw must stay distinguishable by hue at all.
  // No threshold on purpose: the shape channel already carries the state, so a
  // contrast number here would be a second, weaker copy of the same rule.
  check(new Set([LAMP.busy, LAMP.waiting, LAMP.done]).size === 3,
    'busy / waiting / done are three different fills, not three names for one colour')
}

// ------------------------------------------------- three-layer attention --
section('layers: 需要你 / 在动 / 闲着')
{
  const {
    attentionOf, topologyOf, idleLine, layerOf, nameWidth, IDLE_BUDGET, IDLE_SLOP, IDLE_USABLE,
  } = await import(new URL('../src/client/layers.js', import.meta.url).href)
  const {
    HEAD_H, ATTENTION_ROW_H, ATTENTION_GAP, ATTENTION_PAD_V, IDLE_ROW_H, PANEL_BORDER,
    RUNNING_CELL_W, RUNNING_CELL_H, cellHeight, RUN_GRID_GAP, RUN_PAD_B, RUNNING_MIN_H,
    LAYER_STABLE_MS, POLL_MS, SCENE_VB,
  } = await import(new URL('../src/client/const.js', import.meta.url).href)
  const { buildRows } = await import(new URL('../src/client/rows.js', import.meta.url).href)
  const { fallbackT } = await import(new URL('../src/client/locale.js', import.meta.url).href)
  const t = fallbackT('zh')

  const row = (name, scene, since = 0, failureAt = 0) => ({
    bot: { id: `session-${name}`, name }, scene, since, failureAt, badge: false,
  })

  // ── A1 · the set is exactly alert ∪ error, and the order is the rule ──────
  const sample = [
    row('a', 'alert', 100), row('b', 'error', 0, 500), row('c', 'busy', 900),
    row('d', 'alert', 300), row('e', 'error', 0, 100), row('f', 'idle'),
    row('g', 'waiting'), row('h', 'done'), row('i', 'error', 0, 900),
  ]
  const hot = sample.filter(item => item.scene === 'alert' || item.scene === 'error')
  const every = attentionOf(sample, 99)
  check(every.items.length === hot.length && every.items.every(item => hot.includes(item)),
    `A1 需要你 = rows where scene ∈ {alert, error} (${every.items.length}/${hot.length})`)
  check(every.items.map(item => item.bot.name).join('') === 'adebi',
    `A1 every alert outranks every error, longest-waiting first inside a group (got ${every.items.map(i => i.bot.name).join('')})`)
  // The invariant stated once as an ordering predicate, over all 36 pairs.
  const ordered = every.items.every((item, index) => every.items.slice(index + 1).every(later => {
    const rank = value => (value.scene === 'alert' ? 0 : 1)
    if (rank(item) !== rank(later)) return rank(item) < rank(later)
    const key = value => Number(value.since) || Number(value.failureAt) || 0
    return key(item) <= key(later)
  }))
  check(ordered, 'A1 the order is a total order under (alert<error, then since||failureAt ASC — oldest wait first)')
  check(every.items.every(item => ['alert', 'error'].includes(item.scene)), 'A1 nothing else leaks in')

  // ── A3 · overflow is a count, not a loss ─────────────────────────────────
  const capped = attentionOf(sample)
  check(capped.items.length === 3, `A3 at most three rows (${capped.items.length})`)
  check(capped.items.length + capped.overflow === hot.length,
    `A3 items + overflow === n, nothing is silently dropped (${capped.items.length}+${capped.overflow}=${hot.length})`)
  check(capped.overflow === 2, `A3 overflow counts the rest (${capped.overflow})`)

  // ── A4 · a quiet board asks for nothing ──────────────────────────────────
  const quiet = attentionOf([row('a', 'idle'), row('b', 'idle'), row('c', 'done'), row('d', 'busy'), row('e', 'waiting')])
  check(quiet.items.length === 0 && quiet.overflow === 0, 'A4 a team with nobody blocked returns an empty list')

  // ── A6 · a budget that is not a budget ───────────────────────────────────
  // `slice(0, -1)` on a negative max keeps n−1 rows and calls the dropped one
  // overflow: the list then reads as complete while the last Bot is missing from
  // both the rows and the count. Negative and NaN are not budgets, so the clamp
  // has to produce zero rows and an honest overflow.
  const threeHot = [row('a', 'alert', 100), row('b', 'error', 0, 200), row('c', 'alert', 300)]
  const negative = attentionOf(threeHot, -1)
  check(negative.items.length === 0 && negative.overflow === threeHot.length,
    `A6 a negative budget shows nothing and counts everything (${negative.items.length}+${negative.overflow}=${threeHot.length})`)
  // The same accounting over every budget that can occur, including both
  // legitimate extremes: no row may be lost and none may be listed twice.
  const accounted = [-1, 0, 1, 2, 3, 4, Number.POSITIVE_INFINITY].every(max => {
    const out = attentionOf(threeHot, max)
    const ids = out.items.map(item => item.bot.id)
    return out.items.length + out.overflow === threeHot.length && new Set(ids).size === ids.length
  })
  check(accounted, 'A6 items + overflow === n and no Bot is listed twice, at every budget')

  // ── A7 · an error keeps a seat at the table ──────────────────────────────
  // Three approvals used to push the one failing Bot off the panel entirely:
  // layers 2 and 3 do not take `error`, so it survived only as a number in the
  // header. One slot is reserved for the oldest error whenever there are ≥2 rows.
  const reserved = attentionOf([
    row('a', 'alert', 100), row('b', 'alert', 200), row('c', 'alert', 300), row('d', 'error', 0, 400),
  ], 3)
  check(reserved.items.length === 3 && reserved.overflow === 1,
    `A7 three alerts and one error still show three rows (${reserved.items.length}+${reserved.overflow})`)
  check(reserved.items.some(item => item.scene === 'error'),
    `A7 and the failing Bot is one of them (${reserved.items.map(item => item.scene).join(',')})`)

  // ── A8 · "how long have I been ignoring this" starts at the request ──────
  // The approval's own arrival time, not the turn's start: a 3-second-old
  // approval on a 12-minute turn read as 12m34s, and with no turn running the
  // key was 0 for everyone, which collapsed the ordering rule into roster order.
  // A has the newer turn but the older request, so A must come first.
  {
    const twinBots = [
      { id: 'b-a', name: 'Bot5', sessionId: 'b-a' },
      { id: 'b-b', name: 'Bot6', sessionId: 'b-b' },
    ]
    const clock = 1_700_000_000_000
    const built = buildRows({
      bots: twinBots,
      activity: {}, waiting: {}, questions: {}, errors: [], works: [], rooms: {},
      workBots: { 'b-a': { since: clock - 3_000 }, 'b-b': { since: clock - 600_000 } },
      approvals: [
        { id: 'ap-a', botId: 'b-a', tool: 'Bash', at: clock - 3_600_000 },
        // Upstream omits `at` sometimes; the turn start is then the best we have.
        { id: 'ap-b', botId: 'b-b', tool: 'Read' },
      ],
      t, nameOf: id => twinBots.find(bot => bot.id === id)?.name ?? id, now: clock,
    })
    const rowA = built.find(item => item.bot.id === 'b-a')
    check(rowA.approvalAt === clock - 3_600_000 && rowA.waitSince === rowA.approvalAt,
      'A8 an approval carries its own arrival time, and the wait is measured from it')
    const order = attentionOf(built, 3).items.map(item => item.bot.id)
    check(order[0] === 'b-a',
      `A8 the older request outranks the newer turn (got ${order.join(',')})`)
  }

  // ── B6 · a Bot that handed work to itself is not "waiting on each other" ──
  const selfLoop = topologyOf([
    { id: 'w1', fromId: 'a', toId: 'a', open: 1, at: 1 },
    { id: 'w2', fromId: 'a', toId: 'a', open: 1, at: 2 },
  ])
  const selfEdges = selfLoop.flatMap(group => group.edges)
  check(selfEdges.length === 2, `B6 both self-hand-offs are still edges (${selfEdges.length})`)
  check(selfEdges.every(edge => edge.mutual === false),
    'B6 and neither is mutual — one direction cannot be a cycle, and two a→a records paired with each other printed 互相等 for a Bot waiting on nobody')

  // ── A2 · layering is a view; the rows never reorder ──────────────────────
  // Names are only labels now: identity is `avatar.shape` + `color`, so a fixture
  // of nine arbitrary names is as good as any other.
  const NAMES = ['Chief', 'Bob', 'Bot3', 'Bot4', 'Bot5', 'Bot6', 'Bot7', 'Bot8', 'Bot9']
  const bots = NAMES.map((name, index) => ({ id: `session-${index}`, name, sessionId: `session-${index}` }))
  const nameOf = id => bots.find(bot => bot.id === id)?.name ?? id
  const base = { bots, works: [], rooms: {}, waveMap: {}, noteMap: {}, t, nameOf }
  const scenarios = [
    { activity: {}, workBots: {}, waiting: {}, approvals: [], errors: [], questions: {} },
    { activity: { 'session-0': 'working', 'session-3': 'thinking' }, workBots: { 'session-0': { since: 1 } }, waiting: {}, approvals: [], errors: [], questions: {} },
    { activity: {}, workBots: {}, waiting: { 'session-4': { bots: ['session-0'] } }, approvals: [], errors: [], questions: {} },
    { activity: {}, workBots: {}, waiting: {}, approvals: [{ id: 'a1', botId: 'session-2', tool: 'Bash' }], errors: [], questions: {} },
    { activity: {}, workBots: {}, waiting: {}, approvals: [], errors: [{ botId: 'session-6', at: 1, message: 'boom' }], questions: {} },
    {
      activity: { 'session-1': 'working' }, workBots: {},
      waiting: { 'session-7': { bots: ['session-1'] } },
      approvals: [{ id: 'a2', botId: 'session-5', tool: 'Read' }],
      errors: [{ botId: 'session-8', at: 1, message: 'x' }], questions: {},
    },
  ]
  const rosterNames = NAMES.join(',')
  const sequences = scenarios.map(scene => buildRows({ ...base, ...scene }).map(item => item.bot.name).join(','))
  check(sequences.every(sequence => sequence === rosterNames),
    'A2 buildRows keeps roster order under every status mix (the grid can never move)')
  // The layer split is a filter over that same array, so each band is a
  // subsequence of roster order — that is what keeps 位置记忆 intact.
  const split = buildRows({ ...base, ...scenarios[5] })
  const bands = ['attention', 'running', 'idle'].map(layer => split.filter(item => layerOf(item) === layer))
  const isSubsequence = band => {
    const indexes = band.map(item => split.indexOf(item))
    return indexes.every((value, index) => index === 0 || value > indexes[index - 1])
  }
  check(bands.every(isSubsequence), 'A2 each band is a subsequence of the roster, not a re-sort')
  check(bands[0].length + bands[1].length + bands[2].length === split.length,
    'A2 every Bot lands in exactly one band')
  check(bands[0].every(item => item.scene === 'alert' || item.scene === 'error'),
    'A2 需要你 holds only alert/error')
  check(bands[1].every(item => ['busy', 'waiting', 'done'].includes(item.scene)),
    'A2 在动 holds busy ∪ waiting ∪ done — a waiting Bot is neither running nor free')
  check(bands[2].every(item => item.scene === 'idle'), 'A2 闲着 holds only idle')

  // ── B7 · a second Bot cannot impersonate the first ───────────────────────
  // `bot.name` is upstream free text and is not identity any more, so two Bots
  // with one name are two hashed looks — never one drawing copied twice. That is
  // the v0.4.2 finding #12 shape (two identical dumplings, one working and one
  // failing) and it stays impossible.
  {
    const twins = [{ id: 'b1', name: 'Chief' }, { id: 'b2', name: 'Chief' }]
    const twinRows = buildRows({ ...base, bots: twins })
    const key = seat => `${seat.shape}|${seat.color}|${seat.prop}`
    check(twinRows.length === 2 && key(twinRows[0].seat) !== key(twinRows[1].seat),
      `B7 two Bots sharing a name still get two looks (${key(twinRows[0].seat)} vs ${key(twinRows[1].seat)})`)
  }

  // ── B1/B2/B3 · the hand-off edge table ───────────────────────────────────
  const works = [
    { id: 'w1', fromId: 'chief', from: 'Bot3', toId: 'math', to: 'Bot4', open: 4, at: 1000 },
    { id: 'w2', fromId: 'chief', from: 'Bot3', toId: 'phy', to: 'Bot5', open: 3, at: 2000 },
    { id: 'w3', fromId: 'math', from: 'Bot4', toId: 'chief', to: 'Bot3', open: 3, at: 3000 },
    { id: 'w4', fromId: 'bio', from: 'Bot7', toId: 'cn', to: 'Bot8', open: 0, at: 4000 },
  ]
  const groups = topologyOf(works)
  check(groups.reduce((sum, group) => sum + group.edges.length, 0) === works.filter(work => work.open > 0).length,
    'B1 one edge per work with open > 0 (the closed record is not an edge)')
  check(groups.every(group => group.total === group.edges.reduce((sum, edge) => sum + edge.open, 0)),
    'B1 each 共 N 项 is the sum of its own edges')
  check(groups.reduce((sum, group) => sum + group.total, 0) === works.reduce((sum, work) => sum + work.open, 0),
    'B1 the totals add up to the open items on the board')
  check(groups[0].fromId === 'chief' && groups[0].total === 7,
    `B1 the biggest sender is the bottleneck and comes first (${groups[0].from}/${groups[0].total})`)
  const mutuals = groups.flatMap(group => group.edges).filter(edge => edge.mutual)
  check(mutuals.length === 2, `B2 A→B and B→A are both recognised as mutual (${mutuals.length})`)
  check(new Set(mutuals.map(edge => edge.pair)).size === 1, 'B2 the pair is named identically on both sides')
  check(mutuals.every(edge => edge.open === (edge.fromId === 'chief' ? 4 : 3)),
    'B2 each side keeps its own count, so neither 共 N 项 lies')
  check(mutuals.every(edge => groups.find(group => group.fromId === edge.fromId).edges.includes(edge)),
    'B2 each mutual edge stays in its own sender group')
  check(topologyOf([{ id: 'z', fromId: 'a', toId: 'b', open: 0, at: 1 }]).length === 0,
    'B3 nothing open means no table at all (not an empty shell)')
  check(topologyOf([]).length === 0 && topologyOf(null).length === 0, 'B3 no works means no table')

  // ── A5 · 闲着 keeps roster order, and never loses a badge ────────────────
  const idleRows = NAMES.map((name, index) => ({ bot: { id: `session-${index}`, name }, badge: false }))
  const fits = idleLine(idleRows)
  check(fits.items.map(item => item.bot.name).join(',') === rosterNames,
    'A5 nine names fit the 400px line without reordering')
  check(fits.overflow === 0, 'A5 nothing overflows at nine short names')
  const badged = idleRows.map(item => ({ ...item, badge: true }))
  const squeezed = idleLine(badged)
  check(squeezed.items.every(item => item.badge === true),
    'A5 when the line is too tight, unbadged names go first — the badge never does')
  const mixed = idleRows.map((item, index) => ({ ...item, badge: index === 8 }))
  const trimmed = idleLine(mixed, 200)
  check(trimmed.items.some(item => item.bot.name === NAMES[8]),
    'A5 a badge at the tail survives a trim that removes everything else after it')
  check(trimmed.items.length + trimmed.overflow === mixed.length,
    'A5 the trim is counted, not silent')
  check(trimmed.items.map(item => item.bot.name).join(',') ===
      mixed.filter(item => trimmed.items.includes(item)).map(item => item.bot.name).join(','),
    'A5 the surviving names keep roster order')
  check(idleLine(idleRows, Number.POSITIVE_INFINITY).overflow === 0,
    'A5 an unbounded budget keeps every name — that is the +N reveal path')

  // ── A5b · the width budget has to include the box, not just the glyphs ───
  // The bug this pins down: the estimate counted glyphs plus one trailing gap the
  // line never occupies, and skipped the per-name `padding:1px 2px` and the `+N`
  // chip. Nine three-character names "fit" at 379px while actually taking 409px,
  // and `.bb-idle` is `overflow:hidden` — so the ninth name was sliced off with
  // no ellipsis. At four characters the thing sliced off was the `+N` itself, the
  // only control that could have revealed the hidden names. 398 is the real
  // usable width at SIZE_MIN.w (420 − 2 border − 20 padding).
  {
    const tri = ['前端组', '后端组', '测试组', '设计组', '运营组', '数据组', '算法组', '架构组', '安全组']
    const triRows = tri.map((name, index) => ({ bot: { id: `session-${index}`, name }, badge: false }))
    const tight = idleLine(triRows, 398)
    check(tight.overflow > 0,
      `A5b nine three-character names do not fit 398px, so the line trims instead of clipping (${tight.items.length}+${tight.overflow})`)
    check(tight.items.length + tight.overflow === tri.length,
      'A5b and every trimmed name is counted')
    // With the chip charged for, the visible names must leave room for it.
    check(tight.items.length < tri.length,
      'A5b the trim leaves room for the +N chip that reveals the rest')
    const triBadged = triRows.map((row, index) => ({ ...row, badge: index >= 6 }))
    const keep = idleLine(triBadged, 398)
    check(keep.items.filter(row => row.badge).length === 3,
      'A5b badges survive even at the tightest budget')
    check(idleLine(triRows, Number.POSITIVE_INFINITY).items.length === 9,
      'A5b and the +N reveal path still shows all nine')

    // CJK Extension B (U+20000+) is CJK width. The regex used to stop at U+9FFF,
    // so three such characters estimated 279px while really taking 409px: the
    // line kept all nine names, reported overflow 0, drew no +N and clipped the
    // tail. Pinned as an equivalence, not as `=== 11` — the exact number is the
    // estimator's business, being CJK-wide is the requirement.
    check(nameWidth('𠀀') === nameWidth('前'),
      'a CJK Extension B glyph is estimated at CJK width, like a basic-plane one')
    // The DEFAULT budget has to bind, not just the 398 the test passes by hand:
    // this is the assertion that makes `IDLE_BUDGET = 600` impossible to ship.
    const byDefault = idleLine(triRows)
    check(byDefault.items.length < tri.length,
      `the default budget trims nine three-character names instead of clipping them (${byDefault.items.length}+${byDefault.overflow})`)
    check(byDefault.items.length + byDefault.overflow === tri.length,
      'A5b and every name the default budget dropped is counted')
    // Where 380 comes from, term by term: the usable width at the smallest panel
    // minus the estimator's own slack. A bare 380 had no upper bound at all, so
    // raising it to 600 stayed green and re-opened the clipping bug.
    check(IDLE_BUDGET <= IDLE_USABLE,
      `the budget cannot exceed the usable line at the smallest panel (${IDLE_BUDGET} ≤ ${IDLE_USABLE})`)
    check(IDLE_BUDGET === IDLE_USABLE - IDLE_SLOP && IDLE_SLOP === 18,
      `and it is exactly usable minus the slack (${IDLE_USABLE} - ${IDLE_SLOP} = ${IDLE_BUDGET})`)
  }

  // ── C4a/b/c · height budgets (budget, not a measurement) ─────────────────
  // The check harness has no layout engine, so "fits without scrolling" is
  // asserted as arithmetic over the constants the CSS is written against. The
  // requirement's original single inequality (head + 3 rows + 2 cells ≤ 320) is
  // unsatisfiable — it needs a 61px cell, i.e. a 1.87px lamp — so it is replaced
  // by the three scenarios that actually occur.
  //
  // v0.4.1: every term is counted now, including the three v0.4.0 omitted — the
  // grid gap, `.bb-run`'s bottom padding, and the panel's own 2px border. The
  // last one is why the budget said 269px of room while the browser gave 267px.
  // C4c computes in fractions (cellHeight()) rather than from a rounded-up
  // constant, so a 0.9px overflow cannot hide behind an integer.
  const cell = cellHeight()
  const c4a = PANEL_BORDER + HEAD_H + 3 * ATTENTION_ROW_H + 2 * ATTENTION_GAP + ATTENTION_PAD_V
    + IDLE_ROW_H + RUNNING_MIN_H
  check(c4a <= 320, `C4a worst case: 3 need-you + the visible floor of 在动 + 闲着 = ${c4a} ≤ 320 (预算，非实测)`)
  const c4b = PANEL_BORDER + HEAD_H + 2 * ATTENTION_ROW_H + ATTENTION_GAP + ATTENTION_PAD_V
    + RUNNING_CELL_H + RUN_PAD_B + IDLE_ROW_H
  check(c4b <= 320, `C4b common case: 2 need-you + one full row of workstations + 闲着 = ${c4b} ≤ 320 (预算，非实测)`)
  const c4c = PANEL_BORDER + HEAD_H + 3 * ATTENTION_ROW_H + 2 * ATTENTION_GAP + ATTENTION_PAD_V
    + 2 * cell + RUN_GRID_GAP + RUN_PAD_B + IDLE_ROW_H
  check(c4c <= 480,
    `C4c default 560×480: 3 need-you + six running (2 rows + gap + padding) + 闲着 = ${c4c.toFixed(2)} ≤ 480 (预算，非实测)`)
  // The declared cell height has to cover the drawing. Without this, someone could
  // shrink RUNNING_CELL_H alone and leave C4c green while the name row got clipped.
  const sceneH = Math.ceil(RUNNING_CELL_W * SCENE_VB.h / SCENE_VB.w)
  check(RUNNING_CELL_H >= sceneH + 20,
    `C4 the cell height covers the ${SCENE_VB.h}:${SCENE_VB.w} scene plus a 20px name row (${RUNNING_CELL_H} ≥ ${sceneH + 20})`)
  check(RUNNING_CELL_H >= cell,
    `C4 the declared cell height is not an underestimate of the rendered one (${RUNNING_CELL_H} ≥ ${cell.toFixed(2)})`)
  // The ratio used to be hand-copied into station.js, const.js and this file, so
  // changing only the drawing left every budget green while the panel really
  // scrolled 45px. RUNNING_CELL_H was a typed 128; it is now derived, and the
  // second assertion pins `cellHeight` to SCENE_VB instead of to 132/170.
  check(RUNNING_CELL_H === Math.ceil(cellHeight()),
    `RUNNING_CELL_H is derived, not typed (${RUNNING_CELL_H} === ceil(${cellHeight().toFixed(2)}))`)
  check(cellHeight(SCENE_VB.w) === SCENE_VB.h + 20,
    `cellHeight divides by SCENE_VB, so the aspect ratio exists once (${cellHeight(SCENE_VB.w)} === ${SCENE_VB.h} + 20)`)

  check(LAYER_STABLE_MS < POLL_MS,
    `C4 the layer window (${LAYER_STABLE_MS}ms) is shorter than a poll (${POLL_MS}ms), so a real transition still lands`)
  // The overflow chip lives inside the last row, so revealing Bot4..N costs no
  // height. That is what makes C4a survive a 4th (or 9th) item needing you.
  check(18 < ATTENTION_ROW_H,
    'C4d the overflow chip fits inside a 44px row, so overflow costs zero height')
}

// ------------------------------------------------------------- poll loop --
section('poll loop: single flight')
{
  const { createPollLoop, pollDelay } = await import(new URL('../src/client/pollLoop.js', import.meta.url).href)

  const flush = async () => { for (let i = 0; i < 4; i += 1) await new Promise(resolve => setTimeout(resolve, 0)) }
  const fakeClock = () => {
    let next = 1
    const jobs = new Map()
    const delays = []
    return {
      setTimeout: (fn, ms) => { delays.push(ms); const id = next; next += 1; jobs.set(id, fn); return id },
      clearTimeout: id => { jobs.delete(id) },
      pending: () => jobs.size,
      delays,
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

  // The live interval is a property of what the board is showing, so it arrives as
  // a function and must be re-read on every arm — not captured once at creation.
  const dynClock = fakeClock()
  let dynBase = 1000
  const dynamic = createPollLoop({
    base: () => dynBase, timers: dynClock,
    isActive: () => true, isHidden: () => false,
    run: async () => 1, onValue: () => {}, onError: () => {},
  })
  dynamic.start()
  await flush()
  check(dynClock.delays.at(-1) === 1000, 'a function base is read when the loop arms')
  dynBase = 6000
  dynamic.wake()
  await flush()
  check(dynClock.delays.at(-1) === 6000, 'and it is re-read once the interval changes')
  dynamic.stop()
}

// ------------------------------------------------------------- cadence --
section('cadence: an idle team is asked less often')
{
  const { liveCadence, teamActive } = await import(new URL('../src/client/cadence.js', import.meta.url).href)
  const { ACTIVE_TAIL_MS, IDLE_POLL_MS, POLL_MS } = await import(new URL('../src/client/const.js', import.meta.url).href)

  check(teamActive(null) === false, 'no snapshot yet is not active')
  check(teamActive({ activity: { a: 'idle' } }) === false, 'a team where everyone is idle is not active')
  check(teamActive({ activity: { a: 'working' } }) === true, 'a working Bot makes the team active')
  check(teamActive({ activity: { a: 'idle', b: 'searching' } }) === true, 'one moving Bot is enough')
  check(teamActive({ activity: {}, work: { approvals: [{ id: 'x' }] } }) === true,
    'a pending approval counts as active (the card must turn yellow at once)')
  check(teamActive({ activity: {}, work: { waiting: { b: {} } } }) === true, 'a hand-off wait counts as active')
  check(teamActive({ activity: {}, work: { bots: { b: { since: 1 } } } }) === true,
    'a turn that started before activity caught up counts as active')

  const now = 1_000_000_000
  check(liveCadence({ active: true, lastActiveAt: 0, now }) === POLL_MS, 'an active team polls at the base interval')
  check(liveCadence({ active: false, lastActiveAt: now - 10_000, now }) === POLL_MS,
    'the tail of a turn still polls fast, so its end is not missed')
  check(liveCadence({ active: false, lastActiveAt: now - ACTIVE_TAIL_MS - 1, now }) === IDLE_POLL_MS,
    'a team that has been quiet for longer backs off')
  check(liveCadence({ active: false, lastActiveAt: 0, now }) === IDLE_POLL_MS,
    'a board that never saw activity starts out slow')
  check(IDLE_POLL_MS > POLL_MS, 'backing off means a longer interval, not a shorter one')
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
  // The banner is the only place that answers "was this artifact built from this
  // source?" by reading the artifact alone. Nothing used to read it: the
  // `// version:` line could be rewritten to 0.0.0-stale with every check green,
  // because only `npm run verify` looked, and `npm run check` does not run it.
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const banner = source.slice(0, 2000)
  check(banner.includes('// src: '), 'the banner carries a src fingerprint a check can read')
  check(banner.includes(`// version: ${pkg.version}`),
    `and the version is the one in package.json (${pkg.version})`)
  // A read-only board must not send `locale`: ds-bot stores it in a process-wide
  // uiLocale that decides the language of new Bot greetings and memory.
  check(!/locale:\s*['"]zh-CN['"]/.test(source), 'never sends a locale to ds-bot')
  check(!/dangerouslySetInnerHTML/.test(source), 'no dangerouslySetInnerHTML')
}

// ------------------------------------------------------------------- css --
section('css')
{
  const { CSS } = await import(new URL('../src/client/style.js', import.meta.url).href)
  const {
    ATTENTION_ROW_H, ATTENTION_PAD_V, IDLE_ROW_H, RUNNING_CELL_W, RUN_GRID_GAP, RUN_PAD_B,
  } = await import(new URL('../src/client/const.js', import.meta.url).href)

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
  // Every control is reachable by Tab; without a ring you cannot see where you are.
  check(/\.bb-station:focus-visible/.test(CSS), 'a workstation has a visible focus ring')
  check(/\.bb-handoff:focus-visible/.test(CSS), 'the hand-off strip has a visible focus ring')
  check(/\.bb-btn:focus-visible/.test(CSS), 'the drawer buttons have a visible focus ring')
  check(/\.bb-pill:focus-visible/.test(CSS), 'the collapsed pill has a visible focus ring')

  const reduceAt = CSS.lastIndexOf('@media (prefers-reduced-motion:reduce)')
  check(reduceAt > CSS.lastIndexOf('@keyframes'), 'reduced-motion block comes after every keyframe')
  check(reduceAt > CSS.lastIndexOf('animation:bb-'), 'reduced-motion block comes after every animation rule')
  check(CSS.slice(reduceAt).includes('animation:none'), 'reduced-motion block disables the animations')

  // C5: the block is still the last thing in the sheet, and the new layers did
  // not smuggle in an animation. Both are structural: a rule appended after the
  // block would escape the override silently, and a tenth keyframe would be a
  // decoration nobody budgeted a repaint for.
  const blockEnd = (() => {
    const open = CSS.indexOf('{', reduceAt)
    let depth = 0
    for (let i = open; i < CSS.length; i += 1) {
      if (CSS[i] === '{') depth += 1
      else if (CSS[i] === '}') { depth -= 1; if (depth === 0) return i }
    }
    return -1
  })()
  check(blockEnd > reduceAt && CSS.slice(blockEnd + 1).trim() === '',
    'C5 the reduced-motion block is the final rule in the sheet')
  const keyframes = [...CSS.matchAll(/@keyframes\s+([\w-]+)/g)].map(match => match[1])
  check(JSON.stringify(keyframes) === JSON.stringify(['bb-breathe', 'bb-blink', 'bb-tap', 'bb-wave', 'bb-note', 'bb-pulse']),
    `C5 no new keyframes were introduced (${keyframes.join(',')})`)
  // Every class that carries an animation must still be cancelled by the block.
  const cancelled = CSS.slice(reduceAt)
  const MOTION_OWNERS = ['bb-pulse', 'bb-blob', 'bb-eyes', 'bb-tap', 'bb-wave', 'bb-note']
  check(MOTION_OWNERS.every(owner => cancelled.includes(`.${owner}`)),
    'C5 the block still cancels every animated class')

  // E2: the two new clickable layers are in the focus-ring selector list, not
  // beside it. A keyboard user has to be able to see where they are.
  const ring = CSS.match(/[^{}]*:focus-visible[^{]*\{[^}]*outline:2px solid #378ADD[^}]*\}/)?.[0] ?? ''
  for (const name of ['bb-pill', 'bb-icon', 'bb-btn', 'bb-handoff', 'bb-station', 'bb-attention-row', 'bb-idle-name', 'bb-idle-more', 'bb-att-more']) {
    check(ring.includes(`.${name}:focus-visible`), `E2 ${name} is in the focus-ring selector list`)
  }

  // ── §11 · the five "do not" rules that used to be unguarded ───────────────
  // The height budget was "constant against constant": the CSS was joined to it
  // by a comment only, so `.bb-attention-row{40px}` left C4a green and lying. The
  // three numbers the budget depends on are now interpolated from const.js, and
  // these assertions read the generated CSS back. They are cheap; without them
  // every one of these five edits passes `npm run check`.
  check(!/position:sticky/.test(CSS), '§11.5 no position:sticky (it dies silently inside overflow:hidden)')
  const handoffsRule = CSS.match(/\.bb-handoffs\{[^}]*\}/)?.[0] ?? ''
  check(handoffsRule.length > 0 && !/max-height/.test(handoffsRule) && !/overflow/.test(handoffsRule),
    '§11.6 .bb-handoffs adds no second scroll area (one scroll container, in .bb-run)')
  check(/\.bb-att-avatar \.bb-blob[^{]*\{animation:none\}/.test(CSS),
    '§11.14 the layer-1 avatar does not breathe or blink')
  check(new RegExp(`\\.bb-idle\\{[^}]*height:${IDLE_ROW_H}px`).test(CSS) && !/\.bb-idle\{[^}]*flex-wrap/.test(CSS),
    '§11.15 layer 3 is one fixed line and never wraps by default')
  check(!/\.bb-idle-name\{[^}]*color:#(?!5F594D)/.test(CSS),
    '§11.18 layer 3 has no per-state colour (the badge is the only mark)')

  // Every height in the C4 budget is border-box. Without this rule `.bb-idle`
  // would be 25px (24 + its 1px border) and `.bb-panel` 562px, so the whole
  // budget would be silently wrong. Nothing else in this file depends on it
  // being present, which is exactly why it needs an assertion.
  check(/\.bb-wrap \*\{box-sizing:border-box\}/.test(CSS),
    'the box model the C4 budget assumes is declared (.bb-wrap *{box-sizing:border-box})')

  // ── the constants really are the CSS ─────────────────────────────────────
  // Interpolation makes these tautological today; the point is to fail the day
  // somebody replaces `${ATTENTION_ROW_H}px` with a literal.
  check(new RegExp(`\\.bb-attention-row\\{[^}]*height:${ATTENTION_ROW_H}px`).test(CSS),
    `§11.4 .bb-attention-row height is ATTENTION_ROW_H (${ATTENTION_ROW_H}px), not a literal`)
  check(new RegExp(`\\.bb-run-grid\\{[^}]*auto-fit,${RUNNING_CELL_W}px`).test(CSS),
    `the grid track is RUNNING_CELL_W (${RUNNING_CELL_W}px)`)
  check(new RegExp(`\\.bb-run-grid\\{[^}]*gap:${RUN_GRID_GAP}px`).test(CSS),
    `the grid gap is RUN_GRID_GAP (${RUN_GRID_GAP}px) — it was missing from C4c until v0.4.1`)
  check(new RegExp(`\\.bb-run\\{[^}]*padding:0 10px ${RUN_PAD_B}px`).test(CSS),
    `the .bb-run bottom padding is RUN_PAD_B (${RUN_PAD_B}px) — also missing from C4c until v0.4.1`)
  const padMatch = /\.bb-attention\{[^}]*padding:(\d+)px 10px (\d+)px/.exec(CSS)
  const padV = Number(padMatch?.[1] ?? 0) + Number(padMatch?.[2] ?? 0)
  check(padV === ATTENTION_PAD_V,
    `the .bb-attention vertical padding sums to ATTENTION_PAD_V (${padV} === ${ATTENTION_PAD_V})`)
}

// ---------------------------------------------------------------- locale --
section('locale')
{
  const { zh, en } = await import(new URL('../src/client/locale.js', import.meta.url).href)
  const zhKeys = Object.keys(zh).sort()
  const enKeys = Object.keys(en).sort()
  check(zhKeys.length > 20, `dictionary has a real key set (${zhKeys.length})`)
  check(JSON.stringify(zhKeys) === JSON.stringify(enKeys), 'zh and en cover exactly the same keys')

  // D3: the v0.4.0 layers added copy in both languages. Parity above catches a
  // one-sided addition; this catches a key that was renamed on both sides and
  // therefore silently stopped being translated.
  const NEW_KEYS = [
    'legend.help', 'legend.hint.busy', 'legend.hint.alert', 'legend.hint.waiting',
    'legend.hint.error', 'legend.hint.idle', 'legend.hint.done',
    'attention.empty', 'attention.overflow', 'attention.collapse', 'layer.idle',
    'ho.groupTotal', 'ho.blocked', 'ho.notStarted', 'ho.mutual',
    'ho.morePeople', 'ho.moreItems', 'panel.sumHandoff',
  ]
  const missing = NEW_KEYS.filter(key => !(key in zh) || !(key in en))
  check(missing.length === 0, `D3 all ${NEW_KEYS.length} new keys exist in both languages${missing.length ? ` (missing ${missing.join(',')})` : ''}`)
  check(NEW_KEYS.every(key => typeof zh[key] === 'string' && typeof en[key] === 'string'
      && zh[key].length > 0 && en[key].length > 0),
    'D3 no new key is an empty string')
  // Placeholders must match across languages, or one side prints {n} literally.
  check(NEW_KEYS.filter(key => zh[key].includes('{n}')).length ===
      NEW_KEYS.filter(key => en[key].includes('{n}')).length,
    'D3 {n} placeholders appear on both sides of every key that has one')
}

if (failed) {
  console.error(`\nsmoke FAILED: ${failed} assertion(s)`)
  process.exit(1)
}
console.log('\nsmoke OK')
