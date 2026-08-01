---
title: 'Story 4.4: Debug Panel'
type: 'feature'
created: '2026-07-31'
status: 'done'
baseline_revision: 'd7fb818b70f5d18cd54f3d2b7587ddb170a529ab'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
---

<intent-contract>

## Intent

**Problem:** ExchangeModule performs 4 multi-step HTTP flows (system token → member match → member token → 8 parallel resource fetches) with no developer-visible trace. When an exchange fails or returns unexpected data, there is zero diagnostic output — no request/response details, no HTTP status codes, no headers. Developers and demo operators must rely on browser DevTools, which may be unavailable in locked-down environments.

**Approach:** Implement `DebugModule` (replacing the stub) and wire it into every ExchangeModule fetch call site. The panel docks to the bottom of the Exchange view as a collapsible dark-background strip (40px collapsed, 280px expanded). Each HTTP call appends one entry showing step number, method, URL, and status code; expanding an entry reveals full request/response detail. Client secrets are redacted per NFR-7; access tokens removed from response bodies per the spirit of NFR-6.

## Boundaries & Constraints

**Always:**
- Replace the DebugModule stub (lines 824-825, including the `// DebugModule — stub; full implementation in Story 4.4` comment) with the full implementation.
- `DebugModule._entries` is append-only; never cleared or reset between exchanges. Entries from prior runs accumulate — this is intentional for a demo debug tool.
- `DebugModule._open` persists across Exchange view re-renders (set once by toggle click; `render()` reads it on every call).
- `DebugModule.render()` ALWAYS renders `#debug-panel-body` even when collapsed. The body is hidden by `overflow: hidden; max-height: 40px` CSS on `.debug-panel`; expanding adds the `.open` class (max-height: 280px). This ensures `appendEntry()` can always find and update `#debug-panel-body` via direct DOM write.
- `DebugModule.appendEntry(entry)` — calls `_redact()` on entry, pushes redacted copy to `_entries`, then directly updates `#debug-panel-body` innerHTML and `#debug-count` text (no showView call, no full re-render).
- Toggle click handler in `bindExchangeEvents()` — toggles `DebugModule._open`, directly adds/removes `.open` CSS class on `#debug-panel`, updates the toggle icon text. Never calls `showView('exchange')`.
- `DebugModule` never reads `ConfigModule` or `UIModule` (AD-13).
- `UIModule` calls `DebugModule.render()` from `renderExchange()`.
- `ExchangeModule` calls `DebugModule.appendEntry()` only (AD-13).
- Add `var reqData = {...}` capture BEFORE each `await fetch()` call, then call `DebugModule.appendEntry()` in the relevant error/success branches after the response is handled.
- CSS insertion point: after `.json-null { color: #e36209; }` and before the closing `</style>` tag.
- `renderExchange()` insertion point: add `html += DebugModule.render();` immediately before the final `html += '</div>';` at line 1053 (the closing tag of `.view-container`).

**Block If:** None — all decisions fully specified.

