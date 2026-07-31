---
title: 'Story 3.5: Resource Retrieval & Exchange Completion (Step 4)'
type: 'feature'
created: '2026-07-31'
status: 'done'
baseline_revision: '92ce163'
final_revision: 'TBD'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-3-context.md'
---

<intent-contract>

## Intent

**Problem:** After a successful member-scoped token (Step 3), exchange halts with Step 4 permanently pending. No FHIR resources are fetched, no result is stored, and there is no post-exchange CTA.

**Approach:** Add `ExchangeModule._retrieveResources(payer, fhirId, memberToken, newPayerConfig)` which runs 8 parallel FHIR resource GET requests via `Promise.all` (AD-14). Store the results in `ExchangeModule._result` (AD-3); change `hasResult()` to check it. Extend `runExchange` to call step 4, set step 4 state, and inject a "View Results" + "Run New Exchange" post-panel. Clear `_result` at the top of `runExchange` so results are session-scoped and a new exchange always starts clean.

## Boundaries & Constraints

**Always:**
- Add `_result: null` as an ExchangeModule property (before or alongside the existing methods).
- Update `hasResult()`: `return !!ExchangeModule._result;`
- At the very start of `runExchange` (before `_setStepState(1,...)`), add: `ExchangeModule._result = null;`
- `ExchangeModule._retrieveResources(payer, fhirId, memberToken, newPayerConfig)` — async, returns `{ ok: boolean, data: { resourceResults: Array, totalCount: number }|null, error: string|null }`. Never throws (AD-7).
- Resource types array (exactly 8, in this order): `['ExplanationOfBenefit', 'Condition', 'MedicationRequest', 'MedicationDispense', 'Observation', 'AllergyIntolerance', 'Immunization', 'Provenance']` (FR-17).
- Each resource fetch: `GET {fhirBaseUrl}/{ResourceType}?patient={encodeURIComponent(fhirId)}`, `Accept: application/fhir+json`, `Authorization: Bearer {memberToken}`, `referrerPolicy: 'no-referrer'` (FR-17). Apply CORS proxy when `payer.useProxy && newPayerConfig.corsProxyUrl`.
- **All 8 fetches run in parallel** via `Promise.all` (AD-14). Each individual fetch is wrapped in its own try/catch so a single failure does not reject the array.
- Per-resource result shape: `{ resourceType: string, ok: boolean, count: number, status: number, entries: Array }`.
  - HTTP 2xx success: `ok: true`, `count = bundle.entry.length` (or 0 if no entry field), `status = response.status`, `entries = Array.isArray(bundle.entry) ? bundle.entry : []`. Zero entries is still `ok: true` (FR-17).
  - Non-2xx HTTP: `ok: false`, `count: 0`, `status: response.status`, `entries: []`.
  - Fetch throws (network/CORS): `ok: false`, `count: 0`, `status: 0`, `entries: []`.
- `_retrieveResources` outer try/catch: if `Promise.all` itself throws (unexpected), return `{ ok: false, data: null, error: 'Resource retrieval error: ' + (err.message || String(err)) }`.
- `_retrieveResources` normal return (all 8 resolved, even with individual failures): `{ ok: true, data: { resourceResults: [...8 results], totalCount: sum of counts }, error: null }`.
- `totalCount` = sum of all `count` values across the 8 results.
- **Never log `memberToken` anywhere** (NFR-6).
- `runExchange` extension after step 3 success:
  1. `_setStepState(4, 'in-progress', '')`
  2. `var step4 = await ExchangeModule._retrieveResources(payer, fhirId, memberToken, newPayerConfig)`
  3. If `!step4.ok` (outer catch fired): `_setStepState(4, 'failed', step4.error)`, `_showTryAgain()`, return
  4. `_setStepState(4, 'success', step4.data.resourceResults.length + ' resource types queried — ' + step4.data.totalCount + ' resources retrieved')`
  5. `ExchangeModule._result = { payer: payer, member: member, fhirId: fhirId, resourceResults: step4.data.resourceResults };`
  6. Inject post-panel via `_showPostExchangePanel()`
