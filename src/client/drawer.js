// The detail drawer: everything the workstation card is too small to say, in
// particular what an approval is actually asking to run — the old board only
// showed the tool name, so you still had to jump into the chat to find out.
import { createElement as h } from 'react'
import { Elapsed } from './elapsed.js'
import { LAMP, NAME_INK, STATUS_KEY } from './const.js'

function Row({ label, children }) {
  return h('div', { className: 'bb-kv' },
    h('span', { className: 'bb-k' }, label),
    h('span', { className: 'bb-v' }, children))
}

export function Drawer({ row, t, onClose, onOpenChat, canOpenChat = true }) {
  if (!row) return null
  const { bot, status, scene, detail, work, lastResult, since, action, place } = row
  const label = scene === 'done' ? t('status.done') : (STATUS_KEY[status] ? t(STATUS_KEY[status]) : status)
  const approval = detail.kind === 'approval' ? detail : null
  const question = detail.kind === 'question' ? detail : null
  const failure = detail.kind === 'error' ? detail : null
  const hasBody = Boolean(approval || question || failure || lastResult)

  return h('div', { className: 'bb-drawer', role: 'dialog', 'aria-label': bot.name },
    h('div', { className: 'bb-drawer-head' },
      h('span', {
        style: {
          width: 8, height: 8, borderRadius: '50%', flex: 'none', display: 'inline-block',
          background: LAMP[scene] ?? '#D3D1C7',
        },
      }),
      h('span', {
        className: 'bb-drawer-title',
        style: NAME_INK[scene] ? { color: NAME_INK[scene] } : undefined,
      }, bot.name),
      h('span', { className: 'bb-drawer-sub' }, label),
      h('span', { className: 'bb-grow' }),
      h('button', { className: 'bb-icon', type: 'button', onClick: onClose, title: t('drawer.close') }, '×')),

    h('div', { className: 'bb-drawer-body' },
      bot.role ? h(Row, { label: t('drawer.role') }, bot.role) : null,
      bot.model ? h(Row, { label: t('drawer.model') }, bot.model) : null,
      h(Row, { label: t('drawer.elapsed') }, since ? h(Elapsed, { since }) : t('drawer.unknown')),
      action ? h(Row, { label: t('drawer.now') }, action) : null,
      place ? h(Row, { label: t('drawer.place') }, place) : null,

      approval ? h('div', { className: 'bb-block' },
        h('div', { className: 'bb-block-t' }, t('drawer.approval')),
        approval.reason ? h('div', { className: 'bb-text' }, approval.reason) : null,
        approval.code
          ? h('div', null,
              h('div', { className: 'bb-block-t', style: { marginTop: 4 } }, t('drawer.detail')),
              h('pre', { className: 'bb-code' }, approval.code))
          : approval.text
            ? h('pre', { className: 'bb-code' }, approval.text)
            : null) : null,

      question ? h('div', { className: 'bb-block' },
        h('div', { className: 'bb-block-t' }, t('drawer.question')),
        question.text ? h('div', { className: 'bb-text' }, question.text) : null,
        question.hint ? h('div', { className: 'bb-text bb-dim' }, question.hint) : null,
        (question.options ?? []).length
          ? h('div', { style: { marginTop: 6 } },
              h('div', { className: 'bb-block-t' },
                question.multiSelect ? t('drawer.optionsMulti') : t('drawer.options')),
              // Numbering reads as "pick one". A multi-select question gets empty
              // boxes instead, so the shape of the answer matches the question.
              question.options.map((option, index) => h('div', { className: 'bb-opt', key: `${index}-${option?.label ?? ''}` },
                h('b', null, question.multiSelect ? `☐ ${option?.label ?? ''}` : `${index + 1}. ${option?.label ?? ''}`),
                option?.description ? h('span', null, option.description) : null)),
              question.allowCustom ? h('div', { className: 'bb-opt bb-dim' }, t('drawer.allowCustom')) : null)
          : null) : null,

      failure ? h('div', { className: 'bb-block' },
        h('div', { className: 'bb-block-t' }, t('drawer.failure')),
        h('div', { className: 'bb-text' }, failure.message || t('drawer.none'))) : null,

      lastResult ? h('div', { className: 'bb-block' },
        h('div', { className: 'bb-block-t' }, t('drawer.lastResult')),
        h('div', { className: 'bb-text' }, lastResult)) : null,

      !hasBody && !work?.target
        ? h('div', { className: 'bb-block' }, h('div', { className: 'bb-text bb-dim' }, t('drawer.none')))
        : null),

    h('div', { className: 'bb-drawer-foot' },
      h('button', {
        className: 'bb-btn',
        type: 'button',
        disabled: !canOpenChat,
        title: canOpenChat ? '' : t('drawer.noOpener'),
        onClick: () => onOpenChat(row),
      }, `${t('drawer.openChat')} ↗`),
      h('button', { className: 'bb-btn bb-btn-ghost', type: 'button', onClick: onClose }, t('drawer.close'))))
}
