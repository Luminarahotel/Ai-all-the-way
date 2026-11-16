import { expect, test } from '@playwright/test'
import { open } from './helpers'

// Gate i: form states. Port 4173 = no endpoint (demo). Port 4174 = built with VITE_WAITLIST_URL=/api/waitlist.
const submit = (page: import('@playwright/test').Page) => page.locator('#waitlist button[type=submit]')

test('gate i: empty, invalid, valid demo (no endpoint)', async ({ page }) => {
  await open(page, '?tier=poster')
  await submit(page).click()
  await expect(page.locator('#wl-error')).toHaveText(/Enter an email/)
  await expect(page.locator('#wl-email')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#wl-email')).toHaveAttribute('aria-describedby', /wl-error/)
  expect(await page.locator('#wl-error').getAttribute('role')).toBe('alert')

  await page.locator('#wl-email').fill('not-an-email')
  await submit(page).click()
  await expect(page.locator('#wl-error')).toHaveText(/Enter an email/)

  await page.locator('#wl-email').fill('person@mail.test')
  await submit(page).click()
  const status = page.locator('#wl-status')
  await expect(status).toHaveText('Form works. Nothing was saved.')
  expect(await status.getAttribute('aria-live')).toBe('polite')
  expect(await status.getAttribute('role')).toBe('status')
})

test('gate i: mock endpoint success posts JSON {email}', async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: 'http://localhost:4174' })
  const page = await ctx.newPage()
  let body: unknown = null
  await page.route('**/api/waitlist', async (route) => {
    body = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await open(page, '?tier=poster')
  await page.locator('#wl-email').fill('person@mail.test')
  await submit(page).click()
  await expect(page.locator('#wl-status')).toContainText('You are on the list')
  expect(body).toEqual({ email: 'person@mail.test' })
  await ctx.close()
})

test('gate i: mock endpoint 500 shows an error and a working retry', async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: 'http://localhost:4174' })
  const page = await ctx.newPage()
  let calls = 0
  await page.route('**/api/waitlist', async (route) => {
    calls++
    if (calls === 1) await route.fulfill({ status: 500, body: 'nope' })
    else await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await open(page, '?tier=poster')
  await page.locator('#wl-email').fill('person@mail.test')
  await submit(page).click()
  await expect(page.locator('#wl-status')).toContainText('did not go through')
  expect(await page.locator('#wl-status').getAttribute('aria-live')).toBe('polite')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('#wl-status')).toContainText('You are on the list')
  expect(calls).toBe(2)
  await ctx.close()
})

test('gate i: finish picker is an accessible radiogroup', async ({ page }) => {
  await open(page, '?tier=poster')
  const group = page.getByRole('radiogroup')
  await expect(group).toBeVisible()
  const radios = group.getByRole('radio')
  expect(await radios.count()).toBe(3)
  await radios.nth(0).focus()
  await page.keyboard.press('ArrowRight')
  await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('#finish-copy')).toContainText('Graphite')
  expect(await page.locator('#finish-copy').getAttribute('aria-live')).toBe('polite')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(radios.nth(2)).toHaveAttribute('aria-checked', 'true') // wraps
})
