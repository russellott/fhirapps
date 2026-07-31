---
title: 'Story 3.2: ExchangeModule Scaffold & System Token (Step 1)'
type: 'feature'
created: '2026-07-31'
status: 'done'
baseline_revision: '2b629b1'
final_revision: '58f4f54'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-3-context.md'
---

<intent-contract>

## Intent

**Problem:** `ExchangeModule.runExchange` is a no-op stub — clicking Run Exchange swaps to the 4-step progress tracker, but no network activity occurs and the steps remain permanently pending. There is no mechanism to acquire a system access token, update step states in the DOM, or allow the user to retry after failure.

**Approach:** Replace the stub with a real async `runExchange` that executes Step 1 (system token acquisition via POST to `payer.tokenUrl`), updates DOM step states via a private `_setStepState` helper, and on failure injects a "Try Again" button into a pre-rendered `exchange-post-panel` div. Add `ExchangeModule._acquireSystemToken`. Steps 2–4 remain pending after Step 1 success — Stories 3.3–3.5 will extend `runExchange` sequentially.

## Boundaries & Constraints

**Always:**
- `ExchangeModule._setStepState(stepNum, state, detailText)` — new private method. Looks up `document.getElementById('step-row-' + stepNum)`, queries `.querySelector('.step-icon')` within it, sets `icon.className = 'step-icon step-' + state`. If `detailText` is defined (not `undefined`), sets `document.getElementById('step-detail-' + stepNum).textContent = detailText`. All element lookups null-guarded.
- `ExchangeModule._acquireSystemToken(payer, newPayerConfig)` — async, returns `{ ok: boolean, data: any, error: string|null }`. Never throws across the module boundary — all errors caught and returned as `{ ok: false, data: null, error: '...' }`. (AD-7)
- Token request: `POST` to `payer.tokenUrl`; `Content-Type: application/x-www-form-urlencoded`; body as `URLSearchParams`; always include `grant_type=client_credentials` and `scope=system/*.rs` in body; `referrerPolicy: 'no-referrer'`. (FR-14)
- Auth method dispatch (AD-11): if `payer.tokenAuthMethod === 'client_secret_basic'`: set `Authorization: Basic {btoa(payer.clientId + ':' + payer.clientSecret)}` header; do NOT add `client_id` or `client_secret` to body. Otherwise (default, `client_secret_post` or undefined): add `client_id` and `client_secret` to body; no Authorization header.
- CORS proxy (AD-6): if `payer.useProxy === true` and `newPayerConfig.corsProxyUrl` is non-empty, wrap token URL: `newPayerConfig.corsProxyUrl + '?url=' + encodeURIComponent(payer.tokenUrl)`. `referrerPolicy: 'no-referrer'` still applies to the proxied URL.
- Token response validation: if HTTP response is not `ok` → `{ ok: false, error: 'Token request failed: HTTP {status}' }`. If `response.json()` parse succeeds but `tokenData.access_token` is absent → `{ ok: false, error: 'Token response missing access_token' }`. Otherwise → `{ ok: true, data: tokenData, error: null }`.
- `ExchangeModule.runExchange` replaced with `async function(payer, member, newPayerConfig)`. Step 1 sequence: (1) `_setStepState(1, 'in-progress', '')`, (2) `await _acquireSystemToken(payer, newPayerConfig)`, (3a) on failure: `_setStepState(1, 'failed', step1.error)` then inject Try Again button, then `return`; (3b) on success: `_setStepState(1, 'success', successText)` where `successText = 'Access token acquired — expires in ' + step1.data.expires_in + 's'` if `typeof step1.data.expires_in === 'number'`, else `'Access token acquired'`.
- Steps 2–4 remain pending after Step 1 success — no further action in this story.
- **Never log `access_token` to the browser console** (NFR-6). The token value in `step1.data.access_token` must not appear in any `console.log`, `console.debug`, or similar call.
- Try Again button injection: after `_setStepState(1, 'failed', ...)`, set `innerHTML` of `document.getElementById('exchange-post-panel')` to a button with `id="exchange-try-again-btn"`, then immediately query it and wire its `click` handler to set `UIModule._exchangePhase = 'setup'` and call `UIModule.showView('exchange')`. Null-guard the container lookup.
- `renderExchange()` progress panel: add `<div id="exchange-post-panel"></div>` as the last element inside the `.step-tracker` div (before the closing `</div>`). Starts empty on every render; ExchangeModule populates it asynchronously.
- `DebugModule.appendEntry` is a stub and does not exist yet — do not call it in Story 3.2. Story 4.4 implements it.

