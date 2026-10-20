// The one node that repaints every second, and the only one: it subscribes to
// the shared ticker on its own, so a running clock never rebuilds the nine
// workstation SVGs around it.
//
// Shared by the workstation strip and the drawer on purpose. The drawer used to
// call elapsed() inline, which printed the value it saw at open time and then
// froze — the one number you open the drawer to watch was the one number that
// stopped moving.
import { createElement as h } from 'react'
import { elapsed } from './format.js'
import { useNow } from './clock.js'

export function Elapsed({ since, className }) {
  useNow(Boolean(since))
  if (!since) return null
  return h('span', { className }, elapsed(since))
}
