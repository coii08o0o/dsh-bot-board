// Status derivation, kept pure so the priority rules can be unit-tested without
// rendering anything. Two rules matter and used to be wrong:
//
//   1. A failure never outranks live work. A Bot that failed once and then went
//      back to work shows as working, with the failure kept as a badge — it used
//      to stay red for the full 15-minute failure TTL.
//   2. `waiting` (this Bot is waiting for another Bot to hand work back) is not
//      `alert` (the user has to approve or answer something). They get separate
//      lamps because a yellow lamp that never needs you trains you to ignore it.
import { STALL_MS } from './const.js'

// Values ds-bot puts in activity[botId] while a turn is actually running.
const LIVE = new Set(['working', 'thinking', 'searching', 'sending', 'orbit'])

export function isLive(status) {
  return LIVE.has(status)
}

/**
 * @param {object} input
 * @param {string|undefined} input.activity   activity[botId] from ds-bot
 * @param {boolean} input.waiting             work.waiting[botId] exists
 * @param {boolean} input.failed              a failure was recorded for this Bot
 * @param {boolean} input.alerting            an approval or question is pending
 */
export function statusOf({ activity, waiting, failed, alerting }) {
  if (alerting) return 'alert'
  if (typeof activity === 'string' && activity) {
    if (activity === 'alert') return 'alert'
    if (activity === 'waiting') return 'waiting'
    if (activity !== 'idle') return activity
  }
  if (waiting) return 'waiting'
  if (failed) return 'error'
  return 'idle'
}

export function sceneOf(status, done) {
  if (status === 'alert') return 'alert'
  if (status === 'waiting') return 'waiting'
  if (status === 'error') return 'error'
  if (done) return 'done'
  if (status === 'idle') return 'idle'
  return 'busy'
}

export function stalledOf(since, scene, now = Date.now()) {
  return scene === 'busy' && Number(since) > 0 && now - Number(since) > STALL_MS
}

// The failure badge: shown whenever a Bot carries a recorded failure that is not
// already the reason its workstation is red.
export function badgeOf(scene, failed) {
  return Boolean(failed) && scene !== 'error'
}
