---
title: 'Story 3.3: $member-match & Member Match Failure Handling (Step 2)'
type: 'feature'
created: '2026-07-31'
status: 'done'
baseline_revision: 'cc65206'
final_revision: 'b273e58'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-3-context.md'
---

<intent-contract>

## Intent

**Problem:** After a successful system token acquisition (Step 1), the exchange halts with Steps 2–4 permanently pending. There is no `$member-match` request, no matched patient FHIR ID, and no failure handling for 422 business outcomes.

**Approach:** Add `ExchangeModule._runMemberMatch` (async, returns `{ok, data, error}`) and extend `runExchange` to execute Step 2 after Step 1 success. Extract a `_showTryAgain()` helper to deduplicate the failure-button injection pattern from Step 1. Handle 422 separately from other HTTP errors — parse the OperationOutcome and surface the correct FR-19 message. On success, extract the matched patient's FHIR ID for use in Step 3.

## Boundaries & Constraints

**Always:**
- `ExchangeModule._showTryAgain()` — new private helper. Sets `document.getElementById('exchange-post-panel').innerHTML` to a Try Again button, queries it by ID, and wires its click to `UIModule._exchangePhase = 'setup'; UIModule.showView('exchange')`. Null-guards the container lookup. Stories 3.4–3.5 call this same method.
- `runExchange` step 1 failure path refactored: replace the inline Try Again injection block with `ExchangeModule._showTryAgain()` — functionally identical, just DRY.
- After Step 1 success, store `var systemToken = step1.data.access_token;` (never log this value — NFR-6).
- `ExchangeModule._runMemberMatch(payer, member, systemToken, newPayerConfig)` — async, returns `{ ok: boolean, data: { fhirId: string }|null, error: string|null }`. Never throws across module boundary (AD-7).
- Step 2 URL: `payer.fhirBaseUrl + '/Patient/$member-match'`. Apply CORS proxy when `payer.useProxy === true` and `newPayerConfig.corsProxyUrl` is non-empty (same pattern as Step 1).
- Request: `method: 'POST'`, `headers: { Authorization: 'Bearer ' + systemToken, 'Content-Type': 'application/fhir+json' }`, `referrerPolicy: 'no-referrer'`, `body: JSON.stringify(parametersResource)` (see Design Notes for body shape).
- **422 is a business outcome, not a fetch error** (FR-15): if `response.status === 422`, parse body as JSON (OperationOutcome), check `issue[0].code`:
  - If code is `'consent'` → error: exact consent-denied message from FR-19
  - Otherwise → error: member-not-found message from FR-19 (include `member.firstName + ' ' + member.lastName`, `member.dateOfBirth`, `member.memberIdAtOldPayer`)
  - Return `{ ok: false, data: null, error: <selected message> }`
- Non-422 HTTP failure: `{ ok: false, data: null, error: 'Member match failed: HTTP ' + response.status }`
- `response.json()` parse failure: caught in try/catch → `{ ok: false, data: null, error: 'Member match error: ' + (err.message || String(err)) }`
- 200 success: parse JSON (Parameters resource), extract fhirId from the `MemberPatient` parameter's resource id:
  ```js
  var params = (responseData.parameter || []);
  var memberPatient = params.find(function(p) { return p.name === 'MemberPatient'; });
  var fhirId = memberPatient && memberPatient.resource && memberPatient.resource.id;
  ```
  If `fhirId` is absent: `{ ok: false, data: null, error: 'Member match response missing patient ID' }`
  Otherwise: `{ ok: true, data: { fhirId: fhirId }, error: null }`
- Exact FR-19 failure messages:
  - Member not found: `'Member not found at Previous Payer — check demographics or member ID. Submitted: {firstName} {lastName}, DOB {dateOfBirth}, Member ID {memberIdAtOldPayer}.'`
  - Consent denied: `'Consent denied by Previous Payer. Verify Consent resource construction.'`
