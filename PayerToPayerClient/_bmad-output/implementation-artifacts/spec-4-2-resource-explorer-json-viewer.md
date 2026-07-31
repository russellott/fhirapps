---
title: 'Story 4.2: Resource Explorer & JSON Viewer'
type: 'feature'
created: '2026-07-31'
status: 'done'
baseline_revision: '8ced22ff6e307a3f94e9a7746f14fe8b9838ae2f'
review_loop_iteration: 0
followup_review_recommended: false
final_revision: 'pending'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
---

<intent-contract>

## Intent

**Problem:** The Results view shows stat cards but `#results-explorer-panel` is an empty div; users cannot inspect individual FHIR resources or view raw JSON after a completed exchange.

**Approach:** Add `UIModule.renderResourceExplorer(result, activeType)` which renders an 8-tab bar (disabled for zero-count types) and a JSON viewer with Prev/Next navigation. Add `UIModule.highlightJson(str)` for syntax coloring. Wire explorer tabs, Prev/Next buttons, Copy button, and keyboard ← → navigation in `bindResultsEvents()`. Update `renderResults()` to set `_resultsActiveTab` and `_resultsActiveIndex` when deriving the default (amending the Story 4.1 "no state mutation in render" approach). Add `_resultsActiveIndex` and `_resultsKeyHandler` to UIModule state.

## Boundaries & Constraints

**Always:**
- Add `_resultsActiveIndex: 0` and `_resultsKeyHandler: null` to UIModule state (after `_resultsActiveTab: null`).
- Amend `renderResults()`: when deriving the default `activeType` (null-path), also set `UIModule._resultsActiveTab = activeType` and `UIModule._resultsActiveIndex = 0`. This ensures state is initialized before `bindResultsEvents()` runs.
- Replace the `html += '<div id="results-explorer-panel"></div>';` line in `renderResults()` with `html += UIModule.renderResourceExplorer(result, activeType);`.
- Amend the stat card click handler in `bindResultsEvents()` to add `UIModule._resultsActiveIndex = 0;` before `UIModule.showView('results')`.
- Add to `showView()` (after the existing nav sync block): if `name !== 'results'` and `UIModule._resultsKeyHandler` is non-null, remove the listener and set `_resultsKeyHandler = null`.
- `UIModule.renderResourceExplorer(result, activeType)` — returns HTML string. Renders: (a) `<div class="explorer-tab-bar">` with 8 `.explorer-tab` buttons, active class on `activeType`, `disabled` attribute on zero-count types, `data-type` on each; (b) `<div class="explorer-content">` — if `activeResult.count === 0` show `<p class="explorer-zero">No {activeType} resources returned by this Previous Payer.</p>`; else show nav bar (`#explorer-prev-btn` disabled when index=0; `#explorer-next-btn` disabled when index=last; center count span `{currentIndex+1} of {total}`), then `<div class="json-viewer-wrap">` containing `#json-copy-btn` button and `<pre id="json-viewer-pre" class="json-viewer">` with `UIModule.highlightJson(JSON.stringify(resource, null, 2))`. Resource is `entry.resource || entry` where `entry = entries[clampedIndex]`.
- `currentIndex` computation in `renderResourceExplorer`: `Math.max(0, Math.min(UIModule._resultsActiveIndex, entries.length - 1))`.
- `UIModule.highlightJson(str)` — takes a raw JSON string (unescaped). First HTML-escape `&`, `<`, `>`. Then apply regex replacement for JSON tokens: keys (quoted string followed by `:`) → `<span class="json-key">`; strings → `<span class="json-str">`; numbers → `<span class="json-num">`; `true`/`false` → `<span class="json-bool">`; `null` → `<span class="json-null">`. Use the standard JSON syntax regex: `/"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g`. Classification: starts with `"` and ends with `:` → key; starts with `"` without trailing `:` → str; `true`|`false` → bool; `null` → null; else → num.
- Explorer tab clicks in `bindResultsEvents()`: query `.explorer-tab:not([disabled])` elements; add click handler: `UIModule._resultsActiveTab = tab.dataset.type; UIModule._resultsActiveIndex = 0; UIModule.showView('results')`. Use `forEach`.
- Prev button in `bindResultsEvents()`: `UIModule._resultsActiveIndex = Math.max(0, UIModule._resultsActiveIndex - 1); UIModule.showView('results')`.
- Next button in `bindResultsEvents()`: find active result from `ExchangeModule._result`; `UIModule._resultsActiveIndex = Math.min(activeResult.entries.length - 1, UIModule._resultsActiveIndex + 1); UIModule.showView('results')`. Null-guard the result/activeResult lookup.
- Copy button in `bindResultsEvents()` (`#json-copy-btn`): `navigator.clipboard.writeText(pre.textContent)` where `pre = document.getElementById('json-viewer-pre')`. On promise resolve: `btn.textContent = 'Copied!'`; `setTimeout` 1500ms → `btn.textContent = 'Copy'`. Null-guard both elements.
- Keyboard handler in `bindResultsEvents()`: remove prior `_resultsKeyHandler` if non-null; create new handler; register on `document`. Handler: if `UIModule.currentView !== 'results'` return; if `e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'` return; find active result from `ExchangeModule._result`; `ArrowLeft` → decrement if index > 0, `ArrowRight` → increment if index < total-1; call `UIModule.showView('results')` on change.
- CSS additions (in `<style>` block after `.stat-card-type` rule): `.explorer-tab-bar`, `.explorer-tab`, `.explorer-tab.active`, `.explorer-tab:hover:not(.active):not([disabled])`, `.explorer-tab[disabled]`, `.explorer-content`, `.explorer-nav`, `.explorer-nav-count`, `.explorer-zero`, `.json-viewer-wrap`, `.json-copy-btn`, `.json-copy-btn:hover`, `.json-viewer`, `.json-key`, `.json-str`, `.json-num`, `.json-bool`, `.json-null` — specs in Design Notes.
- DOM mutation rule (AD-2): all HTML built as string literals, assigned atomically via `innerHTML`. No `createElement`/`appendChild`.