**Never:**
- Do not call `showView('exchange')` from the debug panel toggle handler — it causes a full Exchange view re-render and resets the running phase UI.
- Do not call `document.createElement` (except the existing download-anchor AD-2 exception in `bindResultsEvents`).
- Do not log `access_token` values — remove from response body objects before storing in `_entries`.
- Do not clear `_entries` on new exchange — entries accumulate intentionally.
- Do not show the debug panel on any view other than Exchange.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Panel collapsed (default) | `_open: false` | 40px strip at bottom of Exchange view; shows "▶ Debug Panel" + entry count badge | — |
| Panel expanded | `_open: true` | 280px height; body shows entry list or empty-state message | — |
| Toggle click | `_open: false → true` | `.open` class added to `#debug-panel`; icon changes to ▼ | — |
| Entry appended during running exchange | `appendEntry()` called | `#debug-panel-body` innerHTML updated; `#debug-count` incremented; no full re-render | — |
| Step 1 non-ok | HTTP 401 from token endpoint | Entry: step 1, POST, tokenUrl, 401 | — |
| Step 1 success | HTTP 200, tokenData returned | Entry: step 1, POST, tokenUrl, 200; `access_token` removed from response body | — |
| Step 2 422 consent | HTTP 422, consent code | Entry: step 2, POST, matchUrl, 422; oo body logged (no access_token in OperationOutcome) | — |
| Step 2 422 other | HTTP 422, non-consent code | Same entry format, different oo body | — |
| Step 2 non-ok | HTTP 500 | Entry: step 2, POST, matchUrl, 500; body null | — |
| Step 2 success | HTTP 200, responseData | Entry: step 2, POST, matchUrl, 200 | — |
| Step 3 non-ok | HTTP 400 | Entry: step 3, POST, tokenUrl, 400; body null | — |
| Step 3 success | HTTP 200 | Entry: step 3, POST, tokenUrl, 200; `access_token` removed | — |
| Step 4 non-ok (one resource) | HTTP 403 for Condition | Entry: step 4, GET, conditionUrl, 403; body null | — |
| Step 4 success (one resource) | HTTP 200, Bundle | Entry: step 4, GET, resourceUrl, 200 | — |
| client_secret_basic auth | `Authorization: Basic dXNlcjpzZWNyZXQ=` | Header stored as `Authorization: Basic dXNl****` | — |
| client_secret_post auth | `client_secret=mysecret` in body | Body stored with `client_secret=myse****` | — |
| Secret shorter than 4 chars | `client_secret=abc` | Body stored with `client_secret=abc****` (shows all available chars + `****`) | — |
| No entries yet | `_entries: []` | Body shows italic empty-state message | — |

</intent-contract>

## Code Map

- `app.html` DebugModule stub (lines 824-825, with preceding comment) — replace with full implementation
- `app.html` ExchangeModule._acquireSystemToken — add `reqData` + `appendEntry` at non-ok return and after json()
- `app.html` ExchangeModule._runMemberMatch — add `reqData` + `appendEntry` at 422 (after oo), non-ok, and success
- `app.html` ExchangeModule._acquireMemberToken — add `reqData` + `appendEntry` at non-ok return and after json()
- `app.html` ExchangeModule._retrieveResources — add `reqData` + `appendEntry` at non-ok and success inside per-resource try
- `app.html` UIModule.renderExchange — add `html += DebugModule.render();` before final `html += '</div>'`
- `app.html` UIModule.bindExchangeEvents — add `#debug-panel-toggle` click handler
- `app.html` `<style>` — debug panel CSS

## Tasks & Acceptance

**Execution:**

- [x] `app.html` `<style>` — Add after `.json-null { color: #e36209; }`:
  ```css
  .debug-panel { margin-top: 24px; background: #263238; color: #aed581; font-family: monospace; font-size: 12px; border-radius: 8px; overflow: hidden; max-height: 40px; transition: max-height 150ms ease; }
  .debug-panel.open { max-height: 280px; }
  .debug-panel-header { display: flex; align-items: center; gap: 8px; padding: 0 12px; height: 40px; cursor: pointer; user-select: none; font-weight: 500; font-size: 13px; flex-shrink: 0; }
  .debug-count { background: #37474f; border-radius: 10px; padding: 2px 7px; font-size: 11px; margin-left: auto; color: #aed581; }
  .debug-panel-body { height: 240px; overflow-y: auto; border-top: 1px solid #37474f; }
  .debug-entry { border-bottom: 1px solid #37474f; }
  .debug-entry:nth-child(even) { background: #1e272e; }
  .debug-entry summary { padding: 5px 12px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; list-style: none; }
  .debug-step { color: #80cbc4; margin-right: 6px; }
  .debug-method { color: #b0bec5; font-weight: 600; margin-right: 6px; }
  .debug-url { color: #aed581; margin-right: 6px; }
  .debug-ok { color: #a5d6a7; }
  .debug-err { color: #ef9a9a; }
  .debug-detail { padding: 8px 12px; font-size: 11px; white-space: pre-wrap; word-break: break-all; background: #1a2329; margin: 0; color: #b0bec5; border-top: 1px solid #37474f; }
  .debug-empty { padding: 12px; color: #546e7a; font-style: italic; }
  ```

