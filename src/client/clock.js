// One shared one-second ticker. Only the little elapsed-time nodes subscribe, so
// the clock no longer forces a full re-render of nine SVG workstations every
// second (the old board did exactly that, and nothing read the tick).
import { useEffect, useState } from 'react'

const listeners = new Set()
let timer = 0

function start() {
  if (timer) return
  timer = setInterval(() => {
    for (const fn of listeners) fn()
  }, 1000)
}

function stop() {
  if (!timer) return
  clearInterval(timer)
  timer = 0
}

export function useNow(active) {
  const [, force] = useState(0)
  useEffect(() => {
    if (!active) return undefined
    const tick = () => force(n => (n + 1) % 1000000)
    listeners.add(tick)
    start()
    return () => {
      listeners.delete(tick)
      if (listeners.size === 0) stop()
    }
  }, [active])
}
