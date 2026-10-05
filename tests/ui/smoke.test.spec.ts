import { expect, test } from '@playwright/test'

test('opens the rate board', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/')
  await expect(
    page.getByRole('heading', { name: 'Xe Rate Board' }),
  ).toBeVisible()
})