**Block If:** None — all decisions fully specified.

**Never:**
- Do not use `createElement` or `appendChild` — use `innerHTML` to inject the Try Again button (AD from project context)
- Do not call `ConfigModule` from within ExchangeModule — all config is passed via function arguments (AD-13)
- Do not send the token request body as JSON — always `URLSearchParams` (FR-14, NFR-2)
- Do not add `client_id`/`client_secret` to the body when using `client_secret_basic`

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Step 1 succeeds, has expires_in | `response.ok`, `access_token` present, `expires_in: 300` | Step 1 icon → success; detail: "Access token acquired — expires in 300s" | — |
| Step 1 succeeds, no expires_in | `access_token` present, `expires_in` absent | Step 1 icon → success; detail: "Access token acquired" | — |
| HTTP error (e.g. 401) | `response.ok === false`, status 401 | Step 1 icon → failed; detail: "Token request failed: HTTP 401"; Try Again button appears | — |
| JSON parse error | response.ok but body not valid JSON | Step 1 icon → failed; detail contains error message from catch | Caught in try/catch |
| access_token absent in response | response.ok, JSON valid, no access_token field | Step 1 icon → failed; detail: "Token response missing access_token" | — |
| Network failure (fetch throws) | No network or CORS error | Step 1 icon → failed; detail: "Token request error: {err.message}" | Caught in try/catch |
| client_secret_basic payer | `payer.tokenAuthMethod === 'client_secret_basic'` | Authorization: Basic header set; no client_id/secret in body | — |
| Proxy enabled | `payer.useProxy === true`, corsProxyUrl set | Token URL wrapped with CORS proxy prefix | — |
| exchange-post-panel not in DOM (nav-away) | User navigated away during run | `getElementById` returns null; null-guard prevents crash | Silently no-op |

</intent-contract>

## Code Map

- `app.html` ExchangeModule — replace `runExchange` stub; add `_setStepState`, `_acquireSystemToken` private methods
- `app.html` UIModule.renderExchange() — add `<div id="exchange-post-panel"></div>` inside the progress tracker panel

## Tasks & Acceptance

**Execution:**

- [x] `app.html` UIModule.renderExchange() — In the progress-panel branch (`if (UIModule._exchangePhase === 'running')`), add `html += '<div id="exchange-post-panel"></div>';` immediately before the closing `html += '</div>';` of the `.step-tracker` div

- [x] `app.html` ExchangeModule — Replace the current stub with the full scaffold:
  ```js
  const ExchangeModule = {
    hasResult() { return false; },

    _setStepState: function(stepNum, state, detailText) {
      var row = document.getElementById('step-row-' + stepNum);
      if (!row) return;
      var icon = row.querySelector('.step-icon');
      if (icon) { icon.className = 'step-icon step-' + state; }
      if (detailText !== undefined) {
        var detail = document.getElementById('step-detail-' + stepNum);
        if (detail) { detail.textContent = detailText; }
      }
    },

    _acquireSystemToken: async function(payer, newPayerConfig) {
      try {
        var tokenUrl = payer.tokenUrl;
        if (payer.useProxy && newPayerConfig.corsProxyUrl) {
          tokenUrl = newPayerConfig.corsProxyUrl + '?url=' + encodeURIComponent(tokenUrl);
        }
        var body = new URLSearchParams();
        body.set('grant_type', 'client_credentials');
        body.set('scope', 'system/*.rs');
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
          return { ok: false, data: null, error: 'Token request failed: HTTP ' + response.status };
        }
        var tokenData = await response.json();
        if (!tokenData.access_token) {
          return { ok: false, data: null, error: 'Token response missing access_token' };
        }
        return { ok: true, data: tokenData, error: null };
      } catch (err) {
        return { ok: false, data: null, error: 'Token request error: ' + (err.message || String(err)) };
      }
    },

    runExchange: async function(payer, member, newPayerConfig) {
      ExchangeModule._setStepState(1, 'in-progress', '');
      var step1 = await ExchangeModule._acquireSystemToken(payer, newPayerConfig);
      if (!step1.ok) {
        ExchangeModule._setStepState(1, 'failed', step1.error);
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
        return;
      }
      var successText = (typeof step1.data.expires_in === 'number')
        ? 'Access token acquired — expires in ' + step1.data.expires_in + 's'
        : 'Access token acquired';
      ExchangeModule._setStepState(1, 'success', successText);
      // Steps 2–4: pending — Story 3.3–3.5
    }
  };
  ```

