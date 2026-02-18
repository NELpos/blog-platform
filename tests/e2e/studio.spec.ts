import { existsSync } from 'node:fs'
import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { AUTH_STATE_PATH } from './support/constants'

test.use({ storageState: AUTH_STATE_PATH })

type DraftFixture = {
  postId: string
  title: string
  content: string
}

function parseSelectedPostId(page: Page) {
  const current = new URL(page.url())
  const postId = current.searchParams.get('post')
  if (!postId) {
    throw new Error('Post id is missing from /studio URL')
  }
  return postId
}

async function createDraftFixture(page: Page, seed: string): Promise<DraftFixture> {
  const title = `e2e-${seed}-title`
  const content = `e2e-${seed}-content`

  await page.goto('/studio/new')
  await page.waitForURL(/\/studio\?post=.*mode=edit/)
  await expect(page.locator('#studio-title')).toBeVisible()

  await page.locator('#studio-title').fill(title)
  await page.getByPlaceholder('마크다운으로 포스트를 작성하세요...').fill(content)
  await page.getByRole('button', { name: /^저장$/ }).click()
  await expect(page.getByRole('button', { name: '편집' })).toBeVisible()
  await expect(page.getByText(content)).toBeVisible()

  return {
    postId: parseSelectedPostId(page),
    title,
    content,
  }
}

async function openLatestPostFromDashboard(page: Page) {
  await page.goto('/dashboard')
  await page.locator('article[role="button"]', { hasText: '클릭해서 보기' }).first().click()
  await page.waitForURL(/\/studio\?post=.*mode=preview/)
  await page.getByRole('button', { name: '편집' }).click()
  await page.waitForURL(/\/studio\?post=.*mode=edit/)
}

async function loadPostSnapshot(request: APIRequestContext, postId: string) {
  const response = await request.get(`/api/posts/${postId}`)
  expect(response.ok()).toBeTruthy()
  return response.json() as Promise<{
    title?: string
    content_markdown?: string
  }>
}

test.beforeAll(() => {
  if (!existsSync(AUTH_STATE_PATH)) {
    throw new Error('Missing auth state. Run `pnpm e2e:setup` first.')
  }
})

test.describe('studio e2e', () => {
  test('dashboard -> studio first navigation should hydrate title/content without refresh', async ({ page, request }) => {
    const seed = Date.now().toString()
    await createDraftFixture(page, seed)

    await openLatestPostFromDashboard(page)

    const openedPostId = parseSelectedPostId(page)
    const snapshot = await loadPostSnapshot(request, openedPostId)
    await expect(page.locator('#studio-title')).toHaveValue(snapshot.title ?? '')
    await expect(page.getByPlaceholder('마크다운으로 포스트를 작성하세요...')).toHaveValue(snapshot.content_markdown ?? '')
  })

  test('save -> view -> publish should keep latest version selected', async ({ page }) => {
    const seed = (Date.now() + 1).toString()
    const fixture = await createDraftFixture(page, seed)

    if (await page.getByRole('button', { name: '뷰' }).isVisible()) {
      await page.getByRole('button', { name: '뷰' }).click()
    }
    await page.getByRole('button', { name: '게시', exact: true }).click()
    await expect(page.getByText('게시중')).toBeVisible()

    await page.getByRole('button', { name: '편집' }).click()
    const nextContent = `${fixture.content}-v2`
    await page.getByPlaceholder('마크다운으로 포스트를 작성하세요...').fill(nextContent)
    await page.getByRole('button', { name: /^저장$/ }).click()
    await expect(page.getByText(nextContent)).toBeVisible()

    await page.getByRole('button', { name: '뷰' }).click()
    const publishVersionSelect = page.getByRole('button', { name: '게시할 버전 선택' })
    await expect(publishVersionSelect).toContainText('v2')
    await page.getByRole('button', { name: '게시', exact: true }).click()
    await expect(page.getByText('게시중')).toBeVisible()
  })

  test('unsaved changes should show confirm before switching post with command palette', async ({ page }) => {
    const seedA = (Date.now() + 2).toString()
    const seedB = (Date.now() + 3).toString()
    const first = await createDraftFixture(page, seedA)
    await createDraftFixture(page, seedB)

    await page.goto(`/studio?post=${first.postId}&mode=edit`)
    await page.locator('#studio-title').fill(`${first.title}-dirty`)

    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)
    await expect(page.getByRole('dialog', { name: 'Post quick open' })).toBeVisible()
    const initialUrl = page.url()

    const commandSearch = page.getByRole('textbox', { name: '포스트 빠른 이동 검색' })
    await commandSearch.fill(seedB)
    page.once('dialog', (dialog) => dialog.accept())
    await page.keyboard.press('Enter')
    await expect(page).not.toHaveURL(initialUrl)
  })
})
