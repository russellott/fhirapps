---
title: 'Story 3.1: Exchange Setup Panel'
type: 'feature'
created: '2026-07-31'
status: 'in-review'
baseline_revision: '31e4c1c'
review_loop_iteration: 0
followup_review_recommended: false
warnings:
  - oversized
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-3-context.md'
---

<intent-contract>

## Intent

**Problem:** The Exchange view shows a static empty-state placeholder with no way to select a Previous Payer, choose a Roster member, or trigger an exchange run.

**Approach:** Replace the stub with a two-phase Exchange view: a setup panel (payer + member dropdowns, summary, Run Exchange button) that panel-swaps to a 4-step progress tracker when Run Exchange is clicked. All 4 steps render in pending state; exchange execution logic is implemented in Story 3.2+.

## Boundaries & Constraints

**Always:**
- Three new UIModule state properties added after `_rosterDeleteConfirmMemberId: null,`:
  - `_exchangeSelectedPayerId: null`
  - `_exchangeSelectedMemberId: null`
  - `_exchangePhase: 'setup'` (valid values: `'setup'` | `'running'`)
- These three properties are NOT reset in the `showView()` nav-away guard — exchange state persists across navigation so "Try Again" (Story 3.2+) can restore prior selections
- `bindExchangeEvents()` added as a UIModule method, called from `showView()` when `name === 'exchange'` (same pattern as `bindPreviousPayersEvents()` for `'previous-payers'`)
- `renderExchange()` fully rewritten: `_exchangePhase === 'setup'` → setup panel; `_exchangePhase === 'running'` → progress tracker
- Setup panel payer dropdown `id="exchange-payer-select"`: options built from `ConfigModule.getConfig().previousPayers`; first option `<option value="" disabled selected>Select a Previous Payer</option>` (shown when `_exchangeSelectedPayerId` is null); option for each payer gets `selected` attribute if its id matches `_exchangeSelectedPayerId`
- Setup panel member dropdown `id="exchange-member-select"`: `disabled` attribute when `_exchangeSelectedPayerId` is null, placeholder text `"Select a Previous Payer first"`; when payer selected, enabled, placeholder `"Select a Member"`, options from `payer.roster`; option for each member gets `selected` if its id matches `_exchangeSelectedMemberId`; member option label: `"{firstName} {lastName} ({dateOfBirth})"` using `UIModule.escapeHtml` on each part
- Summary paragraph `id="exchange-summary"`: empty string when either selection is null; when both non-null: `"Testing {payerName} for {firstName} {lastName} ({dateOfBirth})"` (all parts via `UIModule.escapeHtml`)
- Run Exchange button `id="exchange-run-btn"` `class="btn btn-primary"` `type="button"`: `disabled` attribute when either selection is null; `title="Select a Previous Payer and Member to proceed"` always present
- Run Exchange click handler: reads fresh config from `ConfigModule.getConfig()`; finds `payer` and `member` by stored IDs; if either not found, return early (stale state guard); sets `UIModule._exchangePhase = 'running'`; calls `UIModule.showView('exchange')`; then calls `ExchangeModule.runExchange(payer, member, { newPayer: config.newPayer, corsProxyUrl: config.corsProxyUrl })`
- Progress tracker container `class="step-tracker"` `aria-live="polite"` (UX-DR15); 4 step rows with IDs `step-row-1` through `step-row-4`; each row contains icon `class="step-icon step-pending"`, step name, and empty detail span `id="step-detail-1"` through `id="step-detail-4"` (Story 3.2 populates these)
- Step names (in order): "System Token", "Member Match", "Member-Scoped Token", "Resource Retrieval"
- `ExchangeModule.runExchange(payer, member, newPayerConfig)` stub added to ExchangeModule — no-op function body; Story 3.2 replaces with real implementation

**Block If:** None — all decisions fully specified.

