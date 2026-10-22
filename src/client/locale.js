// Dictionaries for the classroom chrome. Keys are flat and dotted, matching the
// platform convention (ctx.locale.register(namespace, { zh, en })).
export const NS = 'plugin.dsh-bot-board'

export const zh = {
  'panel.title': 'Bot 看板',
  'panel.expand': '展开 Bot 教室',
  'panel.collapse': '收起',
  'panel.drag': '拖动标题栏可移动',
  'panel.resize': '拖动右下角调整大小',
  'panel.empty': '还没有 Bot',
  'panel.loading': '载入中…',
  'panel.stale': '数据读取延迟，显示的是上一次快照',
  'panel.boardError': '本地数据读取失败',
  'panel.offline': '没连上 DS Bot',
  'panel.mostly': '最久',
  'panel.noState': '没找到 DS Bot 的状态文件',
  'panel.unreadable': '状态文件读不了',
  'panel.sumHandoff': '{n} 项在交接',

  'legend.busy': '干活',
  'legend.alert': '等你',
  'legend.waiting': '等交活',
  'legend.error': '卡住',
  'legend.idle': '闲着',
  'legend.done': '干完',
  'legend.help': '六态说明',
  'legend.hint.busy': '正在跑一轮，不用你管',
  'legend.hint.alert': '等你批或等你答',
  'legend.hint.waiting': '在等另一个 Bot 交活',
  'legend.hint.error': '出错了，跑不动',
  'legend.hint.idle': '闲着，没有活',
  'legend.hint.done': '刚交完活（7 秒后回落到闲着）',

  'attention.empty': '没有需要你的事',
  'attention.overflow': '还有 {n} 个',
  'attention.collapse': '收起多出来的',
  'layer.idle': '闲着',

  'ho.groupTotal': '共 {n} 项',
  'ho.blocked': '被堵',
  'ho.notStarted': '未开工',
  'ho.mutual': '互相等',
  'ho.morePeople': '还有 {n} 人',
  'ho.moreItems': '还有 {n} 项',

  'status.working': '干活中',
  'status.thinking': '思考中',
  'status.searching': '查资料',
  'status.sending': '发消息',
  'status.orbit': '转交中',
  'status.alert': '等你处理',
  'status.error': '出错了',
  'status.waiting': '等交活',
  'status.idle': '闲着',
  'status.done': '干完',

  'meta.approval': '等你批',
  'meta.question': '等你答',
  'meta.error': '报错',
  'meta.waiting': '等',
  'meta.tool': '调用',
  'meta.stalled': '可能卡住了',
  'meta.room': '群',
  'meta.for': '替',
  'meta.kickoff': '等你选模型',

  'handoff.title': '正在交接',
  'handoff.open': '项待交',

  'drawer.role': '角色',
  'drawer.model': '模型',
  'drawer.elapsed': '已跑',
  'drawer.now': '当前',
  'drawer.place': '在哪',
  'drawer.approval': '等你审批',
  'drawer.question': '等你回答',
  'drawer.options': '可选项',
  'drawer.optionsMulti': '可选项（可多选）',
  'drawer.allowCustom': '也可以自己说',
  'drawer.failure': '最近的报错',
  'drawer.lastResult': '最近一次交活结果',
  'drawer.detail': '具体内容',
  'drawer.openChat': '打开聊天',
  'drawer.close': '关闭',
  'drawer.none': '暂无',
  'drawer.unknown': '未知',
  'drawer.noOpener': '暂时打不开会话（宿主还没就绪）',

  'notice.approval': '等你处理',
  'notice.approvalBody': '想运行',
  'notice.approvalFallback': '有个审批在等你',
  'notice.error': '出错了',

  'ago.just': '刚刚',
  'ago.seconds': '{n} 秒前',
  'ago.minutes': '{n} 分钟前',
  'ago.hours': '{n} 小时前',
  'ago.days': '{n} 天前',
}