- [x] `app.html` DebugModule — Replace lines 824-825 (comment + stub) with:
  ```js
  const DebugModule = {
    _entries: [],
    _open: false,

    _escape: function(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    _redact: function(entry) {
      var safe = JSON.parse(JSON.stringify(entry));
      // Redact Authorization: Basic header (show first 4 chars of base64 + ****)
      if (safe.request && safe.request.headers) {
        var auth = safe.request.headers['Authorization'];
        if (typeof auth === 'string' && auth.indexOf('Basic ') === 0) {
          var b64 = auth.slice(6);
          safe.request.headers['Authorization'] = 'Basic ' + b64.slice(0, 4) + '****';
        }
      }
      // Redact client_secret in URL-encoded request body
      if (typeof safe.request.body === 'string') {
        safe.request.body = safe.request.body.replace(
          /(client_secret=)([^&]{0,4})([^&]*)/g,
          function(m, prefix, first4) { return prefix + first4 + '****'; }
        );
      }
      // Remove access_token from response body
      if (safe.response && safe.response.body && typeof safe.response.body === 'object') {
        delete safe.response.body.access_token;
      }
      return safe;
    },

    _renderEntries: function() {
      if (DebugModule._entries.length === 0) {
        return '<div class="debug-empty">No entries yet — run an exchange to populate.</div>';
      }
      var html = '';
      DebugModule._entries.forEach(function(e) {
        var status = e.response ? e.response.status : 0;
        var isOk = status >= 200 && status < 300;
        html += '<details class="debug-entry">';
        html += '<summary>';
        html += '<span class="debug-step">Step ' + DebugModule._escape(e.step) + '</span>';
        html += '<span class="debug-method">' + DebugModule._escape(e.request.method) + '</span>';
        html += '<span class="debug-url">' + DebugModule._escape(e.request.url) + '</span>';
        html += '<span class="' + (isOk ? 'debug-ok' : 'debug-err') + '">' + DebugModule._escape(status) + '</span>';
        html += '</summary>';
        html += '<pre class="debug-detail">' + DebugModule._escape(JSON.stringify(e, null, 2)) + '</pre>';
        html += '</details>';
      });
      return html;
    },

    appendEntry: function(entry) {
      var safe = DebugModule._redact(entry);
      DebugModule._entries.push(safe);
      var bodyEl = document.getElementById('debug-panel-body');
      if (bodyEl) { bodyEl.innerHTML = DebugModule._renderEntries(); }
      var countEl = document.getElementById('debug-count');
      if (countEl) { countEl.textContent = DebugModule._entries.length; }
    },

    render: function() {
      var open = DebugModule._open;
      var count = DebugModule._entries.length;
      var html = '<div class="debug-panel' + (open ? ' open' : '') + '" id="debug-panel">';
      html += '<div class="debug-panel-header" id="debug-panel-toggle">';
      html += '<span id="debug-toggle-icon">' + (open ? '&#9660;' : '&#9654;') + '</span>';
      html += ' Debug Panel';
      html += '<span class="debug-count" id="debug-count">' + count + '</span>';
      html += '</div>';
      html += '<div class="debug-panel-body" id="debug-panel-body">';
      html += DebugModule._renderEntries();
      html += '</div>';
      html += '</div>';
      return html;
    }
  };
  ```

- [x] `app.html` ExchangeModule._acquireSystemToken — Add `reqData` capture before the fetch, and `appendEntry` calls at the two return points. Replace:
  ```js
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
  ```
  with:
  ```js
          var reqData = { method: 'POST', url: tokenUrl, headers: headers, body: body.toString() };
          var response = await fetch(tokenUrl, {
            method: 'POST',
            headers: headers,
            body: body,
            referrerPolicy: 'no-referrer'
          });
          if (!response.ok) {
            DebugModule.appendEntry({ step: 1, request: reqData, response: { status: response.status, body: null } });
            return { ok: false, data: null, error: 'Token request failed: HTTP ' + response.status };
          }
          var tokenData = await response.json();
          DebugModule.appendEntry({ step: 1, request: reqData, response: { status: response.status, body: tokenData } });
          if (!tokenData.access_token) {
            return { ok: false, data: null, error: 'Token response missing access_token' };
          }
          return { ok: true, data: tokenData, error: null };
  ```