**Block If:** None — all decisions fully specified.

**Never:**
- Do not implement the NDJSON download (Story 4.3)
- Do not implement the Debug Panel (Story 4.4)
- Do not write to `localStorage`/`sessionStorage` for resource state (AD-3)
- Do not call `ExchangeModule` or `ConfigModule` from `ResultsModule` (AD-13); `ResultsModule` remains an empty stub
- Do not use `innerHTML` on the `<pre>` for the copy operation — use `pre.textContent` to get the raw JSON

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Active type has resources | `entries.length > 0`, `_resultsActiveIndex = 0` | First resource shown, "1 of N" label, Prev disabled, Next enabled if N>1 | — |
| Active type is zero-count | `count === 0` for activeType | Zero-state message, no nav bar, no JSON viewer | — |
| Navigate to last resource | Prev/Next clicks to index = total-1 | "N of N" label, Next button disabled | — |
| Keyboard ← at index 0 | ArrowLeft | No change (guard: `index > 0`) | — |
| Keyboard → at last | ArrowRight | No change (guard: `index < total-1`) | — |
| Copy button clicked | JSON viewer has content | Clipboard receives raw JSON, button shows "Copied!" for 1.5s | Clipboard API failure silently no-ops |
| Explorer tab click on zero-count type | Tab with `disabled` attr | Click does not fire (HTML `disabled` attribute on `<button>`) | — |
| Explorer tab click on non-zero type | Click on `.explorer-tab:not([disabled])` | Active type changes, index resets to 0, view re-renders | — |
| `_resultsActiveIndex` out-of-bounds | Index set beyond entries.length-1 by stale state | Clamped to `Math.min(entries.length-1, index)` in renderResourceExplorer | — |

</intent-contract>

## Code Map

- `app.html` UIModule state — add `_resultsActiveIndex: 0`, `_resultsKeyHandler: null`
- `app.html` UIModule.renderResults — amend null-path to set `_resultsActiveTab` and `_resultsActiveIndex`; replace empty explorer panel div with `renderResourceExplorer()` call
- `app.html` UIModule.renderResourceExplorer — new method (tab bar + content: zero-state OR nav+JSON viewer)
- `app.html` UIModule.highlightJson — new method (JSON string → syntax-highlighted HTML)
- `app.html` UIModule.bindResultsEvents — add explorer tab, prev/next, copy, keyboard handlers; reset `_resultsActiveIndex` in stat card handler
- `app.html` UIModule.showView — add keyboard handler cleanup when leaving results view
- `app.html` `<style>` — explorer tab bar, content, nav, JSON viewer, and syntax color CSS

