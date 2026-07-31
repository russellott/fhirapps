---
title: 'Story 3.4: Member-Scoped Token (Step 3)'
type: 'feature'
created: '2026-07-31'
status: 'done'
baseline_revision: 'b19d938'
final_revision: 'TBD'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-3-context.md'
---

<intent-contract>

## Intent

**Problem:** After a successful member match (Step 2), exchange halts with Steps 3–4 permanently pending. There is no mechanism to request a patient-scoped token for the matched FHIR ID, and no failure handling if the previous payer's auth server does not support patient-scoped client credentials.

**Approach:** Add `ExchangeModule._acquireMemberToken(payer, fhirId, newPayerConfig)` (async, returns `{ok, data, error}`) and extend `runExchange` to execute Step 3 after Step 2 success. The method is nearly identical to `_acquireSystemToken` but uses `scope=patient/{fhirId}.rs` and maps all failure modes to the single FR-19 scoped-token message. On success, store the member token for Step 4.

## Boundaries & Constraints

**Always:**
- `ExchangeModule._acquireMemberToken(payer, fhirId, newPayerConfig)` — async, returns `{ ok: boolean, data: { memberToken: string }|null, error: string|null }`. Never throws across module boundary (AD-7).
- Token URL: `payer.tokenUrl`. Apply CORS proxy when `payer.useProxy === true` and `newPayerConfig.corsProxyUrl` is non-empty: `newPayerConfig.corsProxyUrl + '?url=' + encodeURIComponent(payer.tokenUrl)` (same pattern as steps 1 and 2).
- Request: POST, `Content-Type: application/x-www-form-urlencoded`, body as `URLSearchParams`, `referrerPolicy: 'no-referrer'`. Body always includes `grant_type=client_credentials` and `scope=patient/{fhirId}.rs` (FR-16).
- Auth method dispatch identical to step 1 (AD-11): if `payer.tokenAuthMethod === 'client_secret_basic'` → set `Authorization: Basic {btoa(clientId + ':' + clientSecret)}`, do NOT add credentials to body. Otherwise → add `client_id` and `client_secret` to body.
- All failure modes (non-OK HTTP response, missing `access_token`, fetch throws) return the exact FR-19 scoped-token error string: `'Member-scoped token not supported by this server — this Previous Payer\'s auth server may not support patient-scoped client credentials. Data retrieval cannot proceed.'`
- Success: `{ ok: true, data: { memberToken: tokenData.access_token }, error: null }`. Store the access_token under the key `memberToken` (not `access_token`) to make the caller intent explicit.
- **Never log `memberToken` (the access_token value) to the browser console** (NFR-6).
- `runExchange` extension after Step 2 success:
  1. `_setStepState(3, 'in-progress', '')`
  2. `var step3 = await ExchangeModule._acquireMemberToken(payer, fhirId, newPayerConfig)`
  3. If `!step3.ok`: `_setStepState(3, 'failed', step3.error)`, `_showTryAgain()`, `return`
  4. `_setStepState(3, 'success', 'Member-scoped token acquired — scope: patient/' + fhirId + '.rs')`
  5. `var memberToken = step3.data.memberToken;` — local variable for Step 4 (Story 3.5)
  6. Comment: `// Step 4: pending — Story 3.5`

**Block If:** None — all decisions fully specified.

**Never:**
- Do not fall back to the system token on member-scoped token failure — FR-16 explicitly prohibits this
- Do not log `memberToken` anywhere
- Do not use `createElement`/`appendChild` for the Try Again button
- Do not read ConfigModule from within ExchangeModule (AD-13)
- Do not send token request body as JSON — always `URLSearchParams`

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Step 3 succeeds | 200, access_token present | Step 3 success; detail "Member-scoped token acquired — scope: patient/{fhirId}.rs"; step 4 pending | — |
| HTTP error (401/403/400) | response.ok false | Step 3 failed; exact FR-19 scoped-token message; Try Again button | — |
| access_token absent in response | response.ok, no access_token | Step 3 failed; exact FR-19 scoped-token message; Try Again button | — |
| Network error / CORS | fetch throws | Step 3 failed; exact FR-19 scoped-token message; Try Again button | Caught in outer try/catch |
| client_secret_basic | payer.tokenAuthMethod === 'client_secret_basic' | Authorization: Basic header; no client_id/secret in body | — |
| Proxy enabled | payer.useProxy === true, corsProxyUrl set | Token URL wrapped with CORS proxy prefix | — |

</intent-contract>

## Code Map

- `app.html` ExchangeModule — add `_acquireMemberToken()`, extend `runExchange()` (add step 3)

## Tasks & Acceptance

**Execution:**

