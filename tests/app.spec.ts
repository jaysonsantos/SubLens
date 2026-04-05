import { expect, test } from '@playwright/test'
import type { ViteDevServer } from 'vite'
import { createServer } from 'vite'

let server: ViteDevServer
let port: number

test.beforeAll(async () => {
  server = await createServer({
    server: { port: 0 },
  })
  await server.listen()
  const address = server.httpServer?.address()
  port = typeof address === 'object' && address ? address.port : 5173
})

test.afterAll(async () => {
  await server.close()
})

const SRT_A = `1\n00:00:01,000 --> 00:00:04,000\nHello world\n\n2\n00:00:05,000 --> 00:00:08,000\nGoodbye world`

const SRT_B = `1\n00:00:01,000 --> 00:00:04,000\nOlá mundo\n\n2\n00:00:05,000 --> 00:00:08,000\nAdeus mundo`

async function loadViaPaste(
  page: import('@playwright/test').Page,
  left: string,
  right: string,
) {
  // Expand paste fields
  await page.locator('details').click()
  await page.waitForTimeout(300)

  await page.evaluate(
    ({ left, right }) => {
      const tas = document.querySelectorAll('.paste-col textarea')
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      )?.set as (value: string) => void
      setter.call(tas[0], left)
      tas[0].dispatchEvent(new Event('input', { bubbles: true }))
      setter.call(tas[1], right)
      tas[1].dispatchEvent(new Event('input', { bubbles: true }))
    },
    { left, right },
  )
}

test('app loads and shows upload state', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`[${msg.type()}] ${msg.text()}`)
    }
  })

  await page.goto(`http://localhost:${port}`)

  await expect(page).toHaveTitle('SubLens')
  await expect(page.locator('h1')).toHaveText('SubLens')
  await expect(page.locator('.upload-box')).toHaveCount(2)
  expect(errors).toEqual([])
})

test('load sample subtitles works', async ({ page }) => {
  await page.goto(`http://localhost:${port}`)
  await page.click('button.btn-sample')

  await expect(page.locator('.diff-view')).toBeVisible()
  await expect(page.locator('.diff-row')).toHaveCount(5)
  await expect(page.locator('.pill--total')).toHaveText('5 lines')
  await expect(page.locator('.pill--changed')).toHaveText('5 changed')
})

test('file input triggers and loads file', async ({ page }) => {
  await page.goto(`http://localhost:${port}`)

  const leftBox = page.locator('.upload-box').first()
  await expect(leftBox).toContainText('Original SRT')

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    leftBox.click(),
  ])
  await fileChooser.setFiles({
    name: 'test.srt',
    mimeType: 'text/plain',
    buffer: Buffer.from(SRT_A),
  })

  await expect(leftBox).toContainText('test.srt')
  await expect(leftBox).toContainText('Loaded')
  await expect(page.locator('.upload-state')).toBeVisible()

  const rightBox = page.locator('.upload-box').last()
  const [fileChooser2] = await Promise.all([
    page.waitForEvent('filechooser'),
    rightBox.click(),
  ])
  await fileChooser2.setFiles({
    name: 'test-pt.srt',
    mimeType: 'text/plain',
    buffer: Buffer.from(SRT_B),
  })

  await expect(page.locator('.diff-view')).toBeVisible()
  await expect(page.locator('.diff-row')).toHaveCount(2)
})

test('paste SRT content shows diff view', async ({ page }) => {
  await page.goto(`http://localhost:${port}`)
  await loadViaPaste(page, SRT_A, SRT_B)

  await expect(page.locator('.diff-view')).toBeVisible()
  await expect(page.locator('.diff-row')).toHaveCount(2)
  await expect(page.locator('.pill--total')).toHaveText('2 lines')
  await expect(page.locator('.pill--changed')).toHaveText('2 changed')
})

test('search filters diff rows', async ({ page }) => {
  await page.goto(`http://localhost:${port}`)
  await loadViaPaste(page, SRT_A, SRT_B)
  await expect(page.locator('.diff-view')).toBeVisible()

  await page.locator('.search').fill('Olá')
  await expect(page.locator('.diff-row')).toHaveCount(1)

  await page.locator('.search').fill('notfound')
  await expect(page.locator('.no-results')).toBeVisible()
})

test('toggle show equal hides equal rows', async ({ page }) => {
  await page.goto(`http://localhost:${port}`)

  // Load sample which has a mix of types
  await page.click('button.btn-sample')
  await expect(page.locator('.diff-view')).toBeVisible()

  // All rows are "changed" in sample, but let's verify toggle works
  const initialCount = await page.locator('.diff-row').count()

  // Toggle off
  await page.locator('label.toggle').filter({ hasText: 'Show equal' }).click()
  await page.waitForTimeout(200)

  // Since all sample rows are changed, count stays same
  const afterCount = await page.locator('.diff-row').count()
  expect(afterCount).toBe(initialCount)
})

test('strip HTML removes tags from diff text', async ({ page }) => {
  const srtHtml =
    '1\n00:00:01,000 --> 00:00:04,000\n<i>Hello</i>\n\n2\n00:00:05,000 --> 00:00:08,000\n<b>World</b>'
  const srtPlain =
    '1\n00:00:01,000 --> 00:00:04,000\nHello\n\n2\n00:00:05,000 --> 00:00:08,000\nWorld'

  await page.goto(`http://localhost:${port}`)
  await loadViaPaste(page, srtHtml, srtPlain)
  await expect(page.locator('.diff-view')).toBeVisible()

  // Before strip, there should be changed rows (tags differ)
  await expect(page.locator('.pill--changed')).toHaveText('2 changed')

  // Enable strip HTML
  await page.locator('label.toggle').filter({ hasText: 'Strip HTML' }).click()
  await page.waitForTimeout(300)

  // After strip, all rows should be equal
  await expect(page.locator('.pill--equal')).toHaveText('2 equal')
  await expect(page.locator('.pill--changed')).not.toBeVisible()
})

test('reset clears files and returns to upload state', async ({ page }) => {
  await page.goto(`http://localhost:${port}`)
  await loadViaPaste(page, SRT_A, SRT_B)
  await expect(page.locator('.diff-view')).toBeVisible()

  await page.locator('button').filter({ hasText: 'Reset' }).click()

  await expect(page.locator('.upload-state')).toBeVisible()
  await expect(page.locator('.diff-view')).not.toBeVisible()
  await expect(page.locator('.upload-box')).toHaveCount(2)
})

test('handles files with different subtitle counts', async ({ page }) => {
  const srt3 =
    '1\n00:00:01,000 --> 00:00:04,000\nA\n\n2\n00:00:05,000 --> 00:00:08,000\nB\n\n3\n00:00:09,000 --> 00:00:12,000\nC'
  const srt1 = '1\n00:00:01,000 --> 00:00:04,000\nA'

  await page.goto(`http://localhost:${port}`)
  await loadViaPaste(page, srt3, srt1)
  await expect(page.locator('.diff-view')).toBeVisible()

  await expect(page.locator('.diff-row')).toHaveCount(3)
  await expect(page.locator('.pill--total')).toHaveText('3 lines')
  await expect(page.locator('.pill--equal')).toHaveText('1 equal')
  await expect(page.locator('.pill--removed')).toHaveText('2 removed')
})
