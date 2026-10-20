// dsh-bot-board — browser half.
// A floating "Bot classroom" over the DSH shell: one cream room, 3x3
// workstations, and a round dumpling Bot at each desk (Grok Bot / OpenAI Dots
// style, hand-drawn in SVG). Status reads off the lamp, the monitor and the
// blob's face and little motions.
// Hand-written single-file bundle: no build step, React comes from the shared loader.
window.__ModuleLoader__.load({
  id: 'dsh-bot-board',
  factory: (require) => {
    const React = require('react')
    const { useCallback, useEffect, useMemo, useRef, useState } = React
    const h = React.createElement

    const POLL_MS = 1500
    const HIDDEN_POLL_MS = 10000
    const BOARD_MS = 2500
    const COLLAPSE_KEY = 'dsh-bot-board:collapsed:v4'
    const POS_KEY = 'dsh-bot-board:pos'
    const SIZE_KEY = 'dsh-bot-board:size'
    const SIZE_DEFAULT = { w: 560, h: 420 }
    const SIZE_MIN = { w: 420, h: 320 }
    const SIZE_MAX = { w: 980, h: 700 }

    // Five classroom statuses: lamp colour, legend word, name ink.
    const LAMP = { busy: '#22C55E', alert: '#EAB308', error: '#EF4444', idle: '#D3D1C7', done: '#0F766E' }
    const LEGEND = [['busy', '干活'], ['alert', '等你'], ['error', '卡住'], ['idle', '闲着'], ['done', '干完']]
    const NAME_INK = { error: '#B91C1C', done: '#0F766E' }
    const STATUS_TEXT = {
      working: '干活中', thinking: '思考中', searching: '查资料', sending: '发消息', orbit: '转交中',
      alert: '等你处理', error: '出错了', waiting: '等回话', idle: '闲着',
    }

    // 9 Bots = 9 flat body colours + lighter face disc + one head accessory +
    // one desk prop. Identity is fixed by Bot name so a Bot keeps its face
    // across refreshes; strangers hash into the roster.
    const ROSTER = [
      { name: 'Chief', color: '#378ADD', face: '#7FB4E8', head: 'crown', prop: 'flag' },
      { name: 'Researcher', color: '#EC4899', face: '#F5A3CD', head: 'glasses', prop: 'magnifier' },
      { name: '班主任', color: '#F59E0B', face: '#FBCB74', head: 'bowRed', prop: 'pointer' },
      { name: '数学', color: '#8B5CF6', face: '#BCA5F8', head: 'glasses', prop: 'abacus' },
      { name: '物理', color: '#14B8A6', face: '#7FD8CE', head: 'headphones', prop: 'bolt' },
      { name: '化学', color: '#22C55E', face: '#86E5A3', head: 'hat', prop: 'flask' },
      { name: '生物', color: '#84CC16', face: '#BDE873', head: 'sprout', prop: 'leaf' },
      { name: '语文', color: '#EF4444', face: '#F59C9C', head: 'bowCream', prop: 'books' },
      { name: '英语', color: '#F97316', face: '#FBB277', head: 'headphones', prop: 'mic' },
    ]
    function seatOf(bot) {
      const name = typeof bot?.name === 'string' ? bot.name : ''
      const fixed = ROSTER.find(item => item.name === name)
      if (fixed) return fixed
      const id = String(bot?.id ?? name)
      let hash = 0
      for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
      return ROSTER[hash % ROSTER.length]
    }
    // The five classroom scenes. Priority: error/alert outrank a finished
    // hand-off ("done"), which outranks idle/busy — a 7-second 干完 window must
    // never mask a fresh failure or approval (waiting folds into alert and
    // therefore also outranks done: problems first).
    function sceneOf(status, done) {
      if (status === 'error') return 'error'
      if (status === 'alert' || status === 'waiting') return 'alert'
      if (done) return 'done'
      if (status === 'idle') return 'idle'
      return 'busy'
    }

    const pad = value => String(value).padStart(2, '0')
    function ago(ms) {
      if (!ms) return ''
      const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
      if (s < 10) return '刚刚'
      if (s < 60) return `${s} 秒前`
      if (s < 3600) return `${Math.round(s / 60)} 分钟前`
      if (s < 86400) return `${Math.round(s / 3600)} 小时前`
      return `${Math.round(s / 86400)} 天前`
    }
    function elapsed(ms) {
      const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
      if (s < 60) return `${s}s`
      const m = Math.floor(s / 60)
      if (m < 60) return `${m}m${pad(s % 60)}s`
      return `${Math.floor(m / 60)}h${pad(m % 60)}m`
    }
    const clip = (value, max) => {
      const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
      return text.length > max ? `${text.slice(0, max)}…` : text
    }

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

    // Set once in apply(): opens a Bot's own chat in the main pane.
    let openSession = null
    // ---- hand-drawn dumpling station (all SVG, flat fills, no gradients) ----
    const DARK = '#2C2C2A'
    const FACE_X = 86
    const FACE_Y = 62
    const BODY_R = 26

    // Head accessories that sit on top of the blob body.
    function headGear(kind) {
      const cx = FACE_X
      const top = FACE_Y - BODY_R
      if (kind === 'crown') {
        return h('path', {
          d: `M ${cx - 13} ${top + 2} L ${cx - 9} ${top - 8} L ${cx - 4} ${top - 1} L ${cx} ${top - 10} L ${cx + 4} ${top - 1} L ${cx + 9} ${top - 8} L ${cx + 13} ${top + 2} Z`,
          fill: '#FBBF24', stroke: '#D97706', strokeWidth: 1.5, strokeLinejoin: 'round',
        })
      }
      if (kind === 'bowRed' || kind === 'bowCream') {
        const fill = kind === 'bowRed' ? '#DC2626' : '#FDE68A'
        return h('g', null,
          h('path', { d: `M ${cx + 14} ${top + 4} l -9 -6 v 12 z`, fill }),
          h('path', { d: `M ${cx + 14} ${top + 4} l 9 -6 v 12 z`, fill }),
          h('circle', { cx: cx + 14, cy: top + 4, r: 3, fill }))
      }
      if (kind === 'hat') {
        return h('g', null,
          h('path', { d: `M ${cx - 15} ${top + 1} a 15 13 0 0 1 30 0 z`, fill: '#15803D' }),
          h('rect', { x: cx - 19, y: top, width: 38, height: 5, rx: 2.5, fill: '#166534' }))
      }
      if (kind === 'sprout') {
        return h('g', null,
          h('line', { x1: cx, y1: top + 2, x2: cx, y2: top - 8, stroke: '#15803D', strokeWidth: 2, strokeLinecap: 'round' }),
          h('ellipse', { cx: cx - 6, cy: top - 10, rx: 6, ry: 3.5, fill: '#16A34A', transform: `rotate(-24 ${cx - 6} ${top - 10})` }),
          h('ellipse', { cx: cx + 6, cy: top - 10, rx: 6, ry: 3.5, fill: '#22C55E', transform: `rotate(24 ${cx + 6} ${top - 10})` }))
      }
      return null
    }

    // Face-level accessories drawn over the face disc.
    function faceGear(kind) {
      if (kind === 'glasses') {
        return h('g', { fill: 'none', stroke: DARK, strokeWidth: 2 },
          h('circle', { cx: FACE_X - 9, cy: FACE_Y - 4, r: 6.5 }),
          h('circle', { cx: FACE_X + 9, cy: FACE_Y - 4, r: 6.5 }),
          h('line', { x1: FACE_X - 2.5, y1: FACE_Y - 4, x2: FACE_X + 2.5, y2: FACE_Y - 4 }))
      }
      if (kind === 'headphones') {
        return h('g', null,
          h('path', {
            d: `M ${FACE_X - 20} ${FACE_Y - 2} a 20 20 0 0 1 40 0`,
            fill: 'none', stroke: DARK, strokeWidth: 4, strokeLinecap: 'round',
          }),
          h('rect', { x: FACE_X - 23, y: FACE_Y - 5, width: 8, height: 13, rx: 4, fill: DARK }),
          h('rect', { x: FACE_X + 15, y: FACE_Y - 5, width: 8, height: 13, rx: 4, fill: DARK }))
      }
      return null
    }

    // The desk prop, sitting on the desk top (surface y = 88).
    function deskProp(kind) {
      if (kind === 'flag') {
        return h('g', null,
          h('line', { x1: 60, y1: 70, x2: 60, y2: 88, stroke: '#A16207', strokeWidth: 2.5, strokeLinecap: 'round' }),
          h('path', { d: 'M 60 70 h 16 l -4 5 4 5 h -16 z', fill: '#378ADD' }))
      }
      if (kind === 'magnifier') {
        return h('g', null,
          h('circle', { cx: 63, cy: 80, r: 6, fill: 'none', stroke: DARK, strokeWidth: 2 }),
          h('line', { x1: 67.5, y1: 84.5, x2: 73, y2: 89, stroke: DARK, strokeWidth: 3, strokeLinecap: 'round' }))
      }
      if (kind === 'pointer') {
        return h('line', { x1: 56, y1: 88, x2: 76, y2: 71, stroke: '#A16207', strokeWidth: 2.5, strokeLinecap: 'round' })
      }
      if (kind === 'abacus') {
        return h('g', null,
          h('rect', { x: 54, y: 75, width: 22, height: 13, rx: 2, fill: '#F1E3C6', stroke: '#A16207', strokeWidth: 1.5 }),
          h('circle', { cx: 59, cy: 81.5, r: 2, fill: '#B45309' }),
          h('circle', { cx: 65, cy: 81.5, r: 2, fill: '#B45309' }),
          h('circle', { cx: 71, cy: 81.5, r: 2, fill: '#B45309' }))
      }
      if (kind === 'bolt') {
        return h('path', { d: 'M 66 71 l -8 12 h 6 l -3 8 9 -12 h -6 z', fill: '#FBBF24', stroke: '#D97706', strokeWidth: 1, strokeLinejoin: 'round' })
      }
      if (kind === 'flask') {
        return h('g', null,
          h('path', { d: 'M 60 71 v 6 l -7 11 h 16 l -7 -11 v -6 z', fill: '#BBF7D0', stroke: '#166534', strokeWidth: 1.5, strokeLinejoin: 'round' }),
          h('rect', { x: 58, y: 70, width: 6, height: 2.5, rx: 1, fill: '#166534' }))
      }
      if (kind === 'leaf') {
        return h('g', null,
          h('ellipse', { cx: 63, cy: 83, rx: 8, ry: 4.5, fill: '#22C55E', transform: 'rotate(-18 63 83)' }),
          h('line', { x1: 57, y1: 86, x2: 69, y2: 80, stroke: '#15803D', strokeWidth: 1.2 }))
      }
      if (kind === 'books') {
        return h('g', null,
          h('rect', { x: 54, y: 83, width: 24, height: 5, rx: 1, fill: '#EF4444' }),
          h('rect', { x: 56, y: 78, width: 22, height: 5, rx: 1, fill: '#3B82F6' }),
          h('rect', { x: 55, y: 73, width: 21, height: 5, rx: 1, fill: '#FBBF24' }))
      }
      if (kind === 'mic') {
        return h('g', null,
          h('rect', { x: 59, y: 72, width: 9, height: 13, rx: 4.5, fill: DARK }),
          h('line', { x1: 63.5, y1: 85, x2: 63.5, y2: 88, stroke: DARK, strokeWidth: 2 }))
      }
      return null
    }

    // Monitor screen content per scene: bars / red bar / blank / checkmark.
    function screenContent(scene) {
      if (scene === 'error') {
        return h('g', null,
          h('rect', { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: '#E7E5E1' }),
          h('rect', { x: 113, y: 67, width: 34, height: 4, rx: 2, fill: '#EF4444' }))
      }
      if (scene === 'idle') {
        return h('rect', { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: '#EDEBE7' })
      }
      if (scene === 'done') {
        return h('g', null,
          h('rect', { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: '#CDEFD9' }),
          h('path', {
            d: 'M 120 69 l 5 5 9 -11',
            fill: 'none', stroke: '#0F766E', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round',
          }))
      }
      // busy + alert: light blue screen with 3 small bars.
      return h('g', null,
        h('rect', { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: '#B9D8F2' }),
        h('rect', { x: 113, y: 61, width: 30, height: 3, rx: 1.5, fill: '#7FB4E8' }),
        h('rect', { x: 113, y: 67, width: 34, height: 3, rx: 1.5, fill: '#7FB4E8' }),
        h('rect', { x: 113, y: 73, width: 22, height: 3, rx: 1.5, fill: '#7FB4E8' }))
    }

    // The dumpling: one big circle body, lighter face disc, capsule eyes, arc
    // mouth, blush, two small hands. No legs. Breathing lives on .bb-blob.
    function blobSeat(scene, seat) {
      const cx = FACE_X
      const cy = FACE_Y + 2
      const moon = scene === 'done'
      const squint = scene === 'error'
      const oMouth = scene === 'alert'
      const eyes = squint
        ? h('g', null,
            h('rect', { x: FACE_X - 12, y: FACE_Y - 5.5, width: 6, height: 2.5, rx: 1.25, fill: DARK }),
            h('rect', { x: FACE_X + 6, y: FACE_Y - 5.5, width: 6, height: 2.5, rx: 1.25, fill: DARK }))
        : moon
          ? h('g', { fill: 'none', stroke: DARK, strokeWidth: 2.5, strokeLinecap: 'round' },
              h('path', { d: `M ${FACE_X - 13} ${FACE_Y - 1} q 4 -6 8 0` }),
              h('path', { d: `M ${FACE_X + 5} ${FACE_Y - 1} q 4 -6 8 0` }))
          : h('g', {
              className: scene === 'busy' ? 'bb-eyes' : scene === 'idle' ? 'bb-eyes bb-eyes-slow' : undefined,
              fill: DARK,
            },
              h('rect', { x: FACE_X - 11.5, y: FACE_Y - 8.5, width: 5, height: 9, rx: 2.5 }),
              h('rect', { x: FACE_X + 6.5, y: FACE_Y - 8.5, width: 5, height: 9, rx: 2.5 }))
      const mouth = oMouth
        ? h('circle', { cx: FACE_X, cy: FACE_Y + 9, r: 3, fill: DARK })
        : squint
          ? h('path', {
              d: `M ${FACE_X - 4} ${FACE_Y + 10} q 4 -3 8 0`,
              fill: 'none', stroke: DARK, strokeWidth: 2, strokeLinecap: 'round',
            })
          : h('path', {
              d: `M ${FACE_X - 4} ${FACE_Y + 6} q 4 5 8 0`,
              fill: 'none', stroke: DARK, strokeWidth: 2, strokeLinecap: 'round',
            })
      // 等你 waves (O mouth + hand), 干完 waves — pure scene-driven so an error
      // inside the 7s hand-off window never keeps a waving hand (it is not 干完).
      const wavingNow = scene === 'done' || scene === 'alert'
      const handL = h('circle', {
        cx: cx - 23, cy: cy + 16, r: 4, fill: seat.color,
        className: scene === 'busy' ? 'bb-hand bb-tap' : 'bb-hand',
      })
      const handR = h('circle', {
        cx: cx + 23, cy: cy + 16, r: 4, fill: seat.color,
        className: wavingNow ? 'bb-hand bb-wave' : scene === 'busy' ? 'bb-hand bb-tap' : 'bb-hand',
      })
      return h('g', { className: 'bb-blob' },
        h('circle', { cx, cy, r: BODY_R, fill: seat.color }),
        h('circle', { cx: FACE_X, cy: FACE_Y, r: 18, fill: seat.face }),
        h('ellipse', { cx: FACE_X - 14, cy: FACE_Y + 7, rx: 4.5, ry: 2.8, fill: seat.color, opacity: .3 }),
        h('ellipse', { cx: FACE_X + 14, cy: FACE_Y + 7, rx: 4.5, ry: 2.8, fill: seat.color, opacity: .3 }),
        eyes,
        mouth,
        handL,
        handR,
        faceGear(seat.head),
        headGear(seat.head))
    }

    // One workstation: chair + desk + monitor + lamp + blob + prop + name.
    function Station({ row, onOpen, note }) {
      const { bot, status, scene, action } = row
      const seat = seatOf(bot)
      // Label follows the resolved scene: a fresh error/approval outranks the
      // 干完 wave, so the title never says 干完 while the lamp is red/yellow.
      const label = scene === 'done' ? '干完' : (STATUS_TEXT[status] ?? status)
      const title = `${bot.name} · ${label}${action ? ` · ${action}` : ''}（点击打开它的聊天）`
      return h('div', {
        className: 'bb-station',
        role: 'button',
        tabIndex: 0,
        title,
        onClick: () => onOpen(bot),
        onKeyDown: event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(bot) }
        },
      },
        h('svg', { className: 'bb-scene', viewBox: '0 0 170 132', 'aria-hidden': 'true' },
          h('ellipse', { cx: 88, cy: 122, rx: 42, ry: 5, fill: 'rgba(0,0,0,.06)' }),
          h('g', { fill: '#D9D4CB' },
            h('rect', { x: 22, y: 62, width: 11, height: 40, rx: 5 }),
            h('rect', { x: 22, y: 96, width: 38, height: 10, rx: 4 }),
            h('rect', { x: 36, y: 104, width: 7, height: 14, rx: 2 })),
          blobSeat(scene, seat),
          h('g', null,
            h('rect', { x: 50, y: 88, width: 104, height: 10, rx: 3, fill: '#E8D9C0' }),
            h('rect', { x: 58, y: 98, width: 9, height: 22, rx: 2, fill: '#CBB89A' }),
            h('rect', { x: 137, y: 98, width: 9, height: 22, rx: 2, fill: '#CBB89A' })),
          h('g', null,
            h('rect', { x: 104, y: 52, width: 52, height: 34, rx: 4, fill: '#3A3F45' }),
            h('rect', { x: 126, y: 86, width: 8, height: 3, fill: '#3A3F45' }),
            screenContent(scene)),
          h('circle', { cx: 151, cy: 85, r: 2.5, fill: LAMP[scene] ?? '#D3D1C7' }),
          deskProp(seat.prop)),
        h('div', {
          className: 'bb-station-name',
          'data-scene': scene,
          style: NAME_INK[scene] ? { color: NAME_INK[scene] } : undefined,
        }, bot.name),
        note ? h('span', { className: 'bb-note' }) : null)
    }
    const CSS = `
.bb-wrap{position:fixed;right:16px;bottom:120px;z-index:80;font-size:12px;line-height:1.5;color:inherit;
  font-family:inherit;text-align:left;max-width:calc(100vw - 32px)}
.bb-wrap *{box-sizing:border-box}
.bb-pill{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;cursor:pointer;
  background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));
  box-shadow:0 8px 24px rgba(0,0,0,.14);font-size:12px;color:inherit;font-family:inherit}
.bb-pill:hover{background:var(--dsw-alias-bg-layer-2,#f6f6f4)}
.bb-pill b{font-weight:600}
.bb-panel{display:flex;flex-direction:column;border-radius:14px;overflow:hidden;position:relative;
  background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));
  box-shadow:0 14px 38px rgba(0,0,0,.18)}
.bb-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(0,0,0,.06);
  cursor:grab;user-select:none;touch-action:none}
.bb-head:active{cursor:grabbing}
.bb-grow{flex:1}
.bb-icon{width:24px;height:24px;border-radius:8px;border:0;background:transparent;color:inherit;opacity:.55;
  cursor:pointer;font-size:14px;line-height:1;flex:none}
.bb-icon:hover{opacity:1;background:rgba(0,0,0,.05)}
.bb-legend{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:7px 12px;
  background:#FAF7F1;border-bottom:1px solid rgba(0,0,0,.06)}
.bb-lg{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:500;opacity:.78}
.bb-lg i{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none}
.bb-body{flex:1;min-height:0;overflow:auto;padding:10px 12px 12px;background:#FAF7F1}
.bb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.bb-station{position:relative;border-radius:10px;padding:2px 2px 4px;cursor:pointer;background:transparent;
  transition:background-color .12s ease}
.bb-station:hover{background:rgba(0,0,0,.045)}
.bb-scene{display:block;width:100%;height:auto}
.bb-station-name{margin-top:1px;text-align:center;font-size:12px;font-weight:500;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bb-blob{transform-box:fill-box;transform-origin:center bottom;animation:bb-breathe 2.6s ease-in-out infinite}
.bb-eyes{transform-box:fill-box;transform-origin:center;animation:bb-blink 3s step-end infinite}
.bb-eyes-slow{animation-duration:6s}
.bb-hand{transform-box:fill-box;transform-origin:center}
.bb-tap{animation:bb-tap .9s step-end infinite}
.bb-wave{animation:bb-wave 1.1s step-end infinite}
.bb-note{position:absolute;left:50%;top:0;width:12px;height:9px;margin-left:-6px;background:#fff;
  border:1px solid rgba(0,0,0,.28);border-radius:2px;pointer-events:none;
  animation:bb-note 2s step-end 1 both}
@keyframes bb-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
@keyframes bb-blink{0%{transform:scaleY(1)}94%{transform:scaleY(.12)}97%{transform:scaleY(1)}}
@keyframes bb-tap{0%{transform:translateY(0)}34%{transform:translateY(2.5px)}67%{transform:translateY(0)}}
@keyframes bb-wave{0%{transform:translate(0,0)}25%{transform:translate(2px,-6px)}50%{transform:translate(0,-2px)}
  75%{transform:translate(2px,-6px)}100%{transform:translate(0,0)}}
@keyframes bb-note{0%{opacity:0;transform:translateY(-18px)}25%{opacity:1;transform:translateY(-12px)}
  55%{transform:translateY(-4px)}85%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(0)}}
.bb-pulse{animation:bb-pulse 1.6s ease-in-out infinite}
@keyframes bb-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.bb-rz{position:absolute;right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize;touch-action:none}
.bb-rz::after{content:"";position:absolute;right:3px;bottom:3px;width:9px;height:9px;
  border-right:2px solid rgba(0,0,0,.28);border-bottom:2px solid rgba(0,0,0,.28);border-radius:0 0 3px 0}
@media (prefers-reduced-motion:reduce){.bb-pulse{animation:none}
  .bb-blob,.bb-eyes,.bb-tap,.bb-wave,.bb-note{animation:none}
  .bb-note{display:none}}
`

    function ensureStyle() {
      if (typeof document === 'undefined' || document.getElementById('bb-style')) return
      const node = document.createElement('style')
      node.id = 'bb-style'
      node.textContent = CSS
      document.head.appendChild(node)
    }

    function useTeam() {
      const [view, setView] = useState(null)
      const [board, setBoard] = useState(null)
      const [error, setError] = useState(null)
      const [, setBeat] = useState(0)

      useEffect(() => {
        let stopped = false
        let timer = 0
        let since
        let models
        const tick = async () => {
          try {
            const value = await callBot('state', { since, models, locale: 'zh-CN' })
            if (stopped) return
            since = value.revision ?? since
            models = value.modelsKey ?? models
            setView(previous => (value.unchanged && previous ? { ...previous, ...value } : value))
            setError(null)
          } catch (err) {
            if (!stopped) setError(err?.message ?? '连不上 DS Bot')
          }
          if (!stopped) timer = setTimeout(tick, document.hidden ? HIDDEN_POLL_MS : POLL_MS)
        }
        const wake = () => {
          if (document.hidden) return
          clearTimeout(timer)
          tick()
        }
        document.addEventListener('visibilitychange', wake)
        tick()
        return () => {
          stopped = true
          clearTimeout(timer)
          document.removeEventListener('visibilitychange', wake)
        }
      }, [])

      useEffect(() => {
        let stopped = false
        let timer = 0
        const tick = async () => {
          try {
            const value = await callBoard()
            if (!stopped) setBoard(value)
          } catch (err) {
            if (!stopped) setBoard(previous => ({
              ...(previous ?? { works: [], rooms: [], bots: [], errors: [] }),
              boardError: err?.message ?? '本地数据读取失败',
            }))
          }
          if (!stopped) timer = setTimeout(tick, document.hidden ? HIDDEN_POLL_MS : BOARD_MS)
        }
        tick()
        return () => {
          stopped = true
          clearTimeout(timer)
        }
      }, [])

      useEffect(() => {
        const id = setInterval(() => setBeat(n => n + 1), 1000)
        return () => clearInterval(id)
      }, [])

      return { view, board, error }
    }

    function Dot({ tone, busy }) {
      return h('span', {
        className: busy ? 'bb-dot bb-pulse' : 'bb-dot',
        style: {
          width: 7, height: 7, borderRadius: '50%', flex: 'none', display: 'inline-block',
          background: tone, boxShadow: busy ? `0 0 0 3px ${tone}22` : 'none',
        },
      })
    }

    function Board() {
      const { view, board, error } = useTeam()
      const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
      })
      const [pos, setPos] = useState(() => {
        try { const raw = localStorage.getItem(POS_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
      })
      const [size, setSize] = useState(() => {
        try {
          const raw = localStorage.getItem(SIZE_KEY)
          const parsed = raw ? JSON.parse(raw) : null
          if (parsed && parsed.w && parsed.h) {
            return {
              w: Math.min(SIZE_MAX.w, Math.max(SIZE_MIN.w, parsed.w)),
              h: Math.min(SIZE_MAX.h, Math.max(SIZE_MIN.h, parsed.h)),
            }
          }
        } catch {}
        return { ...SIZE_DEFAULT }
      })
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
      const [waveMap, setWaveMap] = useState({})
      const [noteMap, setNoteMap] = useState({})
      useEffect(() => { ensureStyle() }, [])
      useEffect(() => { posRef.current = pos }, [pos])
      useEffect(() => { sizeRef.current = size }, [size])

      const flip = useCallback(value => {
        setCollapsed(value)
        try { localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0') } catch {}
      }, [])

      const bots = view?.bots ?? board?.bots ?? []
      const activity = view?.activity ?? {}
      const workBots = view?.work?.bots ?? {}
      const waiting = view?.work?.waiting ?? {}
      const approvals = Array.isArray(view?.work?.approvals) ? view.work.approvals : []
      const questions = view?.questions ?? {}
      const errors = Array.isArray(board?.errors) ? board.errors : []
      const nameOf = useCallback(id => bots.find(bot => bot.id === id)?.name ?? id, [bots])

      const stuckFor = useCallback((bot, status) => {
        if (status === 'alert') {
          const approval = approvals.find(item => item?.botId === bot.id)
          if (approval) return { kind: 'approval', text: `等你审批：${approval.tool || '工具'}` }
          const question = questions[bot.sessionId ?? bot.id]
          if (question) return { kind: 'question', text: `等你回答：${clip(question.question, 22)}` }
          return { kind: 'alert', text: '有审批/提问等你' }
        }
        if (status === 'error') {
          const failure = errors.find(item => item.botId === bot.id)
          return { kind: 'error', text: `报错：${clip(failure?.message ?? '这一轮失败了', 24)}` }
        }
        if (status === 'waiting') {
          const wait = waiting[bot.id]
          const names = [...(wait?.bots ?? []).map(nameOf), ...(wait?.rooms ?? []).map(id => `群「${id}」`)]
          return { kind: 'waiting', text: names.length ? `等 ${names.join('、')} 交活` : '等别的 Bot 交活' }
        }
        return null
      }, [approvals, questions, errors, waiting, nameOf])

      const rows = useMemo(() => {
        const rank = { error: 0, alert: 1, busy: 2, done: 3, idle: 4 }
        const alertOf = bot => {
          if (approvals.some(item => item?.botId === bot.id)) return true
          return Boolean(questions[bot.sessionId ?? bot.id])
        }
        return bots.map(bot => {
          const failed = errors.find(item => item.botId === bot.id)
          const status = alertOf(bot) ? 'alert' : failed ? 'error' : (activity[bot.id] || (waiting[bot.id] ? 'waiting' : 'idle'))
          const waving = Boolean(waveMap[bot.id])
          const stuck = stuckFor(bot, status)
          const work = workBots[bot.id]
          const action = stuck?.text
            ?? (work?.said || work?.note || work?.target || (work?.tool ? `调用 ${work.tool}` : '') || (status === 'waiting' ? '等别的 Bot 交活' : ''))
          return { bot, status, scene: sceneOf(status, waving), waving, action, stuck, note: Boolean(noteMap[bot.id]) }
        }).sort((a, b) => (rank[a.scene] ?? 4) - (rank[b.scene] ?? 4))
      }, [bots, activity, workBots, waiting, errors, approvals, questions, stuckFor, waveMap, noteMap])

      const busy = rows.filter(row => row.scene === 'busy').length
      const alertCount = rows.filter(row => row.scene === 'alert').length
      const errorCount = rows.filter(row => row.scene === 'error').length

      const openBot = useCallback(bot => {
        const id = bot?.sessionId ?? bot?.id
        if (!id) return
        try { openSession?.(id) } catch {}
      }, [])

      // System notifications: only approvals/questions and new failures, once each.
      const alertSig = JSON.stringify(approvals.map(item => item?.id)) + '|' + JSON.stringify(errors.map(item => `${item.botId}:${item.at}`))
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
          notify(`等你处理 · ${nameOf(item?.botId)}`,
            item?.tool ? `想运行 ${item.tool}${item.reason ? `：${clip(item.reason, 40)}` : ''}` : '有个审批在等你')
        }
        for (const item of errors) {
          const key = `e:${item.botId}:${item.at}`
          if (seenRef.current.has(key)) continue
          seenRef.current.add(key)
          notify(`出错了 · ${nameOf(item.botId)}`, clip(item.message, 80))
        }
      }, [alertSig])

      // 派活交接完成: a work dropping to 0 open items just handed off cleanly,
      // so the receiver shows the 干完 scene (moon eyes + wave) for 7 seconds and
      // a little paper note flies onto its desk for 2 seconds. Both flags live
      // in useState so rows recompute, and timers cut them short on purpose.
      useEffect(() => {
        for (const work of board?.works ?? []) {
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
      }, [board])
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
        try { localStorage.setItem(POS_KEY, JSON.stringify(posRef.current)) } catch {}
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
        try { localStorage.setItem(SIZE_KEY, JSON.stringify(sizeRef.current)) } catch {}
      }

      const wrapStyle = pos ? { left: pos.left, top: pos.top, right: 'auto', bottom: 'auto' } : undefined

      if (collapsed) {
        return h('div', { className: 'bb-wrap', style: wrapStyle },
          h('button', {
            className: 'bb-pill', type: 'button',
            onClick: () => flip(false), title: '展开 Bot 教室',
          },
            h(Dot, { tone: errorCount || alertCount ? '#EAB308' : busy ? '#22C55E' : '#D3D1C7', busy: busy > 0 }),
            h('b', null, `${busy} 忙`),
            alertCount ? h('span', { style: { color: '#B91C1C', fontWeight: 600 } }, `${alertCount} 待`) : null,
            errorCount ? h('span', { style: { color: '#B91C1C' } }, `${errorCount} 错`) : null))
      }

      return h('div', { className: 'bb-wrap', style: wrapStyle, ref: wrapRef },
        h('div', { className: 'bb-panel', style: { width: size.w, height: size.h } },
          h('div', {
            className: 'bb-head',
            onPointerDown, onPointerMove, onPointerUp,
            onPointerCancel: onPointerUp,
            title: '拖动标题栏可移动',
          },
            h(Dot, { tone: errorCount || alertCount ? '#EAB308' : busy ? '#22C55E' : '#D3D1C7', busy: busy > 0 }),
            h('span', { className: 'bb-grow' }),
            h('button', { className: 'bb-icon', type: 'button', onClick: () => flip(true), title: '收起' }, '×')),
          h('div', { className: 'bb-legend' },
            LEGEND.map(([key, word]) => h('span', { className: 'bb-lg', key },
              h('i', { style: { background: LAMP[key] } }),
              word))),
          h('div', { className: 'bb-body' },
            error ? h('div', { className: 'bb-station-name', style: { opacity: .6, textAlign: 'left' } }, `没连上 DS Bot：${error}`) : null,
            h('div', { className: 'bb-grid' },
              rows.map(row => h(Station, {
                key: row.bot.id, row, onOpen: openBot, note: row.note,
              })))),
          h('div', {
            className: 'bb-rz',
            title: '拖动右下角调整大小',
            onPointerDown: onResizeDown,
            onPointerMove: onResizeMove,
            onPointerUp: onResizeUp,
            onPointerCancel: onResizeUp,
          })))
    }

    function apply(ctx) {
      openSession = ctx.uiWorkspace?.openSession ? ctx.uiWorkspace.openSession.bind(ctx.uiWorkspace) : null
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'bot-board',
        order: 500,
      }, Board))
    }

    return { apply, inject: ['slots', 'uiWorkspace'] }
  },
})
