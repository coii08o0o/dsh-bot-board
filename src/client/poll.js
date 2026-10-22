// Two pollers sharing one loop implementation. Both slow down when the panel is
// collapsed or the window is hidden, because /api/bot is not a pure read: ds-bot
// runs refresh + bootstrap + catalog + loadSecrets before answering. The live feed
// additionally slows down when the whole team is idle — see cadence.js.
import { useEffect, useRef, useState } from 'react'
import { BOARD_MS } from './const.js'
import { liveCadence, teamActive } from './cadence.js'
import { createPollLoop, pollDelay } from './pollLoop.js'

// ±10%: DS Bot's own front end polls the same endpoint, and two fixed intervals
// beat in lockstep. A little jitter spreads the peaks.
const jitter = ms => Math.max(250, Math.round(ms * (0.9 + Math.random() * 0.2)))

async function callBot(endpoint, payload) {
  const response = await fetch('api/bot', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint, payload: payload ?? null }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const result = await response.json()
  if (!result.ok) throw new Error(result.error?.message ?? 'DS Bot 返回错误')
  return result.value
}

async function callBoard() {
  const response = await fetch('api/bot-board', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function usePoll({ base, run, onValue, onError, activeRef, wakeRef }) {
  useEffect(() => {
    const loop = createPollLoop({
      base,
      run,
      onValue,
      onError,
      // `value` is the resolved base — a number, even when `base` is a function.
      delayFor: (value, state) => jitter(pollDelay(value, state)),
      isActive: () => activeRef.current,
      isHidden: () => typeof document !== 'undefined' && document.hidden,
    })
    const onVisible = () => { if (!document.hidden) loop.wake() }
    wakeRef.current = loop.wake
    document.addEventListener('visibilitychange', onVisible)
    loop.start()
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      loop.stop()
      if (wakeRef.current === loop.wake) wakeRef.current = null
    }
  }, [])
}

export function useTeam({ active }) {
  const [view, setView] = useState(null)
  const [board, setBoard] = useState(null)
  const [error, setError] = useState(null)
  const activeRef = useRef(active)
  const liveWake = useRef(null)
  const boardWake = useRef(null)
  const sinceRef = useRef(undefined)
  const modelsRef = useRef(undefined)
  // Cadence state: what the last answer said, and when the team last moved.
  const busyRef = useRef(false)
  const lastActiveRef = useRef(0)

  useEffect(() => {
    activeRef.current = active
    if (!active) return
    liveWake.current?.()
    boardWake.current?.()
  }, [active])

  // Live status: who is running, which tool, approvals and questions.
  // Note: no `locale` field. ds-bot writes it into a process-wide uiLocale that
  // decides the language of new Bot greetings and memory — a read-only board must
  // not change that.
  usePoll({
    // An idle team is asked far less often; `unchanged` answers still carry the
    // live half, so a Bot starting work shows up on the very next tick.
    base: () => liveCadence({ active: busyRef.current, lastActiveAt: lastActiveRef.current }),
    activeRef,
    wakeRef: liveWake,
    run: () => callBot('state', { since: sinceRef.current, models: modelsRef.current }),
    onValue: value => {
      sinceRef.current = value.revision ?? sinceRef.current
      modelsRef.current = value.modelsKey ?? modelsRef.current
      busyRef.current = teamActive(value)
      if (busyRef.current) lastActiveRef.current = Date.now()
      setView(previous => (value.unchanged && previous ? { ...previous, ...value } : value))
      setError(null)
    },
    onError: err => setError(err?.message ?? 'offline'),
  })

  // Hand-offs and failures come from the host snapshot, which reads state.json.
  usePoll({
    base: BOARD_MS,
    activeRef,
    wakeRef: boardWake,
    run: callBoard,
    onValue: value => setBoard(value),
    // `ok:false` matters: without it the panel fell through to `panel.empty` and
    // told the user 「还没有 Bot」 when the truth was that the snapshot could not be
    // read at all — a cheerful lie in the one place this tool must not lie
    // (v0.4.2 audit, finding #10).
    onError: err => setBoard(previous => ({
      ...(previous ?? { works: [], bots: [], errors: [] }),
      ok: false,
      reason: 'unreadable',
      boardError: err?.message ?? 'local read failed',
    })),
  })

  return { view, board, error }
}
