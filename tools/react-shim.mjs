// A one-pass React shim: just enough hooks to render a component tree once and
// walk the result. Used by tools/render-check.mjs so a render-time crash (which
// in the real app silently kills the whole panel) fails the check instead.
//
// v0.4.1: `useRef` AND `useState` are now PERSISTENT per (component type, hook
// index), which is what React actually does. They used to be rebuilt on every
// render, and that made a whole class of bug structurally untestable: anything
// that remembers across renders — the layer-stability window in panel.js is the
// one that shipped a P0, and the "expanded" flag is the one that shipped a
// sticky-state P1 — silently degraded into "always starts empty", so the
// behaviour could not be observed and the bugs passed every assertion.
//
// `resetRefs()` forgets everything a mount remembered, i.e. it is an unmount.
// Call it between unrelated test cases; leave it out to drive a sequence of
// renders of the same mounted component.
let cursor = 0
let currentType = null
// type → array indexed by hook slot. Survives resetHooks on purpose.
const stores = new Map()
export const effects = []

export function createElement(type, props, ...children) {
  const merged = { ...(props ?? {}) }
  if (children.length === 1) merged.children = children[0]
  else if (children.length > 1) merged.children = children
  return { type, props: merged }
}

// The comparator is ignored: every component renders once here.
export function memo(component) {
  return component
}

export function useMemo(fn) { return fn() }
export function useCallback(fn) { return fn }

function slotAt() {
  const key = currentType ?? '<anonymous>'
  let store = stores.get(key)
  if (!store) { store = []; stores.set(key, store) }
  const index = cursor
  cursor += 1
  if (!store[index]) store[index] = {}
  return store[index]
}

export function useRef(value) {
  const slot = slotAt()
  if (!('ref' in slot)) slot.ref = { current: value }
  return slot.ref
}

export function useState(initial) {
  const slot = slotAt()
  if (!('state' in slot)) slot.state = typeof initial === 'function' ? initial() : initial
  return [slot.state, next => {
    slot.state = typeof next === 'function' ? next(slot.state) : next
  }]
}

export function useEffect(fn) { effects.push(fn) }

// Clears the per-render cursor and records which component's hooks are running,
// so each hook can find its own store.
export function resetHooks(type) {
  cursor = 0
  currentType = typeof type === 'function' ? type : null
}

// Forgets every remembered ref and every piece of state: the equivalent of
// unmounting and remounting the whole tree.
export function resetRefs() {
  stores.clear()
}

export function render(node) {
  if (node === null || node === undefined || node === false || node === true) return null
  if (Array.isArray(node)) return node.map(render).flat()
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node.type === 'function') {
    resetHooks(node.type)
    return render(node.type(node.props ?? {}))
  }
  return { type: node.type, props: node.props ?? {}, children: render(node.props?.children) }
}

// Mount a component as an element rather than by calling it, so its hooks run
// under its own identity (and therefore get its own persistent refs).
export function mount(type, props) {
  return render({ type, props })
}

export function walk(node, visit) {
  if (node === null || node === undefined) return
  if (Array.isArray(node)) { node.forEach(child => walk(child, visit)); return }
  if (typeof node === 'string') { visit(node); return }
  visit(node)
  walk(node.children, visit)
}

export function textOf(node) {
  let out = ''
  walk(node, item => { if (typeof item === 'string') out += item })
  return out
}

export function findAll(node, predicate) {
  const out = []
  walk(node, item => {
    if (item && typeof item === 'object' && predicate(item)) out.push(item)
  })
  return out
}
