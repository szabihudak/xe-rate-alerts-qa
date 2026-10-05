import { expect, test, type Page, type Route } from '@playwright/test'

type Rate = {
  pair: string
  rate: number
  asOf: string
}

const initialRates: Rate[] = [
  { pair: 'USD/CAD', rate: 1.2345, asOf: '2026-10-05T00:00:00Z' },
  { pair: 'GBP/USD', rate: 1.3456, asOf: '2026-10-05T00:00:00Z' },
  { pair: 'EUR/USD', rate: 1.0789, asOf: '2026-10-05T00:00:00Z' },
]

const refreshedRates: Rate[] = [
  { pair: 'USD/CAD', rate: 1.4567, asOf: '2026-10-05T00:00:00Z' },
  { pair: 'GBP/USD', rate: 1.5678, asOf: '2026-10-05T00:00:00Z' },
  { pair: 'EUR/USD', rate: 1.0987, asOf: '2026-10-05T00:00:00Z' },
]

async function fulfillRates(route: Route, rates: Rate[]) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(rates),
  })
}

async function expectRatesDisplayed(page: Page, actualRates: Rate[]) {
  for (const actualRate of actualRates) {
    const pairLabel = actualRate.pair.replace('/', ' / ')
    const card = page.locator('.card').filter({ hasText: pairLabel })
    await expect(card.locator('.rate')).toHaveText(actualRate.rate.toFixed(4))
  }
}

function isRatesRequest(response: { url(): string; request(): { method(): string } }) {
  const url = new URL(response.url())
  return url.pathname === '/api/rates' && response.request().method() === 'GET'
}

test.describe('Rates UI', () => {
  test('shows the rates returned on initial page load', async ({ page }) => {
    await page.route('**/api/rates', (route) => fulfillRates(route, initialRates))

    const responsePromise = page.waitForResponse(isRatesRequest)
    await page.goto('http://127.0.0.1:5173/')

    const response = await responsePromise
    expect(response.ok()).toBe(true)

    const responseRates = (await response.json()) as Rate[]
    await expectRatesDisplayed(page, responseRates)
    await expect(page.locator('.updated')).toBeVisible()
  })

  test('refreshes the displayed rates', async ({ page }) => {
    let requestCount = 0

    await page.route('**/api/rates', (route) => {
      requestCount += 1
      const rates = requestCount === 1 ? initialRates : refreshedRates

      return fulfillRates(route, rates)
    })

    const initialResponsePromise = page.waitForResponse(isRatesRequest)
    await page.goto('http://127.0.0.1:5173/')

    const initialResponse = await initialResponsePromise
    expect(initialResponse.ok()).toBe(true)
    await expectRatesDisplayed(page, (await initialResponse.json()) as Rate[])

    const updatedLabel = page.locator('.updated')
    await expect(updatedLabel).toBeVisible()

    const refreshResponsePromise = page.waitForResponse(isRatesRequest)
    await page.getByRole('button', { name: 'Refresh rates' }).click()

    const refreshResponse = await refreshResponsePromise
    expect(requestCount).toBe(2)
    expect(refreshResponse.ok()).toBe(true)
    await expectRatesDisplayed(page, (await refreshResponse.json()) as Rate[])
    await expect(updatedLabel).toBeVisible()
  })
})
