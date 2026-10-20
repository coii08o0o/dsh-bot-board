// dsh-bot-board — host half.
// Reads DS Bot's own state file and serves a small read-only snapshot on the
// shared /api channel: the hand-offs between Bots, plus the failures DSH reports.
// Live status (who is running, which tool) comes from DS Bot's own api/bot, which
// the browser half polls directly.
import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const name = 'dsh-bot-board'
export const inject = ['connection']

const HOME = process.env.DSH_HOME ?? join(homedir(), '.dsh')
const STATE = join(HOME, 'bot', 'state.json')

const ROUTE = '/api/bot-board'
const FAILURE_TTL = 15 * 60 * 1000
const FAILURE_MAX = 256
const WORKS_MAX = 24

const text = value => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const blank = (reason, stale = false) => ({
  ok: false, reason, stale, bots: [], works: [], errors: [], updatedAt: Date.now(),
})

export function apply(ctx) {
  const warn = (message, ...args) => {
    try { ctx.logger?.warn?.(message, ...args) } catch {}
  }

  let cache = { key: '', data: null, owners: null }

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
    const message = typeof error?.message === 'string' ? error.message : String(error ?? 'error')
    failures.set(sessionId, { at: Date.now(), message: message.replace(/\s+/g, ' ').slice(0, 200) })
    // A long-lived client must not grow this store without bound.
    while (failures.size > FAILURE_MAX) failures.delete(failures.keys().next().value)
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
        return { state: JSON.parse(await readFile(STATE, 'utf8')) }
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
    const ownerOf = new Map()
    for (const bot of bots) {
      ownerOf.set(bot.id, bot.id)
      // The current part is not in segments[] until it ends — without this a Bot
      // that rolled over a part loses every failure raised in the new session.
      if (bot.sessionId) ownerOf.set(bot.sessionId, bot.id)
      for (const segment of bot.segments ?? []) {
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
        for (const segment of segments ?? []) {
          if (segment?.sessionId) ownerOf.set(segment.sessionId, botId)
        }
      }
    }
    return ownerOf
  }

  async function snapshot() {
    let info
    try {
      info = await stat(STATE)
    } catch {
      return blank('no-state')
    }
    // mtime alone misses two writes landing inside one millisecond; the size
    // disambiguates that case cheaply.
    const key = `${info.mtimeMs}:${info.size}`
    if (cache.data && cache.key === key && cache.owners) {
      return { ...cache.data, errors: errorsFrom(cache.owners), updatedAt: Date.now(), stale: false }
    }

    const read = await readState()
    if (read.missing) return blank('no-state')
    if (read.broken) {
      warn('bot-board: state.json unreadable; serving %s', cache.data ? 'the last snapshot' : 'nothing')
      return cache.data
        ? { ...cache.data, errors: errorsFrom(cache.owners), updatedAt: Date.now(), stale: true }
        : blank('unreadable', true)
    }

    const state = read.state ?? {}
    const bots = Object.values(state.bots ?? {})
    const rooms = Object.values(state.rooms ?? {})
    const nameOf = id => bots.find(bot => bot.id === id)?.name ?? null

    const owners = ownersOf(bots, rooms)
    // `work.from/to` is usually a bot id, but a Bot that rolled over a part hands
    // work over as its current session id. Resolve through the ownership map so
    // the card never shows a raw session id and the click-through still matches.
    const botOf = id => owners.get(id) ?? id

    const works = Object.entries(state.works ?? {})
      .map(([workId, work]) => {
        const results = Array.isArray(work.results) ? work.results : []
        return {
          id: workId,
          fromId: work.from ? botOf(work.from) : null,
          toId: work.to ? botOf(work.to) : null,
          from: nameOf(botOf(work.from)) ?? work.from ?? '',
          to: nameOf(botOf(work.to)) ?? work.to ?? '',
          at: Number(work.at) || 0,
          open: Array.isArray(work.open) ? work.open.length : 0,
          done: results.length,
          last: text(results.at(-1)?.text).slice(0, 240) || null,
        }
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, WORKS_MAX)

    const data = {
      ok: true,
      updatedAt: Date.now(),
      bots: bots.map(bot => ({
        id: bot.id,
        name: bot.name,
        role: text(bot.role).slice(0, 120),
        model: bot.model ?? null,
        sessionId: bot.sessionId ?? null,
      })),
      works,
      // Only the names: `work.waiting[botId].rooms` carries room ids, and showing
      // a raw id on the card is worse than showing nothing.
      rooms: Object.fromEntries(rooms.map(room => [room.id, text(room.name) || room.id]).filter(([id]) => id)),
    }
    cache = { key, data, owners }
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
