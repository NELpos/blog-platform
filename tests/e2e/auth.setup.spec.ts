import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { test } from '@playwright/test'
import { AUTH_STATE_PATH } from './support/constants'

test.describe('OAuth setup', () => {
  test('login once and persist storage state', async ({ page }) => {
    test.setTimeout(6 * 60 * 1000)
    mkdirSync(dirname(AUTH_STATE_PATH), { recursive: true })

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })
    })

    await page.goto('/login')

    if (!page.url().includes('/dashboard')) {
      await page.getByRole('button', { name: 'Google로 계속하기' }).click()
      await page.waitForURL('**/dashboard', { timeout: 5 * 60 * 1000 })
    }

    await page.context().storageState({ path: AUTH_STATE_PATH })
  })
})