- [ ] `app.html` ExchangeModule — Add `_acquireMemberToken` method after `_runMemberMatch`:
  ```js
  _acquireMemberToken: async function(payer, fhirId, newPayerConfig) {
    try {
      var tokenUrl = payer.tokenUrl;
      if (payer.useProxy && newPayerConfig.corsProxyUrl) {
        tokenUrl = newPayerConfig.corsProxyUrl + '?url=' + encodeURIComponent(tokenUrl);
      }
      var body = new URLSearchParams();
      body.set('grant_type', 'client_credentials');
      body.set('scope', 'patient/' + fhirId + '.rs');
      var headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      if (payer.tokenAuthMethod === 'client_secret_basic') {
        headers['Authorization'] = 'Basic ' + btoa(payer.clientId + ':' + payer.clientSecret);
      } else {
        body.set('client_id', payer.clientId);
        body.set('client_secret', payer.clientSecret);
      }
      var response = await fetch(tokenUrl, {
        method: 'POST',
        headers: headers,
        body: body,
        referrerPolicy: 'no-referrer'
      });
      if (!response.ok) {
        return { ok: false, data: null, error: 'Member-scoped token not supported by this server — this Previous Payer\'s auth server may not support patient-scoped client credentials. Data retrieval cannot proceed.' };
      }
      var tokenData = await response.json();
      if (!tokenData.access_token) {
        return { ok: false, data: null, error: 'Member-scoped token not supported by this server — this Previous Payer\'s auth server may not support patient-scoped client credentials. Data retrieval cannot proceed.' };
      }
      return { ok: true, data: { memberToken: tokenData.access_token }, error: null };
    } catch (err) {
      return { ok: false, data: null, error: 'Member-scoped token not supported by this server — this Previous Payer\'s auth server may not support patient-scoped client credentials. Data retrieval cannot proceed.' };
    }
  },
  ```

- [ ] `app.html` ExchangeModule.runExchange — Replace the `// Step 4: ... Story 3.4–3.5` comment (currently `// Steps 3–4: pending — Story 3.4–3.5`) with:
  ```js
  ExchangeModule._setStepState(3, 'in-progress', '');
  var step3 = await ExchangeModule._acquireMemberToken(payer, fhirId, newPayerConfig);
  if (!step3.ok) {
    ExchangeModule._setStepState(3, 'failed', step3.error);
    ExchangeModule._showTryAgain();
    return;
  }
  ExchangeModule._setStepState(3, 'success', 'Member-scoped token acquired — scope: patient/' + fhirId + '.rs');
  var memberToken = step3.data.memberToken;
  // Step 4: pending — Story 3.5
  ```

**Acceptance Criteria:**
- Given a configured payer whose auth server supports patient-scoped client credentials, when Steps 1–2 succeed, then Step 3 icon changes to teal spinner then checkmark; detail shows "Member-scoped token acquired — scope: patient/{fhirId}.rs"; Step 4 remains pending
- Given the auth server returns HTTP 400/401/403 for the scoped token request, then Step 3 shows red ×; detail shows the exact FR-19 scoped-token failure message; Try Again button appears
- Given the Try Again button is clicked after Step 3 failure, then the setup panel re-appears with prior payer and member selections intact
- Given `payer.tokenAuthMethod === 'client_secret_basic'`, then the scoped token request includes an `Authorization: Basic …` header and no credentials in the body
- Given `payer.useProxy === true` with a corsProxyUrl set, then the scoped token POST URL is wrapped via the CORS proxy
- Given Step 1 and Step 2 both fail, then Step 3 is never reached (execution halted earlier) — Try Again button already shown from the failed step

## Design Notes

**Single error message for all step 3 failures:** Unlike steps 1 and 2 where different failure modes produce different messages (HTTP 422 vs. other vs. network error), step 3 maps every failure mode to the same FR-19 message. This reflects the underlying problem: any failure to get a patient-scoped token means the auth server doesn't support this grant type, regardless of the specific HTTP status. The exact string includes an explanation and remediation hint.

**`memberToken` naming:** Storing as `step3.data.memberToken` rather than `step3.data.access_token` makes the caller site (`var memberToken = step3.data.memberToken`) read as documentation of intent.

**No fallback to system token:** FR-16 is explicit. Even if the system token technically has `system/*.rs` permissions that could substitute, using it for patient-specific resource retrieval would break the compliance intent of the P2P exchange. Never substitute.

## Review Triage Log

### 2026-07-31 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 3 (truthy vs. strict proxy check by-design; `data: null` on failure correct; unused `memberToken` local by-design for Story 3.5)

## Auto Run Result

**Status:** done

**Summary:** Added `_acquireMemberToken(payer, fhirId, newPayerConfig)` to ExchangeModule. Method posts to `payer.tokenUrl` with `scope=patient/{fhirId}.rs`; same auth dispatch (AD-11) and CORS proxy pattern (AD-6) as `_acquireSystemToken`. All failure modes — non-OK HTTP, missing access_token, fetch error — return the single FR-19 scoped-token message. Success returns `{ ok: true, data: { memberToken: tokenData.access_token } }`. Extended `runExchange` to execute step 3 after step 2 success; success detail microcopy includes the patient scope. `memberToken` stored as local variable for Story 3.5. No console logging of token value (NFR-6). No system-token fallback (FR-16).

**Files changed:**
- `PayerToPayerClient/app.html` — ExchangeModule: `_acquireMemberToken()` method, `runExchange` extended with step 3

**Review findings:** 0 patches. 0 deferred. 3 rejected (all by-design or correct as-is).

**Follow-up review recommended:** false

## Verification

**Manual checks:**
- Configure a payer that supports patient-scoped credentials; run through steps 1–2 → step 3 spins then shows checkmark with correct scope string including fhirId
- Configure a payer that doesn't support patient-scoped credentials → step 3 shows red × with the exact FR-19 scoped-token message
- Inspect network: scope in the token request body is `patient/{fhirId}.rs` (not `system/*.rs`)
- Browser console contains no `memberToken` value
