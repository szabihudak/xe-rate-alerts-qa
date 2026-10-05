import { expect, test } from '@playwright/test'
import { API_BASE_URL } from './api-urls'

type Rate = {
  pair: string
  rate: number
  asOf: string
}

test.describe('GET /api/rates', () => {
  test('returns valid rates for all supported currency pairs', async ({ request }) => {
    test.skip(true, 'Xe monthly rate limit is currently exceeded')

    const response = await request.get(`${API_BASE_URL}/api/rates`)
    const body = await response.text()

    expect(response.status(), `GET /api/rates returned ${response.status()}: ${body}`).toBe(200)

    const rates = JSON.parse(body) as Rate[]

    expect(rates).toHaveLength(3)
    expect(rates.map((rate) => rate.pair).sort()).toEqual([
      'EUR/USD',
      'GBP/USD',
      'USD/CAD',
    ])

    for (const rate of rates) {
      expect(Number.isFinite(rate.rate)).toBe(true)
      expect(rate.rate).toBeGreaterThan(0)
      expect(Number.isNaN(Date.parse(rate.asOf))).toBe(false)
    }
  })
})