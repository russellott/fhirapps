---
title: 'Story 4.1: Results View & Stat Card Row'
type: 'feature'
created: '2026-07-31'
status: 'in-review'
baseline_revision: '31fcc2f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
---

<intent-contract>

## Intent

**Problem:** The Results view is a static stub ("Run an exchange to see results."), the Results nav item is hardcoded as permanently disabled (`aria-disabled="true"`), and `ExchangeModule._result` has no exchange date for NDJSON filename generation.

**Approach:** Rewrite `renderResults()` to show the real Results view: a header with "New Exchange" and "Download NDJSON" buttons, a horizontally scrolling stat card row (8 cards, one per resource type with count), and an empty explorer placeholder div (`#results-explorer-panel`) for Story 4.2. Add `bindResultsEvents()` for card-click and button-click wiring. Add `_resultsActiveTab` to UIModule state. Sync the Results nav item on every `showView()` call. Add `date` to `ExchangeModule._result` for Story 4.3.

## Boundaries & Constraints

**Always:**
- Add `_resultsActiveTab: null` to UIModule state (after `_exchangePhase`).
- In `ExchangeModule.runExchange`, add `date: new Date().toISOString().slice(0, 10)` to the `_result` assignment (line currently reads `ExchangeModule._result = { payer, member, fhirId, resourceResults }`).
- In `ExchangeModule._showPostExchangePanel()`, add `UIModule._resultsActiveTab = null;` to the "Run New Exchange" click handler, alongside the existing resets. This clears the active tab so the next result defaults correctly.
- In `UIModule.showView()`, at the very start (before any guard), add the Results nav sync block: find `document.querySelector('[data-view="results"]')`; if `ExchangeModule.hasResult()`: `removeAttribute('aria-disabled')`, `setAttribute('tabindex', '0')`; else: `setAttribute('aria-disabled', 'true')`, `setAttribute('tabindex', '-1')`. Null-guard the element lookup.
- `UIModule.renderResults()` full rewrite: reads `ExchangeModule._result`. Renders `view-container > view-header(h2 "Results" + `.results-header-actions` div with two buttons) + `.stat-card-row`(8 cards) + `#results-explorer-panel`(empty div, Story 4.2 target).
- Header buttons: `id="results-new-exchange-btn"` class `btn btn-secondary` text "New Exchange"; `id="results-download-ndjson-btn"` class `btn btn-primary` text "Download NDJSON" (no click handler yet — Story 4.3 wires it).
- Active tab determination in `renderResults()`: use `UIModule._resultsActiveTab` if non-null; otherwise compute default from first `resourceResults` entry with `count > 0`, or `resourceResults[0].resourceType` if all are zero. Use the computed `activeType` locally (do NOT set `UIModule._resultsActiveTab` from inside renderResults).
- Each stat card: `<div class="stat-card [active]" data-type="{resourceType}">` containing a `.stat-card-count` div and `.stat-card-type` div. `active` class applied when `resourceType === activeType`. Count div gets class `stat-card-count zero` when count === 0 (for `--color-text-secondary` coloring). Use `UIModule.escapeHtml` on `resourceType` and count.
- `#results-explorer-panel`: empty `<div>` — no content in this story. Story 4.2 populates it via `renderResourceExplorer()`.
- `UIModule.bindResultsEvents()` new method (added after `bindExchangeEvents`): wires `#results-new-exchange-btn` click → `UIModule._resultsActiveTab = null; UIModule._exchangePhase = 'setup'; UIModule.showView('exchange')`. Wires each `.stat-card` element click → read `card.dataset.type`, set `UIModule._resultsActiveTab = type`, call `UIModule.showView('results')`. Null-guard button lookup.
- `UIModule.showView()` results branch: already has `else if (name === 'results') { html = UIModule.renderResults(); }`. After `main.innerHTML = html`, add `UIModule.bindResultsEvents()`.
- CSS additions (in `<style>` block): `.results-header-actions` (flex, gap 8px, margin-left auto, align-items center); `.stat-card-row` (display flex, gap 10px, overflow-x auto, padding-bottom 12px); `.stat-card` (flex-shrink 0, width 110px, background `var(--color-surface)`, border `2px solid var(--color-border)`, border-radius 8px, padding `12px 10px`, cursor pointer, text-align center, transition `border-color 0.15s`); `.stat-card:hover` (border-color `var(--color-primary)`); `.stat-card.active` (border-color `var(--color-primary)`, background `var(--color-primary-light)`); `.stat-card-count` (font-size 22px, font-weight 700, line-height 1, margin-bottom 4px, color `var(--color-text-primary)`); `.stat-card-count.zero` (color `var(--color-text-secondary)`); `.stat-card-type` (font-size 11px, color `var(--color-text-secondary)`).

