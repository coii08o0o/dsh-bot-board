// dsh-bot-board — host half.
// Reads DS Bot's own state file and serves a small read-only snapshot on the
// shared /api channel: the work hand-offs between Bots and the group chat lines.
// Live status (who is running, which tool) comes from DS Bot's own api/bot, which
// the browser half polls directly.
import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const name = 'dsh-bot-board'
export const inject = ['connection']

const HOME = process.env.DSH_HOME ?? join(homedir(), '.dsh')
const STATE = join(HOME, 'bot', 'state.json')

const text = value => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

export function apply(ctx) {
  let cache = { mtimeMs: 0, data: null }

  // Bot turns that failed at a step or turn boundary. DSH emits this for every
  // agent; a Session id is mapped back to its Bot when a snapshot is served.
  // 注入始终回调、由 store 判定: the listener is registered before any service
  // check, so hooking never waits on connection readiness — the callback only
  // records into the failures store, and errorsFrom() judges at read time.
  const failures = new Map()
  ctx.on?.('agent/error', payload => {
    const sessionId = payload?.agent?.session?.id ?? payload?.agent?.id
    if (typeof sessionId !== 'string') return
    const error = payload?.error
    const message = typeof error?.message === 'string' ? error.message : String(error ?? 'error')
    failures.set(sessionId, { at: Date.now(), message: message.replace(/\s+/g, ' ').slice(0, 200) })
  })

  // Map recent failures onto Bots using whichever ownership map a snapshot built.
  const errorsFrom = owners => {
    const now = Date.now()
    const list = []
    for (const [sessionId, failure] of failures) {
      if (now - failure.at > 15 * 60 * 1000) {
        failures.delete(sessionId)
        continue
      }
      const botId = owners.get(sessionId)
      if (botId === undefined) continue
      list.push({ botId, sessionId, at: failure.at, message: failure.message })
    }
    return list
  }

  async function snapshot() {
    let info
    try {
      info = await stat(STATE)
    } catch {
      return { ok: false, reason: 'no-state', works: [], rooms: [], bots: [] }
    }
    if (cache.data && cache.mtimeMs === info.mtimeMs && cache.owners) {
      return { ...cache.data, errors: errorsFrom(cache.owners), updatedAt: Date.now() }
    }

    let state
    try {
      state = JSON.parse(await readFile(STATE, 'utf8'))
    } catch {
      return cache.data ?? { ok: false, reason: 'unreadable', works: [], rooms: [], bots: [] }
    }

    const bots = Object.values(state.bots ?? {})
    const nameOf = id => bots.find(bot => bot.id === id)?.name ?? null

    // Which Bot owns a Session: its own chat (current part and earlier parts) or a
    // member's hidden group Session.
    const ownerOf = new Map()
    for (const bot of bots) {
      ownerOf.set(bot.id, bot.id)
      for (const segment of bot.segments ?? []) {
        if (segment?.sessionId) ownerOf.set(segment.sessionId, bot.id)
      }
    }
    for (const room of Object.values(state.rooms ?? {})) {
      for (const [botId, sessionId] of Object.entries(room.sessions ?? {})) ownerOf.set(sessionId, botId)
      for (const segments of Object.values(room.segments ?? {})) {
        for (const segment of segments ?? []) if (segment?.sessionId) ownerOf.set(segment.sessionId, botId)
      }
    }

    const works = Object.entries(state.works ?? {})
      .map(([workId, work]) => {
        const open = Array.isArray(work.open) ? work.open.length : 0
        const results = Array.isArray(work.results) ? work.results : []
        return {
          id: workId,
          fromId: work.from ?? null,
          toId: work.to ?? null,
          from: nameOf(work.from) ?? work.from ?? '',
          to: nameOf(work.to) ?? work.to ?? '',
          at: Number(work.at) || 0,
          open,
          done: results.length,
          held: Boolean(work.held),
          room: nameOf(work.room) ?? work.room ?? null,
          last: text(results.at(-1)?.text).slice(0, 140) || null,
        }
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, 12)

    const rooms = Object.values(state.rooms ?? {}).map(room => {
      const log = Array.isArray(room.log) ? room.log : []
      const spoken = log.filter(line => line?.kind === undefined && text(line?.text))
      return {
        id: room.id ?? null,
        name: room.name ?? '群聊',
        mode: room.mode ?? 'admin',
        admin: nameOf(room.admin) ?? room.admin ?? null,
        members: (room.members ?? []).map(id => nameOf(id) ?? id),
        preview: spoken.at(-1)
          ? { who: text(spoken.at(-1).who) || '？', text: text(spoken.at(-1).text).slice(0, 120), at: Number(spoken.at(-1).time) || 0 }
          : null,
        lines: spoken.slice(-12).map(line => ({
          who: text(line.who) || '？',
          text: text(line.text).slice(0, 120),
          at: Number(line.time) || 0,
        })),
      }
    })

    const data = {
      ok: true,
      updatedAt: Date.now(),
      bots: bots.map(bot => ({
        id: bot.id,
        name: bot.name,
        color: bot.color ?? null,
        role: text(bot.role).slice(0, 80),
        model: bot.model ?? null,
      })),
      works,
      rooms,
    }
    cache = { mtimeMs: info.mtimeMs, data, owners: ownerOf }
    return { ...data, errors: errorsFrom(ownerOf) }
  }

  if (!ctx.connection?.fetch?.register) return
  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/bot-board',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async () => new Response(JSON.stringify(await snapshot()), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    }),
  }), 'bot-board: snapshot route')
}
