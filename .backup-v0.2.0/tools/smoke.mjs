// smoke.mjs — two halves, mirroring how DSH loads the plugin:
//   1. client.js: window.__ModuleLoader__.load() hands the factory a require();
//      apply() must register the board into the shell.overlay slot without
//      throwing. Then Board is rendered with stub hooks so ensureStyle() runs
//      and the real generated CSS can be asserted on: discrete motions must
//      STEP (step-end keyframes, strictly increasing percentages), breathing
//      must be 2.6s, and the reduced-motion block must come after every
//      generated keyframe/rule so it actually wins at equal specificity.
//   2. index.js: apply() must register the agent/error worker even when the
//      connection service is absent (注入始终回调), record events into the
//      failures store and let snapshot time judge them (由 store 判定), and
//      register the snapshot route as POST + buffered (asset routes are gone
//      with petdex; nothing may come back).
// Run: node tools/smoke.mjs
import { readFileSync } from 'node:fs'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
let failed = 0
const check = (ok, label) => {
  if (ok) {
    console.log(`  ok  ${label}`)
  } else {
    failed += 1
    console.error(`FAIL  ${label}`)
  }
}

// ---------------------------------------------------------------- client.js --
{
  const source = readFileSync(join(ROOT, 'client.js'), 'utf8')
  const effects = []
  // Optional seeded hook state: lets one extra render drive real rows through
  // the real sceneOf() (QA Round-3 regressions). Empty queue = plain stub.
  const stateQueue = []
  let stateIndex = 0
  const ReactStub = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useCallback: fn => fn,
    useEffect: fn => { effects.push(fn) },
    useMemo: fn => fn(),
    useRef: value => ({ current: value }),
    useState: value => {
      const next = stateIndex < stateQueue.length
        ? stateQueue[stateIndex]
        : (typeof value === 'function' ? value() : value)
      stateIndex += 1
      return [next, () => {}]
    },
  }
  let loaded = null
  const styleNodes = []
  const sandbox = {
    window: { __ModuleLoader__: { load: spec => { loaded = spec } } },
    fetch: async () => { throw new Error('offline in smoke') },
    localStorage: { getItem: () => null, setItem: () => {} },
    document: {
      hidden: false,
      getElementById: () => null,
      createElement: tag => ({ tag, style: {} }),
      head: { appendChild: node => { styleNodes.push(node) } },
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    console,
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'client.js' })

  check(loaded?.id === 'dsh-bot-board', 'client.js: __ModuleLoader__.load called with id dsh-bot-board')
  const required = []
  const api = loaded.factory(name => {
    required.push(name)
    if (name === 'react') return ReactStub
    throw new Error(`unexpected require("${name}")`)
  })
  check(typeof api?.apply === 'function', 'client.js: factory returns apply()')
  check(JSON.stringify(api.inject) === JSON.stringify(['slots', 'uiWorkspace']), 'client.js: inject list is slots+uiWorkspace')

  const calls = { inject: [], register: [] }
  const ctx = {
    uiWorkspace: { openSession: () => {} },
    slots: {
      inject: (name, cb) => {
        calls.inject.push(name)
        if (typeof cb === 'function') cb()
      },
      register: (options, component) => {
        calls.register.push({ options, component })
        return () => {}
      },
    },
  }
  api.apply(ctx)
  const slot = calls.register[0]
  check(calls.inject.length === 1 && calls.inject[0] === 'shell.overlay', 'client.js: slots.inject("shell.overlay") called')
  check(calls.register.length === 1, 'client.js: slots.register called once')
  check(slot?.options?.id === 'bot-board' && slot?.options?.name === 'shell.overlay' && slot?.options?.order === 500,
    'client.js: slot registered as {name:shell.overlay, id:bot-board, order:500}')
  check(typeof slot?.component === 'function', 'client.js: slot component is a function')

  // Render Board once with stub hooks, then run its effects: ensureStyle()
  // pushes the real generated CSS into our document stub.
  const tree = slot.component()
  for (const effect of effects) effect()
  const css = styleNodes.map(node => node.textContent).join('\n')
  check(css.includes('.bb-wrap') && css.includes('@keyframes bb-breathe'),
    'client.js: Board renders and injects its classroom stylesheet')

  // --- petdex must be gone (hard constraint).
  check(!/petdex|PET_|\.gif|background-position/i.test(source),
    'client.js: no petdex/sprite code left')
  check(!/petdex|PET_|\.gif/i.test(readFileSync(join(ROOT, 'index.js'), 'utf8')),
    'index.js: no petdex/sprite code left')

  // --- step-end motion model: every discrete keyframe set has strictly
  // increasing percentages starting at 0% (no shared-percentage hold pairs,
  // which Chrome linearises into a glide) and its rule uses step-end.
  const parseStops = name => {
    const start = css.indexOf(`@keyframes ${name}{`)
    if (start < 0) return null
    const open = css.indexOf('{', start)
    let depth = 0
    let end = open
    for (; end < css.length; end += 1) {
      if (css[end] === '{') depth += 1
      else if (css[end] === '}') { depth -= 1; if (depth === 0) break }
    }
    return [...css.slice(open + 1, end).matchAll(/([\d.]+)%\{([^}]*)\}/g)]
      .map(match => ({ pct: parseFloat(match[1]), body: match[2] }))
  }
  const DISCRETE = ['bb-blink', 'bb-tap', 'bb-wave', 'bb-note']
  for (const name of DISCRETE) {
    const stops = parseStops(name)
    const label = `client.js: ${name}`
    if (!stops || stops.length < 2) { check(false, `${label} keyframes present`); continue }
    const monotonic = stops[0].pct === 0 && stops.every((stop, index) => index === 0 || stop.pct > stops[index - 1].pct)
    check(monotonic, `${label}: one stop per hold, percentages strictly increasing from 0%`)
  }
  for (const name of [...DISCRETE, 'bb-breathe']) {
    const rule = css.match(new RegExp(`\\.bb-${name === 'bb-breathe' ? 'blob' : name.replace('bb-', '')}[^{]*\\{[^}]*\\}`))
      ?? css.match(new RegExp(`\\.bb-[a-z-]+\\{[^}]*animation:${name}[^}]*\\}`))
    check(Boolean(rule && rule[0].includes(name)), `client.js: rule for ${name} present`)
    if (DISCRETE.includes(name)) {
      check(Boolean(rule && rule[0].includes('step-end')), `client.js: ${name} uses step-end timing`)
    }
  }
  check(/\.bb-blob\{[^}]*bb-breathe 2\.6s/.test(css),
    'client.js: breathing runs bb-breathe over 2.6s')

  // --- reduced-motion ordering (QA must-fix from the sprite era, kept): the
  // reduce block must sit after every generated keyframe and animation rule.
  const reduceAt = css.lastIndexOf('@media (prefers-reduced-motion:reduce)')
  check(reduceAt > css.lastIndexOf('@keyframes'),
    'client.js: reduced-motion block comes after all keyframes')
  check(reduceAt > css.lastIndexOf('animation:bb-') && reduceAt > css.lastIndexOf('bb-note{', reduceAt),
    'client.js: reduced-motion block comes after all animation rules')
  const reduceBlock = css.slice(reduceAt)
  check(reduceBlock.includes('animation:none') && reduceBlock.includes('.bb-blob') && reduceBlock.includes('.bb-note'),
    'client.js: reduced-motion block disables blob/limb/note animations')

  // --- classroom structure in the rendered tree.
  const dump = JSON.stringify(tree)
  for (const word of ['干活', '等你', '卡住', '闲着', '干完']) {
    check(dump.includes(word), `client.js: legend word ${word} rendered`)
  }
  check(dump.includes('bb-grid'), 'client.js: workstation grid rendered')
  check(source.includes("className: 'bb-station'") && source.includes('h(Station,'),
    'client.js: Station paints each workstation (bb-station) into the grid')
  check(dump.includes('bb-rz'), 'client.js: drag-resize grip rendered')
  check(source.includes('SIZE_KEY') && source.includes('SIZE_MIN') && source.includes('SIZE_MAX'),
    'client.js: resize size persisted in localStorage with min/max clamps')

  // --- QA Round-3 regressions, via a seeded render that drives three bots
  // (error+hand-off-wave, alert+wave, idle+hand-off-wave) through the REAL
  // sceneOf()/blobSeat() paths and inspects Station's own output.
  const collect = (node, pred, out = []) => {
    if (!node || typeof node !== 'object') return out
    if (Array.isArray(node)) { node.forEach(child => collect(child, pred, out)); return out }
    if (pred(node)) out.push(node)
    collect(node.children, pred, out)
    return out
  }
  stateIndex = 0
  stateQueue.push(
    {
      bots: [{ id: 'b_err', name: 'Chief' }, { id: 'b_alert', name: '数学' }, { id: 'b_done', name: '生物' }],
      activity: {},
      work: { bots: {}, waiting: {}, approvals: [{ id: 'ap1', botId: 'b_alert', tool: 'Bash' }] },
      questions: {},
    },
    { works: [], rooms: [], errors: [{ botId: 'b_err', at: 1, message: 'boom' }] },
    null,
    0,
    false, null, { w: 560, h: 420 },
    { b_err: true, b_alert: true, b_done: true }, {},
  )
  const seeded = slot.component()
  const renderStation = name => {
    const el = collect(seeded, node => typeof node.type === 'function' && node.props?.row?.bot?.name === name)[0]
    return el ? el.type({ ...el.props, onOpen: () => {} }) : null
  }
  const sceneOfName = st => (collect(st, node => node.props?.['data-scene'])[0]?.props['data-scene']) ?? null
  const errSt = renderStation('Chief')
  const alertSt = renderStation('数学')
  const doneSt = renderStation('生物')
  check(sceneOfName(errSt) === 'error',
    'client.js: sceneOf("error", done)==="error" — done never masks a failure')
  check(sceneOfName(alertSt) === 'alert',
    'client.js: sceneOf("alert", done)==="alert" — done never masks an approval')
  check(sceneOfName(doneSt) === 'done',
    'client.js: sceneOf("idle", done)==="done" — clean hand-off still shows done')
  check(collect(alertSt, node => node.props?.className === 'bb-hand bb-wave').length === 1,
    'client.js: alert scene right hand className carries bb-wave')
  check(collect(errSt, node => String(node.props?.className ?? '').includes('bb-wave')).length === 0,
    'client.js: error scene hands carry no bb-wave even while waving=true')
  const errTitle = errSt?.props?.title ?? ''
  check(errTitle.includes('出错了') && !errTitle.includes('干完'),
    'client.js: error station title reads 出错了 while waving (not 干完)')
  console.log('client.js half done (via', required.join(','), ')')
}

