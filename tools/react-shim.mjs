// A one-pass React shim: just enough hooks to render a component tree once and
// walk the result. Used by tools/render-check.mjs so a render-time crash (which
// in the real app silently kills the whole panel) fails the check instead.
let cursor = 0
let slots = []
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
export function useRef(value) { return { current: value } }

export function useState(initial) {
  const index = cursor
  cursor += 1
  if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
  return [slots[index], next => {
    slots[index] = typeof next === 'function' ? next(slots[index]) : next
  }]
}

export function useEffect(fn) { effects.push(fn) }

export function resetHooks() {
  cursor = 0
  slots = []
}

export function render(node) {
  if (node === null || node === undefined || node === false || node === true) return null
  if (Array.isArray(node)) return node.map(render).flat()
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node.type === 'function') {
    resetHooks()
    return render(node.type(node.props ?? {}))
  }
  return { type: node.type, props: node.props ?? {}, children: render(node.props?.children) }
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
