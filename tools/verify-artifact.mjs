// verify-artifact.mjs — asserts that the committed client.js was built from the
// src/client/** that is sitting next to it right now.
//
// Why this exists: client.js is committed and it is what DSH actually loads, but
// nothing used to read it against its sources. The v0.4.2 audit dropped the
// v0.3.4 artifact (78483 B, zero occurrences of bb-attention-row / bb-run /
// bb-idle-line) into a HEAD tree and ran smoke + render-check: 378 checks, all
// green. The reason is structural — render-check.mjs never imports client.js,
// smoke.mjs only exercises the loader contract (which v0.3.4 satisfies), and
// both `npm run check` and `npm run freeze` ran a build first, so staleness was
// unrepresentable. This script is the missing reference: it compares the src
// stamp in the banner against a freshly computed fingerprint.
//
// Deliberately NOT a byte-for-byte comparison against a fresh esbuild output:
// esbuild is `^0.25.0` with no lockfile in the repo, so a patch release of the
// bundler would turn this red for no reason. Someone would then "fix" it —
// probably by overwriting client.js, which is exactly how a real staleness gets
// laundered into a green run. Hashing the sources is stable across bundler
// versions and only changes when the sources do.
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

// MUST stay byte-for-byte identical to srcFingerprint() in tools/build.mjs.
// Same file set (src/client/*.js), same explicit sort, same sha256, same 16-hex
// truncation. If the two ever diverge, every artifact reads as stale and the
// first hand-fix silently masks the staleness this script exists to catch.
async function srcFingerprint() {
  const files = (await readdir(join(ROOT, 'src/client'))).filter(f => f.endsWith('.js')).sort()
  const hash = createHash('sha256')
  for (const f of files) hash.update(await readFile(join(ROOT, 'src/client', f)))
  return hash.digest('hex').slice(0, 16)
}

const fail = message => {
  console.error(`FAIL  ${message}`)
  process.exit(1)
}

const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
const srcHash = await srcFingerprint()
const artifact = await readFile(join(ROOT, 'client.js'), 'utf8').catch(() => {
  fail('client.js is missing — run `npm run build`')
})

// Only the banner is inspected, and only its head: the bundle body is 100+ KB of
// minified code that may legitimately contain a `// src:` in a string literal.
const head = artifact.slice(0, 2000)
const stamped = head.match(/^\/\/ src: ([0-9a-f]+)$/m)?.[1]
const version = head.match(/^\/\/ version: (\S+)$/m)?.[1]

if (!stamped) {
  fail(`client.js predates the src stamp (no "// src:" line in the banner) — run \`npm run build\``)
}
if (stamped !== srcHash) {
  fail(`artifact is stale: src ${srcHash} vs client.js ${stamped} — run \`npm run build\``)
}
if (!version) {
  fail('client.js has no "// version:" line in the banner — run `npm run build`')
}
if (version !== pkg.version) {
  fail(`artifact version ${version} != package.json ${pkg.version} — run \`npm run build\``)
}

console.log(`artifact OK (src ${srcHash}, v${version})`)