- Step 2 success microcopy: `'Member matched — FHIR ID: ' + fhirId` (FR-18)
- `runExchange` extension after Step 1 success:
  1. `_setStepState(2, 'in-progress', '')`
  2. `var step2 = await ExchangeModule._runMemberMatch(payer, member, systemToken, newPayerConfig)`
  3. If `!step2.ok`: `_setStepState(2, 'failed', step2.error)`, `_showTryAgain()`, `return`
  4. `_setStepState(2, 'success', 'Member matched — FHIR ID: ' + step2.data.fhirId)`
  5. `var fhirId = step2.data.fhirId;` — local variable for Step 3 (Stories 3.4–3.5)
  6. Comment: `// Steps 3–4: pending — Story 3.4–3.5`

**Block If:** None — all decisions fully specified.

**Never:**
- Do not log `systemToken` (the access_token value) to the browser console (NFR-6)
- Do not treat 422 as a network failure — it must be parsed as an OperationOutcome
- Do not use `createElement`/`appendChild` for the Try Again button
- Do not read ConfigModule from within ExchangeModule (AD-13)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Step 2 succeeds | 200 response, Parameters with MemberPatient.resource.id | Step 2 success; detail "Member matched — FHIR ID: {id}"; steps 3–4 pending | — |
| HTTP 422, member not found | 422, OperationOutcome issue.code != 'consent' | Step 2 failed; detail with member-not-found message including submitted demographics; Try Again button | — |
| HTTP 422, consent denied | 422, OperationOutcome issue.code === 'consent' | Step 2 failed; detail "Consent denied by Previous Payer..."; Try Again button | — |
| HTTP 401/403 | response.ok false, not 422 | Step 2 failed; detail "Member match failed: HTTP 401"; Try Again button | — |
| 200 but no MemberPatient fhirId | Parameters missing patient id | Step 2 failed; "Member match response missing patient ID"; Try Again button | — |
| Network error / CORS | fetch throws | Step 2 failed; "Member match error: {err.message}"; Try Again button | Caught in try/catch |
| 422 body not valid JSON | JSON.parse throws inside 422 branch | Caught by outer try/catch; "Member match error: {err.message}" | — |

</intent-contract>

## Code Map

- `app.html` ExchangeModule — add `_showTryAgain()`, add `_runMemberMatch()`, extend `runExchange()` (refactor step 1 Try Again, add step 2)

## Tasks & Acceptance

**Execution:**

- [ ] `app.html` ExchangeModule — Add `_showTryAgain` method after `_setStepState`:
  ```js
  _showTryAgain: function() {
    var postPanel = document.getElementById('exchange-post-panel');
    if (postPanel) {
      postPanel.innerHTML = '<button id="exchange-try-again-btn" class="btn btn-secondary" type="button">Try Again</button>';
      var tryAgainBtn = document.getElementById('exchange-try-again-btn');
      if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', function() {
          UIModule._exchangePhase = 'setup';
          UIModule.showView('exchange');
        });
      }
    }
  },
  ```

- [ ] `app.html` ExchangeModule.runExchange — Replace the inline Try Again injection in the step 1 failure block with `ExchangeModule._showTryAgain()`. The block currently is:
  ```js
  var postPanel = document.getElementById('exchange-post-panel');
  if (postPanel) {
    postPanel.innerHTML = '<button id="exchange-try-again-btn" class="btn btn-secondary" type="button">Try Again</button>';
    var tryAgainBtn = document.getElementById('exchange-try-again-btn');
    if (tryAgainBtn) {
      tryAgainBtn.addEventListener('click', function() {
        UIModule._exchangePhase = 'setup';
        UIModule.showView('exchange');
      });
    }
  }
  ```
  Replace with: `ExchangeModule._showTryAgain();`

