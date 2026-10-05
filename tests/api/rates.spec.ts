import { expect, test } from '@playwright/test'
import { API_BASE_URL } from '../support/constants'
import type { Rate } from '../support/types'

const expectedPairs = ['EUR/USD', 'GBP/USD', 'USD/CAD']

test.describe('GET /api/rates', () => {
  test('returns valid rates for all supported currency pairs', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/rates`)
    const body = await response.text()

    expect(response.status()).toBe(200)

    const actualRates = JSON.parse(body) as Rate[]

    expect(actualRates.map(({ pair }) => pair).sort()).toEqual(expectedPairs)

    for (const actualRate of actualRates) {
      expect(actualRate).toEqual({
        pair: expect.any(String),
        rate: expect.any(Number),
        asOf: expect.any(String),
      })
      expect(Number.isFinite(actualRate.rate)).toBe(true)
      expect(actualRate.rate).toBeGreaterThan(0)
      expect(Number.isFinite(Date.parse(actualRate.asOf))).toBe(true)
    }
  })
})