## Tasks & Acceptance

**Execution:**

- [x] `app.html` UIModule state — Add after `_resultsActiveTab: null,`:
  ```js
  _resultsActiveIndex: 0,
  _resultsKeyHandler: null,
  ```

- [x] `app.html` UIModule.renderResults — Amend the null-path block from:
  ```js
  if (!activeType) {
    var firstNonEmpty = result.resourceResults.find(function(r) { return r.count > 0; });
    activeType = firstNonEmpty ? firstNonEmpty.resourceType : result.resourceResults[0].resourceType;
  }
  ```
  to:
  ```js
  if (!activeType) {
    var firstNonEmpty = result.resourceResults.find(function(r) { return r.count > 0; });
    activeType = firstNonEmpty ? firstNonEmpty.resourceType : result.resourceResults[0].resourceType;
    UIModule._resultsActiveTab = activeType;
    UIModule._resultsActiveIndex = 0;
  }
  ```

- [x] `app.html` UIModule.renderResults — Replace `html += '<div id="results-explorer-panel"></div>';` with `html += UIModule.renderResourceExplorer(result, activeType);`

- [x] `app.html` UIModule.renderResourceExplorer — Add new method after `renderResults`:
  ```js
  renderResourceExplorer: function(result, activeType) {
    var html = '';
    html += '<div class="explorer-tab-bar">';
    result.resourceResults.forEach(function(r) {
      var isActive = r.resourceType === activeType;
      html += '<button class="explorer-tab' + (isActive ? ' active' : '') + '"';
      if (r.count === 0) { html += ' disabled'; }
      html += ' data-type="' + UIModule.escapeHtml(r.resourceType) + '">';
      html += UIModule.escapeHtml(r.resourceType);
      html += '</button>';
    });
    html += '</div>';
    html += '<div class="explorer-content">';
    var activeResult = result.resourceResults.find(function(r) { return r.resourceType === activeType; });
    if (!activeResult || activeResult.count === 0) {
      html += '<p class="explorer-zero">No ' + UIModule.escapeHtml(activeType || '') + ' resources returned by this Previous Payer.</p>';
    } else {
      var entries = activeResult.entries;
      var currentIndex = Math.max(0, Math.min(UIModule._resultsActiveIndex, entries.length - 1));
      var total = entries.length;
      var entry = entries[currentIndex];
      var resource = (entry && entry.resource) ? entry.resource : entry;
      html += '<div class="explorer-nav">';
      html += '<button id="explorer-prev-btn" class="btn btn-secondary" type="button"' + (currentIndex === 0 ? ' disabled' : '') + '>&#8592; Prev</button>';
      html += '<span class="explorer-nav-count">' + (currentIndex + 1) + ' of ' + total + '</span>';
      html += '<button id="explorer-next-btn" class="btn btn-secondary" type="button"' + (currentIndex === total - 1 ? ' disabled' : '') + '>Next &#8594;</button>';
      html += '</div>';
      html += '<div class="json-viewer-wrap">';
      html += '<button id="json-copy-btn" class="json-copy-btn" type="button">Copy</button>';
      html += '<pre id="json-viewer-pre" class="json-viewer">' + UIModule.highlightJson(JSON.stringify(resource, null, 2)) + '</pre>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  },
  ```

- [x] `app.html` UIModule.highlightJson — Add new method after `escapeHtml`:
  ```js
  highlightJson: function(str) {
    var escaped = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
      var cls = 'json-num';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-str';
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  },
  ```

- [x] `app.html` UIModule.bindResultsEvents — In the stat card click handler, add `UIModule._resultsActiveIndex = 0;` before `UIModule.showView('results')`:
  ```js
  statCards.forEach(function(card) {
    card.addEventListener('click', function() {
      UIModule._resultsActiveTab = card.dataset.type || null;
      UIModule._resultsActiveIndex = 0;
      UIModule.showView('results');
    });
  });
  ```

