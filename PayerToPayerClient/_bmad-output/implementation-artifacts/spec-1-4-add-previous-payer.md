---
title: 'Story 1.4: Add Previous Payer'
type: 'feature'
created: '2026-07-30'
status: 'done'
baseline_revision: 'cc572e44b93f016e3382cc906a1ea861bdff9983'
final_revision: 'a33e85ec3a30cbfb4ee7936492e0bba823a2827d'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<intent-contract>

## Intent

**Problem:** The "Add Previous Payer" button exists in the UI but has no handler; `UIModule.showAddPayer()` is a stub. There is no way to create a new Previous Payer entry.

**Approach:** Implement the add-payer flow entirely in `app.html`: add `_expandedPayerId` state to UIModule; refactor `renderPreviousPayers()` to render an inline expanded form card when `_expandedPayerId === 'new'`; add `bindPreviousPayersEvents()` called after each view render to wire the "Add Previous Payer" button, Save, Cancel, and secret show/hide; validate 5 required fields inline without re-rendering; on valid Save call `ConfigModule.addPayer()` and refresh the view.

## Boundaries & Constraints

**Always:**
- `UIModule._expandedPayerId` tracks which card is expanded: `null` = none expanded, `'new'` = add form open, future stories will use a UUID for existing cards
- After `main.innerHTML = html` in `showView('previous-payers')`, call `UIModule.bindPreviousPayersEvents()` to wire view-local events — this pattern replaces relying on `bindEvents()` for per-view interactions
- Validation errors are written to pre-existing error `<div>` elements already in the DOM via `element.classList.add('visible')` and `element.textContent = msg` — do not re-render the whole form on validation failure
- `ConfigModule.addPayer(payerObj)` is called only when all 5 required fields are non-empty; it assigns `id` and `roster: []` internally — never pass those from the form
- On successful Save: set `UIModule._expandedPayerId = null`, call `UIModule.showView('previous-payers')` to re-render
- On Cancel: set `UIModule._expandedPayerId = null`, call `UIModule.showView('previous-payers')` to re-render
- Secret field: `<input type="password">` default; show/hide toggle reuses `.secret-toggle` CSS class already defined in Story 1.3
- `UIModule.escapeHtml()` is already available — use it on any user-controlled value placed in `value="..."` attributes
- Only one expanded card at a time: when `_expandedPayerId` is set to `'new'`, any other expanded state is cleared (will matter more in Story 1.5)
- All HTML accumulated in `var html = ''`, assigned once to `element.innerHTML`

**Block If:** None — all decisions fully specified.

**Never:**
- Do not implement expand/collapse on existing payer cards — that is Story 1.5 scope
- Do not implement the Config tab / Roster tab structure — that is Story 1.5 scope
- No `window.confirm()`, `alert()`, or `prompt()`
- Do not call `ConfigModule.addPayer()` if any required field is empty
- Do not add `id` or `roster` fields to the payerObj passed to `addPayer`

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Click "Add Previous Payer" (no payers) | `payers.length === 0`, `_expandedPayerId = null` | Empty state replaced by payer list + expanded form card at bottom | — |
| Click "Add Previous Payer" (payers exist) | `payers.length > 0`, `_expandedPayerId = null` | Existing collapsed cards remain; expanded form card appended | — |
| Save with all fields filled | All 5 required fields non-empty | `ConfigModule.addPayer()` called; view re-renders with new collapsed card | — |
| Save with empty Name | Name field empty | Name input gets `.invalid`, error div shows "Required"; no save | — |
| Save with multiple empty fields | Multiple fields empty | Each empty required field shows its own inline error; no save | — |
| Cancel | Any form state | Form dismissed; `_expandedPayerId = null`; view re-renders with no form card | — |
| Show/Hide on secret field | Click toggle button | Input type toggles password↔text; button text toggles Show↔Hide | — |
| Token Auth Method default | Form first rendered | `client_secret_post` is pre-selected in the dropdown | — |
| CORS Proxy default | Form first rendered | Checkbox is unchecked (useProxy: false) | — |
| Name contains `<script>` | User types XSS payload | `escapeHtml()` prevents XSS in any rendered value attribute | escapeHtml guards |

</intent-contract>

## Code Map

- `app.html` `<style>` — add `.payer-card-body`, `.payer-form`, `.form-field`, `.form-input`, `.form-input.invalid`, `.field-error`, `.field-error.visible`, `.form-actions`, `.form-row` CSS
- `app.html` `<script>` UIModule — add `_expandedPayerId: null` property; replace `showAddPayer()` stub with full implementation; update `renderPreviousPayers()` to branch on `_expandedPayerId`; add `renderNewPayerForm()` helper; add `bindPreviousPayersEvents()` method; update `showView()` to call `bindPreviousPayersEvents()` after rendering previous-payers

