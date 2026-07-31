---
title: 'Story 4.3: NDJSON Download'
type: 'feature'
created: '2026-07-31'
status: 'done'
final_revision: '0f7b74f'
baseline_revision: 'e37f2f5357449f52374379b46ed58b9b57c196d2'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
---

<intent-contract>

## Intent

**Problem:** The "Download NDJSON" button in the Results view is a non-functional primary CTA — clicking it silently does nothing, giving users zero feedback and no way to export retrieved resources.

**Approach:** Implement `ResultsModule.generateNdjson(result)` and `ResultsModule.getFilename(result)`, then wire the `#results-download-ndjson-btn` click handler in `UIModule.bindResultsEvents()` to build a Blob and trigger a browser file download.

## Boundaries & Constraints

**Always:**
- Replace the `const ResultsModule = {};` stub (line 800, with its preceding stale comment) with a full object containing two methods: `generateNdjson(result)` and `getFilename(result)`.
- `ResultsModule.generateNdjson(result)` — iterates `result.resourceResults`; for each entry where `r.count > 0 && r.entries` is truthy, iterates entries and pushes `JSON.stringify(entry.resource || entry)` to a `lines` array; returns `lines.join('\n')`. Zero-count types contribute zero lines.
- `ResultsModule.getFilename(result)` — derives filename from `result.payer.name`, `result.member.lastName`, `result.member.firstName`, `result.date`. Replace `\s+` with `-` in each name part. Format: `{payerName}_{lastName}-{firstName}_{date}.ndjson`. Guard each field with fallback: `payer.name || 'payer'`, `member.lastName || 'unknown'`, `member.firstName || 'unknown'`, `result.date || ''`.
- In `UIModule.bindResultsEvents()`, add handler for `#results-download-ndjson-btn` click: read `ExchangeModule._result`; if null return. Call `ResultsModule.generateNdjson(result)` and `ResultsModule.getFilename(result)`. Create a `Blob([ndjson], { type: 'application/x-ndjson' })`, call `URL.createObjectURL(blob)`. Use `document.createElement('a')` (the explicit AD-2 exception for download anchor), set `a.href = url`, `a.download = filename`, `document.body.appendChild(a)`, `a.click()`, `document.body.removeChild(a)`, `URL.revokeObjectURL(url)`.
- `ResultsModule` never calls `ExchangeModule` or `ConfigModule` directly (AD-13); all data arrives as arguments.

**Block If:** None — all decisions fully specified.

**Never:**
- Do not add `disabled` attribute to the NDJSON button — it is always enabled when the Results view is visible (which already requires `ExchangeModule.hasResult()`)
- Do not use `createElement`/`appendChild` anywhere other than the download anchor
- Do not write NDJSON to `localStorage` or `sessionStorage` (FR-23)
- Do not implement DebugModule (Story 4.4)
- Do not add a progress indicator or spinner — the Blob is always small enough to generate synchronously

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Exchange with mixed results | `result.resourceResults` with some count > 0, some = 0 | NDJSON has one line per resource across non-empty types; zero-count types omitted | — |
| All zero counts | All `count === 0` | NDJSON is empty string; file downloads with 0 bytes | — |
| `r.entries` undefined for non-zero type | `r.count > 0` but `r.entries` absent | Type skipped (guarded by `r.count > 0 && r.entries`) | — |
| Payer name with spaces | `payer.name = "Blue Cross"` | Filename segment becomes `Blue-Cross` | — |
| Payer/member name missing | `payer.name` undefined | Uses fallback `payer` / `unknown` | — |
| Entry has no `.resource` wrapper | `entry = { id: '...', resourceType: '...' }` | Uses `entry` directly via `entry.resource \|\| entry` | — |

</intent-contract>

## Code Map

- `app.html` ResultsModule stub (line 799-800) — expand from `{}` to full object with `generateNdjson` and `getFilename`
- `app.html` UIModule.bindResultsEvents — add `#results-download-ndjson-btn` click handler

