import { existsSync } from 'node:fs'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { AUTH_STATE_PATH } from './support/constants'

test.use({ storageState: AUTH_STATE_PATH })

type DraftFixture = {
  postId: string
  title: string
  content: string
}

type PostSnapshot = {
  id: string
  title: string
  content_markdown: string
  live_title: string | null
  live_content_markdown: string | null
  published: boolean
  published_version_id: string | null
  versions?: Array<{
    id: string
    version_number: number
    title: string
    content_markdown: string
  }>
}

test.beforeAll(() => {
  if (!existsSync(AUTH_STATE_PATH)) {
    throw new Error('Missing auth state. Run `pnpm e2e:setup` first.')
  }
})

function parseSelectedPostId(page: Page) {
  const current = new URL(page.url())
  const postId = current.searchParams.get('post')
  if (!postId) {
    throw new Error('Post id is missing from /studio URL')
  }
  return postId
}

async function createDraftFixture(page: Page, seed: string): Promise<DraftFixture> {
  const title = `lifecycle-${seed}-title`
  const content = `lifecycle-${seed}-content`

  await page.goto('/studio/new')
  await page.waitForURL(/\/studio\?post=.*mode=edit/)
  await expect(page.locator('#studio-title')).toBeVisible()

  await page.locator('#studio-title').fill(title)
  await page.getByPlaceholder('마크다운으로 포스트를 작성하세요...').fill(content)
  await page.getByRole('button', { name: /^저장$/ }).click()

  return {
    postId: parseSelectedPostId(page),
    title,
    content,
  }
}

async function saveDraft(page: Page) {
  const saveButton = page.getByRole('button', { name: /^저장$/ })
  if (await saveButton.isEnabled()) {
    await saveButton.click()
    await expect(saveButton).toBeDisabled()
    await expect(page.getByText(/저장 완료|변경사항 없음/)).toBeVisible()
  }
}

async function switchToView(page: Page) {
  const viewButton = page.getByRole('button', { name: '뷰' })
  if (await viewButton.isVisible()) {
    await viewButton.click()
  }
}

async function switchToEdit(page: Page) {
  const editButton = page.getByRole('button', { name: '편집' })
  if (await editButton.isVisible()) {
    await editButton.click()
  }
}

async function publishSelectedVersion(page: Page) {
  await switchToView(page)
  await page.getByRole('button', { name: '게시', exact: true }).click()
  await expect(page.getByText('게시중')).toBeVisible()
}

async function unpublishFromView(page: Page) {
  await switchToView(page)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /게시 해제/ }).click()
  await expect(page.getByText('현재 비공개 상태')).toBeVisible()
}

async function loadPostSnapshot(request: APIRequestContext, postId: string) {
  const response = await request.get(`/api/posts/${postId}`)
  if (!response.ok()) {
    throw new Error(`Failed to load post ${postId}, status=${response.status()}`)
  }
  return response.json() as Promise<PostSnapshot>
}

async function expectDraftContent(request: APIRequestContext, postId: string, expectedSubstring: string) {
  await expect.poll(async () => {
    const snapshot = await loadPostSnapshot(request, postId)
    return snapshot.content_markdown ?? ''
  }).toContain(expectedSubstring)
}

async function deleteDraftFromDashboard(page: Page, title: string) {
  await page.goto('/dashboard')
  const row = page.locator('article[role="button"]', { hasText: title }).first()
  await expect(row).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: '삭제' }).click()
  await expect(row).toBeHidden()
}