**Block If:** None — all decisions fully specified.

**Never:**
- Do not set `UIModule._resultsActiveTab` inside `renderResults()` — it's a render function, not a state mutation
- Do not use `createElement` / `appendChild`
- Do not wire the "Download NDJSON" click handler in this story (Story 4.3 owns it)
- Do not implement any explorer content (Story 4.2 owns `#results-explorer-panel`)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Results view opens, mixed counts | `_result.resourceResults` with some counts > 0, some = 0 | Non-zero counts in primary text color; zero counts in secondary color; first non-zero type's card is active | — |
| Results view opens, all zero counts | All `count === 0` | All cards in secondary color; first type's card is active | — |
| Stat card clicked | Card with data-type="Condition" clicked | `_resultsActiveTab = 'Condition'`; view re-renders; Condition card gets `.active` class | — |
| "New Exchange" clicked | Button click | `_resultsActiveTab = null`, `_exchangePhase = 'setup'`, navigate to Exchange view | — |
| After exchange, showView called | Any showView call | Results nav item updates to enabled (tabindex=0, no aria-disabled) | Null guard if nav element missing |
| hasResult() false, showView called | Pre-exchange state | Results nav item remains disabled; guard prevents results view render | — |

</intent-contract>

## Code Map

- `app.html` ExchangeModule.runExchange — add `date` field to `_result` assignment
- `app.html` ExchangeModule._showPostExchangePanel — add `UIModule._resultsActiveTab = null` to "Run New Exchange" handler
- `app.html` UIModule state — add `_resultsActiveTab: null`
- `app.html` UIModule.showView — add nav sync block at top; add `bindResultsEvents()` call in results branch
- `app.html` UIModule.renderResults — full rewrite
- `app.html` UIModule.bindResultsEvents — new method
- `app.html` `<style>` — stat card and results header CSS

## Tasks & Acceptance

**Execution:**

- [ ] `app.html` `<style>` — Add after `.step-detail` rules: `.results-header-actions { display: flex; gap: 8px; margin-left: auto; align-items: center; }` `.stat-card-row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 12px; }` `.stat-card { flex-shrink: 0; width: 110px; background: var(--color-surface); border: 2px solid var(--color-border); border-radius: 8px; padding: 12px 10px; cursor: pointer; text-align: center; transition: border-color 0.15s; }` `.stat-card:hover { border-color: var(--color-primary); }` `.stat-card.active { border-color: var(--color-primary); background: var(--color-primary-light); }` `.stat-card-count { font-size: 22px; font-weight: 700; line-height: 1; margin-bottom: 4px; color: var(--color-text-primary); }` `.stat-card-count.zero { color: var(--color-text-secondary); }` `.stat-card-type { font-size: 11px; color: var(--color-text-secondary); }`

- [ ] `app.html` UIModule state — Add `_resultsActiveTab: null,` after `_exchangePhase: 'setup',`

- [ ] `app.html` ExchangeModule.runExchange — Change the `_result` assignment from:
  `ExchangeModule._result = { payer: payer, member: member, fhirId: fhirId, resourceResults: step4.data.resourceResults };`
  to:
  `ExchangeModule._result = { payer: payer, member: member, fhirId: fhirId, resourceResults: step4.data.resourceResults, date: new Date().toISOString().slice(0, 10) };`

- [ ] `app.html` ExchangeModule._showPostExchangePanel — In the "Run New Exchange" click handler, add `UIModule._resultsActiveTab = null;` before `UIModule._exchangeSelectedPayerId = null;`

- [ ] `app.html` UIModule.showView — At the very start of the method body (before any existing logic), add the Results nav sync:
  ```js
  var resultsNavBtn = document.querySelector('[data-view="results"]');
  if (resultsNavBtn) {
    if (ExchangeModule.hasResult()) {
      resultsNavBtn.removeAttribute('aria-disabled');
      resultsNavBtn.setAttribute('tabindex', '0');
    } else {
      resultsNavBtn.setAttribute('aria-disabled', 'true');
      resultsNavBtn.setAttribute('tabindex', '-1');
    }
  }
  ```

- [ ] `app.html` UIModule.showView — In the results branch, after `html = UIModule.renderResults()` and after `main.innerHTML = html`, add `UIModule.bindResultsEvents();`

