---
title: 'Story 1.6: Config Export & Import'
type: 'feature'
created: '2026-07-30'
status: 'done'
baseline_revision: 'a50d6db13e9cd41399f36cef787a6ce733b39226'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<intent-contract>

## Intent

**Problem:** There is no way to back up or restore the full P2P configuration. Users who seed payers manually have no portable representation, and there is no way to share a pre-configured state across machines or sessions.

**Approach:** Add Export and Import buttons to the Settings drawer (as a new "Config File" section below the CORS Proxy URL field). Export triggers an immediate download of the full config as `p2p-config.json` (pretty-printed JSON) and shows an inline "Config file downloaded." message. Import accepts a `.json` file, validates its shape, shows an inline confirm area with summary and warning text, and on confirmation replaces the entire stored config. All UI is inline in the drawer — no toasts, no browser dialogs.

## Boundaries & Constraints

**Always:**
- Export and Import live in the Settings drawer, in a new section below the CORS Proxy URL field, separated by a `.drawer-section-title` label "Config File"
- Export: clicking "Download Config" creates a temporary `<a>` element programmatically, sets `download="p2p-config.json"` and `href` to a `URL.createObjectURL()` blob, clicks it, removes it, revokes the URL, then shows "Config file downloaded." in `#export-feedback` — the feedback persists until the drawer is closed (no timer dismiss)
- The programmatic `<a>` creation for download is an intentional exception to the innerHTML rule: it is a transient utility operation (< 1ms in DOM, never visible), not a rendering mutation. No other `createElement` is used in this story.
- Import: `<input type="file" id="settings-import-file" accept=".json" style="display:none">` is in the drawer HTML; a visible "Load Config File" button (`id="settings-import-btn"`) triggers it via `.click()`
- After file selection: use `FileReader.readAsText()` (async) in the `change` handler; reset `e.target.value = ''` after capturing the `File` reference so the same file can be re-selected
- Validation: parse JSON, then check `Array.isArray(parsed.previousPayers)`. If either fails: show error message in `#import-error`, do NOT show confirm area
- If valid: populate `#import-summary` text, store parsed config in `UIModule._importPendingConfig`, show `#import-confirm-area` (set `style.display = ''`), hide `#import-error`
- Summary text (exact): `"This file contains {n} Previous Payer(s) with {m} total member(s)."` — where `{n}` = `parsed.previousPayers.length`, `{m}` = sum of each entry's `roster.length` (default 0 if `roster` is missing or not an Array); use singular forms only when count is 1 (e.g., "1 Previous Payer", "1 total member", otherwise plural "N Previous Payers", "M total members")
- Warning text (exact, static in HTML): `"This will replace your current configuration. All existing Previous Payers and Rosters will be overwritten. Continue?"`
- Replace button: call `ConfigModule.saveConfig(UIModule._importPendingConfig)`, set `UIModule._importPendingConfig = null`, call `UIModule.closeSettings()`, then `UIModule.showView('previous-payers')`, then `UIModule.updateNewPayerChip()`
- Cancel button: set `UIModule._importPendingConfig = null`, hide `#import-confirm-area`, reset `#settings-import-file` value to `''`
- `closeSettings()`: add `UIModule._importPendingConfig = null` to ensure stale import state is always cleared on close
- `UIModule.escapeHtml()` is NOT needed for the export/import UI — no user-controlled values are placed in HTML attributes; `summaryEl.textContent = msg` is safe

**Block If:** None — all decisions fully specified.