**Never:**
- Do not implement exchange network calls — Story 3.2+
- Do not reset `_exchangeSelectedPayerId`, `_exchangeSelectedMemberId`, or `_exchangePhase` in the `showView()` nav-away guard
- No `window.confirm`, `alert`, or `prompt`
- Do not use `createElement`/`appendChild` — accumulate `let html = ''` and assign atomically

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Exchange view opened, no previousPayers | `previousPayers: []`, phase: 'setup' | Setup panel; payer dropdown shows placeholder only; member dropdown disabled; Run Exchange disabled | — |
| Exchange view opened, payers exist | `previousPayers: [...]`, `_exchangeSelectedPayerId: null` | Setup panel; payer dropdown lists payers; member dropdown disabled; Run Exchange disabled | — |
| Payer selected | payer onChange fires | `_exchangeSelectedPayerId` set, `_exchangeSelectedMemberId` reset null; re-render; member dropdown enabled with roster | — |
| Payer selected, roster empty | `payer.roster: []` | Member dropdown enabled but shows only its placeholder; Run Exchange still disabled | — |
| Both selected | Both state props non-null | Summary line shows; Run Exchange enabled | — |
| Run Exchange clicked | Both non-null | `_exchangePhase = 'running'`; panel swaps to 4-step tracker (all pending); `runExchange` stub called | If payer or member not found in fresh config, return early |
| Nav away and back while running | `_exchangePhase: 'running'` | Progress tracker re-renders on return — state preserved | — |

</intent-contract>

## Code Map

- `app.html` `<style>` — add exchange setup panel CSS and step tracker CSS (step-pending, step-in-progress, step-success, step-failed, @keyframes spin)
- `app.html` UIModule — add `_exchangeSelectedPayerId`, `_exchangeSelectedMemberId`, `_exchangePhase` state props
- `app.html` UIModule.showView() — add `else if (name === 'exchange') { UIModule.bindExchangeEvents(); }` after the previous-payers branch
- `app.html` UIModule.renderExchange() — full rewrite for setup panel and progress tracker
- `app.html` UIModule.bindExchangeEvents() — new method (payer select, member select, run button)
- `app.html` ExchangeModule — add `runExchange` no-op stub

## Tasks & Acceptance

**Execution:**

