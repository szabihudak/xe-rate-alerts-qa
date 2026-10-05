# QA Notes

## Focus and rationale

This is a time-boxed, risk-based slice rather than exhaustive coverage. The tests prioritize the alert stub's money-related threshold behavior because it is deterministic and available without Xe: representative above/below outcomes, equality boundaries, all supported pairs, creation/list/deletion, and rejection of an unsupported pair. Each created alert is checked by ID and cleaned up, so test data does not depend on an initially empty in-memory list.

Rates are covered separately at the API and UI layers because those checks answer different questions. The API contract test is intended to verify the backend response from `GET /api/rates` (supported pairs, valid numeric rates, and timestamps). The UI tests intercept the browser's `/api/rates` request and compare the response received by that page with the three displayed card values, both on initial load and after clicking Refresh. Using controlled browser responses keeps UI checks deterministic and avoids comparing separate live requests whose values may change or consuming more Xe quota; these UI tests do not claim to verify the backend-to-Xe integration.

## Trade-offs and omissions

- The live `GET /api/rates` API test is enabled and checks the response contract without asserting exact, changing rate values. During earlier investigation Xe returned a monthly-quota error, but a later live request and test run succeeded.
- The UI checks that “Last updated” is visible after load and refresh, but does not assert that its text changes. That value is browser-local receipt time, not Xe's `asOf`; clock control and a timestamp-change assertion were deferred to keep this small UI slice focused on rate rendering and refresh behavior.
- Alert creation and lifecycle are tested through the stub API only. Alert UI tests are postponed until the frontend alert-management feature is implemented; the starter frontend does not currently provide that UI.
- One alert error case is covered: an unsupported pair is rejected. Invalid direction, deleting an unknown alert ID, negative thresholds, missing/null request fields, and broader malformed-input cases are not automated. These were left out to keep the API slice focused; the brief does not define threshold bounds or the expected missing-field behavior, so those rules should be clarified before asserting rejection.
- The current rates API test does not cover upstream Xe error handling, timeouts, or malformed responses. During the earlier quota error, `GET /api/rates` returned HTTP 500 because the controller expected a success-shaped `to` property. Testing those error paths was deferred for this time-box.
- The alert stub stores data in memory, so alerts do not persist across backend restarts. Equality currently does not trigger because the stub uses strict `>` and `<`; the brief does not define whether that is intended.

## Findings and risks

A direct Xe request initially returned HTTP 403, code 3, `Monthly rate limit exceeded`. At that time, the app's `GET /api/rates` returned HTTP 500: `RatesController` attempted to read a `to` property from the error response and threw `KeyNotFoundException`. A later live request returned HTTP 200 and the rates API test passed. The quota issue was temporary, though upstream error handling remains a risk if Xe returns an error-shaped response.

## Next steps

- If additional time is available, make the backend's Xe HTTP client configurable and use WireMock (or an equivalent local mock) to test successful response parsing/mapping and error handling for quota, timeout, and malformed responses. This would be deterministic and would not require live Xe access.
- Repeat the live `GET /api/rates` integration check if Xe access becomes unavailable again; exact rate values should remain unasserted.
- Add boundary tests for negative thresholds and missing/null fields after the expected validation rules are agreed.
- If a formal OpenAPI contract is introduced, consider validating responses against its schema; current explicit Playwright assertions are sufficient for this small suite.
- Keep helpers and test data next to their specs while they are only used there. Extract shared fixtures if more specs need them; consider Page Objects only if the UI grows beyond its current small surface.
- Shared test definitions used by API and UI specs are centralized in `tests/support/`: the API base URL in `constants.ts` and the shared `Rate` type in `types.ts`.
- Dockerization was not added: the GitHub-hosted runner installs Node and .NET directly, and Playwright starts the two app processes itself. Containers would add setup without improving this suite's current test isolation.

## Optional extension

The small GitHub Actions workflow is the selected optional extension. It installs Node, .NET 10, and Chromium, then runs the same test command used locally. The tests also make basic assertions about documented API behavior as part of the required API testing; no separate schema-generation or contract-testing tool was added.

## Run the tests

Run from the repository root. Playwright starts the backend and frontend, waits for their configured readiness URLs, and stops the processes it started afterward. Ports 5180 and 5173 must be free.

```sh
npm test                 # API suite, then UI suite
npm run test:api         # API tests only (Chromium)
npm run test:ui          # UI tests only (Chromium)
```

The live rates API test calls Xe through the backend and therefore depends on provider availability. UI rate responses are mocked in the browser to keep rendering and refresh checks deterministic.

## AI collaboration

I used GitHub Copilot and Playwright MCP to explore the application. Copilot suggested parts of the test code and sample data; I reviewed, adapted, and ran the tests, and made the final decisions about scope and coverage.