**Never:**
- No `window.confirm()`, `window.alert()`, or `window.prompt()`
- No toast / snack-bar / positioned notification — inline feedback only
- Do not merge imported config with existing config — replace entirely
- Do not validate beyond `Array.isArray(parsed.previousPayers)` — deeper shape validation is out of scope
- Do not close the drawer on export — only on import Replace

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Click "Download Config" | Any config state | `p2p-config.json` download triggers; "Config file downloaded." appears below button | — |
| Download with empty payers | `previousPayers: []` | Downloads valid JSON with empty array; summary on re-import: "0 Previous Payers with 0 total members." | — |
| Click "Load Config File" | — | OS file picker opens; `accept=".json"` filter applied | — |
| Select a valid .json file | File parses, has `previousPayers` array | Summary text and warning shown; Replace/Cancel buttons shown | — |
| Select an invalid JSON file | File does not parse | `#import-error` shows "Invalid JSON file. Please check the format."; confirm area hidden | — |
| Select JSON missing `previousPayers` | Parses but no array at root | `#import-error` shows "Invalid config file. Expected a previousPayers array."; confirm area hidden | — |
| Click Replace | Valid `_importPendingConfig` | Config saved; drawer closes; Previous Payers view re-renders; chip updates | — |
| Click Cancel | After valid file loaded | `_importPendingConfig = null`; confirm area hidden; file input reset | — |
| Open drawer again after import | Any | Drawer renders fresh; no stale import state | closeSettings clears `_importPendingConfig` |
| Re-select same file after Cancel | Same file picked again | `e.target.value = ''` reset ensures `change` fires again | — |
| Payer has no roster field | `p.roster` is undefined | Member count treated as 0 for that payer | — |

</intent-contract>

## Code Map

- `app.html` `<style>` — add `.export-feedback`, `.import-summary`, `.import-warning`, `.import-confirm-actions`, `.import-error` CSS classes
- `app.html` UIModule — add `_importPendingConfig: null` property
- `app.html` UIModule.showSettings() — extend drawer HTML to add Config File section; extend event wiring to add export, import-trigger, file-change, replace, and cancel handlers
- `app.html` UIModule.closeSettings() — add `UIModule._importPendingConfig = null`

## Tasks & Acceptance

**Execution:**

- [ ] `app.html` CSS — Add to `<style>` block (after the drawer/settings CSS from Story 1.3):
  ```css
  .export-feedback { font-size: 13px; color: var(--color-success); margin-top: 6px; }
  .import-error { font-size: 13px; color: var(--color-error); margin-top: 6px; }
  .import-summary { font-size: 13px; color: var(--color-text-primary); margin: 8px 0 4px; }
  .import-warning { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px; }
  .import-confirm-actions { display: flex; gap: 8px; }
  ```

- [ ] `app.html` UIModule — Add `_importPendingConfig: null,` property alongside the other UIModule state properties (`currentView`, `_settingsKeyHandler`, etc.)

- [ ] `app.html` UIModule.showSettings() — Insert the following HTML after the CORS Proxy URL `</div>` and before the closing `</div>` of `.drawer-body`:
  ```js
  html += '<div class="drawer-section-title" style="margin-top:8px">Config File</div>';
  html += '<div class="settings-field">';
  html += '<label class="settings-label">Export</label>';
  html += '<div>';
  html += '<button id="settings-export-btn" class="btn btn-secondary" type="button">Download Config</button>';
  html += '<div id="export-feedback" class="export-feedback" style="display:none">Config file downloaded.</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="settings-field">';
  html += '<label class="settings-label">Import</label>';
  html += '<div>';
  html += '<input type="file" id="settings-import-file" accept=".json" style="display:none">';
  html += '<button id="settings-import-btn" class="btn btn-secondary" type="button">Load Config File</button>';
  html += '<div id="import-error" class="import-error" style="display:none"></div>';
  html += '<div id="import-confirm-area" style="display:none">';
  html += '<p id="import-summary" class="import-summary"></p>';
  html += '<p class="import-warning">This will replace your current configuration. All existing Previous Payers and Rosters will be overwritten. Continue?</p>';
  html += '<div class="import-confirm-actions">';
  html += '<button id="import-cancel-btn" class="btn btn-secondary" type="button">Cancel</button>';
  html += '<button id="import-replace-btn" class="btn btn-danger" type="button">Replace</button>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  ```

