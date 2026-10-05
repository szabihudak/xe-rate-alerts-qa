import { expect, test } from '@playwright/test'
import { API_BASE_URL } from './api-urls'

type Alert = {
  id: string
  pair: string
  threshold: number
  direction: 'above' | 'below'
  triggered: boolean
}

type TriggerScenario = {
  pair: string
  threshold: number
  direction: Alert['direction']
  expectedTriggered: boolean
}

const alertsUrl = `${API_BASE_URL}/api/alerts`

const scenarios: TriggerScenario[] = [
  { pair: 'USD/CAD', threshold: 1.3, direction: 'above', expectedTriggered: true },
  { pair: 'USD/CAD', threshold: 1.3, direction: 'below', expectedTriggered: false },
  { pair: 'USD/CAD', threshold: 1.4, direction: 'above', expectedTriggered: false },
  { pair: 'USD/CAD', threshold: 1.4, direction: 'below', expectedTriggered: true },
  { pair: 'USD/CAD', threshold: 1.365, direction: 'above', expectedTriggered: false },
  { pair: 'USD/CAD', threshold: 1.365, direction: 'below', expectedTriggered: false },
  { pair: 'GBP/USD', threshold: 1.3, direction: 'below', expectedTriggered: true },
  { pair: 'EUR/USD', threshold: 1.2, direction: 'below', expectedTriggered: true },
]

test.describe('POST /api/alerts trigger evaluation', () => {
  for (const scenario of scenarios) {
    test(`${scenario.pair} threshold ${scenario.threshold} ${scenario.direction} -> triggered ${scenario.expectedTriggered}`, async ({ request }) => {
      let createdId: string | undefined

      //Create an alert
      try {
        const response = await request.post(alertsUrl, {
          data: {
            pair: scenario.pair,
            threshold: scenario.threshold,
            direction: scenario.direction,
          },
        })

        expect(response.status()).toBe(201)

        const alert = (await response.json()) as Alert
        createdId = alert.id

        expect(alert).toEqual({
            id: expect.any(String),
            pair: scenario.pair,
            threshold: scenario.threshold,
            direction: scenario.direction,
            triggered: scenario.expectedTriggered,
        })

        expect(alert.id).toBeTruthy()

        // Verify that the alert is listed and its content is correct
        const listResponse = await request.get(alertsUrl)
        expect(listResponse.status()).toBe(200)

        const listedAlerts = (await listResponse.json()) as Alert[]
        expect(listedAlerts).toContainEqual(expect.objectContaining(alert))

        //Delete the alert and verify that it is no longer listed
        const deleteResponse = await request.delete(`${alertsUrl}/${alert.id}`)
        expect(deleteResponse.status()).toBe(204)
        createdId = undefined

        const afterDeleteResponse = await request.get(alertsUrl)
        expect(afterDeleteResponse.status()).toBe(200)

        const alertsAfterDelete = (await afterDeleteResponse.json()) as Alert[]
        expect(alertsAfterDelete.some((listedAlert) => listedAlert.id === alert.id)).toBe(false)
      } finally {
        if (createdId) {
          await request.delete(`${alertsUrl}/${createdId}`)
        }
      }
    })
  }

  test('rejects an unsupported currency pair', async ({ request }) => {
    const response = await request.post(alertsUrl, {
      data: { pair: 'AUD/USD', threshold: 1.0, direction: 'above' },
    })

    expect(response.status()).toBe(400)
    expect((await response.json()).error).toBeTruthy()
  })
})
