// Bundles src/client/** into the single-file bundle DSH loads: an IIFE that calls
// window.__ModuleLoader__.load({ id, factory }). react/react-dom stay external —
// the loader hands them in, and bundling a second copy breaks hooks.
//
// IIFE + globalName rather than CJS: esbuild's CJS output reassigns
// `module.exports` via __toCommonJS, which leaves any `exports` alias we declare
// pointing at a dead object. The IIFE just returns one value.
import { build } from 'esbuild'
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

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
const banner = `// GENERATED FILE — do not edit. Source lives in src/client/**, rebuild with: npm run build
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
console.log(`built client.js (${output.length} bytes)`)
