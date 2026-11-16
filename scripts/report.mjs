// Prints a gate-results table from Playwright results and the metrics the tests wrote.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = resolve('test-results')
const metrics = {}
if (existsSync(dir)) {
  for (const f of readdirSync(dir)) {
    if (f.startsWith('metric-') && f.endsWith('.json')) Object.assign(metrics, JSON.parse(readFileSync(resolve(dir, f), 'utf8')))
  }
}
let results = null
try { results = JSON.parse(readFileSync(resolve(dir, 'results.json'), 'utf8')) } catch {}
const rows = []
function walk(s) {
  for (const sp of s.specs ?? []) {
    const ok = sp.tests.every((t) => t.results.every((r) => r.status === 'passed' || r.status === 'skipped'))
    const skipped = sp.tests.every((t) => t.results.every((r) => r.status === 'skipped'))
    rows.push([sp.title, skipped ? 'skipped' : ok ? 'pass' : 'FAIL'])
  }
  for (const c of s.suites ?? []) walk(c)
}
if (results) for (const s of results.suites) walk(s)
console.log('\nGATE RESULTS')
for (const [t, r] of rows) console.log(`  ${r.padEnd(8)} ${t}`)
console.log('\nMETRICS')
console.log(JSON.stringify(metrics, null, 2))
try {
  console.log('\nLIGHTHOUSE')
  console.log(readFileSync(resolve(dir, 'lighthouse.json'), 'utf8'))
} catch { console.log('(not run: npm run lighthouse)') }
