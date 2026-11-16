// Copies self-hosted assets out of node_modules into /public.
// Runs on postinstall. Fonts: Instrument Serif (headlines) + Hanken Grotesk variable (UI/body).
// GPU benchmark JSON for detect-gpu is served from /gpu-benchmarks, never from a CDN.
import { cpSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const nm = (p) => resolve(root, 'node_modules', p)
const pub = (p) => resolve(root, 'public', p)

mkdirSync(pub('fonts'), { recursive: true })

const fonts = [
  [nm('@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2'), pub('fonts/InstrumentSerif-Regular.woff2')],
  [nm('@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2'), pub('fonts/HankenGrotesk-Variable.woff2')],
]
let problems = 0
for (const [from, to] of fonts) {
  if (existsSync(from)) copyFileSync(from, to)
  else {
    console.warn('[assets] font source not found:', from)
    problems++
  }
}

const bench = nm('detect-gpu/dist/benchmarks')
if (existsSync(bench)) cpSync(bench, pub('gpu-benchmarks'), { recursive: true })
else {
  console.warn('[assets] detect-gpu benchmarks not found at', bench)
  problems++
}

if (problems) {
  console.warn(`[assets] ${problems} asset(s) missing. Check the file names inside the packages and edit scripts/assets.mjs.`)
  process.exitCode = 0
} else {
  console.log('[assets] fonts and GPU benchmarks copied to /public')
}
