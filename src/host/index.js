// dsh-bot-board — host half.
// Reads DS Bot's own state file and serves a small read-only snapshot on the
// shared /api channel: the hand-offs between Bots, plus the failures DSH reports.
// Live status (who is running, which tool) comes from DS Bot's own api/bot, which
// the browser half polls directly.
import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export const name = 'dsh-bot-board'
export const inject = ['connection']

// DS Bot resolves its data folder in two steps: expand `~`/relative DSH_HOME and
// resolve it, then take `bot` under that — unless `config.home` moved the folder.
// The board has to take the same two steps. Reading `$DSH_HOME/bot` literally was
// wrong twice over: `DSH_HOME=~/data` never expanded, and anyone who moved the
// folder in DS Bot's own config got a board that says "no state file" forever.
const expandHome = value => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''
  if (text === '~') return homedir()
  if (text.startsWith('~/') || text.startsWith('~\\')) return join(homedir(), text.slice(2))
  return text
}

// `config.home` is the folder that holds state.json, exactly like DS Bot's own
// `bot.home`. Unset means `$DSH_HOME/bot`, which is where DS Bot puts it too.
export const statePathOf = config => {
  const configured = expandHome(config?.home)
  if (configured) return join(resolve(configured), 'state.json')
  const dshHome = expandHome(process.env.DSH_HOME) || join(homedir(), '.dsh')
  return join(resolve(dshHome), 'bot', 'state.json')
}

const ROUTE = '/api/bot-board'
export const FAILURE_TTL = 15 * 60 * 1000
const FAILURE_MAX = 256
export const WORKS_MAX = 24
// `works` and `failures` were bounded from the start; `bots` and `rooms` were not.
// A single state.json is another process's file and may be arbitrarily large, and
// every entry here is copied into the snapshot the browser polls for. 64 is well
// past the nine-Bot roster this panel is designed for and still bounds the payload.
export const BOTS_MAX = 64
export const ROOMS_MAX = 64
// The browser half polls every 5000 ms (BOARD_MS). Three missed reads in a row is
// no longer a blip — it means state.json stopped being written — so anything older
// than 3x that is reported as stale. Spelled out rather than imported: the host
// bundle and the browser bundle share no modules.
export const READ_STALE_MS = 15000

// `\s` covers neither the C0/C1 control range nor the invisible/bidi marks, so
// `replace(/\s+/g, ' ')` alone let ESC, NUL, U+202E and U+200B reach the board —
// and this board is read at a glance. U+202E reverses the rest of the string
// ("正常\u202Eelbuod" renders backwards), and U+200B makes "Chief" and "Chief\u200B"
// look like two different Bots sitting side by side. Both are visual deception in
// a tool people watch for anomalies, so they are removed, not escaped.
// Tab/LF/VT/FF/CR are deliberately left out of the class: they are whitespace and
// must keep collapsing to a single space, or "a\nb" would fuse into "ab".
const INVISIBLE = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g
const text = value => (typeof value === 'string'
  ? value.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim()
  : '')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
// Every non-ok path goes through this so the browser half always has `ok:false`
// plus a `reason` to name. A bare `{}` (or a 500 with no body) leaves it unable to
// tell "the state file is unreadable" from "there are no Bots yet". `readAt: 0`
// means no successful read ever happened — distinct from a read that is merely old.
const blank = (reason, stale = false) => ({
  ok: false, reason, stale, readAt: 0, bots: [], works: [], errors: [], updatedAt: Date.now(),
})
// Staleness is a property of the last successful read, not of the last response:
// ds-bot can stay alive and keep answering api/bot while it stops writing
// state.json, and that is exactly the case a "generated just now" timestamp hides.
const readIsStale = readAt => readAt > 0 && Date.now() - readAt > READ_STALE_MS

