// Entry JS budget: under 150 KB gzip. The 3D chunk (three, r3f) and the motion chunk are dynamic imports and are excluded.
import { readFileSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
if (!existsSync(resolve(dist, 'index.html'))) {
  console.error('dist/index.html not found. Run npm run build first.')
  process.exit(1)
}
const html = readFileSync(resolve(dist, 'index.html'), 'utf8')
const entries = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
const preloads = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map((m) => m[1])
let total = 0
for (const f of [...new Set([...entries, ...preloads])]) {
  const p = resolve(dist, '.' + f)
  const gz = gzipSync(readFileSync(p)).length
  total += gz
  console.log(`  ${f}  ${(gz / 1024).toFixed(1)} KB gzip`)
}
console.log(`[size] entry JS total: ${(total / 1024).toFixed(1)} KB gzip (budget 150 KB)`)
if (total > 150 * 1024) process.exit(1)