// ----------------------------------------------------------------- index.js --
{
  // Hermetic DSH home so snapshot() reads a fixture instead of the real one.
  const home = await mkdtemp(join(tmpdir(), 'bb-smoke-'))
  try {
    await mkdir(join(home, 'bot'))
    await writeFile(join(home, 'bot', 'state.json'), JSON.stringify({
      bots: {
        b1: { id: 'b1', name: 'Chief', segments: [] },
        b2: { id: 'b2', name: '数学', segments: [] },
      },
      works: {},
      rooms: {},
    }))
    process.env.DSH_HOME = home
    const { apply } = await import(new URL('../index.js', import.meta.url).href)

    // Full ctx: connection ready.
    const listeners = []
    const routes = []
    apply({
      on: (name, cb) => { listeners.push({ name, cb }) },
      effect: fn => {
        const dispose = fn()
        return typeof dispose === 'function' ? dispose : () => {}
      },
      connection: { fetch: { register: route => { routes.push(route); return () => {} } } },
    })

    const worker = listeners.find(item => item.name === 'agent/error')
    check(typeof worker?.cb === 'function', 'index.js: agent/error listener registered (worker injected)')
    check(routes.some(route => route.path === '/api/bot-board'), 'index.js: snapshot route registered')

    const snapshot = routes.find(route => route.path === '/api/bot-board')
    check(snapshot?.methods?.length === 1 && snapshot.methods[0] === 'POST',
      'index.js: snapshot route keeps methods:["POST"] (regression)')
    check(snapshot?.requestBody === 'buffered',
      'index.js: snapshot route keeps requestBody:"buffered" (regression)')
    check(snapshot?.path.startsWith('/'), 'index.js: snapshot path keeps the leading slash')
    check(routes.every(route => route.path === '/api/bot-board'),
      'index.js: no pet/asset routes registered (petdex removed)')
    check(routes.length === 1, `index.js: exactly one route registered (got ${routes.length})`)

    // 由 store 判定: the worker only records; snapshot serving time judges.
    worker.cb({ agent: { session: { id: 'b1' } }, error: { message: 'boom at step 3' } })
    const body = await (await snapshot.fetch()).json()
    const surfaced = (body.errors ?? []).find(item => item.botId === 'b1')
    check(Boolean(surfaced) && surfaced.message.includes('boom at step 3'),
      'index.js: agent/error event judged into snapshot.errors by the store')
    check(body.ok === true && body.bots.length === 2, 'index.js: snapshot still healthy with fixture bots')

    // 注入不再依赖服务就绪: no connection service at all, but the worker must
    // still be registered and must still record.
    const bareListeners = []
    apply({
      on: (name, cb) => { bareListeners.push({ name, cb }) },
      effect: () => () => {},
    })
    const bareWorker = bareListeners.find(item => item.name === 'agent/error')
    check(typeof bareWorker?.cb === 'function',
      'index.js: agent/error listener registered even without connection service')
    bareWorker.cb({ agent: { session: { id: 'b2' } }, error: { message: 'offline keep-alive' } })
    check(true, 'index.js: connection-less worker callback records without throwing')
    console.log('index.js half done')
  } finally {
    await rm(home, { recursive: true, force: true })
  }
}

if (failed) {
  console.error(`smoke FAILED: ${failed} assertion(s)`)
  process.exit(1)
}
console.log('smoke OK')
