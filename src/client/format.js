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

export function clip(value, max) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  return text.length > max ? `${text.slice(0, max)}…` : text
}