**Acceptance Criteria:**
- Given a configured payer with valid token credentials, when Run Exchange is clicked, then step 1 icon changes to teal spinning circle (in-progress), then after the token request responds changes to filled teal circle with checkmark (success)
- Given step 1 succeeds and `expires_in` is present in the token response, then step 1 detail shows "Access token acquired — expires in {n}s"
- Given step 1 succeeds and `expires_in` is absent, then step 1 detail shows "Access token acquired"
- Given step 1 succeeds, then steps 2–4 remain in pending state (dashed circle icons)
- Given a token request returns HTTP 401, then step 1 icon becomes red ×, detail shows "Token request failed: HTTP 401", and a "Try Again" button appears below the step tracker
- Given the Try Again button is clicked, then the view reverts to the setup panel with prior payer and member selections still populated
- Given `payer.tokenAuthMethod === 'client_secret_basic'`, then the request includes an `Authorization: Basic …` header and no `client_id`/`client_secret` in the body
- Given `payer.useProxy === true` with a corsProxyUrl set, then the token POST URL is wrapped via the CORS proxy

## Design Notes

**`_setStepState` as a shared method:** Stories 3.3–3.5 call this same method to update their respective step rows. Naming it on ExchangeModule (not UIModule) keeps exchange-step DOM ownership inside ExchangeModule per AD-13.

**`exchange-post-panel` starts empty on every `renderExchange()` call.** This means if the user navigates away and returns while phase is `'running'`, the view re-renders with all 4 steps pending again and the post-panel empty. Direct DOM state (icon classes, detail text) is not stored in UIModule — this is an accepted limitation for the demo tool. Step state persists only during a single continuous view session.

**`btoa` encoding for `client_secret_basic`:** `btoa(clientId + ':' + clientSecret)` — the colon separator matches RFC 7617. Payer credentials in the demo are ASCII-safe; `btoa` does not need a UTF-8 polyfill.

**Unicode em-dash in successText:** The `—` in `'Access token acquired — expires in ...'` matches the exact microcopy from epic-3-context.md FR string without risking encoding issues.

## Review Triage Log

### 2026-07-31 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 0, low 1)
- defer: 3: (low 3)
- reject: 9
- addressed_findings:
  - `[low]` `[patch]` `expires_in` type check used `typeof ... === 'number'` only; servers that return `expires_in` as a string (e.g. `"3600"`) silently dropped the expiry from the success message — fixed by accepting both `number` and numeric string, converting via `Number(expiresIn)` before display

## Auto Run Result

**Status:** done

**Summary:** Replaced the ExchangeModule no-op stub with a full async scaffold. `_setStepState(stepNum, state, detailText)` updates step icon class and detail text by stable DOM IDs. `_acquireSystemToken` POSTs to `payer.tokenUrl` as `application/x-www-form-urlencoded` with `grant_type=client_credentials` and `scope=system/*.rs`; dispatches `client_secret_basic` (Authorization header) vs `client_secret_post` (body params) per AD-11; wraps URL with CORS proxy when `payer.useProxy === true`; catches all errors into structured `{ok, data, error}` returns per AD-7. On failure: sets step 1 failed, injects Try Again button into `#exchange-post-panel` via `innerHTML` and wires its click to reset `_exchangePhase` and re-render. On success: sets step 1 success with expiry text (handles both number and string `expires_in`). `exchange-post-panel` div added to progress panel HTML. Review patch: accepted string-typed `expires_in` from OAuth servers in addition to number type.

**Files changed:**
- `PayerToPayerClient/app.html` — ExchangeModule full implementation, exchange-post-panel div in progress tracker
- `PayerToPayerClient/_bmad-output/implementation-artifacts/deferred-work.md` — 3 new entries (missing tokenUrl, null credentials, no fetch timeout)

**Review findings:** 1 patch applied (low: expires_in type check). 3 deferred (all low). 9 rejected.

**Follow-up review recommended:** false

**Residual risks:** Steps 2–4 remain pending after a successful token acquisition — Stories 3.3–3.5 extend runExchange to complete the exchange.

## Verification

**Manual checks:**
- Configure a payer with valid tokenUrl and credentials; click Run Exchange → step 1 spins then shows checkmark + "Access token acquired — expires in Ns"; steps 2–4 still pending
- Configure a payer with wrong credentials → step 1 shows red × with "Token request failed: HTTP 401"; Try Again button visible
- Click Try Again → setup panel reappears with prior payer and member still selected
- Inspect network requests: token POST has `Content-Type: application/x-www-form-urlencoded`, body contains `grant_type=client_credentials`, `scope=system/*.rs`
- Verify browser console contains no `access_token` value