## Tasks & Acceptance

**Execution:**
- [ ] `app.html` CSS — Add to `<style>` block (after the payer-cards section):
  ```css
  /* Payer form (add/edit) */
  .payer-card-body { border-top: 1px solid var(--color-border); }
  .payer-form { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .form-field { display: flex; flex-direction: column; gap: 4px; }
  .form-field label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
  .required-marker { color: var(--color-error); margin-left: 2px; }
  .form-input {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 14px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    box-sizing: border-box;
  }
  .form-input:focus { outline: 2px solid var(--color-primary); outline-offset: -1px; }
  .form-input.invalid { border-color: var(--color-error); }
  .field-error { font-size: 12px; color: var(--color-error); display: none; margin-top: 2px; }
  .field-error.visible { display: block; }
  .form-row { display: flex; gap: 8px; align-items: flex-end; }
  .form-row .form-input { flex: 1; min-width: 0; }
  .form-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; border-top: 1px solid var(--color-border); margin-top: 4px; }
  .form-check-row { display: flex; align-items: center; gap: 8px; }
  .form-check-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--color-primary); cursor: pointer; }
  .form-check-row label { font-size: 14px; color: var(--color-text-primary); cursor: pointer; margin: 0; font-weight: normal; }
  ```

- [ ] `app.html` UIModule — Add `_expandedPayerId: null,` property alongside `currentView` and `_settingsKeyHandler`

- [ ] `app.html` UIModule — Replace `showAddPayer()` stub with:
  ```js
  showAddPayer: function() {
    UIModule._expandedPayerId = 'new';
    UIModule.showView('previous-payers');
  },
  ```

- [ ] `app.html` UIModule — Add `renderNewPayerForm()` method that returns an HTML string for the new-payer expanded card:
  - Outer: `<div class="payer-card" id="new-payer-card">`
  - Header: `<div class="payer-card-header"><span class="payer-name">New Previous Payer</span></div>`
  - Body: `<div class="payer-card-body"><div class="payer-form">` containing:
    - `<div class="form-field">` for each of 5 text/url/password fields: Display Name (`id="np-name"`), FHIR Base URL (`id="np-fhir-url"`, `type="url"`), Token URL (`id="np-token-url"`, `type="url"`), Client ID (`id="np-client-id"`), Client Secret (`id="np-secret"`, `type="password"` + `.form-row` with `.secret-toggle` button `id="np-secret-toggle"`)
    - Each field has a `<label>` with `for=` binding, a required marker `<span class="required-marker" aria-hidden="true">*</span>`, and an error div `<div id="np-NAME-error" class="field-error"></div>`
    - Token Auth Method: `<div class="form-field">` with `<label for="np-auth-method">Token Auth Method</label>` + `<select id="np-auth-method" class="form-input">` with options `client_secret_post` (selected) and `client_secret_basic`
    - CORS Proxy: `<div class="form-check-row">` with `<input type="checkbox" id="np-use-proxy">` + `<label for="np-use-proxy">Use CORS Proxy</label>`
    - Actions: `<div class="form-actions"><button id="new-payer-cancel" class="btn btn-secondary" type="button">Cancel</button><button id="new-payer-save" class="btn btn-primary" type="button">Save</button></div>`

- [ ] `app.html` UIModule — Update `renderPreviousPayers()`:
  - When `payers.length === 0` AND `_expandedPayerId !== 'new'`: render empty state (unchanged)
  - Otherwise: render `<div class="payer-list">` with collapsed payer cards (unchanged), then if `_expandedPayerId === 'new'` append `UIModule.renderNewPayerForm()` inside the list; render "Add Previous Payer" button below the list in all non-empty cases (including when only the new form is shown)

- [ ] `app.html` UIModule — Add `bindPreviousPayersEvents()` method that:
  1. Binds "Add Previous Payer" button: `document.getElementById('add-payer-btn')` click → `UIModule.showAddPayer()` (guard with `if (!el) return` before binding each)
  2. If `_expandedPayerId === 'new'`: bind `#new-payer-cancel` click → set `_expandedPayerId = null`, call `UIModule.showView('previous-payers')`; bind `#new-payer-save` click → validate then save (see save logic below); bind `#np-secret-toggle` click → toggle input type password↔text and button text Show↔Hide
  3. Save logic in the save handler: read values from `#np-name`, `#np-fhir-url`, `#np-token-url`, `#np-client-id`, `#np-secret`; validate each non-empty (clear all errors first, then set errors for each empty field); if any invalid, `return`; if all valid: call `ConfigModule.addPayer({ name, fhirBaseUrl, tokenUrl, clientId, clientSecret, tokenAuthMethod, useProxy })`, set `UIModule._expandedPayerId = null`, call `UIModule.showView('previous-payers')`