- `_showPostExchangePanel()` — new private helper. Gets `#exchange-post-panel`, sets `innerHTML` to two buttons: `id="exchange-view-results-btn"` class `btn btn-primary` text "View Results", and `id="exchange-new-exchange-btn"` class `btn btn-secondary` text "Run New Exchange". Then queries both and wires events:
  - "View Results" click → `UIModule.showView('results')`
  - "Run New Exchange" click → `ExchangeModule._result = null; UIModule._exchangeSelectedPayerId = null; UIModule._exchangeSelectedMemberId = null; UIModule._exchangePhase = 'setup'; UIModule.showView('exchange')`
  - Null-guard the container.

**Block If:** None — all decisions fully specified.

**Never:**
- Do not log `memberToken` to the console
- Do not store `memberToken` in `_result`
- Do not write `_result` to `localStorage` or `sessionStorage` (AD-3)
- Do not use `createElement`/`appendChild`

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| All 8 types succeed | 8× HTTP 200, entries present | Step 4 success; detail "{8} resource types queried — {total} resources retrieved"; View Results + Run New Exchange buttons; hasResult() true | — |
| Some types fail | Mix of 200 and 4xx | Step 4 success (not failure); only successful counts add to total; step 4 detail still shows total; all 8 results stored | Individual errors captured per-result |
| All types fail (HTTP errors) | 8× non-2xx | Step 4 success; "8 resource types queried — 0 resources retrieved"; hasResult() still true | Per-result ok: false |
| Zero-result bundle (200, no entries) | 200, entry absent | ok: true, count: 0 — still a success | — |
| All types throw (network down) | 8× fetch throws | Step 4 success; 0 total retrieved; hasResult() true | Per-result catches; outer try/catch only fires if Promise.all itself throws |
| Promise.all itself throws | Unexpected outer error | Step 4 failed; error message; Try Again button | Outer try/catch |
| "Run New Exchange" clicked | post-panel visible | _result cleared; payer/member selections reset; setup panel re-renders | — |
| "View Results" clicked | post-panel visible | showView('results') called; nav re-renders with Results enabled | — |

</intent-contract>

## Code Map

- `app.html` ExchangeModule — add `_result: null`, update `hasResult()`, add `_retrieveResources()`, add `_showPostExchangePanel()`, extend `runExchange()` (add `_result = null` guard + step 4), add `_result = null` at top of `runExchange`

## Tasks & Acceptance

**Execution:**

- [ ] `app.html` ExchangeModule — Change `hasResult() { return false; }` to `hasResult() { return !!ExchangeModule._result; }` and add `_result: null,` as the first property:
  ```js
  const ExchangeModule = {
    _result: null,
    hasResult() { return !!ExchangeModule._result; },
    ...
  ```

- [ ] `app.html` ExchangeModule.runExchange — Add `ExchangeModule._result = null;` as the first line of `runExchange` (before `_setStepState(1, 'in-progress', '')`).

- [ ] `app.html` ExchangeModule — Add `_showPostExchangePanel` method after `_showTryAgain`:
  ```js
  _showPostExchangePanel: function() {
    var postPanel = document.getElementById('exchange-post-panel');
    if (postPanel) {
      postPanel.innerHTML = '<button id="exchange-view-results-btn" class="btn btn-primary" type="button">View Results</button> <button id="exchange-new-exchange-btn" class="btn btn-secondary" type="button">Run New Exchange</button>';
      var viewResultsBtn = document.getElementById('exchange-view-results-btn');
      if (viewResultsBtn) {
        viewResultsBtn.addEventListener('click', function() {
          UIModule.showView('results');
        });
      }
      var newExchangeBtn = document.getElementById('exchange-new-exchange-btn');
      if (newExchangeBtn) {
        newExchangeBtn.addEventListener('click', function() {
          ExchangeModule._result = null;
          UIModule._exchangeSelectedPayerId = null;
          UIModule._exchangeSelectedMemberId = null;
          UIModule._exchangePhase = 'setup';
          UIModule.showView('exchange');
        });
      }
    }
  },
  ```

