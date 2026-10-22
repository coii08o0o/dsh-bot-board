// A one-pass React shim: just enough hooks to render a component tree once and
// walk the result. Used by tools/render-check.mjs so a render-time crash (which
// in the real app silently kills the whole panel) fails the check instead.
//
// v0.4.1: `useRef` is now PERSISTENT per (component type, hook index), which is
// what React actually does. It used to be rebuilt on every render, and that made
// a whole class of bug structurally untestable: any logic that remembers
// something across renders — the layer-stability window in panel.js is the one
// that shipped a P0 — silently degraded into "always starts empty", so the
// debounce could not be observed and a panel that contradicted its own header
// still passed every assertion. `useState` still resets per render: the checks
// drive state by calling the component with new props, not by clicking.
let cursor = 0
let slots = []
let currentType = null
// type → array indexed by hook slot. Survives resetHooks on purpose; call
// resetRefs() to start a fresh mount.
const refStores = new Map()
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

export function useRef(value) {
  const key = currentType ?? '<anonymous>'
  let store = refStores.get(key)
  if (!store) { store = []; refStores.set(key, store) }
  const index = cursor
  cursor += 1
  if (!(index in store)) store[index] = { current: value }
  return store[index]
}

export function useState(initial) {
  const index = cursor
  cursor += 1
  if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
  return [slots[index], next => {
    slots[index] = typeof next === 'function' ? next(slots[index]) : next
  }]
}

export function useEffect(fn) { effects.push(fn) }

// Clears the per-render cursor and state, and records which component's hooks
// are running so useRef can find its own store.
export function resetHooks(type) {
  cursor = 0
  slots = []
  currentType = typeof type === 'function' ? type : null
}

// Forgets every remembered ref: the equivalent of unmounting and remounting.
export function resetRefs() {
  refStores.clear()
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