test.describe('publish lifecycle scenarios', () => {
  test('1) 기존 게시되지 않은 작성글 수정하고 게시', async ({ page, request }) => {
    const seed = `${Date.now()}-s1`
    const fixture = await createDraftFixture(page, seed)

    const edited = `${fixture.content}-edited-before-publish`
    await page.getByPlaceholder('마크다운으로 포스트를 작성하세요...').fill(edited)
    await saveDraft(page)
    await expectDraftContent(request, fixture.postId, edited)
    await publishSelectedVersion(page)

    const snapshot = await loadPostSnapshot(request, fixture.postId)
    expect(snapshot.published).toBe(true)
    expect(snapshot.live_content_markdown ?? '').toContain(edited)
  })

  test('2) 기존 게시된 게시글 수정하고 신규 버전으로 게시', async ({ page, request }) => {
    const seed = `${Date.now()}-s2`
    const fixture = await createDraftFixture(page, seed)

    await publishSelectedVersion(page)
    let snapshot = await loadPostSnapshot(request, fixture.postId)
    const firstPublishedVersionId = snapshot.published_version_id
    expect(firstPublishedVersionId).not.toBeNull()

    await switchToEdit(page)
    const editedV2 = `${fixture.content}-v2`
    await page.getByPlaceholder('마크다운으로 포스트를 작성하세요...').fill(editedV2)
    await saveDraft(page)
    await expectDraftContent(request, fixture.postId, editedV2)
    await publishSelectedVersion(page)

    snapshot = await loadPostSnapshot(request, fixture.postId)
    expect(snapshot.published).toBe(true)
    expect(snapshot.live_content_markdown ?? '').toContain(editedV2)
    expect(snapshot.published_version_id).not.toBe(firstPublishedVersionId)
    expect((snapshot.versions ?? [])[0]?.version_number ?? 0).toBeGreaterThanOrEqual(2)
  })

  test('3) 기존 게시글 게시 해제 -> 수정 -> 신규 버전으로 게시', async ({ page, request }) => {
    const seed = `${Date.now()}-s3`
    const fixture = await createDraftFixture(page, seed)

    await publishSelectedVersion(page)
    const firstPublished = await loadPostSnapshot(request, fixture.postId)
    const firstPublishedVersionId = firstPublished.published_version_id
    expect(firstPublishedVersionId).not.toBeNull()

    await unpublishFromView(page)
    let snapshot = await loadPostSnapshot(request, fixture.postId)
    expect(snapshot.published).toBe(false)

    await switchToEdit(page)
    const editedAfterUnpublish = `${fixture.content}-after-unpublish-v2`
    await page.getByPlaceholder('마크다운으로 포스트를 작성하세요...').fill(editedAfterUnpublish)
    await saveDraft(page)
    await expectDraftContent(request, fixture.postId, editedAfterUnpublish)
    await publishSelectedVersion(page)

    snapshot = await loadPostSnapshot(request, fixture.postId)
    expect(snapshot.published).toBe(true)
    expect(snapshot.live_content_markdown ?? '').toContain(editedAfterUnpublish)
    expect(snapshot.published_version_id).not.toBe(firstPublishedVersionId)
  })

  test('4) 게시된 글 수정 상태 -> 게시 해제 -> 삭제', async ({ page, request }) => {
    const seed = `${Date.now()}-s4`
    const fixture = await createDraftFixture(page, seed)

    await publishSelectedVersion(page)
    let snapshot = await loadPostSnapshot(request, fixture.postId)
    expect(snapshot.published).toBe(true)

    await switchToEdit(page)
    await page.locator('#studio-title').fill(`${fixture.title}-dirty-unsaved`)

    // Unsaved state에서 view 전환 시 discard confirm이 떠야 하고,
    // 수락 후 unpublish -> dashboard delete 흐름이 가능해야 한다.
    page.once('dialog', (dialog) => dialog.accept())
    await switchToView(page)
    await unpublishFromView(page)

    snapshot = await loadPostSnapshot(request, fixture.postId)
    expect(snapshot.published).toBe(false)

    await deleteDraftFromDashboard(page, fixture.title)
    const deletedResponse = await request.get(`/api/posts/${fixture.postId}`)
    expect(deletedResponse.status()).toBe(404)
  })
})