- [ ] `app.html` ExchangeModule — Add `_retrieveResources` method before `runExchange`:
  ```js
  _retrieveResources: async function(payer, fhirId, memberToken, newPayerConfig) {
    try {
      var resourceTypes = ['ExplanationOfBenefit', 'Condition', 'MedicationRequest', 'MedicationDispense', 'Observation', 'AllergyIntolerance', 'Immunization', 'Provenance'];
      var resourceResults = await Promise.all(resourceTypes.map(async function(resourceType) {
        try {
          var url = payer.fhirBaseUrl + '/' + resourceType + '?patient=' + encodeURIComponent(fhirId);
          if (payer.useProxy && newPayerConfig.corsProxyUrl) {
            url = newPayerConfig.corsProxyUrl + '?url=' + encodeURIComponent(url);
          }
          var response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + memberToken, 'Accept': 'application/fhir+json' },
            referrerPolicy: 'no-referrer'
          });
          if (!response.ok) {
            return { resourceType: resourceType, ok: false, count: 0, status: response.status, entries: [] };
          }
          var bundle = await response.json();
          var entries = Array.isArray(bundle.entry) ? bundle.entry : [];
          return { resourceType: resourceType, ok: true, count: entries.length, status: response.status, entries: entries };
        } catch (err) {
          return { resourceType: resourceType, ok: false, count: 0, status: 0, entries: [] };
        }
      }));
      var totalCount = resourceResults.reduce(function(sum, r) { return sum + r.count; }, 0);
      return { ok: true, data: { resourceResults: resourceResults, totalCount: totalCount }, error: null };
    } catch (err) {
      return { ok: false, data: null, error: 'Resource retrieval error: ' + (err.message || String(err)) };
    }
  },
  ```

- [ ] `app.html` ExchangeModule.runExchange — Replace the `// Step 4: pending — Story 3.5` comment with:
  ```js
  ExchangeModule._setStepState(4, 'in-progress', '');
  var step4 = await ExchangeModule._retrieveResources(payer, fhirId, memberToken, newPayerConfig);
  if (!step4.ok) {
    ExchangeModule._setStepState(4, 'failed', step4.error);
    ExchangeModule._showTryAgain();
    return;
  }
  ExchangeModule._setStepState(4, 'success', step4.data.resourceResults.length + ' resource types queried — ' + step4.data.totalCount + ' resources retrieved');
  ExchangeModule._result = { payer: payer, member: member, fhirId: fhirId, resourceResults: step4.data.resourceResults };
  ExchangeModule._showPostExchangePanel();
  ```

**Acceptance Criteria:**
- Given a full exchange run completes through all 4 steps, then Step 4 icon changes to teal spinner then checkmark; detail shows "8 resource types queried — {N} resources retrieved"; "View Results" and "Run New Exchange" buttons appear below the step tracker
- Given some but not all resource types return HTTP errors, then Step 4 still shows success (not failed); total reflects only successfully-retrieved resources; all 8 resource results are stored
- Given "View Results" is clicked, then `UIModule.showView('results')` is called; nav re-renders with Results enabled (hasResult() is now true)
- Given "Run New Exchange" is clicked, then the setup panel re-appears with payer and member dropdowns reset to unselected; hasResult() returns false until a new exchange completes
- Given `ExchangeModule.hasResult()` is true, then the Results nav item is interactive (tabindex removed or not applied)
- Given a new exchange starts (Run Exchange clicked), then any prior result is cleared immediately (`_result = null`) at the top of `runExchange`

## Design Notes