- [x] `app.html` `<style>` — After `.roster-action-btn` rules, add exchange CSS: `.exchange-setup-panel` (padding/layout), `.exchange-form-row` (flex column, gap), `.exchange-select` (width:100%, max-width 360px), `.exchange-summary` (font-style:italic, color:var(--color-text-secondary), min-height:1.4em), `.step-tracker` (display:flex, flex-direction:column, gap:16px), `.step-row` (display:flex, align-items:center, gap:12px), `.step-icon` (width:24px, height:24px, border-radius:50%, flex-shrink:0, display:flex, align-items:center, justify-content:center), `.step-pending` (border:2px dashed var(--color-border)), `.step-in-progress` (border:2px solid var(--color-primary), animation:spin 1s linear infinite), `.step-success` (background:var(--color-primary), color:#fff with ::after content:'✓'), `.step-failed` (background:#ef4444, color:#fff with ::after content:'✗'), `.step-content` (flex:1), `.step-name` (font-weight:500), `.step-detail` (font-size:12px, color:var(--color-text-secondary)), `@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`

- [x] `app.html` UIModule — Add after `_rosterDeleteConfirmMemberId: null,`:
  ```js
  _exchangeSelectedPayerId: null,
  _exchangeSelectedMemberId: null,
  _exchangePhase: 'setup',
  ```

- [x] `app.html` UIModule.showView() — Change the post-innerHTML event-wiring block from:
  ```js
  if (name === 'previous-payers') { UIModule.bindPreviousPayersEvents(); }
  ```
  to:
  ```js
  if (name === 'previous-payers') { UIModule.bindPreviousPayersEvents(); }
  else if (name === 'exchange') { UIModule.bindExchangeEvents(); }
  ```

- [x] `app.html` UIModule.renderExchange() — Full rewrite. When `_exchangePhase === 'setup'`: build setup panel HTML (view-container + view-header + exchange-setup-panel div containing two exchange-form-rows for selects, exchange-summary paragraph, Run Exchange button). When `_exchangePhase === 'running'`: build progress tracker (view-container + view-header + step-tracker div with 4 step-rows all in step-pending state). Member dropdown `disabled` attribute and placeholder text depend on `_exchangeSelectedPayerId`. Run Exchange `disabled` attribute depends on both selections being non-null. Pre-select matching options using `selected` attribute by comparing payer/member IDs to state.

- [x] `app.html` UIModule.bindExchangeEvents() — New method (added after `bindPreviousPayersEvents`). Wire `#exchange-payer-select` change: read `event.target.value`, set `UIModule._exchangeSelectedPayerId`, reset `UIModule._exchangeSelectedMemberId = null`, call `UIModule.showView('exchange')`. Wire `#exchange-member-select` change: read `event.target.value`, set `UIModule._exchangeSelectedMemberId`, call `UIModule.showView('exchange')`. Wire `#exchange-run-btn` click: read fresh config, find payer and member by stored IDs, guard if either missing; set `UIModule._exchangePhase = 'running'`; call `UIModule.showView('exchange')`; call `ExchangeModule.runExchange(payer, member, { newPayer: config.newPayer, corsProxyUrl: config.corsProxyUrl })`.

- [x] `app.html` ExchangeModule — Add after `hasResult()`:
  ```js
  runExchange: function(payer, member, newPayerConfig) {}
  ```

**Acceptance Criteria:**
- Given Exchange view is opened with no previous payers configured, then the payer dropdown shows only its placeholder and Run Exchange is disabled
- Given previous payers exist, when Exchange view is opened, then the payer dropdown lists all payer names and Run Exchange is disabled
- Given a payer is selected from the dropdown, then the member dropdown enables and shows that payer's roster members; Run Exchange stays disabled
- Given a payer with no roster members is selected, then the member dropdown enables but shows only its placeholder; Run Exchange stays disabled
- Given both a payer and a member are selected, then the summary shows "Testing {Payer Name} for {First Last} ({dateOfBirth})" and Run Exchange is enabled
- Given both are selected and Run Exchange is clicked, then the setup panel is replaced by a 4-step progress tracker with all 4 steps in pending state (dashed circle icons)
- Given the progress tracker is showing, when the user navigates away and returns to Exchange, then the progress tracker is still showing

## Design Notes

**onChange re-render pattern:** Both dropdown change handlers store the selected value in UIModule state then immediately call `UIModule.showView('exchange')`. This wipes the DOM and re-renders with updated state, identical to the pattern used by all edit/add/delete flows in the Previous Payers view. The selected option is preserved by matching state IDs in `renderExchange()`.

**Member option label format:** `"{firstName} {lastName} ({dateOfBirth})"` — same fields shown in the roster table, giving the tester an unambiguous member reference.

**Step detail IDs are stable hooks:** `id="step-detail-1"` through `id="step-detail-4"` are empty in this story but intentionally present so Story 3.2+ can use `document.getElementById('step-detail-1').textContent = ...` without modifying Story 3.1's HTML structure.

**ExchangeModule.runExchange stub position:** The call in the Run Exchange handler is placed AFTER `UIModule.showView('exchange')` so the progress panel renders synchronously before any async work begins in Story 3.2. This mirrors the "All steps render in pending state first" UX requirement.

## Verification

**Manual checks:**
- Open Exchange tab → setup panel shows; payer dropdown populated from config; member dropdown disabled
- Select a payer → member dropdown enables with roster members; summary still empty; Run Exchange disabled
- Select a member → summary reads "Testing {name} for {member} ({dob})"; Run Exchange enabled
- Click Run Exchange → panel replaces with step tracker; 4 rows with dashed circle pending icons
- Navigate to Previous Payers, return to Exchange → progress tracker still showing; no reset
- Zero console errors throughout

## Review Triage Log

### 2026-07-31 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 0, low 1)
- defer: 4: (low 4)
- reject: 8
- addressed_findings:
  - `[low]` `[patch]` `bindExchangeEvents` run button click handler missing null guard on `ConfigModule.getConfig()` return value; `config.previousPayers.find(...)` would throw TypeError if config is null — fixed by adding `if (!config || !Array.isArray(config.previousPayers)) return;` before the `.find()` call