- [x] `app.html` UIModule.bindResultsEvents — After stat card handlers, add explorer tab, nav, copy, and keyboard handlers:
  ```js
  var explorerTabs = document.querySelectorAll('.explorer-tab:not([disabled])');
  explorerTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      UIModule._resultsActiveTab = tab.dataset.type;
      UIModule._resultsActiveIndex = 0;
      UIModule.showView('results');
    });
  });

  var prevBtn = document.getElementById('explorer-prev-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      UIModule._resultsActiveIndex = Math.max(0, UIModule._resultsActiveIndex - 1);
      UIModule.showView('results');
    });
  }

  var nextBtn = document.getElementById('explorer-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      var result = ExchangeModule._result;
      if (!result) return;
      var activeResult = result.resourceResults.find(function(r) { return r.resourceType === UIModule._resultsActiveTab; });
      if (!activeResult) return;
      UIModule._resultsActiveIndex = Math.min(activeResult.entries.length - 1, UIModule._resultsActiveIndex + 1);
      UIModule.showView('results');
    });
  }

  var copyBtn = document.getElementById('json-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      var pre = document.getElementById('json-viewer-pre');
      if (!pre) return;
      navigator.clipboard.writeText(pre.textContent).then(function() {
        copyBtn.textContent = 'Copied!';
        setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1500);
      });
    });
  }

  if (UIModule._resultsKeyHandler) {
    document.removeEventListener('keydown', UIModule._resultsKeyHandler);
  }
  UIModule._resultsKeyHandler = function(e) {
    if (UIModule.currentView !== 'results') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    var result = ExchangeModule._result;
    if (!result) return;
    var activeResult = result.resourceResults.find(function(r) { return r.resourceType === UIModule._resultsActiveTab; });
    if (!activeResult || activeResult.count === 0) return;
    var total = activeResult.entries.length;
    if (e.key === 'ArrowLeft' && UIModule._resultsActiveIndex > 0) {
      UIModule._resultsActiveIndex--;
      UIModule.showView('results');
    } else if (e.key === 'ArrowRight' && UIModule._resultsActiveIndex < total - 1) {
      UIModule._resultsActiveIndex++;
      UIModule.showView('results');
    }
  };
  document.addEventListener('keydown', UIModule._resultsKeyHandler);
  ```

- [x] `app.html` UIModule.showView — After the existing nav sync block, add keyboard handler cleanup:
  ```js
  if (name !== 'results' && UIModule._resultsKeyHandler) {
    document.removeEventListener('keydown', UIModule._resultsKeyHandler);
    UIModule._resultsKeyHandler = null;
  }
  ```

- [x] `app.html` `<style>` — Add after `.stat-card-type` rule:
  ```css
  .explorer-tab-bar { display: flex; flex-wrap: wrap; border-bottom: 1px solid var(--color-border); margin-top: 16px; }
  .explorer-tab { background: none; border: none; border-bottom: 2px solid transparent; padding: 8px 12px; font-size: 12px; font-weight: 500; cursor: pointer; color: var(--color-text-secondary); margin-bottom: -1px; white-space: nowrap; }
  .explorer-tab.active { border-bottom-color: var(--color-primary); color: var(--color-primary); }
  .explorer-tab:hover:not(.active):not([disabled]) { color: var(--color-text-primary); }
  .explorer-tab[disabled] { opacity: 0.4; cursor: not-allowed; }
  .explorer-content { margin-top: 12px; }
  .explorer-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .explorer-nav-count { font-size: 13px; color: var(--color-text-secondary); flex: 1; text-align: center; }
  .explorer-zero { font-size: 14px; color: var(--color-text-secondary); padding: 24px 0; }
  .json-viewer-wrap { position: relative; }
  .json-copy-btn { position: absolute; top: 8px; right: 8px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; color: var(--color-text-secondary); }
  .json-copy-btn:hover { background: var(--color-surface-alt); }
  .json-viewer { background: var(--color-surface-alt); border-radius: 12px; padding: 16px; font-family: monospace; font-size: 0.8rem; max-height: 480px; overflow-y: auto; white-space: pre; margin: 0; line-height: 1.4; }
  .json-key { color: #17b3b3; }
  .json-str { color: #22863a; }
  .json-num { color: #005cc5; }
  .json-bool { color: #e36209; }
  .json-null { color: #e36209; }
  ```

