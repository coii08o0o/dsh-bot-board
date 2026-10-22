// Bundles src/client/** into the single-file bundle DSH loads: an IIFE that calls
// window.__ModuleLoader__.load({ id, factory }). react/react-dom stay external —
// the loader hands them in, and bundling a second copy breaks hooks.
//
// IIFE + globalName rather than CJS: esbuild's CJS output reassigns
// `module.exports` via __toCommonJS, which leaves any `exports` alias we declare
// pointing at a dead object. The IIFE just returns one value.
import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))

// A fingerprint of src/client/** that gets stamped into the banner, so "is this
// artifact built from this source?" is answerable by reading client.js alone.
// The sort() is load-bearing: readdir order follows the filesystem (and glob
// order follows locale), so without it two machines hash the same sources to
// different values and the check flaps.
//
// MUST stay byte-for-byte identical to srcFingerprint() in
// tools/verify-artifact.mjs — if the two disagree, every artifact reads as
// stale and the first person to "fix" it by hand overwrites a real staleness.
async function srcFingerprint() {
  const files = (await readdir(join(ROOT, 'src/client'))).filter(f => f.endsWith('.js')).sort()
  const hash = createHash('sha256')
  for (const f of files) hash.update(await readFile(join(ROOT, 'src/client', f)))
  return hash.digest('hex').slice(0, 16)
}

const srcHash = await srcFingerprint()

const result = await build({
  entryPoints: [join(ROOT, 'src/client/index.js')],
  bundle: true,
  format: 'iife',
  globalName: '__bbEntry',
  platform: 'browser',
  target: 'es2020',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  write: false,
  legalComments: 'none',
  logLevel: 'warning',
})

const code = result.outputFiles[0].text
// The version is stamped in because otherwise "is the artifact built from this
// source?" has no answer that can be read off the artifact — the check can only
// compare a file against itself. With it, a stale bundle is visible at a glance.
//
// `// src:` is not decoration: it is the criterion tools/verify-artifact.mjs
// asserts on. The v0.4.2 audit found the `// version:` line could be rewritten
// to 0.0.0-stale with every check still green, because nothing read it. The
// src stamp is read by an assertion, so a stale artifact now fails loudly.
const banner = `// GENERATED FILE — do not edit. Source lives in src/client/**, rebuild with: npm run build
// version: ${pkg.version}
// src: ${srcHash}
window.__ModuleLoader__.load({
  id: 'dsh-bot-board',
  factory: (require) => {
`
const footer = `
    return __bbEntry
  },
})
`

const output = banner + code + footer
await writeFile(join(ROOT, 'client.js'), output)
// Byte length, not string length: the bundle contains CJK, so `.length` reports
// UTF-16 code units and under-reports the file by ~80 bytes. Anyone reconciling
// the printed number against `ls -l` would think the write was truncated.
console.log(`built client.js (${Buffer.byteLength(output)} bytes, v${pkg.version}, src ${srcHash})`)