- [ ] `app.html` UIModule.showView — After `main.innerHTML = html;`, add: `if (name === 'previous-payers') { UIModule.bindPreviousPayersEvents(); }`

**Acceptance Criteria:**
- Given I am on the Previous Payers screen with no payers, when I click "Add Previous Payer", then the empty state is replaced by a form card with all 7 fields and Save/Cancel buttons
- Given I am on the Previous Payers screen with existing payers, when I click "Add Previous Payer", then the existing collapsed payer cards remain visible above the new form card
- Given the form is open, when I click Cancel, then the form card disappears and the view returns to its prior state; `ConfigModule.getConfig().previousPayers` is unchanged
- Given I fill all 7 fields and click Save, then `ConfigModule.getConfig().previousPayers` gains one new entry with the correct field values and `roster: []`; the new payer card appears collapsed showing the name and "0 members"
- Given I click Save with the Display Name field empty, then an inline error "Required" appears below the Name field; no payer is added to config
- Given I click Save with Display Name empty and FHIR Base URL empty, then inline errors appear for both fields simultaneously; no save occurs
- Given the Client Secret field is masked, when I click Show, then the field reveals the text and the button reads "Hide"; clicking Hide re-masks it
- Given I fill fields and click Save successfully, when I then open the drawer again, then the form is gone and the new payer's card is in the list

## Design Notes

**`bindPreviousPayersEvents()` is called after every `showView('previous-payers')`** because `innerHTML` assignment wipes all prior DOM event listeners. This replaces static `bindEvents()` for view-local interactions.

**Validation mutates existing DOM elements** (sets `.invalid` class and `.visible` on error divs) rather than re-rendering. This preserves user-typed values in other fields and avoids focus jumping.

**`renderNewPayerForm()` returns a string** — it is called from `renderPreviousPayers()` and its output is accumulated into the `html` variable before the single `innerHTML` assignment.

**`Add Previous Payer` button `id="add-payer-btn"`** — set in both the empty-state and the payer-list-actions div so `bindPreviousPayersEvents()` can find it with one selector regardless of which state is rendered.

## Verification

**Manual checks:**
- With no payers: click "Add Previous Payer" → form renders, Cancel restores empty state
- With seeded payers: click "Add Previous Payer" → form appears below existing cards, existing cards unaffected
- Fill form, Save → new card appears collapsed with entered name and "0 members"; DevTools localStorage confirms entry with UUID
- Leave Name blank, click Save → error shown, no save
- Show/Hide toggle on secret field works correctly
- Zero console errors throughout

## Spec Change Log

## Review Triage Log

### 2026-07-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 2, low 0)
- defer: 5: (low 5)
- reject: 8
- addressed_findings:
  - `[medium]` `[patch]` Suppressed "Add Previous Payer" button when form is already open (`if (!isAdding)` guard on actions div) — clicking it while form was open silently destroyed all entered data via re-render
  - `[medium]` `[patch]` Clear `_expandedPayerId` in `showView()` when navigating away from previous-payers — state leaked across navigation, causing blank form to re-appear on return

## Auto Run Result

**Status:** done

**Summary:** Implemented the add-previous-payer flow: `_expandedPayerId` state, `showAddPayer()`, `renderNewPayerForm()` (7 fields), `bindPreviousPayersEvents()` with inline validation, and `showView()` binding. Review patches: suppress Add button when form is open; clear expanded state on navigation away.

**Files changed:**
- `PayerToPayerClient/app.html` — modified; form CSS, `_expandedPayerId` property, `showAddPayer()`, `renderNewPayerForm()`, `bindPreviousPayersEvents()`, `renderPreviousPayers()` updated, `showView()` updated

**Review findings:** 2 patches applied (both medium: button-destroys-data guard, state-leakage-on-nav guard). 5 deferred (URL format validation, keyboard accessibility, aria-required, duplicate detection). 8 rejected (null guards for structurally-guaranteed elements, established toggle pattern, trim divergence irrelevant on success, internal-only allowlist concerns, structural noise is by design).

**Follow-up review recommended:** false

**Verification:** Manual checks per spec — add button shows/hides, Cancel restores state, Save writes to localStorage, inline errors appear on empty fields, Show/Hide toggle works, navigation away clears form state.

**Residual risks:** URL format validation deferred — invalid URLs stored now, will fail at fetch time during exchange. Keyboard accessibility (Escape, Enter, focus) deferred.