export function apply(ctx, config = {}) {
  const warn = (message, ...args) => {
    try { ctx.logger?.warn?.(message, ...args) } catch {}
  }
  const statePath = statePathOf(config)

  // `readAt` rides along with the cache: a cache hit means the file did not change,
  // which is precisely when the age of the last real read must be preserved rather
  // than refreshed.
  let cache = { key: '', data: null, owners: null, readAt: 0 }

  // Bot turns that failed at a step or turn boundary. DSH emits this for every
  // agent; a Session id is mapped back to its Bot when a snapshot is served.
  // 注入始终回调、由 store 判定: the listener is registered before any service
  // check, so hooking never waits on connection readiness — the callback only
  // records into the failures store, and errorsFrom() judges at read time.
  const failures = new Map()
  const onAgentError = payload => {
    const sessionId = payload?.agent?.session?.id ?? payload?.agent?.id
    if (typeof sessionId !== 'string') return
    const error = payload?.error
    const raw = typeof error?.message === 'string' ? error.message : String(error ?? 'error')
    // The failure channel is the one text a model or a tool wrote, and it is the
    // loudest signal on the board (red lamp, one line, a system notification).
    // Sanitising Bot names but not this was backwards: a name is chosen once and
    // changes rarely, while an error message is arbitrary prose. `text()` also
    // strips ANSI escapes, which would otherwise paint the drawer.
    failures.set(sessionId, { at: Date.now(), message: text(raw).slice(0, 200) || 'error' })
    // A long-lived client must not grow this store without bound. Evict the oldest
    // by `at`, not by insertion order: re-setting a key does not move it in a Map,
    // so a Bot that keeps failing would keep its original position and be dropped
    // before a one-off failure from long ago.
    if (failures.size > FAILURE_MAX) {
      let oldestKey
      let oldestAt = Infinity
      for (const [key, value] of failures) {
        if (value.at < oldestAt) { oldestAt = value.at; oldestKey = key }
      }
      if (oldestKey !== undefined) failures.delete(oldestKey)
    }
  }
  // Registered inside an effect so a plugin reload does not stack listeners (and
  // therefore a second failures store) on the same context.
  ctx.effect?.(() => {
    const off = ctx.on?.('agent/error', onAgentError)
    return () => { if (typeof off === 'function') off() }
  }, 'bot-board: failure worker')

  // Map recent failures onto Bots using whichever ownership map a snapshot built.
  const errorsFrom = owners => {
    const now = Date.now()
    const list = []
    for (const [sessionId, failure] of failures) {
      if (now - failure.at > FAILURE_TTL) {
        failures.delete(sessionId)
        continue
      }
      const botId = owners.get(sessionId)
      if (botId === undefined) continue
      list.push({ botId, sessionId, at: failure.at, message: failure.message })
    }
    return list
  }

  // ds-bot writes state.json non-atomically, so a read can land mid-write. One
  // short retry keeps that from being reported as "the file is unreadable".
  async function readState() {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return { state: JSON.parse(await readFile(statePath, 'utf8')) }
      } catch (error) {
        if (error?.code === 'ENOENT') return { missing: true }
        if (attempt === 0) await sleep(12)
      }
    }
    return { broken: true }
  }

  function ownersOf(bots, rooms) {
    // Which Bot owns a Session: its own chat (the current part, its id, and the
    // parts it has already ended) or a member's hidden group Session.
    // `segments` gets an Array.isArray guard rather than `?? []`: a non-array value
    // is not iterable, so `for...of` throws — and this is the same chain as bots and
    // rooms, where any throw here skips the cache write at the end of snapshot() and
    // the board never heals.
    const ownerOf = new Map()
    for (const bot of bots) {
      ownerOf.set(bot.id, bot.id)
      // The current part is not in segments[] until it ends — without this a Bot
      // that rolled over a part loses every failure raised in the new session.
      if (bot.sessionId) ownerOf.set(bot.sessionId, bot.id)
      for (const segment of Array.isArray(bot.segments) ? bot.segments : []) {
        if (segment?.sessionId) ownerOf.set(segment.sessionId, bot.id)
      }
    }
    // Group Sessions are only used for ownership here; the board no longer shows
    // group chat, so no room payload is built. room.segments is keyed by bot id.
    for (const room of rooms) {
      for (const [botId, sessionId] of Object.entries(room.sessions ?? {})) {
        if (sessionId) ownerOf.set(sessionId, botId)
      }
      for (const [botId, segments] of Object.entries(room.segments ?? {})) {
        for (const segment of Array.isArray(segments) ? segments : []) {
          if (segment?.sessionId) ownerOf.set(segment.sessionId, botId)
        }
      }
    }
    return ownerOf
  }

  async function snapshot() {
    let info
    try {
      info = await stat(statePath)
    } catch {
      return blank('no-state')
    }
    // mtime alone misses two writes landing inside one millisecond; the size
    // disambiguates that case cheaply.
    const key = `${info.mtimeMs}:${info.size}`
    if (cache.data && cache.key === key && cache.owners) {
      // `readAt` is deliberately NOT refreshed here: the file is unchanged, so the
      // last real read is as old as it was, and that is the signal the board needs.
      return { ...cache.data, errors: errorsFrom(cache.owners), updatedAt: Date.now(), stale: readIsStale(cache.readAt) }
    }

    const read = await readState()
    if (read.missing) return blank('no-state')
    if (read.broken) {
      warn('bot-board: state.json unreadable; serving %s', cache.data ? 'the last snapshot' : 'nothing')
      // `stale: true` here regardless of readAt: an unreadable file right now is a
      // definite staleness, and the readAt rule would under-report it for the first
      // 15 s after a good read.
      return cache.data
        ? { ...cache.data, errors: errorsFrom(cache.owners), updatedAt: Date.now(), stale: true }
        : blank('unreadable', true)
    }
    // The moment the file was read and parsed. This — not the response time — is
    // what the board reports as `readAt`.
    const readAt = Date.now()

    const state = read.state ?? {}
    const bots = Object.values(state.bots ?? {})
    const rooms = Object.values(state.rooms ?? {})
    // `bots` is another process's file content, not a value this code built: one
    // null in the map used to throw on the first `bot.id`, and since the cache is
    // assigned at the end of this function, the throw skipped the write — so the
    // board never healed and every poll failed the same way. Drop only entries that
    // cannot be a Bot; a real Bot with odd fields still renders.
    const safeBots = (Array.isArray(bots) ? bots : [])
      .filter(bot => bot !== null && typeof bot === 'object' && bot.id !== undefined)
    // Same family of hazard, same consequence: a null room throws on `room.id`
    // (and on `room.sessions` before the `?? {}` can apply) and takes the cache
    // write down with it. Rooms without an id are kept on purpose — their session
    // map still tells which Bot owns a failing session, and the name-only map
    // drops them by id anyway.
    const safeRooms = (Array.isArray(rooms) ? rooms : [])
      .filter(room => room !== null && typeof room === 'object')
    const nameOf = id => safeBots.find(bot => bot.id === id)?.name ?? null

    const owners = ownersOf(safeBots, safeRooms)
    // `work.from/to` is usually a bot id, but a Bot that rolled over a part hands
    // work over as its current session id. Resolve through the ownership map so
    // the card never shows a raw session id and the click-through still matches.
    //
    // Non-strings resolve to null rather than falling through: this file belongs
    // to another process, and an object here used to reach React as a child node
    // ("Objects are not valid as a React child") and blank the whole panel. A
    // missing owner is a missing name; it must not become a crash.
    const botOf = id => (typeof id === 'string' ? owners.get(id) ?? id : null)
    // Output caps. Ownership is built from the full lists (so a failure on the
    // 100th Bot still maps), but only the first N Bots/rooms reach the browser.
    const cappedBots = safeBots.slice(0, BOTS_MAX)
    const cappedRooms = safeRooms.slice(0, ROOMS_MAX)

    const listed = Object.entries(state.works ?? {})
      // Same chain as bots, rooms and segments: a null record threw on
      // `work.results` and took the cache write with it, so the board stayed dead
      // on every poll instead of dropping one bad row.
      .filter(([, work]) => work !== null && typeof work === 'object')
      .map(([workId, work]) => {
        const results = Array.isArray(work.results) ? work.results : []
        return {
          id: workId,
          fromId: work.from ? botOf(work.from) : null,
          toId: work.to ? botOf(work.to) : null,
          // The fallback is `text()`, not the raw value: `work.from` can be any
          // JSON type, and `from` is rendered as a string on the hand-off card.
          from: nameOf(botOf(work.from)) ?? text(work.from).slice(0, 40),
          to: nameOf(botOf(work.to)) ?? text(work.to).slice(0, 40),
          at: Number(work.at) || 0,
          open: Array.isArray(work.open) ? work.open.length : 0,
          done: results.length,
          last: text(results.at(-1)?.text).slice(0, 240) || null,
          // results[] holds one entry per Bot that handed something back, each
          // tagged with that Bot's name. `last` is whoever finished last, which is
          // not necessarily the Bot whose card is being read, so send the names.
          results: results.slice(-6).map(result => ({
            name: text(result?.name).slice(0, 40),
            text: text(result?.text).slice(0, 240),
          })),
        }
      })
      .sort((a, b) => b.at - a.at)
    const openWorks = listed.filter(work => work.open > 0)
    // The strip only ever lists works with open items, so an old-but-still-open
    // hand-off must never be cut in favour of a newer closed record. That intent
    // used to be written as `Math.max(WORKS_MAX, openWorks.length)`, which made the
    // cap a no-op in exactly the case it exists for: 5000 open works went out as a
    // 3 MB payload every poll. Cap the open ones too, then let closed ones fill up
    // to the same limit.
    const works = [
      ...openWorks.slice(0, WORKS_MAX),
      ...listed.filter(work => work.open === 0),
    ].slice(0, WORKS_MAX)

    const data = {
      ok: true,
      // Two timestamps on purpose: `updatedAt` is when this snapshot was built,
      // `readAt` is when state.json was last actually read. They diverge on a cache
      // hit, and only the second one can show that the writer went quiet.
      updatedAt: Date.now(),
      readAt,
      // DS Bot stamps its own data format version on state.json (1 today). The
      // board reads that file directly, so this is the only version contract it
      // can actually check — and a mismatch has to be *said out loud*, because
      // the failure mode of a moved field is a board that looks right and is not.
      dataVersion: Number(state.version) || null,
      bots: cappedBots.map(bot => ({
        id: typeof bot.id === 'string' ? text(bot.id).slice(0, 80) : String(bot.id).slice(0, 80),
        // Names are short, but they are also the one field the user uses to tell two
        // Bots apart — a zero-width space would let one Bot look like two.
        name: text(bot.name).slice(0, 40),
        role: text(bot.role).slice(0, 120),
        // `model` and `sessionId` are rendered as text (drawer, open-chat). They
        // were the only two Bot fields forwarded raw; an object model crashed the
        // drawer, and a non-string session id was handed to openSession().
        model: text(bot.model).slice(0, 60) || null,
        sessionId: text(bot.sessionId).slice(0, 80) || null,
        // The colour the user picked for this Bot in DS Bot's own UI (a named ink
        // or #rrggbb). Forwarded as sanitised text and validated on the browser
        // side, where it is only ever read as a key into the ink table — an
        // unrecognised value degrades to the roster/hash seat instead of
        // reaching a fill. Bots the user never picked a colour for have no such
        // key upstream, so most of a real roster arrives without one.
        color: text(bot.color).slice(0, 24) || null,
        // The character the user picked in DS Bot's UI. It is the same seven-id
        // vocabulary the board redraws, so a Bot keeps its character across the
        // two surfaces. Unknown ids fall through to the board's hash.
        shape: text(bot.avatar?.shape).slice(0, 24) || null,
        // A held setup greeting: the Bot will not speak until the user picks its
        // model. `view()` exposes the same thing as `waiting`, so the browser half
        // reads one field whichever source it got its Bot list from.
        waiting: bot.kickoff !== undefined,
      })),
      works,
      // Only the names: `work.waiting[botId].rooms` carries room ids, and showing
      // a raw id on the card is worse than showing nothing.
      rooms: Object.fromEntries(cappedRooms
        // A room id is used as an object key and compared against `work.roomId`.
        // Only a non-empty string is a legal key; anything else is dropped rather
        // than stringified into "[object Object]".
        .filter(room => typeof room.id === 'string' && room.id)
        .map(room => [room.id, text(room.name).slice(0, 60) || room.id])),
    }
    cache = { key, data, owners, readAt }
    // `data` already carries readAt; the fresh read is by definition not stale.
    return { ...data, errors: errorsFrom(owners), stale: false }
  }

  const registerRoute = host => {
    if (!host?.connection?.fetch?.register) {
      warn('bot-board: connection.fetch is unavailable; the snapshot route was not registered')
      return
    }
    host.effect(() => host.connection.fetch.register({
      path: ROUTE,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async () => new Response(JSON.stringify(await snapshot()), {
        status: 200,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      }),
    }), 'bot-board: snapshot route')
  }

  // `export const inject = ['connection']` already keeps this plugin inactive
  // until the service exists, so registering straight away is enough. Calling
  // ctx.inject(['connection'], …) as well would register the route twice if the
  // service were ever re-provided.
  registerRoute(ctx)
}
