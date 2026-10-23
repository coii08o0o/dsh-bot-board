// The floating panel: header + three-layer body (需要你 / 在动 / 闲着) + the
// detail sheet, which doubles as the legend.
import { Component, createElement as h, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ATTENTION_EMPTY_ROW_H, ATTENTION_GAP, ATTENTION_PAD_V, ATTENTION_ROW_H, COLLAPSE_KEY, HEAD_H, IDLE_ROW_H,
  LAMP, LAYER_STABLE_MS, NOTICES_MAX_H, PANEL_BORDER, POS_KEY, ROSTER_CELL_FULL, ROSTER_CELL_MIN, ROSTER_PAD_H,
  SIZE_DEFAULT, SIZE_KEY, SIZE_MAX, SIZE_MIN,
} from './const.js'
import { clip, sanitize } from './format.js'
import { countBelow } from './overflow.js'
import { buildRows } from './rows.js'
import { Station } from './station.js'
import { Drawer } from './drawer.js'
import { LegendSheet } from './legend.js'
import { Attention, IdleLine, IdleRoster } from './attention.js'
import { Handoffs } from './handoffs.js'
import { ATTENTION_MAX, LAYER_ATTENTION, LAYER_IDLE, LAYER_RUNNING, attentionOf, idleLine, layerOf } from './layers.js'
import { useTeam } from './poll.js'
import { ensureStyle } from './style.js'
import { defaultT } from './locale.js'
import { hasOpener, openSession } from './bridge.js'

const readRaw = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : raw
  } catch {
    return fallback
  }
}
const writeRaw = (key, value) => {
  try { localStorage.setItem(key, value) } catch {}
}

function notify(title, body) {
  try {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      new Notification(title, { body })
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(result => {
        if (result === 'granted') new Notification(title, { body })
      }).catch(() => {})
    }
  } catch {}
}

function Dot({ tone, busy }) {
  return h('span', {
    className: busy ? 'bb-dot bb-pulse' : 'bb-dot',
    style: { background: tone, boxShadow: busy ? `0 0 0 3px ${tone}33` : 'none' },
  })
}

// A saved size is only meaningful for the viewport that saved it. Without the
// viewport term, a 560px panel restored on a 500px window puts its right edge —
// and the resize handle — off-screen, and `clampPos` can only move it to left:6,
// never make it narrower. `Math.max(SIZE_MIN.w, …)` keeps the floor even when the
// viewport is smaller than the floor; `.bb-panel{max-width:100%}` then caps the
// painted box.
const fitWidth = value => {
  const viewport = typeof window !== 'undefined' && window.innerWidth
    ? window.innerWidth - 12
    : SIZE_MAX.w
  return Math.min(SIZE_MAX.w, Math.max(SIZE_MIN.w, value), Math.max(SIZE_MIN.w, viewport))
}

const readSize = () => {
  try {
    const raw = readRaw(SIZE_KEY, '')
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && parsed.w && parsed.h) {
      return {
        w: fitWidth(parsed.w),
        h: Math.min(SIZE_MAX.h, Math.max(SIZE_MIN.h, parsed.h)),
      }
    }
  } catch {}
  return { ...SIZE_DEFAULT }
}