- [ ] `app.html` ExchangeModule — Add `_runMemberMatch` method:
  ```js
  _runMemberMatch: async function(payer, member, systemToken, newPayerConfig) {
    try {
      var matchUrl = payer.fhirBaseUrl + '/Patient/$member-match';
      if (payer.useProxy && newPayerConfig.corsProxyUrl) {
        matchUrl = newPayerConfig.corsProxyUrl + '?url=' + encodeURIComponent(matchUrl);
      }
      var now = new Date().toISOString();
      var fiveYearsAgo = new Date(Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      var parametersBody = {
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'MemberPatient',
            resource: {
              resourceType: 'Patient',
              name: [{ family: member.lastName, given: [member.firstName] }],
              birthDate: member.dateOfBirth,
              gender: member.gender
            }
          },
          {
            name: 'CoverageToMatch',
            resource: {
              resourceType: 'Coverage',
              status: 'active',
              subscriberId: member.memberIdAtOldPayer,
              beneficiary: { display: member.firstName + ' ' + member.lastName },
              payor: [{ display: payer.name }]
            }
          },
          {
            name: 'CoverageToLink',
            resource: {
              resourceType: 'Coverage',
              status: 'active',
              beneficiary: { display: member.firstName + ' ' + member.lastName },
              payor: [{ display: newPayerConfig.newPayer ? newPayerConfig.newPayer.name : '' }]
            }
          },
          {
            name: 'Consent',
            resource: {
              resourceType: 'Consent',
              status: 'active',
              scope: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/consentscope', code: 'patient-privacy' }] },
              category: [{ coding: [{ system: 'http://loinc.org', code: '59284-0' }] }],
              dateTime: now,
              performer: [{ display: newPayerConfig.newPayer ? newPayerConfig.newPayer.name : '' }],
              organization: [{ display: payer.name }],
              provision: {
                type: 'permit',
                period: { start: fiveYearsAgo, end: now.slice(0, 10) },
                purpose: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason', code: 'TREAT' }]
              }
            }
          }
        ]
      };
      var response = await fetch(matchUrl, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + systemToken, 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(parametersBody),
        referrerPolicy: 'no-referrer'
      });
      if (response.status === 422) {
        var oo = await response.json();
        var issues = (oo.issue || []);
        var code = issues.length > 0 ? (issues[0].code || '') : '';
        if (code === 'consent') {
          return { ok: false, data: null, error: 'Consent denied by Previous Payer. Verify Consent resource construction.' };
        }
        return { ok: false, data: null, error: 'Member not found at Previous Payer — check demographics or member ID. Submitted: ' + member.firstName + ' ' + member.lastName + ', DOB ' + member.dateOfBirth + ', Member ID ' + member.memberIdAtOldPayer + '.' };
      }
      if (!response.ok) {
        return { ok: false, data: null, error: 'Member match failed: HTTP ' + response.status };
      }
      var responseData = await response.json();
      var params = (responseData.parameter || []);
      var memberPatient = params.find(function(p) { return p.name === 'MemberPatient'; });
      var fhirId = memberPatient && memberPatient.resource && memberPatient.resource.id;
      if (!fhirId) {
        return { ok: false, data: null, error: 'Member match response missing patient ID' };
      }
      return { ok: true, data: { fhirId: fhirId }, error: null };
    } catch (err) {
      return { ok: false, data: null, error: 'Member match error: ' + (err.message || String(err)) };
    }
  },
  ```

- [ ] `app.html` ExchangeModule.runExchange — Replace the `// Steps 2–4: pending — Story 3.3–3.5` comment with:
  ```js
  var systemToken = step1.data.access_token;
  ExchangeModule._setStepState(2, 'in-progress', '');
  var step2 = await ExchangeModule._runMemberMatch(payer, member, systemToken, newPayerConfig);
  if (!step2.ok) {
    ExchangeModule._setStepState(2, 'failed', step2.error);
    ExchangeModule._showTryAgain();
    return;
  }
  ExchangeModule._setStepState(2, 'success', 'Member matched — FHIR ID: ' + step2.data.fhirId);
  var fhirId = step2.data.fhirId;
  // Steps 3–4: pending — Story 3.4–3.5
  ```

