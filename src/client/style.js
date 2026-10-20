// The classroom stylesheet. Room surfaces are intentionally cream and carry an
// explicit dark ink: the classroom is a light island inside the app shell, so its
// text must not inherit the shell's colour (in a dark theme that produced light
// text on a cream background — unreadable). Panel chrome keeps `inherit` so it
// still follows the host theme, and anything that must be emphasised there uses
// weight instead of a hard-coded colour.
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
  background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));
  box-shadow:0 14px 38px rgba(0,0,0,.18)}
.bb-head{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid rgba(0,0,0,.06);
  cursor:grab;user-select:none;touch-action:none}
.bb-head:active{cursor:grabbing}
.bb-title{font-weight:600;font-size:12px;white-space:nowrap}
.bb-sum{display:flex;gap:9px;font-size:11px;opacity:.75;white-space:nowrap;overflow:hidden}
.bb-sum-hot{font-weight:700;opacity:.95}
.bb-grow{flex:1}
.bb-icon{width:24px;height:24px;border-radius:8px;border:0;background:transparent;color:inherit;opacity:.55;
  cursor:pointer;font-size:14px;line-height:1;flex:none}
.bb-icon:hover{opacity:1;background:rgba(0,0,0,.05)}
.bb-legend{display:flex;flex-wrap:wrap;gap:9px;align-items:center;padding:5px 12px;
  background:#F3EDE2;color:#3A352C;border-bottom:1px solid rgba(0,0,0,.06)}
.bb-lg{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:500;color:#3A352C}
.bb-lg i{width:8px;height:8px;display:inline-block;flex:none;border-radius:50%;
  box-shadow:0 0 0 1px #5B5648}
.bb-lg-error i{border-radius:1px;transform:rotate(45deg)}
.bb-lg-alert i{border-radius:1px}
.bb-body{flex:1;min-height:0;overflow:auto;padding:9px 12px 10px;background:#FAF7F1;color:#2C2C2A}
.bb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,200px));gap:8px;justify-content:center}
.bb-station{position:relative;border-radius:10px;padding:2px 2px 4px;cursor:pointer;background:transparent;
  transition:background-color .12s ease;outline:none}
.bb-station:hover{background:rgba(0,0,0,.045)}
.bb-station:focus-visible{outline:2px solid #378ADD;outline-offset:1px}
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
.bb-notice{margin:0 0 8px;padding:5px 8px;border-radius:8px;font-size:11px;background:#FDF2F2;color:#9B1C1C;
  border:1px solid rgba(185,28,28,.18)}
.bb-notice-warn{background:#FEF7E6;color:#8A5B00;border-color:rgba(138,91,0,.18)}
.bb-handoffs{border-top:1px solid rgba(0,0,0,.07);background:#F6F1E7;color:#3A352C;padding:6px 12px 7px;
  flex:none;max-height:92px;overflow:auto}
.bb-ho-title{font-size:11px;font-weight:600;color:#6B6558;margin-bottom:3px}
.bb-handoff{display:flex;align-items:center;gap:6px;font-size:11px;padding:2px 0;cursor:pointer;
  border-radius:6px}
.bb-handoff:hover{background:rgba(0,0,0,.05)}
.bb-ho-arrow{color:#8A8577;flex:none}
.bb-ho-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:32%}
.bb-ho-count{flex:none;color:#8A5B00}
.bb-ho-time{margin-left:auto;flex:none;color:#6B6558;font-variant-numeric:tabular-nums}
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