**Acceptance Criteria:**
- Given results are open with a type that has resources, then a tab bar of 8 tabs appears, the active type's tab has a primary underline, and zero-count type tabs are visually dimmed and unclickable
- Given clicking a non-zero explorer tab, then the view re-renders with that type active, index resets to 0, and "1 of N" is shown
- Given navigating with Prev/Next, then the resource index changes by 1, the count label updates, and the JSON viewer shows the new resource's raw JSON
- Given the user is at the first resource, then the Prev button is disabled; at the last, the Next button is disabled
- Given a zero-count type is active, then "No {ResourceType} resources returned by this Previous Payer." appears with no nav bar or JSON viewer
- Given the Copy button is clicked, then the clipboard receives the raw JSON string and the button label changes to "Copied!" for 1.5 s then reverts to "Copy"
- Given the ← key is pressed while viewing results with index > 0, then the index decrements and the viewer updates
- Given the ← key is pressed while viewing results with index = 0, then nothing happens
- Given the → key is pressed while the user is typing in an input or textarea, then arrow key navigation does not fire

## Design Notes

**`_resultsActiveTab` set in renderResults():** Story 4.1 explicitly deferred this write-back, noting that downstream stories (4.2) would need it. Story 4.2 adopts the write-back: when `_resultsActiveTab` is null, `renderResults()` derives and sets it alongside `_resultsActiveIndex = 0`. This ensures `bindResultsEvents()` always operates on a non-null `_resultsActiveTab`.

**`highlightJson` operates on HTML-escaped input:** The method first HTML-escapes the raw JSON string, then applies regex to the escaped form. The regex matches quoted strings (which may contain `&amp;` etc.), but since FHIR field names and string values typically don't contain `<`, `>`, or `&` in practice, this ordering is safe and avoids double-escaping issues.

**JSON viewer uses `var(--color-surface-alt)`:** The architecture spec says `#f8fafb` but that's a specific hex. Using `--color-surface-alt` (`#f8fafc` light / `#1e2d40` dark) gives correct dark-mode behavior without additional CSS overrides.

**Keyboard handler cleanup:** The `_resultsKeyHandler` is registered once per `bindResultsEvents()` call and unregistered in `showView()` when navigating away. This prevents handler accumulation across view transitions.

## Review Triage Log

### 2026-07-31 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3: (low 3)
- defer: 2: (low 2)
- reject: 12
- addressed_findings:
  - `[low]` `[patch]` `activeResult.entries` not null-guarded — could be undefined when count > 0 or entries is empty array. Fixed: `|| []` fallback + empty-array check in `renderResourceExplorer`; `!activeResult.entries` guard added to Next handler and keyboard handler.
  - `[low]` `[patch]` `navigator.clipboard` not checked before use — may be undefined in HTTP / sandboxed contexts. Fixed: `if (!pre || !navigator.clipboard) return;` guard + `.catch(function() {})` on clipboard promise.
  - `[low]` `[patch]` Keyboard handler did not exclude SELECT or contenteditable elements — arrow keys would trigger resource navigation while operating a select dropdown. Fixed: extended guard to include `e.target.tagName === 'SELECT' || e.target.isContentEditable`.

## Verification

**Manual checks:**
- Complete a full exchange; navigate to Results → explorer tab bar shows 8 tabs; active tab has teal underline
- Click a non-zero tab → viewer updates to show that resource type, index resets to "1 of N"
- Click Next/Prev → count label advances; Prev disables at index 0, Next disables at last
- Click Copy → clipboard has raw JSON; button shows "Copied!" then reverts
- Press → / ← arrow keys → same behavior as Next/Prev
- Click a zero-count tab → tab is unclickable (disabled); zero-state message appears if forced as activeType
- Dark mode: JSON viewer background is dark, syntax colors remain as specified