- [ ] `app.html` UIModule.showSettings() — Add the following event handlers after the existing `document.getElementById('settings-save').addEventListener(...)` block (before `UIModule._backdropClickHandler = ...`):

  ```js
  // Export
  document.getElementById('settings-export-btn').addEventListener('click', function() {
    var config = ConfigModule.getConfig() || {};
    var blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'p2p-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    var feedback = document.getElementById('export-feedback');
    if (feedback) { feedback.style.display = ''; }
  });

  // Import — trigger file picker
  document.getElementById('settings-import-btn').addEventListener('click', function() {
    document.getElementById('settings-import-file').click();
  });

  // Import — file selected
  document.getElementById('settings-import-file').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    var reader = new FileReader();
    reader.onload = function(evt) {
      var errorEl = document.getElementById('import-error');
      var confirmArea = document.getElementById('import-confirm-area');
      var summaryEl = document.getElementById('import-summary');
      errorEl.style.display = 'none';
      confirmArea.style.display = 'none';
      var parsed;
      try {
        parsed = JSON.parse(evt.target.result);
      } catch (err) {
        errorEl.textContent = 'Invalid JSON file. Please check the format.';
        errorEl.style.display = '';
        return;
      }
      if (!parsed || !Array.isArray(parsed.previousPayers)) {
        errorEl.textContent = 'Invalid config file. Expected a previousPayers array.';
        errorEl.style.display = '';
        return;
      }
      var payerCount = parsed.previousPayers.length;
      var memberCount = parsed.previousPayers.reduce(function(sum, p) {
        return sum + (Array.isArray(p.roster) ? p.roster.length : 0);
      }, 0);
      var payerLabel = payerCount === 1 ? '1 Previous Payer' : payerCount + ' Previous Payers';
      var memberLabel = memberCount === 1 ? '1 total member' : memberCount + ' total members';
      summaryEl.textContent = 'This file contains ' + payerLabel + ' with ' + memberLabel + '.';
      UIModule._importPendingConfig = parsed;
      confirmArea.style.display = '';
    };
    reader.readAsText(file);
  });

  // Import — Replace
  document.getElementById('import-replace-btn').addEventListener('click', function() {
    if (!UIModule._importPendingConfig) return;
    ConfigModule.saveConfig(UIModule._importPendingConfig);
    UIModule._importPendingConfig = null;
    UIModule.closeSettings();
    UIModule.showView('previous-payers');
    UIModule.updateNewPayerChip();
  });

  // Import — Cancel
  document.getElementById('import-cancel-btn').addEventListener('click', function() {
    UIModule._importPendingConfig = null;
    var confirmArea = document.getElementById('import-confirm-area');
    if (confirmArea) { confirmArea.style.display = 'none'; }
    var fileInput = document.getElementById('settings-import-file');
    if (fileInput) { fileInput.value = ''; }
  });
  ```

- [ ] `app.html` UIModule.closeSettings() — Add `UIModule._importPendingConfig = null;` at the start of the function body (before `var overlay = ...`):

**Acceptance Criteria:**
- Given the Settings drawer is open, when I click "Download Config", then `p2p-config.json` is downloaded via the browser and "Config file downloaded." text appears below the button
- Given there are 3 payers with a total of 7 members, when I download and re-import the file, then the summary shows "This file contains 3 Previous Payers with 7 total members."
- Given I select a valid config file, then the confirm area appears with summary text, warning text, and Cancel/Replace buttons; the "Load Config File" button remains visible
- Given I select a file that is not valid JSON, then `#import-error` shows "Invalid JSON file. Please check the format." and no confirm area appears
- Given I select a JSON file without a `previousPayers` array, then `#import-error` shows "Invalid config file. Expected a previousPayers array."
- Given the confirm area is shown, when I click Replace, then `ConfigModule.getConfig()` reflects the imported data; the drawer closes; the Previous Payers view re-renders with the imported payers; the header chip reflects the imported `newPayer.name`
- Given the confirm area is shown, when I click Cancel, then the confirm area disappears; no config change; `_importPendingConfig` is null
- Given I click Cancel then re-select the same file, then the `change` event fires again (file input was reset)
- Given I open the drawer, click "Download Config", then close and reopen the drawer, then no "Config file downloaded." text is visible (fresh render)