- [x] `app.html` ExchangeModule._runMemberMatch — Add `reqData` before fetch and `appendEntry` at all three return paths. Replace:
  ```js
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
  ```
  with:
  ```js
          var reqData2 = { method: 'POST', url: matchUrl, headers: { 'Authorization': 'Bearer ' + systemToken, 'Content-Type': 'application/fhir+json' }, body: JSON.stringify(parametersBody) };
          var response = await fetch(matchUrl, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + systemToken, 'Content-Type': 'application/fhir+json' },
            body: JSON.stringify(parametersBody),
            referrerPolicy: 'no-referrer'
          });
          if (response.status === 422) {
            var oo = await response.json();
            DebugModule.appendEntry({ step: 2, request: reqData2, response: { status: 422, body: oo } });
            var issues = (oo.issue || []);
            var code = issues.length > 0 ? (issues[0].code || '') : '';
            if (code === 'consent') {
              return { ok: false, data: null, error: 'Consent denied by Previous Payer. Verify Consent resource construction.' };
            }
            return { ok: false, data: null, error: 'Member not found at Previous Payer — check demographics or member ID. Submitted: ' + member.firstName + ' ' + member.lastName + ', DOB ' + member.dateOfBirth + ', Member ID ' + member.memberIdAtOldPayer + '.' };
          }
          if (!response.ok) {
            DebugModule.appendEntry({ step: 2, request: reqData2, response: { status: response.status, body: null } });
            return { ok: false, data: null, error: 'Member match failed: HTTP ' + response.status };
          }
          var responseData = await response.json();
          DebugModule.appendEntry({ step: 2, request: reqData2, response: { status: response.status, body: responseData } });
  ```

- [x] `app.html` ExchangeModule._acquireMemberToken — Add `reqData` before fetch and `appendEntry` at the two return points. Replace:
  ```js
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
  ```
  with:
  ```js
          var reqData3 = { method: 'POST', url: tokenUrl, headers: headers, body: body.toString() };
          var response = await fetch(tokenUrl, {
            method: 'POST',
            headers: headers,
            body: body,
            referrerPolicy: 'no-referrer'
          });
          if (!response.ok) {
            DebugModule.appendEntry({ step: 3, request: reqData3, response: { status: response.status, body: null } });
            return { ok: false, data: null, error: 'Member-scoped token not supported by this server — this Previous Payer\'s auth server may not support patient-scoped client credentials. Data retrieval cannot proceed.' };
          }
          var tokenData = await response.json();
          DebugModule.appendEntry({ step: 3, request: reqData3, response: { status: response.status, body: tokenData } });
          if (!tokenData.access_token) {
            return { ok: false, data: null, error: 'Member-scoped token not supported by this server — this Previous Payer\'s auth server may not support patient-scoped client credentials. Data retrieval cannot proceed.' };
          }
          return { ok: true, data: { memberToken: tokenData.access_token }, error: null };
  ```

- [x] `app.html` ExchangeModule._retrieveResources — Add `reqData` after url construction and `appendEntry` at both branches inside the per-resource try block. Replace:
  ```js
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
  ```
  with:
  ```js
              var reqData4 = { method: 'GET', url: url, headers: { 'Authorization': 'Bearer ' + memberToken, 'Accept': 'application/fhir+json' }, body: null };
              var response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + memberToken, 'Accept': 'application/fhir+json' },
                referrerPolicy: 'no-referrer'
              });
              if (!response.ok) {
                DebugModule.appendEntry({ step: 4, request: reqData4, response: { status: response.status, body: null } });
                return { resourceType: resourceType, ok: false, count: 0, status: response.status, entries: [] };
              }
              var bundle = await response.json();
              DebugModule.appendEntry({ step: 4, request: reqData4, response: { status: response.status, body: bundle } });
              var entries = Array.isArray(bundle.entry) ? bundle.entry : [];
              return { resourceType: resourceType, ok: true, count: entries.length, status: response.status, entries: entries };
  ```

- [x] `app.html` UIModule.renderExchange — Add `DebugModule.render()` call before the closing `view-container` div. Replace:
  ```js
        html += '</div>';
        return html;
      },

      renderResults: function() {
  ```
  with:
  ```js
        html += DebugModule.render();
        html += '</div>';
        return html;
      },

      renderResults: function() {
  ```

