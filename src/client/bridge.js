// The one thing the browser half needs from apply(): the host's openSession.
// A module-level bridge instead of slot props keeps it working on platform
// builds where slot `inject` props are not delivered.
let opener = null

export function setOpener(fn) {
  // Never clear a working opener: apply() can run before uiWorkspace exists, and
  // a second call must not undo the first one's binding.
  if (typeof fn === 'function') opener = fn
}

export function hasOpener() {
  return typeof opener === 'function'
}

export function openSession(id) {
  try {
    opener?.(id)
    return Boolean(opener)
  } catch {
    return false
  }
}
