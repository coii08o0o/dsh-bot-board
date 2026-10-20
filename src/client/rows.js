// Row building, pure: given the two data sources, produce one row per Bot.
// Extracted from the panel so the priority rules can be exercised without a DOM.
// `now` is a parameter so the stall check is deterministic under test.
import { clip } from './format.js'
import { badgeOf, isLive, sceneOf, stalledOf, statusOf } from './scene.js'
import { ROSTER } from './const.js'

// Roster order first so a workstation never moves when a status changes; unknown
// Bots trail in a stable order instead of hashing into somebody else's seat.
export const seatOrder = bot => {
  const index = ROSTER.findIndex(item => item.name === bot?.name)
  return index < 0 ? 100 : index
}

// `work.bots[botId].said/note/target` is free prose; the card only has room for a
// phrase, so it gets clipped and the drawer shows the whole thing.
const PHRASE = 16

// A failure that is still showing on a Bot that has visibly gone back to work is
// stale. The turn start is the precise signal, but `work.bots[botId].since` is
// not always present, so a minute of live activity is the fallback.
const RECOVERED_MS = 60 * 1000

// questions is keyed by session id; a Bot that rolled over a part may still be
// matched by its previous parts in a stale snapshot.
function questionOf(bot, questions) {
  const keys = [bot.sessionId, bot.id, ...(bot.parts ?? [])]
  for (const key of keys) {
    if (key && questions[key]) return questions[key]
  }
  return undefined
}

function describe({ approval, question, failure, wait, kickoff, t, nameOf, rooms }) {
  if (approval) {
    return {
      kind: 'approval',
      action: `${t('meta.approval')} ${approval.tool || ''}`.trim(),
      tool: approval.tool,
      reason: approval.reason,
      // ds-bot fills `detail.code` from command|cmd|file_path|path|url|query, so
      // it is "what this call acts on", not necessarily a shell command.
      code: approval.detail?.code ?? '',
      text: approval.detail?.text ?? '',
    }
  }
  if (question) {
    return {
      kind: 'question',
      action: `${t('meta.question')} ${clip(question.question, 20)}`.trim(),
      text: question.question,
      // The one-line context ds-bot shows under the question. Without it a
      // question like "这段用哪个语气？" has no way to be answered confidently.
      hint: question.detail ?? '',
      options: Array.isArray(question.options) ? question.options : [],
      // Both change what the numbered list means: several picks are allowed, and
      // there is a free-text field the card cannot show.
      multiSelect: question.multiSelect === true,
      allowCustom: question.allowCustom === true,
    }
  }
  if (failure) {
    return {
      kind: 'error',
      action: `${t('meta.error')} ${clip(failure.message, 22)}`.trim(),
      message: failure.message,
    }
  }
  if (wait) {
    const names = [
      ...(wait.bots ?? []).map(nameOf),
      ...(wait.rooms ?? []).map(id => (rooms[id] ? `${t('meta.room')} ${rooms[id]}` : id)),
    ]
    // "等 Chief · 替 Chief" reads like a stutter; drop the repeat.
    const patrons = (wait.for ?? []).map(nameOf).filter(name => name && !names.includes(name))
    const parts = []
    if (names.length) parts.push(`${t('meta.waiting')} ${names.join('、')}`)
    if (patrons.length) parts.push(`${t('meta.for')} ${patrons.join('、')}`)
    return {
      kind: 'waiting',
      action: parts.length ? parts.join(' · ') : t('meta.waiting'),
      names,
      patrons,
    }
  }
  // A Bot created without a model holds its setup greeting and never speaks until
  // the user picks one. ds-bot exposes that as `bot.waiting`; it is not the same
  // `waiting` as "waiting for another Bot to hand work back".
  if (kickoff) {
    return { kind: 'kickoff', action: t('meta.kickoff') }
  }
  return { kind: null, action: '' }
}

export function buildRows({
  bots = [], activity = {}, workBots = {}, waiting = {}, approvals = [], questions = {},
  errors = [], works = [], rooms = {}, waveMap = {}, noteMap = {}, t, nameOf, now = Date.now(),
}) {
  const approvalsList = Array.isArray(approvals) ? approvals : []
  const errorList = Array.isArray(errors) ? errors : []
  const failureOf = bot => errorList
    .filter(item => item.botId === bot.id)
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]

  return bots
    .map(bot => {
      const approval = approvalsList.find(item => item?.botId === bot.id)
      const question = questionOf(bot, questions)
      const wait = waiting[bot.id]
      const work = workBots[bot.id]
      const since = Number(work?.since) || 0
      // A held setup greeting: the Bot exists but will not speak until the user
      // picks its model. It looks idle from every other angle, so it has to be
      // read from `bot.waiting` explicitly.
      const kickoff = bot.waiting === true
      const recorded = failureOf(bot)
      // A failure older than the current turn belongs to a turn the Bot already
      // moved past. Keeping it would leave the "!" badge up for the whole
      // 15-minute TTL even though the Bot is working again.
      const isWorking = isLive(activity[bot.id])
      const stale = recorded && ((since > 0 && recorded.at < since)
        || (isWorking && now - recorded.at > RECOVERED_MS))
      const failure = stale ? null : recorded
      const status = statusOf({
        activity: activity[bot.id],
        waiting: Boolean(wait),
        failed: Boolean(failure),
        alerting: Boolean(approval || question || kickoff),
      })
      const scene = sceneOf(status, Boolean(waveMap[bot.id]))
      const detail = describe({ approval, question, failure, wait, kickoff, t, nameOf, rooms })
      const live = work?.tool
        ? `${t('meta.tool')} ${work.tool}`
        : clip(work?.said || work?.note || work?.target || '', PHRASE)
      const action = detail.kind === 'approval' || detail.kind === 'question'
        ? detail.action
        : scene === 'error' || scene === 'waiting'
          ? detail.action
          : (live || detail.action)
      // A work's results[] holds one entry per Bot that handed something back, so
      // its last entry belongs to whoever finished last — not necessarily this Bot.
      // Prefer the entry that names it; fall back to the work's own last line.
      const handed = works.find(item => item.toId === bot.id)
      const own = (handed?.results ?? []).filter(item => item?.name && item.name === bot.name).at(-1)
      const roomId = work?.roomId
      return {
        bot,
        status,
        scene,
        action,
        since,
        // A busy Bot without a turn start is not "0 seconds in" — it is unknown.
        sinceKnown: since > 0,
        stalled: stalledOf(since, scene, now),
        badge: badgeOf(scene, Boolean(failure)),
        failure: failure?.message ?? '',
        detail,
        work: work ?? null,
        // A turn running in a group, not in the Bot's own chat. Worth saying: the
        // Bot appears to be talking to nobody in particular otherwise.
        place: roomId ? (rooms[roomId] ? `${t('meta.room')} ${rooms[roomId]}` : t('meta.room')) : '',
        lastResult: own?.text ?? handed?.last ?? null,
        note: Boolean(noteMap[bot.id]),
      }
    })
    .sort((a, b) => seatOrder(a.bot) - seatOrder(b.bot) || String(a.bot.id).localeCompare(String(b.bot.id)))
}