- [x] `app.html` UIModule.bindExchangeEvents — Append debug panel toggle handler. Replace:
  ```js
        var runBtn = document.getElementById('exchange-run-btn');
        if (runBtn) {
          runBtn.addEventListener('click', function() {
            var config = ConfigModule.getConfig();
            if (!config || !Array.isArray(config.previousPayers)) return;
            var payer = config.previousPayers.find(function(p) { return p.id === UIModule._exchangeSelectedPayerId; });
            var member = payer && Array.isArray(payer.roster) ? payer.roster.find(function(m) { return m.id === UIModule._exchangeSelectedMemberId; }) : null;
            if (!payer || !member) return;
            UIModule._exchangePhase = 'running';
            UIModule.showView('exchange');
            ExchangeModule.runExchange(payer, member, { newPayer: config.newPayer, corsProxyUrl: config.corsProxyUrl });
          });
        }
      },
  ```
  with:
  ```js
        var runBtn = document.getElementById('exchange-run-btn');
        if (runBtn) {
          runBtn.addEventListener('click', function() {
            var config = ConfigModule.getConfig();
            if (!config || !Array.isArray(config.previousPayers)) return;
            var payer = config.previousPayers.find(function(p) { return p.id === UIModule._exchangeSelectedPayerId; });
            var member = payer && Array.isArray(payer.roster) ? payer.roster.find(function(m) { return m.id === UIModule._exchangeSelectedMemberId; }) : null;
            if (!payer || !member) return;
            UIModule._exchangePhase = 'running';
            UIModule.showView('exchange');
            ExchangeModule.runExchange(payer, member, { newPayer: config.newPayer, corsProxyUrl: config.corsProxyUrl });
          });
        }

        var debugToggle = document.getElementById('debug-panel-toggle');
        if (debugToggle) {
          debugToggle.addEventListener('click', function() {
            DebugModule._open = !DebugModule._open;
            var panel = document.getElementById('debug-panel');
            if (panel) { panel.classList.toggle('open', DebugModule._open); }
            var icon = document.getElementById('debug-toggle-icon');
            if (icon) { icon.textContent = DebugModule._open ? '▼' : '►'; }
          });
        }
      },
  ```

**Acceptance Criteria:**
- Given the Exchange view is open, then a 40px dark panel labeled "Debug Panel" is visible at the bottom with a ▶ icon and entry count badge
- Given the panel is collapsed and I click the header, then the panel expands to 280px and the icon changes to ▼
- Given the panel is expanded and I click the header, then the panel collapses to 40px and the icon changes to ▶
- Given the panel is expanded and I navigate to another view (Previous Payers, Results), then the debug panel is not visible (it is only rendered by `renderExchange()`)
- Given the panel is expanded and I return to Exchange, then it is still expanded (`_open` persists)
- Given an exchange runs to completion, then the panel entry count equals the number of HTTP calls completed (1 token + 1 match + 1 member-token + up to 8 resources = up to 11)
- Given the panel has entries and I expand an entry, then I see the full request (method, URL, headers, body) and response (status, body) as formatted JSON
- Given the payer uses `client_secret_post` auth, then the request body in debug entries shows `client_secret=<first4>****` (never the full secret)
- Given the payer uses `client_secret_basic` auth, then the Authorization header shows `Basic <first4>****`
- Given any step returns an access_token in the response, then `access_token` is absent from the debug entry's response body
- Given HTTP 2xx response, then the status number in the summary row is green
- Given HTTP 4xx or 5xx response, then the status number is red
- Given no exchange has been run, then the panel body shows the empty-state italic message

## Design Notes

**Why `_renderEntries()` re-renders all entries on each `appendEntry()`:** The entry list is O(n) HTML string concatenation. For up to 11 entries total (1 + 1 + 1 + 8 resource types), the cost is negligible. `<details>/<summary>` collapse state resets on re-render, which is acceptable for a demo debug panel.

