import { expect, test } from '@playwright/test'

test.describe('editor input scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/editor-input-repro')
    await expect(page.getByRole('heading', { name: 'Editor Input Repro' })).toBeVisible()
    await expect(page.getByPlaceholder('마크다운으로 포스트를 작성하세요...')).toBeVisible()
  })

  test('fast english typing should preserve full text', async ({ page }) => {
    const editor = page.getByPlaceholder('마크다운으로 포스트를 작성하세요...')
    const text = 'quick-brown-fox '.repeat(80)

    await editor.click()
    await page.keyboard.type(text)

    await expect(editor).toHaveValue(text)
    await expect(page.getByTestId('repro-content-preview')).toContainText(text.trim())
  })

  test('korean typing should preserve composed text', async ({ page }) => {
    const editor = page.getByPlaceholder('마크다운으로 포스트를 작성하세요...')
    const text = '한글 입력 안정성 테스트 '.repeat(40).trim()

    await editor.click()
    await page.keyboard.type(text)

    await expect(editor).toHaveValue(text)
    await expect(page.getByTestId('repro-content-preview')).toContainText('한글 입력 안정성 테스트')
  })

  test('typing in the middle should not jump cursor to end', async ({ page }) => {
    const editor = page.getByPlaceholder('마크다운으로 포스트를 작성하세요...')
    const base = 'aaaaabbbbbccccc'

    await editor.fill(base)
    await editor.evaluate((node) => {
      const textarea = node as HTMLTextAreaElement
      textarea.focus()
      textarea.setSelectionRange(5, 5)
    })
    await page.keyboard.type('XYZ')
    await page.keyboard.type('123')

    await expect(editor).toHaveValue('aaaaaXYZ123bbbbbccccc')
  })

  test('paste large markdown then backspace should keep editor responsive', async ({ page }) => {
    const editor = page.getByPlaceholder('마크다운으로 포스트를 작성하세요...')
    const lines = Array.from({ length: 260 }, (_, idx) => `- line ${idx} lorem ipsum dolor sit amet`)
    const pasted = lines.join('\n')

    await editor.click()
    await page.evaluate(async ({ value }) => {
      await navigator.clipboard.writeText(value)
    }, { value: pasted })
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+V`)
    await expect(editor).toHaveValue(pasted)

    for (let i = 0; i < 120; i++) {
      await page.keyboard.press('Backspace')
    }

    const after = await editor.inputValue()
    expect(after.length).toBe(pasted.length - 120)
  })
})