## Design Notes

**`createElement` exception:** The `<a download>` technique for file download requires `document.createElement('a')`. This is the only sanctioned deviation from the innerHTML rule in this codebase, and applies solely to the transient download anchor. The anchor is appended, clicked, and removed in under one tick — it is never a rendered UI element.

**Import confirm area via `style.display`:** The confirm area is pre-rendered in the drawer HTML as `style="display:none"`. After file validation, it is shown by setting `style.display = ''` and its summary text is set via `summaryEl.textContent`. This avoids re-rendering the drawer while keeping the innerHTML pattern for all initial rendering.

**`_importPendingConfig` cleared on `closeSettings()`:** The drawer innerHTML is wiped 200ms after close, so the DOM elements disappear. Clearing `_importPendingConfig` in `closeSettings()` ensures the JS state is also reset consistently even if `closeSettings()` is called via Escape or backdrop click with a pending import.

**Post-import navigation:** After Replace, we navigate to `previous-payers` so the user immediately sees the result of the import. This is the most informative recovery — the user can confirm their payers are present.

**Export file name:** `p2p-config.json` — matches the app's identity prefix used elsewhere in the codebase.

## Verification

**Manual checks:**
- Click "Download Config" → browser downloads `p2p-config.json`; "Config file downloaded." text appears; drawer stays open
- Open downloaded file in text editor → valid, pretty-printed JSON matching `ConfigModule.getConfig()`
- Click "Load Config File" → OS file picker opens with `.json` filter
- Select the downloaded file → confirm area shows with correct payer/member count; Replace/Cancel visible
- Click Replace → drawer closes; previous-payers view shows imported payers; chip shows imported name
- Click Cancel → confirm area hides; config unchanged
- Edit the JSON to remove `previousPayers`, re-import → error message shows, no confirm area
- Rename a `.txt` file to `.json` containing non-JSON → error message shows
- Zero console errors throughout

## Spec Change Log

## Review Triage Log

### 2026-07-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 1, low 0)
- defer: 1: (low 1)
- reject: 0
- addressed_findings:
  - `[medium]` `[patch]` Added missing `.drawer-section-title` CSS rule — class was intended by Story 1.3 but never defined; Story 1.6 relies on it for the "Config File" section heading
- deferred_findings:
  - `[low]` `[defer]` `FileReader.onload` callback has no null guard — if `closeSettings()` fires during async read, `getElementById` returns null and throws; race window is < 1ms for any plausible config file on this demo tool

## Auto Run Result

**Status:** done

**Summary:** Implemented Config Export & Import in the Settings drawer. Export downloads `p2p-config.json` via a programmatic anchor and shows "Config file downloaded." inline. Import uses a hidden file input + FileReader; validates JSON shape; shows summary and warning in an inline confirm area; Replace saves and navigates to previous-payers. Patch: added missing `.drawer-section-title` CSS rule.

**Files changed:**
- `PayerToPayerClient/app.html` — modified; export/import CSS, `_importPendingConfig` property, Config File drawer section HTML, export/import event handlers, `closeSettings()` state clear, `.drawer-section-title` CSS patch

**Review findings:** 1 patch applied (medium: missing `.drawer-section-title` CSS from Story 1.3). 1 deferred (FileReader null guard, low priority for demo tool).

**Follow-up review recommended:** false

**Verification:** Manual checks per spec — download config file, re-import it, confirm summary and member counts, Replace updates payer list and chip, Cancel dismisses confirm, error message on malformed JSON.

**Residual risks:** FileReader race condition (< 1ms window, extremely low practical risk for demo tool).