**Why `reqData3` and `reqData2` variable names:** `_acquireSystemToken` and `_acquireMemberToken` both use `tokenUrl`, `headers`, and `body` with the same local variable names, and the inner `try` scopes overlap. Using distinct suffixed names avoids linter warnings about block-scoped redeclaration if the implementer uses `let`/`const`. Since we use `var`, it's not strictly necessary, but the naming makes the code map unambiguous.

**Why access_token removal from response body (not just console):** NFR-6 says "never log access_token to browser console." The debug panel is DOM, not console — but removing it from stored entries is a conservative interpretation that prevents token leakage via debug panel copy-paste. The `_redact()` function does a deep clone first so the original tokenData flowing through ExchangeModule is never mutated.

**Why `<details>/<summary>` instead of click-toggle JS:** Native browser disclosure widget requires zero JS state for per-entry expand/collapse. Each `appendEntry()` re-render resets all entries to collapsed — acceptable because entries are debug artifacts, not persisted state.

**Panel position (sticky vs. static):** The debug panel uses normal document flow (no `position: sticky`). The Exchange view is typically short enough to fit without scrolling. If the view is taller than the viewport and the user scrolls up, the panel scrolls off — acceptable for a demo debug tool.

## Review Triage Log

### 2026-07-31 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (low 2)
- defer: 9: (medium 1, low 8)
- reject: 10
- addressed_findings:
  - `[low]` `[patch]` `_redact()` deep-clone via `JSON.parse(JSON.stringify(entry))` would throw on non-serializable values and propagate as an unhandled rejection in the exchange async flow. Fixed: wrapped in try/catch; on failure falls back to a safe sentinel entry retaining step/method/url/status.
  - `[low]` `[patch]` HTML entity mismatch: `render()` used `&#9660;`/`&#9654;` (HTML entities) while the toggle click handler used literal `▼`/`►` characters. Fixed: `render()` now uses the same literal characters as the click handler.

## Auto Run Result

**Summary:** Implemented the DebugModule for Story 4.4 — a collapsible debug panel docked to the bottom of the Exchange view that logs full HTTP request/response details for all 9+ fetch call sites across the 4 exchange steps. Client secrets are redacted per NFR-7; access tokens removed from response bodies.

**Files changed:**
- `app.html` — Added DebugModule (75 lines replacing a 2-line stub), 15 CSS rules, `DebugModule.render()` call in `renderExchange()`, toggle handler in `bindExchangeEvents()`, and `reqData`/`appendEntry` instrumentation at all 9 call sites across 4 ExchangeModule steps.
- `_bmad-output/implementation-artifacts/spec-4-4-debug-panel.md` — Spec created and tracked.

**Review findings breakdown:**
- Patches applied: 2 (low)
- Items deferred: 9 (PII retention in reqData2 body, unbounded entries array, no exchange boundary, no clear method, max-height CSS animation, no opt-in flag, refresh_token not stripped, step-4 catch has no appendEntry, non-JSON 200 response has no appendEntry)
- Items rejected: 10

**Follow-up review recommendation:** false — only 2 low-severity localized patches applied; no security, behavior, or API-surface changes.

**Verification performed:**
- Read all 8 changed sections in app.html and verified exact placement
- Confirmed `reqData` capture before each fetch; `appendEntry` at error and success paths in all 4 steps
- Confirmed `DebugModule.render()` inserted before final `</div>` of `.view-container` in `renderExchange()`
- Confirmed toggle handler uses DOM class toggle (not `showView`)
- Confirmed `#debug-panel-body` always rendered (not conditionally) so `appendEntry` DOM updates always find the element

**Residual risks:**
- Step-4 network throws (CORS, abort) produce no debug entry (deferred)
- Bearer tokens (systemToken, memberToken) visible in request headers by design
- Entries accumulate unbounded across sessions (deferred)

## Verification

**Manual checks:**
- Open Exchange view → debug panel visible at bottom, collapsed, count shows 0
- Click panel header → expands; click again → collapses
- Navigate to Previous Payers → no debug panel; return to Exchange → panel state preserved
- Run a full exchange → count increments with each step; after completion shows 2-11 entries
- Expand step 1 entry → see POST request to tokenUrl, response with status 200, no access_token in body
- If payer uses client_secret_post → confirm `client_secret=` value is truncated in request body
- Failed exchange (wrong credentials) → red status in step 1 entry
