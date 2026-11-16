// Fails if placeholder text appears in src, index.html or dist.
// Allowed exceptions live in scripts/placeholder-allowlist.json (each entry needs a reason).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PATTERNS = [
  /\[PLACEHOLDER/i,
  /PLACEHOLDER:/i,
  /\bTODO\b/,
  /\bTBD\b/,
  /lorem/i,
  /example\.com/i,
  /coming soon/i,
]
const allow = JSON.parse(readFileSync(resolve(root, 'scripts/placeholder-allowlist.json'), 'utf8')).allow

const targets = ['src', 'index.html', 'dist']
const exts = new Set(['.ts', '.tsx', '.css', '.html', '.js', '.json', '.svg', '.mjs'])
const files = []
function walk(p) {
  if (!existsSync(p)) return
  const st = statSync(p)
  if (st.isDirectory()) for (const f of readdirSync(p)) walk(join(p, f))
  else if (exts.has(p.slice(p.lastIndexOf('.')))) files.push(p)
}
targets.forEach((t) => walk(resolve(root, t)))

let fails = 0
for (const f of files) {
  const rel = relative(root, f).replaceAll('\\', '/')
  if (rel.startsWith('dist/gpu-benchmarks') || rel.startsWith('dist/fonts')) continue
  const text = readFileSync(f, 'utf8')
  for (const re of PATTERNS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
    let m
    while ((m = g.exec(text))) {
      const ctx = text.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, ' ')
      const ok = allow.some((a) => rel.includes(a.file) && ctx.includes(a.context))
      if (!ok) {
        fails++
        console.error(`FAIL ${rel}: /${re.source}/ ...${ctx}...`)
      }
    }
  }
}
console.log(`[placeholders] scanned ${files.length} files, ${fails} problem(s)`)
if (fails) process.exit(1)