const readPos = () => {
  try {
    const raw = readRaw(POS_KEY, '')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// A saved position only means something for the window that saved it. Restored
// unclamped, a panel parked in the bottom-right corner lands outside the viewport
// after the window shrinks — and you cannot drag back something you cannot see.
// The size was already clamped on restore; the position was not.
export function clampPos(value, size) {
  if (!value || !Number.isFinite(value.left) || !Number.isFinite(value.top)) return null
  if (typeof window === 'undefined') return { left: value.left, top: value.top }
  const width = size?.w ?? SIZE_DEFAULT.w
  return {
    left: Math.min(Math.max(6, value.left), Math.max(6, (window.innerWidth || 0) - width - 6)),
    top: Math.min(Math.max(6, value.top), Math.max(6, (window.innerHeight || 0) - 60)),
  }
}

// ── Layer membership, with a stability window ────────────────────────────────
// The point of the layers is that a Bot only moves between 在动 and 闲着 when
// something real happened — it started or finished a turn. A status that flips
// for a single tick must not relocate anybody.
//
// So each Bot's layer is committed only after it has held for LAYER_STABLE_MS,
// which is shorter than POLL_MS. The delay is therefore two polls, not one: the
// first render that sees a change only records it, the next one commits it. That
// is deliberate — committing on first sight would turn a one-tick flip into
// "move there, move back" — but it means the honest description is "the poll
// after next", not "the next poll". The bookkeeping lives in a ref and is
// evaluated during render; it never schedules a render of its own, so a quiet
// board stays completely still (no timer, no reflow, nothing).
//
// 需要你 is NOT debounced, and that is the v0.4.1 fix. Debouncing it made the
// panel contradict itself: the header counts live scenes, so for one poll after an
// approval arrived the header said "1 等你" while layer 1 said "✓ 没有需要你的事"
// and the Bot was still sitting in 闲着. Worse in the other direction — when an
// approval was cleared, the debounced layer said ATTENTION while the live scene
// said busy, so the Bot was filtered out of all three layers and a nine-Bot panel
// counted eight. Both windows open exactly when the user has just clicked approve,
// i.e. when he is certainly looking. 需要你 is the one answer on this panel that is
// never allowed to lag.
//
// The fix is deliberately in two halves — dropping the entry here, and falling
// back to the live layer in Body. Either half alone is enough to close the bug
// (both were verified by rolling each one back on its own). That redundancy is
// intentional: it is the belt to the braces of "a row is never in no layer at
// all", and it should not be deleted as dead code.
function useStableLayers(rows) {
  const ref = useRef(null)
  if (!ref.current) ref.current = new Map()
  const map = ref.current
  const now = Date.now()
  for (const row of rows) {
    const id = row.bot.id
    const live = layerOf(row)
    if (live === LAYER_ATTENTION) {
      // Live channel: no memory, no window. Dropping the entry also means that
      // when this Bot leaves 需要你 for 在动 it commits immediately instead of
      // waiting out a window against a stale memory.
      map.delete(id)
      continue
    }
    const target = live
    const entry = map.get(id)
    if (!entry) {
      map.set(id, { layer: target, pending: null, since: now })
      continue
    }
    if (entry.layer === target) {
      entry.pending = null
      continue
    }
    if (entry.pending !== target) {
      entry.pending = target
      entry.since = now
      continue
    }
    if (now - entry.since >= LAYER_STABLE_MS) {
      entry.layer = target
      entry.pending = null
    }
  }
  // Nine Bots is the whole roster; anything beyond that is a stale id from a
  // previous session and must not accumulate forever.
  if (map.size > 32) {
    const alive = new Set(rows.map(row => row.bot.id))
    for (const id of [...map.keys()]) if (!alive.has(id)) map.delete(id)
  }
  return map
}

// The three bands. Split out of Board so the structure can be asserted on
// directly: the check harness renders once and runs no effects, so a panel that
// only builds its body from a poll result would be untestable.
export function Body({
  rows = [], works = [], notices = [], empty = null, t, onOpen, onPick, sceneOf,
  // How many 需要你 rows the panel can actually hold at its current height. The
  // panel passes it; the preview and the checks fall back to the design floor.
  attentionCapacity = ATTENTION_MAX,
  // The panel's own size. Only the roster form of layer 3 needs it: its column
  // count is derived from the height that is actually left, not from a
  // breakpoint, because the panel is resizable. Defaults to the design size so
  // the preview and the checks can mount Body without inventing one.
  panelW = SIZE_DEFAULT.w,
  panelH = SIZE_DEFAULT.h,
  // The static preview renders the post-click state, which is otherwise only
  // reachable by clicking. The panel never passes it; production is unchanged.
  initialAttExpanded = false,
}) {
  const layers = useStableLayers(rows)
  const [expanded, setExpanded] = useState(false)
  const [attExpanded, setAttExpanded] = useState(initialAttExpanded)

  const hot = []
  const moving = []
  const resting = []
  for (const row of rows) {
    const live = layerOf(row)
    // 需要你 by the live scene, never by the debounced layer.
    if (live === LAYER_ATTENTION) {
      hot.push(row)
      continue
    }
    // 在动/闲着 by the debounced layer, falling back to live. The fallback is what
    // stops a Bot from falling through the gap: without it, a stale ATTENTION
    // memory would put a row in `hot` and then `attentionOf` would filter it out
    // by scene, leaving the Bot in no layer at all.
    const stable = layers.get(row.bot.id)?.layer
    const bucket = stable === LAYER_RUNNING || stable === LAYER_IDLE ? stable : live
    if (bucket === LAYER_RUNNING) moving.push(row)
    else resting.push(row)
  }

  // The empty board is returned at the END of this function, not here. It used to
  // be here, and that was the v0.7.0 crash: `runRef` / `runOverflow` below are
  // hooks, so the first render of a session — which always has no rows yet, the
  // first poll has not answered — claimed three hook slots and the first render
  // with data claimed five. React answers that with "Rendered more hooks than
  // during the previous render", unmounts the subtree, and the boundary above
  // degrades the whole panel to a pill. Worse, unmounting throws away the poll
  // state, so every retry replayed [] → data → crash: the pill was permanent and
  // the "reload to recover" it printed was false. Hooks may never sit behind a
  // return, so the early exit lives below them now.

  // `+N` is a one-way reveal (design: the only path that may make layer 3 grow),
  // so the expanded line is the *untrimmed* roster — otherwise expanding would
  // open 20px of empty space and still hide the names it promised.
  const idle = idleLine(resting, expanded ? Number.POSITIVE_INFINITY : undefined)
  // Layer 1's chip is a toggle rather than a one-way reveal: expanding it is
  // unbounded (nine approvals would push the other two layers off a 320px panel),
  // and a state the user cannot undo is a trap. Layer 3 is bounded to two rows by
  // CSS, so it stays one-way.
  //
  // The flag has to be cleared when the overflow goes away, because the chip goes
  // with it — no chip means no `−` to press, so the state would sit at true and
  // the list would silently re-expand the next time five Bots needed you, which
  // would be a different five, minutes later. Adjusted during render rather than
  // in an effect so the corrected value is what this very render paints (and so
  // the sequence is observable without a layout engine).
  // When layer 1 is the ONLY layer with content, its three-row cap has no reason
  // to exist: the 294px below it is empty, and the user reads "three things need
  // me" while six more sit behind a chip. The cap exists so nine rows cannot push
  // the other two layers off a 320px panel; with no other layers, the only limit
  // is the panel's own height.
  const showRun = moving.length > 0 || (works ?? []).some(work => Number(work?.open) > 0)
  const onlyAttention = !showRun && resting.length === 0
  const hotOver = hot.length > ATTENTION_MAX
  if (attExpanded && !hotOver) setAttExpanded(false)
  const attOpen = attExpanded && hotOver
  const attLimit = attOpen
    ? Number.POSITIVE_INFINITY
    : (onlyAttention ? Math.max(ATTENTION_MAX, attentionCapacity) : undefined)
  const attention = attentionOf(hot, attLimit)
  // ── 退化态 ────────────────────────────────────────────────────────────────
  // Nobody is running and nothing is owed. Layer 3 may grow into a roster here,
  // and only here: the classroom band is empty, so the 400px of cream under a
  // 24px line of names is what read as a panel that never finished loading.
  // "5 need you + 4 resting" gets the same treatment — those rows fill the space
  // the cards leave, and they are quieter than the cards (no surface, no status
  // bar, no lamp), so 需要你 stays the first thing the eye lands on.
  //
  // Membership comes from the *debounced* layers, never from the live scene. A
  // scene-only test would repaint the roster as a 24px line for one tick whenever
  // a status blipped — the exact relocation the stability window exists to
  // prevent. The price is that a Bot which really did start a turn is drawn as
  // resting for LAYER_STABLE_MS; that is the same 1.2s the name line has always
  // had, and it ends in one transition (roster → classroom), not in a flicker.
  //
  // The room is whatever the band above leaves, which is why this sits after
  // `attention`: eight cards leave 56px, and one row of roster is not worth the
  // switch — below two rows the line wins, because the line always fits.
  const hotBand = attention.items.length
    ? attention.items.length * ATTENTION_ROW_H + (attention.items.length - 1) * ATTENTION_GAP + ATTENTION_PAD_V
    : ATTENTION_EMPTY_ROW_H + ATTENTION_PAD_V
  // The notice term is the CSS maximum rather than the measured height: a notice
  // is the one thing above the roster that appears without a resize, and a stale
  // snapshot — which shows every Bot idle — is exactly when one does.
  // Over-reserving costs a column in a state that already says the feed is
  // broken; under-reserving hides a Bot.
  const rosterRoom = panelH - HEAD_H - PANEL_BORDER - hotBand - (notices.length ? NOTICES_MAX_H : 0)
  const rosterRows = Math.max(1, Math.floor(rosterRoom / ATTENTION_ROW_H))
  const rest = !showRun && resting.length > 0 && rosterRows >= 2
  const rosterNeed = Math.max(1, Math.ceil(resting.length / rosterRows))
  const rosterWidth = panelW - PANEL_BORDER - ROSTER_PAD_H
  const rosterFit = Math.max(1, Math.floor(rosterWidth / ROSTER_CELL_FULL))
  const rosterTight = rosterNeed > rosterFit
  const rosterCols = Math.min(rosterNeed, rosterTight
    ? Math.max(1, Math.floor(rosterWidth / ROSTER_CELL_MIN))
    : rosterFit)
  // `expanded` is the one-way reveal of the *line*. Entering the roster would
  // otherwise leave it armed, so the next mixed snapshot would open the line at
  // 44px for no reason the user can see.
  if (rest && expanded) setExpanded(false)
  // The hand-off table lives inside the running band's scroll area, but *above*
  // the workstation grid. When six Bots are running the two rows of cells already
  // fill the band (268px of 269px), so the table cannot stay on screen with them —
  // and the moment that happens is exactly when it matters most: right after
  // handing work to the whole team, when eight Bots run and eight edges open at
  // once. Given a scroll is unavoidable there, the relation is the thing to see
  // first: workstations never move and are remembered by position, while which
  // debts are open is new information every time. The header's `N 项在交接` covers
  // the case where you never scroll at all.
  //
  // It is also the only reason the running band exists when nobody is running:
  // open debts with no owner at work are still worth showing.
  // (`showRun` is computed above, next to the layer-1 capacity it feeds.)

  // The running band is the only scroll area, and macOS hides its scrollbar when
  // the mouse is still — so a second or third row of workstations can be entirely
  // off-screen with no hint that it exists. Measured rather than computed: the
  // number of rows depends on the panel width, the notices, the hand-off table
  // and the two other layers, and a second arithmetic copy of that would drift
  // exactly like the old height budget did.
  const runRef = useRef(null)
  const [runOverflow, setRunOverflow] = useState(0)
  const measureRun = useCallback(() => {
    const el = runRef.current
    if (!el?.querySelector) return
    const grid = el.querySelector('.bb-run-grid')
    const cells = grid ? [...grid.children] : []
    if (!cells.length) {
      setRunOverflow(previous => (previous === 0 ? previous : 0))
      return
    }
    const box = el.getBoundingClientRect()
    const hidden = countBelow(cells.map(cell => cell.getBoundingClientRect().top), box.bottom)
    setRunOverflow(previous => (previous === hidden ? previous : hidden))
  }, [])
  // The panel's own size is a dependency: a resize changes `.bb-run`'s visible
  // height, which changes what is below the fold, and a hint that still reports
  // the pre-resize count is the same lie as a clock that keeps ticking offline.
  useEffect(() => {
    measureRun()
  }, [measureRun, moving.length, works.length, rows.length, attOpen, expanded, panelW, panelH])
  const idleVisible = idle.items.length > 0 || idle.overflow > 0

  // No Bots at all — "载入中…" before the first answer, or "还没有 Bot" after it.
  // Last, not first: every hook above has to run on every render (see the note
  // where this block used to sit, above `idleLine`).
  if (!rows.length) {
    return h('div', { className: 'bb-body' },
      notices.length ? h('div', { className: 'bb-notices' }, notices) : null,
      empty)
  }

  return h('div', { className: 'bb-body' },
    notices.length ? h('div', { className: 'bb-notices' }, notices) : null,

    // Layer 1 — 需要你. Always rendered: an empty list is one summary line, never
    // blank, because "I looked and there is nothing" is the answer to the
    // question this panel exists for.
    h(Attention, {
      items: attention.items,
      overflow: attention.overflow,
      expanded: attOpen,
      t,
      onOpen,
      onExpand: () => setAttExpanded(value => !value),
    }),

    // Layer 2 — 在动. The only scroll area in the panel; layers 1 and 3 are
    // always inside the viewport, so "is anything waiting on me" and "who is
    // free" never need a scroll.
    showRun
      ? h('div', { className: 'bb-run', ref: runRef, onScroll: measureRun },
          h(Handoffs, { works, t, onPick, sceneOf }),
          moving.length
            ? h('div', { className: 'bb-run-grid' },
                moving.map(row => h(Station, {
                  key: row.bot.id, row, onOpen, note: row.note, t, compact: true,
                })))
            : null)
      : null,

    // Overlay, not a line: a hint that consumes height would shrink the band and
    // change the very count it is reporting. It sits above the idle row.
    runOverflow > 0
      ? h('div', {
          className: 'bb-run-more',
          style: { bottom: idleVisible ? IDLE_ROW_H + 2 : 6 },
          role: 'status',
        }, t('run.overflow').replace('{n}', String(runOverflow)))
      : null,

    // Layer 3 — 闲着. Two forms, one rule: the line is the default, the roster is
    // what 退化态 gets (see `rest` above). Both are roster-ordered and both open
    // the same drawer, so a Bot never moves because a status changed.
    rest
      ? h(IdleRoster, {
          items: resting,
          cols: rosterCols,
          capacity: rosterCols * rosterRows,
          tight: rosterTight,
          align: attention.items.length ? 'top' : 'center',
          t,
          onOpen,
        })
      : h(IdleLine, {
          items: idle.items,
          overflow: idle.overflow,
          expanded,
          t,
          onOpen,
          onExpand: () => setExpanded(true),
        }))
}

// Everything the header and the collapsed pill report, derived in one place so
// the static preview (tools/export-preview.mjs) cannot show different numbers
// from the panel it is supposed to be previewing.
//
// There is deliberately no `最久` here. v0.4.0 printed `最久 4m12s` in the header;
// the static preview measured the header at the 420px design baseline and it
// needed 288px in 255px of space, so the last item — that one — was clipped by
// 33px, showing a half number. It was also the only item in the header that never
// changes a decision, and layer 2 prints every duration anyway. Removing it makes
// the remaining five fit at 420 (226 ≤ 255).
export function summarize(rows, works) {
  const counts = { busy: 0, alert: 0, waiting: 0, error: 0, idle: 0, done: 0, total: rows.length }
  for (const row of rows) counts[row.scene] = (counts[row.scene] ?? 0) + 1
  const openHandoffs = (works ?? []).reduce((sum, work) => sum + (Number(work?.open) || 0), 0)
  const tone = counts.error ? LAMP.error
    : counts.alert ? LAMP.alert
      : counts.waiting ? LAMP.waiting
        : counts.busy ? LAMP.busy
          : LAMP.idle
  return { counts, openHandoffs, tone }
}

// The header. Extracted so the static preview (tools/export-preview.mjs) can mount
// the real chrome instead of re-typing it — a preview that re-types the header
// drifts from the panel and then "verifies" something the product no longer does.
// Pure: every value comes in as a prop, including the drag handlers.
export function Head({ counts, openHandoffs = 0, tone, t, onHelp, onCollapse, drag = {} }) {
  return h('div', { className: 'bb-head', ...drag, title: t('panel.drag') },
    h(Dot, { tone, busy: counts.busy > 0 }),
    h('span', { className: 'bb-title' }, t('panel.title')),
    h('span', { className: 'bb-grow' }),
    // Counts report 需要你 first. The old order led with 干活, which is the one
    // number that never needs the user; emphasis is weight, not colour, because
    // the header follows the host theme and a hard-coded colour goes invisible in
    // a dark one. Both zeroes are shown on purpose: a quiet board has to be able
    // to say "0 waiting, 0 stuck" rather than say nothing.
    h('span', { className: 'bb-sum' },
      h('span', { className: counts.alert ? 'bb-sum-hot' : 'bb-sum-quiet' },
        `${counts.alert} ${t('legend.alert')}`),
      h('span', { className: counts.error ? 'bb-sum-hot' : 'bb-sum-quiet' },
        `${counts.error} ${t('legend.error')}`),
      h('span', { className: 'bb-sum-quiet' }, `${counts.busy} ${t('legend.busy')}`),
      h('span', { className: 'bb-sum-quiet' }, `${counts.waiting} ${t('legend.waiting')}`),
      openHandoffs
        ? h('span', { className: 'bb-sum-quiet' }, t('panel.sumHandoff').replace('{n}', String(openHandoffs)))
        : null),
    // The legend used to be a permanent 27px strip here — six swatches that never
    // changed, at the eye's first landing point. It is now one 24px button that
    // costs nothing until you ask.
    h('button', {
      className: 'bb-icon',
      type: 'button',
      onClick: onHelp,
      title: t('legend.help'),
      'aria-label': t('legend.help'),
    }, '?'),
    h('button', { className: 'bb-icon', type: 'button', onClick: onCollapse, title: t('panel.collapse') }, '×'))
}

function BoardView(props) {
  const t = (typeof props?.t === 'function' ? props.t : null) ?? defaultT
  const [collapsed, setCollapsed] = useState(() => readRaw(COLLAPSE_KEY, '0') === '1')
  const [size, setSize] = useState(readSize)
  const [pos, setPos] = useState(() => clampPos(readPos(), readSize()))
  // One sheet, not two: `{kind:'bot', id}` | `{kind:'legend'}` | null. A second
  // drawer instance would fight this one over `previous.focus()` and Tab.
  const [sheet, setSheet] = useState(null)
  const [waveMap, setWaveMap] = useState({})
  const [noteMap, setNoteMap] = useState({})

  const wrapRef = useRef(null)
  const dragRef = useRef(null)
  const rzRef = useRef(null)
  const posRef = useRef(pos)
  const sizeRef = useRef(size)
  const seenRef = useRef(new Set())
  const primedRef = useRef(false)
  const openRef = useRef(new Map())
  const waveTimers = useRef(new Map())
  const noteTimers = useRef(new Map())

  const { view, board, error } = useTeam({ active: !collapsed })

  useEffect(() => { ensureStyle() }, [])
  useEffect(() => { posRef.current = pos }, [pos])
  useEffect(() => { sizeRef.current = size }, [size])

  // A window that shrinks must not strand the panel outside the viewport.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined
    const onResize = () => {
      setSize(previous => {
        const w = fitWidth(previous.w)
        const h = Math.min(previous.h, Math.max(SIZE_MIN.h, (window.innerHeight || 0) - 60))
        return w === previous.w && h === previous.h ? previous : { w, h }
      })
      setPos(previous => (previous ? clampPos(previous, sizeRef.current) : previous))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Keyboard handling for the sheet — the bot drawer and the legend drawer share
  // it, because there is exactly one `.bb-drawer` in the tree at a time. Without
  // it the sheet is a visual overlay the keyboard walks straight past: focus stays
  // on the row underneath, Tab keeps moving through the layers behind it, and
  // there is no way out but the mouse. Move focus in, keep Tab inside, close on
  // Escape, hand focus back to whatever opened it (a `?` button or a list row).
  useEffect(() => {
    if (!sheet) return undefined
    if (typeof document === 'undefined') return undefined
    const host = wrapRef.current
    if (!host?.querySelector) return undefined
    const drawer = host.querySelector('.bb-drawer')
    const previous = document.activeElement ?? null
    const focusable = () => [...(drawer?.querySelectorAll?.('button:not([disabled])') ?? [])]
    focusable()[0]?.focus?.()

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setSheet(null)
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus?.()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus?.()
      }
    }
    host.addEventListener('keydown', onKeyDown)
    return () => {
      host.removeEventListener('keydown', onKeyDown)
      // Back to the row that opened it, not to the top of the page.
      previous?.focus?.()
    }
  }, [sheet])

  const flip = useCallback(value => {
    setCollapsed(value)
    writeRaw(COLLAPSE_KEY, value ? '1' : '0')
  }, [])

  // The live `api/bot` feed carries DS Bot's own `avatar` object, while the host
  // snapshot carries the flattened `shape`. Normalise here so `seatOf` sees one
  // field whichever source answered first.
  const botSource = view?.bots ?? board?.bots
  // This is the main path — `api/bot` answers first, so the host's `text()`
  // sanitiser never sees these values. Normalise here, not only there: every
  // field below is rendered as a child or a title, and a non-string crashes the
  // tree (there is an error boundary now, but a blank pill is not a board).
  const bots = useMemo(() => (Array.isArray(botSource) ? botSource.map(bot => {
    if (!bot || typeof bot !== 'object') return null
    const shape = bot.shape === undefined ? bot.avatar?.shape : bot.shape
    const id = typeof bot.id === 'string' ? sanitize(bot.id) : (bot.id === undefined || bot.id === null ? '' : String(bot.id))
    if (!id) return null
    return {
      ...bot,
      id,
      name: sanitize(bot.name).slice(0, 40) || id,
      role: sanitize(bot.role).slice(0, 120),
      model: sanitize(bot.model).slice(0, 60) || null,
      sessionId: sanitize(bot.sessionId).slice(0, 80) || null,
      shape: typeof shape === 'string' ? shape : null,
      color: typeof bot.color === 'string' ? bot.color : null,
    }
  }).filter(Boolean) : []), [botSource])
  const activity = view?.activity ?? {}
  const workBots = view?.work?.bots ?? {}
  const waiting = view?.work?.waiting ?? {}
  const approvals = Array.isArray(view?.work?.approvals) ? view.work.approvals : []
  const questions = view?.questions ?? {}
  const errors = Array.isArray(board?.errors) ? board.errors : []
  const works = Array.isArray(board?.works) ? board.works : []
  const rooms = board?.rooms ?? {}

  const nameOf = useCallback(id => {
    const name = bots.find(bot => bot.id === id)?.name
    // The fallback is an id from another process's feed and it lands in a
    // system notification title, so it goes through the sanitiser too.
    return name ?? sanitize(typeof id === 'string' ? id : String(id ?? ''))
  }, [bots])
  // When the live feed fails, the last good `view` stays on screen. Freezing the
  // clock is the honest half of that: "18m40s" was measured against a feed that
  // stopped answering 15 minutes ago, and a monitoring tool must not keep counting
  // on behalf of a process it can no longer hear.
  const viewStale = view?.stale === true
  const freezeAt = viewStale ? Number(view?.fetchedAt) || 0 : 0
  const rows = useMemo(() => buildRows({
    bots, activity, workBots, waiting, approvals, questions, errors, works, rooms,
    waveMap, noteMap, t, nameOf, now: freezeAt || Date.now(), freezeAt,
  }), [bots, activity, workBots, waiting, approvals, questions, errors, works, rooms, waveMap, noteMap, nameOf, t, freezeAt])

  const { counts, openHandoffs, tone } = summarize(rows, works)
  // Body height minus the head and the 10px attention padding, divided by one
  // row plus its gap. At 560×480 this is 9 — exactly the case that used to show
  // three rows and 294px of nothing.
  const attentionCapacity = Math.max(ATTENTION_MAX, Math.floor(
    (size.h - HEAD_H - PANEL_BORDER - 10) / (ATTENTION_ROW_H + ATTENTION_GAP)))

  const openDrawer = useCallback(row => {
    const id = row?.bot?.id
    if (id) setSheet({ kind: 'bot', id })
  }, [])
  const openChat = useCallback(row => {
    const raw = row?.bot?.sessionId ?? row?.bot?.id
    // `sessionId` arrives from another process's file. `openSession` jumps the
    // host's main view, so a malformed value must not be handed over at all.
    const id = typeof raw === 'string' ? raw.slice(0, 128) : ''
    if (id) openSession(id)
  }, [])

  // `questions` is keyed by session id, not Bot id, so a question needs its own
  // name lookup. It also needs its own notification: the comment above this
  // effect always said "approvals/questions", but the code only walked approvals,
  // so the one kind of waiting that blocks a Bot silently never rang.
  const questionList = useMemo(() => Object.entries(questions ?? {})
    .filter(([, item]) => item && typeof item === 'object')
    .map(([sessionId, item]) => ({ sessionId, question: item.question, botId: item.botId })), [questions])
  const nameOfSession = useCallback(sessionId => {
    const bot = bots.find(item => item.sessionId === sessionId || item.id === sessionId)
    return bot?.name ?? sessionId
  }, [bots])

  // System notifications: only approvals/questions and new failures, once each.
  const alertSig = JSON.stringify(approvals.map(item => item?.id))
    + '|' + JSON.stringify(errors.map(item => `${item.botId}:${item.at}`))
    + '|' + JSON.stringify(questionList.map(item => item.sessionId))
  useEffect(() => {
    const keys = [
      ...approvals.map(item => `a:${item?.id}`),
      ...errors.map(item => `e:${item.botId}:${item.at}`),
      ...questionList.map(item => `q:${item.sessionId}`),
    ]
    if (!primedRef.current) {
      keys.forEach(key => seenRef.current.add(key))
      primedRef.current = true
      return
    }
    for (const item of approvals) {
      const key = `a:${item?.id}`
      if (seenRef.current.has(key)) continue
      seenRef.current.add(key)
      notify(`${t('notice.approval')} · ${nameOf(item?.botId)}`,
        item?.tool ? `${t('notice.approvalBody')} ${clip(item.tool, 40)}${item.reason ? `：${clip(item.reason, 40)}` : ''}` : t('notice.approvalFallback'))
    }
    for (const item of errors) {
      const key = `e:${item.botId}:${item.at}`
      if (seenRef.current.has(key)) continue
      seenRef.current.add(key)
      notify(`${t('notice.error')} · ${nameOf(item.botId)}`, clip(item.message, 80))
    }
    for (const item of questionList) {
      const key = `q:${item.sessionId}`
      if (seenRef.current.has(key)) continue
      seenRef.current.add(key)
      notify(`${t('notice.question')} · ${nameOfSession(item.sessionId)}`,
        clip(item.question, 80) || t('notice.questionFallback'))
    }
    // Keep the dedupe set bounded on long sessions — but keep the OLD keys too:
    // rebuilding it from the current keys alone dropped every pending failure and
    // re-notified them on the next poll.
    if (seenRef.current.size > 400) {
      const kept = [...seenRef.current].slice(-200)
      seenRef.current = new Set([...kept, ...keys])
    }
  }, [alertSig])

  // 派活交接完成: a work dropping to 0 open items just handed off cleanly, so the
  // receiver shows the 干完 scene for 7 seconds and a paper note flies onto its
  // desk for 2.
  useEffect(() => {
    for (const work of works) {
      const key = work.id ?? `${work.from}-${work.at}`
      const previous = openRef.current.get(key)
      if (previous !== undefined && previous > 0 && work.open === 0 && work.toId) {
        const botId = work.toId
        setWaveMap(prev => (prev[botId] ? prev : { ...prev, [botId]: true }))
        setNoteMap(prev => (prev[botId] ? prev : { ...prev, [botId]: true }))
        clearTimeout(waveTimers.current.get(botId))
        clearTimeout(noteTimers.current.get(botId))
        waveTimers.current.set(botId, setTimeout(() => {
          waveTimers.current.delete(botId)
          setWaveMap(prev => {
            if (!prev[botId]) return prev
            const next = { ...prev }
            delete next[botId]
            return next
          })
        }, 7000))
        noteTimers.current.set(botId, setTimeout(() => {
          noteTimers.current.delete(botId)
          setNoteMap(prev => {
            if (!prev[botId]) return prev
            const next = { ...prev }
            delete next[botId]
            return next
          })
        }, 2000))
      }
      openRef.current.set(key, work.open ?? 0)
    }
    // Drop ids the snapshot no longer carries, so the map cannot grow forever.
    if (openRef.current.size > 64) {
      const alive = new Set(works.map(work => work.id ?? `${work.from}-${work.at}`))
      for (const key of [...openRef.current.keys()]) {
        if (!alive.has(key)) openRef.current.delete(key)
      }
    }
  }, [works])

  useEffect(() => () => {
    for (const timer of waveTimers.current.values()) clearTimeout(timer)
    for (const timer of noteTimers.current.values()) clearTimeout(timer)
    waveTimers.current.clear()
    noteTimers.current.clear()
  }, [])

  const onPointerDown = event => {
    if (event.target.closest('button') || event.target.closest('.bb-rz')) return
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top, w: rect.width, h: rect.height }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = event => {
    const drag = dragRef.current
    if (!drag) return
    const left = Math.min(Math.max(6, event.clientX - drag.dx), Math.max(6, window.innerWidth - drag.w - 6))
    const top = Math.min(Math.max(6, event.clientY - drag.dy), Math.max(6, window.innerHeight - 60))
    setPos({ left, top })
  }
  const onPointerUp = () => {
    if (!dragRef.current) return
    dragRef.current = null
    writeRaw(POS_KEY, JSON.stringify(posRef.current))
  }

  const onResizeDown = event => {
    event.stopPropagation()
    rzRef.current = { x: event.clientX, y: event.clientY, w: sizeRef.current.w, h: sizeRef.current.h }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const onResizeMove = event => {
    const start = rzRef.current
    if (!start) return
    const w = Math.min(SIZE_MAX.w, Math.max(SIZE_MIN.w, start.w + event.clientX - start.x),
      Math.max(SIZE_MIN.w, (window.innerWidth || 0) - 12))
    // The height is clamped to the viewport on the same terms the window
    // resize handler uses (`:488`) and the drag does for `top` (`:727`).
    // Without it a short window lets the grip — and the panel's lower half —
    // be dragged off-screen, and only a window resize brings them back.
    const hh = Math.min(SIZE_MAX.h, Math.max(SIZE_MIN.h, start.h + event.clientY - start.y),
      Math.max(SIZE_MIN.h, (window.innerHeight || 0) - 60))
    setSize({ w, h: hh })
  }
  const onResizeUp = () => {
    if (!rzRef.current) return
    rzRef.current = null
    writeRaw(SIZE_KEY, JSON.stringify(sizeRef.current))
    // Growing the panel near an edge can push it past the viewport; settle it back.
    const next = clampPos(posRef.current, sizeRef.current)
    if (next) {
      posRef.current = next
      setPos(next)
      writeRaw(POS_KEY, JSON.stringify(next))
    }
  }

  // A board with no DS Bot behind it is not a board. Showing "no state file" in
  // every chat of a DSH install that never had DS Bot is noise, so the panel stays
  // invisible while that is the answer — and becomes visible for good as soon as
  // one snapshot succeeds, because a panel that blinks out on a single bad read is
  // worse than one that says so. The first frame (no answer yet) still renders the
  // loading state: an empty panel is not the same thing as "not asked yet".
  const seenOk = useRef(false)
  if (board?.ok === true) seenOk.current = true
  if (!seenOk.current && board?.ok === false && board.reason === 'no-state') return null

  const wrapStyle = pos ? { left: pos.left, top: pos.top, right: 'auto', bottom: 'auto' } : undefined
  const drawerRow = sheet?.kind === 'bot' ? rows.find(row => row.bot.id === sheet.id) ?? null : null
  const loading = !view && !board && !error
  const reason = board && board.ok === false
    ? (board.reason === 'no-state' ? t('panel.noState')
      : board.reason === 'unreadable' ? t('panel.unreadable')
        : board.reason ?? '')
    : ''

  // How many items are still owed across every open record is part of `summarize`
  // so "is anything in flight at all" stays on the first line even when the table
  // itself has scrolled below the fold.
  const sceneOf = id => rows.find(row => row.bot.id === id)?.scene

  const notices = []
  // Both error channels carry text another process wrote. poll.js sanitises at
  // the door; this is the same insurance at the render, the way the bot list
  // normalises in two places on purpose.
  const errorText = error === 'timeout' ? t('panel.timeout') : sanitize(error)
  if (error) notices.push(h('div', { className: 'bb-notice', key: 'offline' }, `${t('panel.offline')}：${errorText}`))
  if (board?.boardError) notices.push(h('div', { className: 'bb-notice', key: 'board' }, `${t('panel.boardError')}：${sanitize(board.boardError)}`))
  if (reason) notices.push(h('div', { className: 'bb-notice bb-notice-warn', key: 'reason' }, reason))
  if (board?.stale) notices.push(h('div', { className: 'bb-notice bb-notice-warn', key: 'stale' }, t('panel.stale')))
  if (viewStale) notices.push(h('div', { className: 'bb-notice bb-notice-warn', key: 'viewStale' }, t('panel.viewStale')))
  // state.json carries DS Bot's data format version. A mismatch is not a crash —
  // it is a board that looks right and reads the wrong field, so it has to say so.
  if (Number.isFinite(board?.dataVersion) && board.dataVersion !== 1) {
    notices.push(h('div', { className: 'bb-notice bb-notice-warn', key: 'dataVersion' },
      `${t('panel.dataVersion')} (v${board.dataVersion})`))
  }

  if (collapsed) {
    return h('div', { className: 'bb-wrap', style: wrapStyle },
      h('button', {
        className: 'bb-pill', type: 'button',
        onClick: () => flip(false), title: t('panel.expand'),
      },
        h(Dot, { tone, busy: counts.busy > 0 }),
        h('b', null, `${counts.busy} ${t('legend.busy')}`),
        counts.alert ? h('span', { style: { fontWeight: 600 } }, `${counts.alert} ${t('legend.alert')}`) : null,
        counts.waiting ? h('span', null, `${counts.waiting} ${t('legend.waiting')}`) : null,
        counts.error ? h('span', { style: { fontWeight: 600 } }, `${counts.error} ${t('legend.error')}`) : null,
        // "0 干活" on its own reads as "no Bots". When nothing is moving, the
        // total is the answer to the question the pill exists to answer.
        counts.busy === 0 && counts.alert === 0 && counts.waiting === 0 && counts.error === 0
          ? h('span', { style: { opacity: .6 } }, t('panel.total').replace('{n}', String(counts.total)))
          : null))
  }

  return h('div', { className: 'bb-wrap', style: wrapStyle, ref: wrapRef },
    h('div', { className: 'bb-panel', style: { width: size.w, height: size.h } },
      h(Head, {
        counts,
        openHandoffs,
        tone,
        t,
        onHelp: () => setSheet(previous => (previous?.kind === 'legend' ? null : { kind: 'legend' })),
        onCollapse: () => flip(true),
        drag: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
      }),

      h(Body, {
        rows,
        works,
        notices,
        attentionCapacity,
        panelW: size.w,
        panelH: size.h,
        empty: h('div', { className: 'bb-text', style: { color: '#6B6558' } },
          loading ? t('panel.loading') : t('panel.empty')),
        t,
        onOpen: openDrawer,
        onPick: edge => {
          const target = rows.find(row => row.bot.id === edge.toId)
          if (target) openDrawer(target)
        },
        sceneOf,
      }),

      drawerRow
        ? h(Drawer, {
            row: drawerRow,
            t,
            canOpenChat: hasOpener(),
            onClose: () => setSheet(null),
            onOpenChat: row => { openChat(row); setSheet(null) },
          })
        : null,

      sheet?.kind === 'legend'
        ? h(LegendSheet, { t, onClose: () => setSheet(null) })
        : null,

      h('div', {
        className: 'bb-rz',
        title: t('panel.resize'),
        onPointerDown: onResizeDown,
        onPointerMove: onResizeMove,
        onPointerUp: onResizeUp,
        onPointerCancel: onResizeUp,
      })))
}

// A last line of defence, not the fix. Every known crash path is closed by type
// coercion above, but `state.json` belongs to another process and this panel is
// the only thing on screen that can be unmounted by a bad value. Without a
// boundary, React unmounts the whole root — the classroom disappears and the
// shell around it may go with it. With one, the worst case is a pill that says so.
//
// The pill used to be permanent: only a reload cleared it. But the value that
// broke it is one poll old, and the next poll usually carries a healed one — so
// the boundary retries on a timer instead of waiting for the user to notice.
// If the bad value persists, it crashes again and logs again; that is honest.
const BOUNDARY_RETRY_MS = 15000
class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    try { console.error('[bot-board] render failed:', error) } catch {}
    clearTimeout(this.retry)
    this.retry = setTimeout(() => this.setState({ failed: false }), BOUNDARY_RETRY_MS)
  }

  componentWillUnmount() {
    clearTimeout(this.retry)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const t = this.props.t ?? defaultT
    return h('div', { className: 'bb-wrap' },
      h('div', { className: 'bb-pill', role: 'alert' }, t('panel.crashed')))
  }
}

export function Board(props) {
  const t = (typeof props?.t === 'function' ? props.t : null) ?? defaultT
  return h(Boundary, { t }, h(BoardView, props))
}
