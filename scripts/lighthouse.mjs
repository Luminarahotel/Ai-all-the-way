// Mobile Lighthouse run against the production preview. Prints the real numbers, pass or fail.
// Needs `npm run build` first. Starts its own preview server on port 4175.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

const port = 4175
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
try {
  const res = await lighthouse(`http://localhost:${port}/`, { port: chrome.port, output: 'json', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] })
  const lhr = res.lhr
  const out = {
    performance: Math.round(lhr.categories.performance.score * 100),
    accessibility: Math.round(lhr.categories.accessibility.score * 100),
    bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
    seo: Math.round(lhr.categories.seo.score * 100),
    lcpMs: Math.round(lhr.audits['largest-contentful-paint'].numericValue),
    cls: Number(lhr.audits['cumulative-layout-shift'].numericValue.toFixed(4)),
    tbtMs: Math.round(lhr.audits['total-blocking-time'].numericValue),
    note: 'Headless Chrome, simulated mobile throttling. Treat as indicative, rerun on a real device profile.',
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/lighthouse.json', JSON.stringify(out, null, 2))
  console.log(out)
  console.log(`targets: performance >= 85, LCP < 2500 ms, CLS < 0.1 -> ${out.performance >= 85 && out.lcpMs < 2500 && out.cls < 0.1 ? 'PASS' : 'FAIL'}`)
} finally {
  await chrome.kill()
  server.kill()
}
