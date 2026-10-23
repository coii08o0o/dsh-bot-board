// The classroom stylesheet. Room surfaces are intentionally cream and carry an
// explicit dark ink: the classroom is a light island inside the app shell, so its
// text must not inherit the shell's colour (in a dark theme that produced light
// text on a cream background — unreadable). Panel chrome keeps `inherit` so it
// still follows the host theme, and anything that must be emphasised there uses
// weight instead of a hard-coded colour.
//
// v0.4.0: the body is three bands, not one scrolled grid — 需要你 (flex:none) /
// 在动 (flex:1, the only scroll area) / 闲着 (flex:none).
//
// v0.4.1: the five numbers the height budget depends on are interpolated from
// const.js instead of typed twice. The budget used to be "constant against
// constant" with the CSS joined to it by a comment, so `.bb-attention-row{40px}`
// left C4a green and lying. Now the CSS *is* the constant.
import {
  ATTENTION_GAP, ATTENTION_ROW_H, IDLE_ROW_H, NOTICES_SCROLL_H, ROSTER_PAD_H, RUN_GRID_GAP, RUN_PAD_B, RUNNING_CELL_W,
} from './const.js'

export const CSS = `
.bb-wrap{position:fixed;right:16px;bottom:120px;z-index:80;font-size:12px;line-height:1.5;color:inherit;
  font-family:inherit;text-align:left;max-width:calc(100vw - 32px)}
.bb-wrap *{box-sizing:border-box}
.bb-pill{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;cursor:pointer;
  background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));
  box-shadow:0 8px 24px rgba(0,0,0,.14);font-size:12px;color:inherit;font-family:inherit}
.bb-pill:hover{background:var(--dsw-alias-bg-layer-2,#f6f6f4)}
.bb-pill b{font-weight:600}
.bb-dot{width:7px;height:7px;border-radius:50%;flex:none;display:inline-block;border:1px solid #5B5648}
.bb-panel{display:flex;flex-direction:column;border-radius:14px;overflow:hidden;position:relative;
  max-width:100%;
  background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));
  box-shadow:0 14px 38px rgba(0,0,0,.18)}
/* Head: 39px = 7 + 24 (icon) + 7 + 1 (border). Counts report 需要你 first. */
.bb-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(0,0,0,.06);
  cursor:grab;user-select:none;touch-action:none}
.bb-head:active{cursor:grabbing}
.bb-title{font-weight:600;font-size:12px;white-space:nowrap}
.bb-sum{display:flex;gap:7px;font-size:11px;opacity:.75;white-space:nowrap;overflow:hidden}
/* Emphasis is weight only: the header follows the host theme, and a hard-coded
   colour would go invisible in a dark one. */
.bb-sum-hot{font-weight:700;opacity:1}
.bb-sum-quiet{font-weight:400;opacity:.55}
.bb-grow{flex:1}
.bb-icon{width:24px;height:24px;border-radius:8px;border:0;background:transparent;color:inherit;opacity:.55;
  cursor:pointer;font-size:14px;line-height:1;flex:none}
.bb-icon:hover{opacity:1;background:rgba(0,0,0,.05)}

/* Body: three bands, and only the middle one scrolls. */
.bb-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;position:relative;
  padding:0;background:#FAF7F1;color:#2C2C2A}
.bb-notices{flex:none;max-height:${NOTICES_SCROLL_H}px;overflow:auto;padding:6px 10px 0}

/* ── Layer 1 · 需要你 ──────────────────────────────────────────────────────── */
/* #FFFFFF against #FAF7F1 is only 1.07:1, so the card's surface encodes nothing.
   What carries the layer is the 44px rhythm, the 3px status bar (5.02 / 6.47:1)
   and the right-hand rail of lamps. Do not "fix" the weak white. */
.bb-attention{flex:none;display:flex;flex-direction:column;gap:${ATTENTION_GAP}px;padding:6px 10px 4px}
.bb-attention-row{position:relative;display:flex;align-items:center;gap:8px;height:${ATTENTION_ROW_H}px;
  padding:0 8px 0 7px;border-left:3px solid transparent;border-radius:9px;
  background:#FFFFFF;box-shadow:0 1px 2px rgba(44,44,42,.10);
  cursor:pointer;outline:none;overflow:hidden}
.bb-attention-row[data-scene="alert"]{border-left-color:#B45309}
.bb-attention-row[data-scene="error"]{border-left-color:#B91C1C}
/* Hover is a 1px inner ring, not a tint: a tint on cream measures 1.06:1, i.e.
   no feedback at all. */
.bb-attention-row:hover{box-shadow:0 1px 2px rgba(44,44,42,.10),inset 0 0 0 1px #8F8776}
.bb-att-avatar{flex:0 0 30px;width:30px;height:30px;border-radius:50%;overflow:hidden;
  display:grid;place-items:center;background:#FAF7F1}
.bb-att-avatar svg{display:block;width:30px;height:30px}
.bb-att-name{flex:0 0 auto;max-width:68px;font-size:12.5px;font-weight:600;color:#2C2C2A;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* The only flexible, and the only clippable, column: prose yields, structure does
   not. Long prose has the drawer as its exit; identity and duration do not. */
.bb-att-act{flex:1 1 auto;min-width:0;font-size:12px;color:#4A4438;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bb-att-time{flex:0 0 auto;min-width:44px;font-size:11px;color:#6B6558;text-align:right;
  font-variant-numeric:tabular-nums}
.bb-att-lamp{flex:0 0 12px;width:12px;height:12px;display:grid;place-items:center}
/* Empty state: one summary line, never blank. "I looked and there is nothing" is
   the answer this panel exists to give. */
.bb-att-empty{display:flex;align-items:center;gap:6px;height:28px;padding:0 2px;
  font-size:11.5px;color:#6B6558}
.bb-att-empty b{color:#0F766E;font-weight:600}
/* The overflow chip lives *inside* the last row, in the trailing edge of the
   flexible action column, so revealing the 4th, 5th, 6th Bot costs zero height.
   v0.4.0 put it on its own line below the list, which cost 20.5px (a 3px gap plus
   a 17.5px line) — that pushed layer 2 below its 96px floor — and, worse, it was
   a bare div: the names it stood for existed nowhere on the panel and could not
   be opened. Same overflow as layer 3's +N, worse treatment, on the more
   important layer. It is now a real control. */
/* The chip is the only path to the 4th Bot onwards, so it cannot read as part of
   the sentence before it: #F3EDE2 on white is ~1.1:1. The deeper cream plus the
   room's ink gives it an edge, and 20px keeps it a comfortable pointer target
   inside the 44px row. */
.bb-att-more{flex:none;display:inline-flex;align-items:center;height:20px;padding:0 7px;
  border-radius:10px;background:#E7DCC4;color:#2C2C2A;font-size:10.5px;font-weight:600;
  line-height:20px;cursor:pointer;outline:none;white-space:nowrap;
  font-variant-numeric:tabular-nums}
/* Hover is a 1px inner ring plus a step in text colour, not a tint: a tint on
   this surface measures 1.105:1, i.e. no feedback — the same mistake the
   .bb-attention-row hover comment above already argues against. */
.bb-att-more:hover{box-shadow:inset 0 0 0 1px #8F8776;color:#2C2C2A}

/* ── Layer 2 · 在动 (the only scroll area) ──────────────────────────────────── */
.bb-run{flex:1;min-height:0;overflow:auto;padding:0 10px ${RUN_PAD_B}px}
/* Overlay, not a row: a hint that consumed height would shrink the band and
   change the count it reports. Sits above the idle line (the inline bottom is
   set by Body, because the idle line may be absent). */
.bb-run-more{position:absolute;right:16px;z-index:1;display:inline-flex;align-items:center;
  height:19px;padding:0 8px;border-radius:10px;background:#2C2C2A;color:#FFFDF8;
  font-size:10.5px;font-weight:600;pointer-events:none;white-space:nowrap;
  box-shadow:0 2px 8px rgba(0,0,0,.18);font-variant-numeric:tabular-nums}
.bb-run-grid{display:grid;grid-template-columns:repeat(auto-fit,${RUNNING_CELL_W}px);
  gap:${RUN_GRID_GAP}px;justify-content:center}
/* The classroom is not a card grid: no white fill, no drop shadow. A hover ring
   is the only surface change, so the cream room survives. */
.bb-run .bb-station{padding:0 0 1px;border-radius:8px}
.bb-run .bb-station:hover{background:rgba(44,44,42,.05);box-shadow:inset 0 0 0 1px #8F8776}
/* Name and duration on one line, pinned to 18px: the height budget is arithmetic,
   so nothing here may drift with the font family. */
.bb-run .bb-station-name{display:flex;align-items:baseline;justify-content:center;gap:4px;
  margin-top:1px;font-size:12px;font-weight:500;line-height:18px;color:#2C2C2A}
.bb-run .bb-station-nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bb-run .bb-station-time{flex:none;font-size:10.5px;line-height:18px;font-weight:400;color:#6B6558;
  font-variant-numeric:tabular-nums}

/* ── Layer 2 internal · hand-offs, grouped by sender ───────────────────────── */
/* A hairline means "above is a note", not "here is a panel". No fill, no border
   box, and no max-height: two scrollbars inside a 420px column fight each other,
   so the list is bounded by rows (3 groups × 3 edges + a count) instead.
   The rule sits on the bottom edge because the table now precedes the grid: when
   the band has to scroll, the relation is read before the individual cells. */
.bb-handoffs{flex:none;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #DDD6C8;
  font-size:11px;color:#2C2C2A}
.bb-ho-group{margin-bottom:6px}
.bb-ho-group:last-child{margin-bottom:0}
/* 600 + deep ink = structural: this is who the bottleneck is. Same size as an
   edge, so the only difference is weight and colour. */
.bb-ho-group-head{display:flex;align-items:baseline;gap:6px;font-size:11px;font-weight:600;
  line-height:16px;color:#4A4438;padding:2px 0}
.bb-ho-from{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Amber is reserved for quantities. "共 N 项" is the answer of the whole table:
   the biggest group is the bottleneck. */
.bb-ho-total{flex:none;color:#8A5B00;font-variant-numeric:tabular-nums}
/* 14px indent = subordinate: more than 1em, so the left edge clearly steps in,
   and less than the arrow's advance, so the arrow never hangs outside. */
.bb-handoff{display:flex;align-items:center;gap:6px;height:18px;padding:0 0 0 14px;
  font-size:11px;border-radius:6px;cursor:pointer;outline:none}
.bb-handoff:hover{background:rgba(44,44,42,.05)}
/* A character, not a drawn line: it carries the direction (dispatch), it never
   breaks at any width, and it is already in the DOM. */
.bb-ho-arrow{flex:none;font-size:12px;line-height:1;color:#8A8577}
.bb-ho-name{flex:0 0 auto;max-width:72px;color:#2C2C2A;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}
.bb-ho-count{flex:none;color:#6B6558;font-variant-numeric:tabular-nums}
.bb-ho-time{margin-left:auto;flex:none;min-width:56px;text-align:right;color:#6B6558;
  font-variant-numeric:tabular-nums}
.bb-ho-flag{flex:none;color:#6B6558}
/* 被堵 is the only branch that adds pixels. busy/waiting fall through to the
   default, which is why the laziest implementation is also the correct one. */
.bb-handoff[data-blocked="true"] .bb-ho-count{color:#8A5B00;font-weight:600}
.bb-handoff[data-blocked="true"] .bb-ho-flag{color:#B45309;font-weight:600}
.bb-handoff[data-mutual="true"] .bb-ho-arrow{color:#B45309}
.bb-ho-more{padding:0 0 0 14px;color:#6B6558;font-size:11px;line-height:16px;cursor:pointer}

/* ── Layer 3 · 闲着: one line, no image, no surface, no lamp ────────────────── */
/* height is pinned and wrapping is off: a second line breaks the 480px budget by
   its 1px margin. Overflow degrades to +N, never to a wrap. */
.bb-idle{flex:none;height:${IDLE_ROW_H}px;display:flex;align-items:center;gap:6px;overflow:hidden;
  padding:0 10px;border-top:1px solid #DDD6C8;font-size:11px;background:transparent}
.bb-idle-k{flex:none;font-weight:600;color:#6B6558}
.bb-idle-name{flex:0 0 auto;display:inline-flex;align-items:center;gap:2px;padding:1px 2px;
  border-radius:4px;color:#5F594D;white-space:nowrap;cursor:pointer;outline:none}
.bb-idle-name:hover{color:#2C2C2A;background:rgba(44,44,42,.06)}
/* Same rule as .bb-att-more: a 0.06 black tint on cream is 1.12:1, which is not
   feedback. The ring is 3.3:1 and the text steps to the room's ink. */
.bb-idle-more{flex:none;padding:1px 3px;border-radius:4px;font-weight:600;color:#6B6558;
  cursor:pointer;outline:none}
.bb-idle-more:hover{background:transparent;box-shadow:inset 0 0 0 1px #8F8776;color:#2C2C2A}
/* The inline badge keeps the bb-badge class name (that is what D1 asserts) and
   only changes its position: the badge must survive every compressed form. */
.bb-badge-inline{position:static;flex:none;width:12px;height:12px;line-height:12px;font-size:9px;
  margin-left:2px}
/* The one path that may grow layer 3 — and only because the user asked for it. */
.bb-idle[data-expanded="true"]{height:auto;max-height:44px;flex-wrap:wrap;padding:4px 10px}

/* ── Layer 3, roster form · 退化态 only ────────────────────────────────────── */
/* Body decides when this is drawn (nothing needs you, nobody running, no open
   hand-off). It is deliberately not layer 1 in grey:
     - no white card: #FFFFFF on #FAF7F1 is 1.07:1, so the card encodes nothing,
       and spending it twice blurs which rows want something from you;
     - no lamp: nine identical grey circles are wallpaper, not a channel. A quiet
       failure keeps its "!" instead — the one mark that carries news;
     - name weight 500, one step under layer 1's 600.
   It keeps the 44px rhythm, the 30px face crop and the column order, so the two
   bands read as one table rather than two drawings. 44 is also the WCAG 2.5.5
   pointer target every row here has to meet. */
.bb-roster{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;padding:0 ${ROSTER_PAD_H / 2}px}
.bb-roster-scroll{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column}
/* margin:auto 0 centres a short roster in 退化态, so the leftover space reads as
   whitespace instead of a hole. It is deliberately NOT used under the cards: a
   centred block leaves a gap between the two bands, and the rows are a
   continuation of the table above, not a separate object.
   Auto margins rather than justify-content:center — centring a flex child that
   overflows clips its top edge, and no scroll can reach what was clipped. */
.bb-roster-grid{margin:auto 0;display:grid;row-gap:0;column-gap:8px}
.bb-roster[data-align="top"] .bb-roster-grid{margin:0}
.bb-roster-row{display:flex;align-items:center;gap:8px;height:${ATTENTION_ROW_H}px;
  padding:0 4px 0 7px;border-left:3px solid transparent;border-radius:9px;
  cursor:pointer;outline:none;overflow:hidden}
/* Same rule as .bb-attention-row:hover: a tint on cream is 1.06:1, i.e. no
   feedback at all. The ring is 3.3:1. */
.bb-roster-row:hover{box-shadow:inset 0 0 0 1px #8F8776}
.bb-roster-av{flex:0 0 30px;width:30px;height:30px;border-radius:50%;overflow:hidden;
  display:grid;place-items:center;background:#FAF7F1}
.bb-roster-av svg{display:block;width:30px;height:30px}
.bb-roster-nm{flex:0 0 auto;max-width:68px;font-size:12.5px;font-weight:500;color:#2C2C2A;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bb-roster-sub{flex:1 1 auto;min-width:0;font-size:12px;color:#4A4438;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* The state column sits exactly where layer 1's duration column does, so a row
   reads across the panel instead of stopping after the name — and it is the one
   column that can never be empty. 5.27:1 on cream. */
.bb-roster-state{flex:none;min-width:24px;text-align:right;font-size:11px;color:#6B6558}
/* Width crisis: the second column goes before the name does. Same rule layer 1
   already applies to its action column — prose yields, structure does not. */
.bb-roster[data-density="tight"] .bb-roster-sub{display:none}
/* The badge is the shared .bb-badge.bb-badge-inline node — 12px, static, after
   the flexible column. Deliberately not a second red dot with its own size:
   two badges that tune independently are two badges that drift. */
/* The roster is the only band in 退化态, so it is also the only scroll area —
   and macOS hides a scrollbar until the mouse moves. Same pill as 在动's. */
.bb-roster-more{position:absolute;right:16px;bottom:6px;display:inline-flex;align-items:center;
  height:19px;padding:0 8px;border-radius:10px;background:#2C2C2A;color:#FFFDF8;
  font-size:10.5px;font-weight:600;pointer-events:none;white-space:nowrap;
  box-shadow:0 2px 8px rgba(0,0,0,.18);font-variant-numeric:tabular-nums}

/* ── Lamps ────────────────────────────────────────────────────────────────── */
.bb-lamp{display:block}
.bb-drawer-lamp{flex:none;display:grid;place-items:center}

/* ── Legend, demoted to a drawer ──────────────────────────────────────────── */
.bb-lg-row{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:11.5px;
  border-bottom:1px solid rgba(0,0,0,.05)}
.bb-lg-row:last-child{border-bottom:0}
.bb-lg-lamp{flex:none;width:16px;height:16px;display:grid;place-items:center}
.bb-lg-name{flex:0 0 62px;font-weight:600;color:#2C2C2A}
.bb-lg-hint{flex:1;min-width:0;color:#6B6558}

/* ── Workstation (layer 2 card; compact=false is still the default) ───────── */
.bb-station{position:relative;border-radius:10px;padding:2px 2px 4px;cursor:pointer;background:transparent;
  transition:background-color .12s ease;outline:none}
.bb-station:hover{background:rgba(0,0,0,.045)}
.bb-scene{display:block;width:100%;height:auto}
.bb-station-name{margin-top:1px;text-align:center;font-size:12px;font-weight:500;color:#2C2C2A;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bb-meta{display:flex;gap:6px;align-items:baseline;font-size:11px;color:#6B6558;
  margin-top:1px;min-height:15px}
.bb-meta-act{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bb-meta-time{margin-left:auto;flex:none;min-width:34px;text-align:right;font-variant-numeric:tabular-nums}
.bb-stalled{color:#B45309;font-weight:600}
.bb-badge{position:absolute;top:1px;right:3px;width:14px;height:14px;border-radius:50%;background:#B91C1C;
  color:#fff;font-size:10px;font-weight:700;line-height:14px;text-align:center;pointer-events:none}

/* Every control is reachable by Tab; without a ring you cannot tell where you
   are. This list is extended, never replaced. */
.bb-pill:focus-visible,.bb-icon:focus-visible,.bb-btn:focus-visible,.bb-handoff:focus-visible,
.bb-station:focus-visible,.bb-attention-row:focus-visible,.bb-idle-name:focus-visible,
.bb-idle-more:focus-visible,.bb-att-more:focus-visible,.bb-ho-more:focus-visible,
.bb-roster-row:focus-visible{outline:2px solid #378ADD;outline-offset:1px}

/* ── Motion: unchanged set, unchanged budgets ─────────────────────────────── */
.bb-blob{transform-box:fill-box;transform-origin:center bottom;animation:bb-breathe 2.6s ease-in-out infinite}
.bb-eyes{transform-box:fill-box;transform-origin:center;animation:bb-blink 3s step-end infinite}
.bb-eyes-slow{animation-duration:6s}
.bb-hand{transform-box:fill-box;transform-origin:center}
.bb-tap{animation:bb-tap .9s step-end infinite}
.bb-wave{animation:bb-wave 1.1s step-end infinite}
.bb-note{position:absolute;left:50%;top:0;width:12px;height:9px;margin-left:-6px;background:#fff;
  border:1px solid rgba(0,0,0,.28);border-radius:2px;pointer-events:none;
  animation:bb-note 2s step-end 1 both}
.bb-pulse{animation:bb-pulse 1.6s ease-in-out infinite}
/* Layer 1 is where you *read*: breathing and blinking in the three rows that
   matter compete with the action text, and the lamp already encodes activity.
   These overrides sit after the base rules they cancel, on purpose. */
.bb-att-avatar .bb-blob,.bb-att-avatar .bb-eyes{animation:none}
/* Same rule for the roster: nine blinking faces would be nine small animations
   in a state whose whole point is that nothing is happening. This selector must
   stay *after* the .bb-eyes rule above it — a smoke check reads the first
   .bb-eyes{ in the sheet to verify the blink is step-end, and a selector list
   ending in .bb-eyes{ placed earlier would answer for the wrong rule. */
.bb-roster-av .bb-blob,.bb-roster-av .bb-eyes{animation:none}
.bb-notice{margin:0 0 8px;padding:5px 8px;border-radius:8px;font-size:11px;background:#FDF2F2;color:#9B1C1C;
  border:1px solid rgba(185,28,28,.18)}
.bb-notice-warn{background:#FEF7E6;color:#8A5B00;border-color:rgba(138,91,0,.18)}

/* ── The sheet (bot detail + legend share one .bb-drawer) ─────────────────── */
.bb-drawer{position:absolute;inset:0;display:flex;flex-direction:column;background:#FFFDF8;color:#2C2C2A;
  z-index:2}
.bb-drawer-head{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid rgba(0,0,0,.08);
  flex:none}
.bb-drawer-title{font-weight:600;font-size:12px}
.bb-drawer-sub{font-size:11px;color:#6B6558}
.bb-drawer-body{flex:1;min-height:0;overflow:auto;padding:10px 12px}
.bb-kv{display:flex;gap:8px;padding:2px 0;font-size:11px}
.bb-k{flex:none;width:52px;color:#6B6558}
.bb-v{flex:1;min-width:0;word-break:break-word}
.bb-block{margin-top:9px;padding-top:8px;border-top:1px dashed rgba(0,0,0,.1)}
.bb-block-t{font-size:11px;font-weight:600;color:#6B6558;margin-bottom:4px}
.bb-code{margin:0;padding:7px 8px;border-radius:8px;background:#2C2C2A;color:#F7F5F0;font-size:11px;
  line-height:1.45;white-space:pre-wrap;word-break:break-word;max-height:min(96px,40%);overflow:auto;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.bb-opt{display:flex;gap:6px;padding:2px 0;font-size:11px}
.bb-opt b{font-weight:600;flex:none}
.bb-opt span{color:#6B6558}
.bb-text{font-size:11px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.bb-dim{color:#6B6558}
.bb-drawer-foot{flex:none;display:flex;gap:8px;padding:9px 12px;border-top:1px solid rgba(0,0,0,.08)}
.bb-btn{flex:1;padding:6px 10px;border-radius:8px;border:1px solid transparent;background:#2C2C2A;color:#FFFDF8;
  font-size:11px;font-weight:600;cursor:pointer;font-family:inherit}
.bb-btn:hover{background:#43423F}
.bb-btn:disabled{background:#B6B2A8;cursor:not-allowed}
.bb-btn-ghost{flex:1;background:transparent;color:#2C2C2A;border-color:rgba(0,0,0,.16)}
.bb-btn-ghost:hover{background:rgba(0,0,0,.05)}
.bb-rz{position:absolute;right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize;touch-action:none;z-index:3}
.bb-rz::after{content:"";position:absolute;right:3px;bottom:3px;width:9px;height:9px;
  border-right:2px solid rgba(0,0,0,.28);border-bottom:2px solid rgba(0,0,0,.28);border-radius:0 0 3px 0}
@keyframes bb-breathe{0%{transform:scale(1)}50%{transform:scale(1.02)}100%{transform:scale(1)}}
@keyframes bb-blink{0%{transform:scaleY(1)}94%{transform:scaleY(.12)}97%{transform:scaleY(1)}100%{transform:scaleY(1)}}
@keyframes bb-tap{0%{transform:translateY(0)}34%{transform:translateY(2.5px)}67%{transform:translateY(0)}100%{transform:translateY(0)}}
@keyframes bb-wave{0%{transform:translate(0,0)}25%{transform:translate(2px,-6px)}50%{transform:translate(0,-2px)}
  75%{transform:translate(2px,-6px)}100%{transform:translate(0,0)}}
@keyframes bb-note{0%{opacity:0;transform:translateY(-18px)}25%{opacity:1;transform:translateY(-12px)}
  55%{transform:translateY(-4px)}85%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(0)}}
@keyframes bb-pulse{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}
@media (prefers-reduced-motion:reduce){.bb-pulse{animation:none}
  .bb-blob,.bb-eyes,.bb-tap,.bb-wave,.bb-note{animation:none}
  .bb-note{display:none}}
`

export function ensureStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById('bb-style')) return
  const node = document.createElement('style')
  node.id = 'bb-style'
  node.textContent = CSS
  document.head.appendChild(node)
}
