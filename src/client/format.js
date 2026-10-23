// Small formatting helpers. Pure apart from the clock, and the clock is a
// parameter, so the smoke test can pin it.
import { defaultT } from './locale.js'

export const pad = value => String(value).padStart(2, '0')

export function ago(ms, now = Date.now(), t = defaultT) {
  if (!Number.isFinite(ms) || !ms) return ''
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 10) return t('ago.just')
  if (s < 60) return t('ago.seconds').replace('{n}', String(s))
  if (s < 3600) return t('ago.minutes').replace('{n}', String(Math.round(s / 60)))
  if (s < 86400) return t('ago.hours').replace('{n}', String(Math.round(s / 3600)))
  return t('ago.days').replace('{n}', String(Math.round(s / 86400)))
}

export function elapsed(ms, now = Date.now()) {
  if (!Number.isFinite(ms) || !ms) return ''
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m${pad(s % 60)}s`
  return `${Math.floor(m / 60)}h${pad(m % 60)}m`
}

// The client-side twin of the host's `text()`. It exists because the panel
// normally renders `api/bot`'s raw Bot list (`view?.bots`), so the host's
// sanitiser — the one with the nine-line comment about U+202E — never runs on
// the main path. Duplicated on purpose: the host and the browser bundle share
// no modules.
const INVISIBLE = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g
export const sanitize = value => (typeof value === 'string'
  ? value.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim()
  : '')

export function clip(value, max) {
  const text = sanitize(value)
  // Code points, not UTF-16 units: slicing an emoji in half produces a lone
  // surrogate, which renders as a replacement glyph in the drawer and the title.
  const chars = Array.from(text)
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : text
}