- [ ] `app.html` UIModule.renderResults — Full rewrite:
  ```js
  renderResults: function() {
    var result = ExchangeModule._result;
    var html = '<div class="view-container">';
    html += '<div class="view-header">';
    html += '<h2>Results</h2>';
    html += '<div class="results-header-actions">';
    html += '<button id="results-new-exchange-btn" class="btn btn-secondary" type="button">New Exchange</button>';
    html += '<button id="results-download-ndjson-btn" class="btn btn-primary" type="button">Download NDJSON</button>';
    html += '</div></div>';
    var activeType = UIModule._resultsActiveTab;
    if (!activeType) {
      var firstNonEmpty = result.resourceResults.find(function(r) { return r.count > 0; });
      activeType = firstNonEmpty ? firstNonEmpty.resourceType : result.resourceResults[0].resourceType;
    }
    html += '<div class="stat-card-row">';
    result.resourceResults.forEach(function(r) {
      var isActive = r.resourceType === activeType;
      html += '<div class="stat-card' + (isActive ? ' active' : '') + '" data-type="' + UIModule.escapeHtml(r.resourceType) + '">';
      html += '<div class="stat-card-count' + (r.count === 0 ? ' zero' : '') + '">' + r.count + '</div>';
      html += '<div class="stat-card-type">' + UIModule.escapeHtml(r.resourceType) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div id="results-explorer-panel"></div>';
    html += '</div>';
    return html;
  },
  ```

- [ ] `app.html` UIModule.bindResultsEvents — New method (after `bindExchangeEvents`):
  ```js
  bindResultsEvents: function() {
    var newExchangeBtn = document.getElementById('results-new-exchange-btn');
    if (newExchangeBtn) {
      newExchangeBtn.addEventListener('click', function() {
        UIModule._resultsActiveTab = null;
        UIModule._exchangePhase = 'setup';
        UIModule.showView('exchange');
      });
    }
    var statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(function(card) {
      card.addEventListener('click', function() {
        UIModule._resultsActiveTab = card.dataset.type || null;
        UIModule.showView('results');
      });
    });
  },
  ```

**Acceptance Criteria:**
- Given an exchange has completed and I navigate to Results, then I see header with "New Exchange" and "Download NDJSON" buttons, and a row of 8 stat cards with resource type names and counts
- Given zero-count resource types, then their count is shown in secondary text color but the card is not hidden
- Given a stat card is clicked, then that card gains the `active` class and its resource type name highlights; clicking a second time re-renders with the same card active
- Given "New Exchange" is clicked from Results, then the Exchange view shows the setup panel with prior payer and member selections preserved (not cleared)
- Given an exchange completes successfully (`hasResult()` returns true), then the next call to `showView()` for ANY view causes the Results nav item to lose `aria-disabled` and become clickable (tabindex=0)
- Given `hasResult()` is false, then the Results nav item has `aria-disabled="true"` and `tabindex="-1"`
- Given the Results view is rendered, then `#results-explorer-panel` exists as an empty div (placeholder for Story 4.2)

## Design Notes

**`renderResults()` does not set state:** The active tab default is computed locally from `_result.resourceResults` without calling `UIModule._resultsActiveTab =` inside the render method. The card click handler in `bindResultsEvents()` sets the state, then triggers a re-render via `showView('results')`. This matches the existing pattern for exchange dropdown changes.

**Nav sync in `showView()`:** Every `showView` call (not just `showView('results')`) updates the Results nav item. This means navigating to any view after an exchange completes will automatically enable the Results nav — without needing a dedicated event or callback.

**`date` field in `_result`:** Added in this story as `new Date().toISOString().slice(0, 10)` (YYYY-MM-DD) captured at exchange completion. Story 4.3 reads `ExchangeModule._result.date` for the NDJSON filename.

## Review Triage Log

### 2026-07-31 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1: (low 1)
- defer: 2: (low 2)
- reject: 10
- addressed_findings:
  - `[low]` `[patch]` `.stat-card-type` has no text-overflow control; `ExplanationOfBenefit` (19 chars) overflows 110px card width. Fixed by adding `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` to `.stat-card-type` CSS rule.

## Verification

**Manual checks:**
- Complete a full exchange; navigate to Results → header shows both buttons; 8 stat cards render with correct counts
- Non-zero type cards have count in primary text color; zero-type cards in secondary color
- Click a stat card → that card highlights as active; other cards are not active
- Click "New Exchange" → Exchange setup panel shows with prior payer/member still selected
- After exchange completes, navigate to any view → Results nav item is now clickable (no aria-disabled)
- Before running exchange, Results nav item is disabled (tooltip visible on hover)
