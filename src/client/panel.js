// The floating panel: header + summary, legend, the workstation grid, the
// in-flight hand-off list, and the detail drawer.
import { createElement as h, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  COLLAPSE_KEY, LEGEND, LAMP, POS_KEY, SIZE_DEFAULT, SIZE_KEY, SIZE_MAX, SIZE_MIN,
} from './const.js'
import { clip, elapsed } from './format.js'
import { buildRows } from './rows.js'
import { Station } from './station.js'
import { Drawer } from './drawer.js'
import { Handoffs } from './handoffs.js'
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

function Board(props) {
  const t = (typeof props?.t === 'function' ? props.t : null) ?? defaultT
  const [collapsed, setCollapsed] = useState(() => readRaw(COLLAPSE_KEY, '0') === '1')
  const [size, setSize] = useState(readSize)
  const [pos, setPos] = useState(() => clampPos(readPos(), readSize()))
  const [drawerId, setDrawerId] = useState(null)
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

  // Keyboard handling for the drawer. Without it the drawer is a visual overlay
  // the keyboard walks straight past: focus stays on the workstation underneath,
  // Tab keeps moving through the grid behind it, and there is no way out but the
  // mouse. Move focus in, keep Tab inside, close on Escape, hand focus back.
  useEffect(() => {
    if (!drawerId) return undefined
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
        setDrawerId(null)
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
      // Back to the workstation that opened it, not to the top of the page.
      previous?.focus?.()
    }
  }, [drawerId])

  const flip = useCallback(value => {
    setCollapsed(value)
    writeRaw(COLLAPSE_KEY, value ? '1' : '0')
  }, [])

  const bots = view?.bots ?? board?.bots ?? []
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

  const counts = useMemo(() => {
    const tally = { busy: 0, alert: 0, waiting: 0, error: 0, idle: 0, done: 0 }
    for (const row of rows) tally[row.scene] = (tally[row.scene] ?? 0) + 1
    return tally
  }, [rows])

  const longest = useMemo(() => {
    const now = Date.now()
    const live = rows.filter(row => row.since > 0 && row.scene === 'busy')
    if (!live.length) return ''
    return elapsed(Math.min(...live.map(row => row.since)), now)
  }, [rows])

  const openDrawer = useCallback(row => setDrawerId(row?.bot?.id ?? null), [])
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

  const wrapStyle = pos ? { left: pos.left, top: pos.top, right: 'auto', bottom: 'auto' } : undefined
  const tone = counts.error ? LAMP.error : counts.alert ? LAMP.alert : counts.waiting ? LAMP.waiting : counts.busy ? LAMP.busy : LAMP.idle
  const drawerRow = drawerId ? rows.find(row => row.bot.id === drawerId) ?? null : null
  const loading = !view && !board && !error
  const reason = board && board.ok === false
    ? (board.reason === 'no-state' ? t('panel.noState')
      : board.reason === 'unreadable' ? t('panel.unreadable')
        : board.reason ?? '')
    : ''

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
      h('div', {
        className: 'bb-head',
        onPointerDown, onPointerMove, onPointerUp,
        onPointerCancel: onPointerUp,
        title: t('panel.drag'),
      },
        h(Dot, { tone, busy: counts.busy > 0 }),
        h('span', { className: 'bb-title' }, t('panel.title')),
        h('span', { className: 'bb-grow' }),
        h('span', { className: 'bb-sum' },
          h('span', null, `${counts.busy} ${t('legend.busy')}`),
          counts.alert ? h('span', { className: 'bb-sum-hot' }, `${counts.alert} ${t('legend.alert')}`) : null,
          counts.waiting ? h('span', null, `${counts.waiting} ${t('legend.waiting')}`) : null,
          counts.error ? h('span', { className: 'bb-sum-hot' }, `${counts.error} ${t('legend.error')}`) : null,
          longest ? h('span', null, `${t('panel.mostly')} ${longest}`) : null),
        h('button', { className: 'bb-icon', type: 'button', onClick: () => flip(true), title: t('panel.collapse') }, '×')),

      h('div', { className: 'bb-legend' },
        LEGEND.map(([key, labelKey]) => h('span', { className: 'bb-lg', key },
          h('i', { className: `bb-lg-${key}`, style: { background: LAMP[key] } }),
          t(labelKey)))),

      h('div', { className: 'bb-body' },
        error ? h('div', { className: 'bb-notice' }, `${t('panel.offline')}：${error}`) : null,
        board?.boardError ? h('div', { className: 'bb-notice' }, `${t('panel.boardError')}：${board.boardError}`) : null,
        reason ? h('div', { className: 'bb-notice bb-notice-warn' }, reason) : null,
        board?.stale ? h('div', { className: 'bb-notice bb-notice-warn' }, t('panel.stale')) : null,
        loading
          ? h('div', { className: 'bb-text', style: { color: '#6B6558' } }, t('panel.loading'))
          : rows.length
            ? h('div', { className: 'bb-grid' },
                rows.map(row => h(Station, { key: row.bot.id, row, onOpen: openDrawer, note: row.note, t })))
            : h('div', { className: 'bb-text', style: { color: '#6B6558' } }, t('panel.empty'))),

      h(Handoffs, {
        works,
        t,
        onPick: work => {
          const target = rows.find(row => row.bot.id === work.toId)
          if (target) openDrawer(target)
        },
      }),

      drawerRow
        ? h(Drawer, {
            row: drawerRow,
            t,
            canOpenChat: hasOpener(),
            onClose: () => setDrawerId(null),
            onOpenChat: row => { openChat(row); setDrawerId(null) },
          })
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
