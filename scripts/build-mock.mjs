// Builds a second copy of the site into dist-mock with a mock waitlist endpoint,
// so the form gate can test the success and 500 paths. Production dist is untouched.
import { spawnSync } from 'node:child_process'

const r = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_WAITLIST_URL: '/api/waitlist', LUMO_OUT_DIR: 'dist-mock' },
})
process.exit(r.status ?? 1)
