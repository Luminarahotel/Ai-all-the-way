// Rewrites package.json so every dependency is pinned to the exact installed version.
// Run once after the first `npm install`, then commit package.json and package-lock.json.
// Also checks that three and @types/three share the same release line.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = resolve(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const installed = {}

for (const group of ['dependencies', 'devDependencies']) {
  for (const name of Object.keys(pkg[group] ?? {})) {
    const p = resolve(root, 'node_modules', name, 'package.json')
    if (!existsSync(p)) {
      console.warn(`[pin] ${name} is not installed, skipped`)
      continue
    }
    const v = JSON.parse(readFileSync(p, 'utf8')).version
    pkg[group][name] = v
    installed[name] = v
  }
}
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

const minor = (v) => (v ?? '').split('.').slice(0, 2).join('.')
const three = installed['three']
const types = installed['@types/three']
console.log('[pin] pinned versions:')
for (const [k, v] of Object.entries(installed)) console.log(`  ${k}@${v}`)
if (three && types) {
  const t = three.split('.')[1] // three 0.18x.y -> release 18x
  const ty = types.split('.')[1]
  if (t !== ty) console.warn(`[pin] WARNING: three ${three} and @types/three ${types} are on different release lines. Install a matching @types/three.`)
  else console.log(`[pin] three ${three} and @types/three ${types} match (${minor(three)})`)
}
