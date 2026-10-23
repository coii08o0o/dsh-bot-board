// The floating panel: header + three-layer body (需要你 / 在动 / 闲着) + the
// detail sheet, which doubles as the legend.
import { createElement as h, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  COLLAPSE_KEY, LAMP, LAYER_STABLE_MS, POS_KEY, SIZE_DEFAULT, SIZE_KEY, SIZE_MAX, SIZE_MIN,
} from './const.js'
import { clip } from './format.js'
import { buildRows } from './rows.js'
import { Station } from './station.js'
import { Drawer } from './drawer.js'
import { LegendSheet } from './legend.js'
import { Attention, IdleLine } from './attention.js'
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

const readSize = () => {
  try {
    const raw = readRaw(SIZE_KEY, '')
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && parsed.w && parsed.h) {
      return {
        w: Math.min(SIZE_MAX.w, Math.max(SIZE_MIN.w, parsed.w)),
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

  if (!rows.length) {
    return h('div', { className: 'bb-body' },
      notices.length ? h('div', { className: 'bb-notices' }, notices) : null,
      empty)
  }

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
  const hotOver = hot.length > ATTENTION_MAX
  if (attExpanded && !hotOver) setAttExpanded(false)
  const attOpen = attExpanded && hotOver
  const attention = attentionOf(hot, attOpen ? Number.POSITIVE_INFINITY : undefined)
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
  const showRun = moving.length > 0 || (works ?? []).some(work => Number(work?.open) > 0)

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
      ? h('div', { className: 'bb-run' },
          h(Handoffs, { works, t, onPick, sceneOf }),
          moving.length
            ? h('div', { className: 'bb-run-grid' },
                moving.map(row => h(Station, {
                  key: row.bot.id, row, onOpen, note: row.note, t, compact: true,
                })))
            : null)
      : null,

    // Layer 3 — 闲着. No image, no surface, no lamp: names only.
    h(IdleLine, {
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
  const counts = { busy: 0, alert: 0, waiting: 0, error: 0, idle: 0, done: 0 }
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

function Board(props) {
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
    const onResize = () => setPos(previous => (previous ? clampPos(previous, sizeRef.current) : previous))
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
  const bots = useMemo(() => (Array.isArray(botSource) ? botSource.map(bot => (
    bot && bot.shape === undefined ? { ...bot, shape: bot.avatar?.shape ?? null } : bot
  )) : []), [botSource])
  const activity = view?.activity ?? {}
  const workBots = view?.work?.bots ?? {}
  const waiting = view?.work?.waiting ?? {}
  const approvals = Array.isArray(view?.work?.approvals) ? view.work.approvals : []
  const questions = view?.questions ?? {}
  const errors = Array.isArray(board?.errors) ? board.errors : []
  const works = Array.isArray(board?.works) ? board.works : []
  const rooms = board?.rooms ?? {}

  const nameOf = useCallback(id => bots.find(bot => bot.id === id)?.name ?? id, [bots])
  const rows = useMemo(() => buildRows({
    bots, activity, workBots, waiting, approvals, questions, errors, works, rooms,
    waveMap, noteMap, t, nameOf,
  }), [bots, activity, workBots, waiting, approvals, questions, errors, works, rooms, waveMap, noteMap, nameOf, t])

  const { counts, openHandoffs, tone } = summarize(rows, works)

  const openDrawer = useCallback(row => {
    const id = row?.bot?.id
    if (id) setSheet({ kind: 'bot', id })
  }, [])
  const openChat = useCallback(row => {
    const id = row?.bot?.sessionId ?? row?.bot?.id
    if (id) openSession(id)
  }, [])

  // System notifications: only approvals/questions and new failures, once each.
  const alertSig = JSON.stringify(approvals.map(item => item?.id))
    + '|' + JSON.stringify(errors.map(item => `${item.botId}:${item.at}`))
  useEffect(() => {
    const keys = [
      ...approvals.map(item => `a:${item?.id}`),
      ...errors.map(item => `e:${item.botId}:${item.at}`),
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
        item?.tool ? `${t('notice.approvalBody')} ${item.tool}${item.reason ? `：${clip(item.reason, 40)}` : ''}` : t('notice.approvalFallback'))
    }
    for (const item of errors) {
      const key = `e:${item.botId}:${item.at}`
      if (seenRef.current.has(key)) continue
      seenRef.current.add(key)
      notify(`${t('notice.error')} · ${nameOf(item.botId)}`, clip(item.message, 80))
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
    const w = Math.min(SIZE_MAX.w, Math.max(SIZE_MIN.w, start.w + event.clientX - start.x))
    const hh = Math.min(SIZE_MAX.h, Math.max(SIZE_MIN.h, start.h + event.clientY - start.y))
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
  if (error) notices.push(h('div', { className: 'bb-notice', key: 'offline' }, `${t('panel.offline')}：${error}`))
  if (board?.boardError) notices.push(h('div', { className: 'bb-notice', key: 'board' }, `${t('panel.boardError')}：${board.boardError}`))
  if (reason) notices.push(h('div', { className: 'bb-notice bb-notice-warn', key: 'reason' }, reason))
  if (board?.stale) notices.push(h('div', { className: 'bb-notice bb-notice-warn', key: 'stale' }, t('panel.stale')))
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
        counts.error ? h('span', { style: { fontWeight: 600 } }, `${counts.error} ${t('legend.error')}`) : null))
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

export { Board }
