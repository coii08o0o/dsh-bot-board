// The poll loop, as a plain object instead of a hook body, so the single-flight
// guarantee can be tested with a fake clock.
//
// The bug this exists to prevent: clearing a timer that has ALREADY fired and
// then firing again starts a second chain. Every collapse/expand of the panel
// woke the loop, so the board ended up with an extra poller each time — and the
// extra pollers never went away.
import { SLOW_POLL_MS } from './const.js'

export function pollDelay(base, { active, hidden, misses }) {
  const slow = hidden || !active
  const target = slow ? SLOW_POLL_MS : base
  return misses > 0 ? Math.min(target * 2 ** Math.min(misses, 3), SLOW_POLL_MS) : target
}

export function createPollLoop({
  base, run, onValue, onError, isActive, isHidden, delayFor = pollDelay,
  timers = { setTimeout: (...args) => setTimeout(...args), clearTimeout: id => clearTimeout(id) },
}) {
  let stopped = false
  let timer = null
  let inflight = false
  let misses = 0

  function arm() {
    if (stopped) return
    timer = timers.setTimeout(fire, delayFor(base, {
      active: isActive(), hidden: isHidden(), misses,
    }))
  }

  async function fire() {
    timer = null
    if (stopped || inflight) return
    inflight = true
    try {
      const value = await run()
      if (!stopped) {
        onValue(value)
        misses = 0
      }
    } catch (error) {
      if (!stopped) {
        onError(error)
        misses += 1
      }
    } finally {
      inflight = false
    }
    arm()
  }

  function wake() {
    // A request already in the air owns the next tick: it will arm one itself.
    if (stopped || inflight) return
    if (timer !== null) {
      timers.clearTimeout(timer)
      timer = null
    }
    fire()
  }

  return {
    start: fire,
    wake,
    stop() {
      stopped = true
      if (timer !== null) {
        timers.clearTimeout(timer)
        timer = null
      }
    },
    armed: () => timer !== null,
    inFlight: () => inflight,
  }
}
