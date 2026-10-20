// Browser half entry: register the board into the shell overlay slot.
import { Board } from './panel.js'
import { installLocale, NS } from './locale.js'
import { setOpener } from './bridge.js'

export function apply(ctx) {
  const t = installLocale(ctx)

  // uiWorkspace is optional and may be provided after apply(): the board renders
  // without it, only the "open chat" button needs it. Waiting on it here (rather
  // than reading it once) is what makes that button work on a slow start.
  const bindWorkspace = host => {
    let workspace
    try { workspace = host?.uiWorkspace ?? host?.get?.('uiWorkspace') } catch { workspace = undefined }
    if (workspace?.openSession) setOpener(workspace.openSession.bind(workspace))
  }
  if (typeof ctx.inject === 'function') ctx.inject(['uiWorkspace'], bindWorkspace)
  else bindWorkspace(ctx)

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'bot-board',
    order: 500,
    locale: NS,
    inject: () => ({ t }),
  }, Board))
}

export const inject = ['slots']