export const en = {
  'panel.title': 'Bot board',
  'panel.expand': 'Open the Bot classroom',
  'panel.collapse': 'Collapse',
  'panel.drag': 'Drag the title bar to move',
  'panel.resize': 'Drag the corner to resize',
  'panel.empty': 'No Bots yet',
  'panel.loading': 'Loading…',
  'panel.stale': 'Data is delayed — showing the last snapshot',
  'panel.boardError': 'Could not read local data',
  'panel.offline': 'Not connected to DS Bot',
  'panel.mostly': 'Longest',
  'panel.noState': 'DS Bot has no state file yet',
  'panel.unreadable': 'The state file cannot be read',
  'panel.sumHandoff': '{n} open hand-offs',

  'legend.busy': 'Working',
  'legend.alert': 'Needs you',
  'legend.waiting': 'Waiting',
  'legend.error': 'Stuck',
  'legend.idle': 'Idle',
  'legend.done': 'Done',
  'legend.help': 'What the six states mean',
  'legend.hint.busy': 'Running a turn — nothing for you',
  'legend.hint.alert': 'Waiting for your approval or answer',
  'legend.hint.waiting': 'Waiting for another Bot to hand back',
  'legend.hint.error': 'Failed — it cannot continue',
  'legend.hint.idle': 'Idle, nothing running',
  'legend.hint.done': 'Just handed back (idle after 7s)',

  'attention.empty': 'Nothing needs you',
  'attention.overflow': '{n} more',
  'attention.collapse': 'Collapse the extras',
  'layer.idle': 'Idle',

  'ho.groupTotal': '{n} open',
  'ho.blocked': 'blocked',
  'ho.notStarted': 'not started',
  'ho.mutual': 'waiting on each other',
  'ho.morePeople': '{n} more',
  'ho.moreItems': '{n} more',

  'status.working': 'Working',
  'status.thinking': 'Thinking',
  'status.searching': 'Searching',
  'status.sending': 'Sending',
  'status.orbit': 'Handing off',
  'status.alert': 'Needs you',
  'status.error': 'Failed',
  'status.waiting': 'Waiting',
  'status.idle': 'Idle',
  'status.done': 'Done',

  'meta.approval': 'Approve',
  'meta.question': 'Answer',
  'meta.error': 'Failed',
  'meta.waiting': 'Waiting for',
  'meta.tool': 'Running',
  'meta.stalled': 'Possibly stuck',
  'meta.room': 'group',
  'meta.for': 'for',
  'meta.kickoff': 'Pick a model',

  'handoff.title': 'In flight',
  'handoff.open': 'open',

  'drawer.role': 'Role',
  'drawer.model': 'Model',
  'drawer.elapsed': 'Running',
  'drawer.now': 'Now',
  'drawer.place': 'Where',
  'drawer.approval': 'Waiting for your approval',
  'drawer.question': 'Waiting for your answer',
  'drawer.options': 'Options',
  'drawer.optionsMulti': 'Options (pick any)',
  'drawer.allowCustom': 'Or answer in your own words',
  'drawer.failure': 'Last failure',
  'drawer.lastResult': 'Last hand-off result',
  'drawer.detail': 'Details',
  'drawer.openChat': 'Open chat',
  'drawer.close': 'Close',
  'drawer.none': 'Nothing yet',
  'drawer.unknown': 'unknown',
  'drawer.noOpener': 'Chat is not available yet',

  'notice.approval': 'Needs you',
  'notice.approvalBody': 'Wants to run',
  'notice.approvalFallback': 'An approval is waiting',
  'notice.error': 'Failed',

  'ago.just': 'just now',
  'ago.seconds': '{n}s ago',
  'ago.minutes': '{n}m ago',
  'ago.hours': '{n}h ago',
  'ago.days': '{n}d ago',
}

const DICTS = { zh, en }

export function fallbackT(locale) {
  const dict = DICTS[locale] ?? zh
  return key => dict[key] ?? zh[key] ?? key
}

// Registers the dictionaries with the host and returns the bound translate
// function. Falls back to the zh dictionary if the locale service is missing, so
// the panel still renders on a platform build without i18n. The bound function is
// also wrapped: a namespace the host did not accept returns the key unchanged,
// and showing "legend.busy" to the user is worse than showing Chinese.
// One shared instance: the panel falls back to this when the slot does not hand
// it a translator, and a new function identity on every render would make the
// memoised workstations repaint on every poll.
export const defaultT = fallbackT('zh')

export function installLocale(ctx) {
  const fallback = defaultT
  try {
    if (typeof ctx?.locale?.register === 'function') {
      ctx.effect?.(() => ctx.locale.register(NS, { zh, en }), 'bot-board: dictionaries')
      if (typeof ctx.locale.bind === 'function') {
        const bound = ctx.locale.bind(NS)
        if (typeof bound === 'function') {
          return key => {
            try {
              const value = bound(key)
              return typeof value === 'string' && value && value !== key ? value : fallback(key)
            } catch {
              return fallback(key)
            }
          }
        }
      }
    }
  } catch {
    // A locale service that rejects the namespace must not take the panel down.
  }
  return fallback
}
