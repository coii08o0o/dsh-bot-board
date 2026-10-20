// Two pollers sharing one loop implementation. Both slow down when the panel is
// collapsed or the window is hidden, because /api/bot is not a pure read: ds-bot
// runs refresh + bootstrap + catalog + loadSecrets before answering.
import { useEffect, useRef, useState } from 'react'
import { BOARD_MS, POLL_MS } from './const.js'
import { createPollLoop, pollDelay } from './pollLoop.js'

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
      delayFor: pollDelay,
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
    base: POLL_MS,
    activeRef,
    wakeRef: liveWake,
    run: () => callBot('state', { since: sinceRef.current, models: modelsRef.current }),
    onValue: value => {
      sinceRef.current = value.revision ?? sinceRef.current
      modelsRef.current = value.modelsKey ?? modelsRef.current
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
    onError: err => setBoard(previous => ({
      ...(previous ?? { works: [], bots: [], errors: [] }),
      boardError: err?.message ?? 'local read failed',
    })),
  })

  return { view, board, error }
}