**Step 4 never "fails" from individual resource HTTP errors:** The P2P exchange is considered complete when all 8 resource types are queried — even if some returned errors. Partial results are valid and expected in demo/connectathon environments where some resource types may not be supported. Only an exceptional `Promise.all` failure (outer catch) triggers a step 4 failure state.

**`_result` stores entries for Epic 4:** The `resourceResults` array includes `entries: []` or the full Bundle.entry array. Epic 4 (Results view) will read `ExchangeModule._result.resourceResults` to render the resource browser. `memberToken` is intentionally excluded from `_result` — it's ephemeral and should not be stored beyond the run scope.

**`_showPostExchangePanel` spacing:** A space character (`' '`) between the two buttons in the `innerHTML` string provides natural gap without CSS. This matches the inline pattern used for other button groups.

**Results nav item:** The nav item's enabled/disabled state is controlled by `ExchangeModule.hasResult()` at render time. After step 4, `hasResult()` returns true, but the nav won't visually update until the next `showView` call (either the user clicking "View Results" or navigating manually). This is an acceptable limitation for the demo tool.

## Deferred

- Step detail sub-panel click behavior (FR-18): clicking completed/failed steps to expand per-step detail panels. Deferred — adds significant UI complexity. Step detail text already visible inline.
- AbortController timeouts on the 8 resource fetches (same pattern as step 1 deferred timeout). Deferred — out of scope for this story.
- `step4.data.resourceResults.length` is always 8 (hardcoded array). The display `"8 resource types queried"` could instead say `step4.data.resourceResults.length + ' resource types queried'` dynamically — kept dynamic for future extensibility even though it's always 8.

## Review Triage Log

### 2026-07-31 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0 (2 new items logged in deferred-work.md: step detail sub-panel expansion, resource fetch timeouts)
- reject: 3 (memberToken console exposure — no console.log exists; literal 8 vs dynamic — by design; entries memory — by design for Epic 4)

## Auto Run Result

**Status:** done

**Summary:** Added `_result: null` property and updated `hasResult()` to check it. Added `_showPostExchangePanel()` which injects "View Results" and "Run New Exchange" buttons via innerHTML; "View Results" routes to Results view; "Run New Exchange" clears `_result`, resets exchange state, and shows setup panel. Added `_retrieveResources(payer, fhirId, memberToken, newPayerConfig)` which runs 8 parallel FHIR resource GETs via `Promise.all` with per-type inner try/catch; counts entries from successful Bundle responses; zero-entry bundles are success. Extended `runExchange` with `_result = null` at top (session-scoped result), full step 4 sequence, and post-exchange panel injection on success. All 8 resource types queried in parallel per AD-14. Token values not logged or stored in `_result`. Results not persisted to storage per AD-3.

**Files changed:**
- `PayerToPayerClient/app.html` — ExchangeModule: `_result`, `hasResult()`, `_showPostExchangePanel()`, `_retrieveResources()`, `runExchange` extended with result clearing + step 4
- `PayerToPayerClient/_bmad-output/implementation-artifacts/deferred-work.md` — 2 new entries (step detail sub-panel expansion, resource fetch timeouts)

**Review findings:** 0 patches. 0 deferred. 3 rejected (all by-design).

**Follow-up review recommended:** false

## Verification

**Manual checks:**
- Run a full exchange; all 4 steps succeed → step 4 shows "8 resource types queried — N resources retrieved"; "View Results" and "Run New Exchange" appear
- Inspect network: 8 parallel GETs to `{fhirBaseUrl}/{ResourceType}?patient={fhirId}`, each with `Authorization: Bearer {memberToken}` and `Accept: application/fhir+json`
- Click "View Results" → Results view renders (stub or content); nav Results item is now interactive
- Click "Run New Exchange" → setup panel with empty dropdowns; hasResult() is false
- Run another exchange from the setup panel → prior result replaced on step 4 completion
- Browser console contains no memberToken value
