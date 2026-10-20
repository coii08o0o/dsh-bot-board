// How often the live feed needs to be asked, as a pure decision so it can be
// tested without a DOM or a timer.
//
// The board used to poll `api/bot` every 1.5 seconds no matter what. That endpoint
// is not a pure read: ds-bot runs refresh + bootstrap + catalog + loadSecrets
// before it even looks at `since`, so a board showing nine idle Bots was still
// making the host do that work 40 times a minute. The interval is now a function
// of whether anything is actually moving.
import { ACTIVE_TAIL_MS, IDLE_POLL_MS, POLL_MS } from './const.js'

// Whether anything on the team is moving right now.
//
// `activity` already folds in pending approvals ('alert') and hand-off waits
// ('waiting'), but `work` is checked too: `work.bots` appears the instant a turn
// starts, which can be a poll ahead of `activity`.
export function teamActive(view) {
  if (!view || typeof view !== 'object') return false
  for (const value of Object.values(view.activity ?? {})) {
    if (value && value !== 'idle') return true
  }
  const work = view.work ?? {}
  if ((work.approvals ?? []).length) return true
  if (Object.keys(work.waiting ?? {}).length) return true
  if (Object.keys(work.bots ?? {}).length) return true
  return false
}

// Fast while something moves; still fast for a while after the last thing stopped,
// so the end of a turn is not missed at 6-second granularity; slow once the room
// has genuinely gone quiet.
export function liveCadence({ active, lastActiveAt, now = Date.now() }) {
  if (active) return POLL_MS
  if (Number(lastActiveAt) > 0 && now - Number(lastActiveAt) < ACTIVE_TAIL_MS) return POLL_MS
  return IDLE_POLL_MS
}