**Acceptance Criteria:**
- Given a configured payer whose $member-match endpoint returns 200 with a matched patient, then step 2 icon changes to teal spinner then checkmark; detail shows "Member matched — FHIR ID: {id}"; steps 3–4 remain pending
- Given $member-match returns HTTP 422 with OperationOutcome issue.code not equal to 'consent', then step 2 shows red ×; detail includes "Member not found at Previous Payer" with submitted demographics; Try Again button appears
- Given $member-match returns HTTP 422 with issue.code 'consent', then step 2 shows red ×; detail shows "Consent denied by Previous Payer. Verify Consent resource construction."; Try Again button appears
- Given a non-422 HTTP error (e.g., 500), then step 2 shows red ×; detail shows "Member match failed: HTTP 500"; Try Again button appears
- Given the Try Again button is clicked after any step 2 failure, then the setup panel re-appears with prior payer and member selections intact
- Given step 1 fails, then the Try Again button still appears (refactored path via `_showTryAgain()` — functionally unchanged)

## Design Notes

**`_showTryAgain()` extraction:** Story 3.2 inlined the Try Again button injection inside `runExchange`. Extracting it to `_showTryAgain()` removes duplication for steps 1–4. The refactored step 1 path is functionally identical — the same innerHTML + event wiring — just via a method call.

**$member-match body:** Uses FHIR R4 Parameters with MemberPatient (Patient demographics), CoverageToMatch (old payer coverage with subscriberId = memberIdAtOldPayer), CoverageToLink (new payer coverage), and Consent (5-year lookback, patient-privacy scope). `fiveYearsAgo` is computed as ISO date string using `Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000`. `[ASSUMPTION — validate exact resource structure against target servers; IHE PDex STU2 servers may require additional or different fields]`

**422 code detection:** `issues[0].code === 'consent'` catches the IHE PDex consent-denial code. Any other code (including `'no-match'`, `'not-found'`, or server-specific strings) maps to the member-not-found message. This is conservative and matches the two documented FR-19 cases.

**`systemToken` never logged:** The value is extracted with `var systemToken = step1.data.access_token;` and passed directly to `_runMemberMatch`. It does not appear in any console call.

## Review Triage Log

### 2026-07-31 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0

## Auto Run Result

**Status:** done

**Summary:** Added `_showTryAgain()` helper to ExchangeModule, extracting the Try Again button injection pattern from the step 1 failure handler (refactored to call the helper — functionally identical). Added `_runMemberMatch(payer, member, systemToken, newPayerConfig)` which POSTs a FHIR R4 Parameters body to `{fhirBaseUrl}/Patient/$member-match` with Bearer token auth, CORS proxy support, and `referrerPolicy: 'no-referrer'`. 422 responses parsed as OperationOutcome — `issue[0].code === 'consent'` routes to the consent-denied FR-19 message; all other codes route to the member-not-found FR-19 message with submitted demographics. Non-422 HTTP failures return a generic status message; successful responses extract `fhirId` from the `MemberPatient` parameter's resource id. Extended `runExchange` to execute step 2 after step 1 success: sets step 2 in-progress, awaits `_runMemberMatch`, fails with `_showTryAgain()` on error, succeeds with "Member matched — FHIR ID: {id}" detail. `systemToken` is never logged.

**Files changed:**
- `PayerToPayerClient/app.html` — ExchangeModule: `_showTryAgain()` helper, `_runMemberMatch()` method, step 1 failure path refactored, `runExchange` extended with step 2

**Review findings:** 0 patches. 0 deferred. 0 rejected.

**Follow-up review recommended:** false

## Verification

**Manual checks:**
- Run exchange against a real $member-match endpoint with valid member → step 2 shows FHIR ID in detail
- Run with incorrect member demographics → step 2 shows member-not-found message with submitted data
- Inspect network: POST to `{fhirBaseUrl}/Patient/$member-match`, Authorization header present, Content-Type `application/fhir+json`
- Inspect request body: valid Parameters JSON with 4 named parameters
- Browser console contains no access_token value
- Step 1 failure still shows Try Again (refactored path unchanged)