## Tasks & Acceptance

**Execution:**

- [x] `app.html` ResultsModule — Replace stub (lines 799-800, including the stale comment) with:
  ```js
  const ResultsModule = {
    generateNdjson: function(result) {
      var lines = [];
      result.resourceResults.forEach(function(r) {
        if (r.count > 0 && r.entries) {
          r.entries.forEach(function(entry) {
            lines.push(JSON.stringify(entry && entry.resource ? entry.resource : entry));
          });
        }
      });
      return lines.join('\n');
    },
    getFilename: function(result) {
      var payer = result.payer || {};
      var member = result.member || {};
      var payerName = (payer.name || 'payer').replace(/\s+/g, '-');
      var lastName = (member.lastName || 'unknown').replace(/\s+/g, '-');
      var firstName = (member.firstName || 'unknown').replace(/\s+/g, '-');
      return payerName + '_' + lastName + '-' + firstName + '_' + (result.date || '') + '.ndjson';
    }
  };
  ```

- [x] `app.html` UIModule.bindResultsEvents — After the existing stat card handler block, add:
  ```js
  var downloadBtn = document.getElementById('results-download-ndjson-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      var result = ExchangeModule._result;
      if (!result) return;
      var ndjson = ResultsModule.generateNdjson(result);
      var filename = ResultsModule.getFilename(result);
      var blob = new Blob([ndjson], { type: 'application/x-ndjson' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
  ```

**Acceptance Criteria:**
- Given results are open after a completed exchange, when the Download NDJSON button is clicked, then a file download begins
- Given the downloaded file is opened, then it contains one JSON object per line for each resource across all non-empty resource types
- Given the exchange had resources of types A, B, C with counts 3, 0, 2, then the NDJSON has 5 lines (types A and C only)
- Given the payer name is "Blue Cross" and member is "Jane Doe", then the filename is `Blue-Cross_Doe-Jane_{YYYY-MM-DD}.ndjson`
- Given the payer name contains no spaces, then the filename is unchanged
- Given all resource types returned zero results, then the download produces an empty file

## Review Triage Log

### 2026-07-31 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3: (low 3)
- defer: 2: (low 2)
- reject: 10
- addressed_findings:
  - `[low]` `[patch]` Filename sanitization only replaced whitespace; payer/member names with `/\:*?"<>|` would produce invalid filesystem names. Fixed: replaced `.replace(/\s+/g, '-')` with a `sanitize()` helper using `[\\/:*?"<>|\s]+` regex plus leading/trailing dash trim.
  - `[low]` `[patch]` `result.resourceResults` not guarded in `generateNdjson` — TypeError if absent. Fixed: added `if (!result || !result.resourceResults) return '';` guard.
  - `[low]` `[patch]` Null `entry` in entries array would write literal `"null"` as a NDJSON line. Fixed: added `if (entry == null) return;` guard inside inner forEach.

## Design Notes

**`createElement` exception:** The download anchor is the only allowed use of `document.createElement` in this codebase (explicit carve-out in the project architecture). The append/click/remove pattern is required because Firefox ignores `.click()` on detached elements.

**MIME type:** `application/x-ndjson` is the registered but unofficial type for newline-delimited JSON. Browsers will treat it as a download (not displayed inline) which is the desired behavior.

**ResultsModule ownership:** `ResultsModule` receives the full result object as an argument from `UIModule.bindResultsEvents()` — it never reads `ExchangeModule._result` directly. This keeps the module boundary clean per AD-13.

## Verification

**Manual checks:**
- Complete a full exchange; click Download NDJSON → browser downloads a `.ndjson` file with the correct filename
- Open the file — each line is a valid JSON object; lines equal the total resource count across non-empty types
- Payer/member name spaces become hyphens in the filename
- Date in filename matches the exchange run date (YYYY-MM-DD)
