---
title: 'Story 1.5: Edit & Delete Previous Payer'
type: 'feature'
created: '2026-07-30'
status: 'done'
baseline_revision: '446801f2990a5f6cb17fdc15c3575cf30dd369fe'
final_revision: '69e9635ad794b40f686ff73aea0441c7c41c2fa4'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<intent-contract>

## Intent

**Problem:** Payer cards are collapsed stubs with no expand/collapse, no edit capability, and no delete capability; `_expandedPayerId` exists but is only used for the add form.

**Approach:** In `app.html` only: wire card header clicks to expand/collapse using `_expandedPayerId`; add two new state properties `_expandedPayerTab` and `_deleteConfirmPayerId`; expand body renders a Config tab (pre-populated edit form using `ConfigModule.updatePayer`) and a Roster stub tab; Delete button enters inline confirmation mode replacing the header row; Confirm calls `ConfigModule.deletePayer`.

## Boundaries & Constraints

**Always:**
- `_expandedPayerId`: `null` = none expanded, `'new'` = add form open (Story 1.4), UUID = existing payer expanded — set to UUID on header click, `null` on second click of same header or on save/cancel/nav-away
- `_expandedPayerTab: 'config' | 'roster'` — new UIModule property; always reset to `'config'` when `_expandedPayerId` changes to a new UUID
- `_deleteConfirmPayerId: null | UUID` — new UIModule property; cleared on nav-away (add alongside the existing `_expandedPayerId = null` guard in `showView()`)
- Only one card expanded at a time — clicking a different collapsed header sets `_expandedPayerId` to the new UUID and clears `_expandedPayerTab` to `'config'`
- Card header click wiring: use `document.querySelectorAll('.payer-card-header[data-payer-id]')` in `bindPreviousPayersEvents()`; in the click handler, guard `if (e.target.closest('.payer-delete-btn')) return;` before toggling expansion
- Delete button click: call `e.stopPropagation()`, set `_deleteConfirmPayerId = payer.id`, if `_expandedPayerId === payer.id` then also set `_expandedPayerId = null`, call `showView('previous-payers')`
- Delete confirm row replaces the entire `.payer-card-header` (no card body shown during confirm mode); microcopy: `"Delete {name}? This will also delete its {n}-member Roster."` — use exact wording; `n` = `payer.roster ? payer.roster.length : 0`
- Confirm Delete calls `ConfigModule.deletePayer(id)`, clears `_deleteConfirmPayerId`, calls `showView('previous-payers')` — no `window.confirm()`
- Edit form fields: Display Name (`id="ep-name"`), FHIR Base URL (`id="ep-fhir-url"`, `type="url"`), Token URL (`id="ep-token-url"`, `type="url"`), Client ID (`id="ep-client-id"`), Client Secret (`id="ep-secret"`, `type="password"` + show/hide toggle `id="ep-secret-toggle"`), Token Auth Method (`id="ep-auth-method"`, select), Use CORS Proxy (`id="ep-use-proxy"`, checkbox) — same structure as `renderNewPayerForm()` with `ep-` IDs
- Pre-populate value attributes with `UIModule.escapeHtml(payer.field)` for text fields; set `selected` on the matching `<option>` for auth method; set `checked` attribute for useProxy
- Edit form validation: same 5 required fields as add form; inline errors use `ep-NAME-error` IDs and the same `.invalid`/`.visible` pattern
- On edit save success: call `ConfigModule.updatePayer(id, values)`, set `_expandedPayerId = null`, call `showView('previous-payers')`
- On edit cancel: set `_expandedPayerId = null`, call `showView('previous-payers')`
- Roster tab: stub only — render `<div class="payer-form"><p class="roster-stub">Member roster management coming in Epic 2.</p></div>`
- All HTML accumulated in `var html = ''`, assigned once to `element.innerHTML` — no createElement/appendChild
- `UIModule.escapeHtml()` on every payer-controlled string in innerHTML and in `value="..."` attributes
- `ConfigModule.updatePayer(id, fields)` and `ConfigModule.deletePayer(id)` are already implemented — never pass `id` or `roster` in the update fields object

**Block If:** None — all decisions fully specified.

**Never:**
- No `window.confirm()`, `alert()`, or `prompt()`
- Do not pass `id` or `roster` to `ConfigModule.updatePayer()`
- Do not implement Roster tab content — Epic 2 scope
- Do not add a second Delete button inside the edit form body — delete is header-only
- Do not use `document.getElementById` for per-card header/delete bindings — use `querySelectorAll` + `forEach`

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Click collapsed card header | `_expandedPayerId = null` | Card expands; Config tab shown; edit form pre-populated | — |
| Click expanded card header | `_expandedPayerId === payer.id` | Card collapses; `_expandedPayerId = null` | — |
| Click different card header while one is expanded | `_expandedPayerId === A.id`, click B header | A collapses, B expands; `_expandedPayerTab = 'config'` | — |
| Click Roster tab | Config tab active | Roster tab active; stub message shown; Config tab inactive | — |
| Edit form: save with all fields | All 5 required non-empty | `ConfigModule.updatePayer()` called; card collapses; updated name shown in list | — |
| Edit form: save with empty name | Name blank | Inline error "Required" under Name; no save | — |
| Click Delete on collapsed card | Any state | Header replaced with confirm row: "Delete {name}? This will also delete its {n}-member Roster." | — |
| Click Delete on expanded card | `_expandedPayerId === payer.id` | Card body hidden; header replaced with confirm row | — |
| Click Confirm Delete | `_deleteConfirmPayerId` set | `ConfigModule.deletePayer()` called; card removed from list | — |
| Click Cancel on delete confirm | `_deleteConfirmPayerId` set | Confirm row dismissed; card returns to collapsed state | — |
| Navigate away with confirm open | `_deleteConfirmPayerId` set | On nav-away: `_deleteConfirmPayerId = null`; returning to view shows normal collapsed card | — |
| Card with `<script>` in name | Delete confirm row | Escaped via `escapeHtml()`; no XSS | escapeHtml guards |

</intent-contract>

## Code Map

- `app.html` `<style>` — add cursor/delete/tab/confirm CSS
- `app.html` `<script>` UIModule — add `_expandedPayerTab`, `_deleteConfirmPayerId` properties; update `showView()` to clear both on nav-away; update `renderPreviousPayers()` to branch on expanded/delete-confirm; add `renderEditPayerForm(payer)` method; extend `bindPreviousPayersEvents()` with all new bindings

## Tasks & Acceptance

**Execution:**

- [x] `app.html` CSS — Add after existing payer-form CSS block:
  ```css
  .payer-card-header { cursor: pointer; }
  .payer-delete-btn { background: none; border: 1px solid var(--color-border); border-radius: 4px; padding: 3px 8px; font-size: 12px; cursor: pointer; color: var(--color-text-secondary); white-space: nowrap; }
  .payer-delete-btn:hover { color: var(--color-error); border-color: var(--color-error); background: var(--color-surface-alt); }
  .tab-bar { display: flex; border-bottom: 1px solid var(--color-border); padding: 0 16px; gap: 0; }
  .tab-btn { background: none; border: none; padding: 10px 14px; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--color-text-secondary); border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .tab-btn.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
  .tab-btn:hover:not(.active) { color: var(--color-text-primary); }
  .delete-confirm-row { display: flex; align-items: center; padding: 12px 16px; gap: 12px; flex-wrap: wrap; }
  .delete-confirm-text { flex: 1; font-size: 14px; color: var(--color-text-primary); }
  .delete-confirm-actions { display: flex; gap: 8px; }
  .btn-danger { background: var(--color-error); color: #fff; border: none; }
  .btn-danger:hover { opacity: 0.85; }
  .roster-stub { font-size: 14px; color: var(--color-text-secondary); padding: 16px 0; }
  ```

- [x] `app.html` UIModule — Add `_expandedPayerTab: 'config'` and `_deleteConfirmPayerId: null` properties alongside `_expandedPayerId`

- [x] `app.html` UIModule.showView — Extend the nav-away guard (currently `if (name !== 'previous-payers') { UIModule._expandedPayerId = null; }`) to also clear `UIModule._deleteConfirmPayerId = null` and `UIModule._expandedPayerTab = 'config'`

- [x] `app.html` UIModule.renderPreviousPayers — Update the payer `forEach` loop body to branch on three states:
  1. `_deleteConfirmPayerId === payer.id` → render `.delete-confirm-row` inside the card (no card body)
  2. `_expandedPayerId === payer.id` → render `.payer-card-header` (with `data-payer-id` and delete button) + `.payer-card-body` (tab bar + tab content from `renderEditPayerForm(payer)`)
  3. Otherwise → render `.payer-card-header` (with `data-payer-id` and delete button) only (collapsed)

  In all non-delete-confirm states, the header contains: `<span class="payer-name">`, `<span class="payer-member-count">`, `<button class="payer-delete-btn" data-payer-id="..." type="button" aria-label="Delete payer">Delete</button>`

- [x] `app.html` UIModule — Add `renderEditPayerForm(payer)` method that returns the tab bar + tab content HTML:
  - Tab bar: `<div class="tab-bar">` with two `.tab-btn` buttons (Config and Roster), active class on whichever matches `UIModule._expandedPayerTab`; each with `data-tab="config"|"roster"` and `data-payer-id="{escapeHtml(payer.id)}"`
  - Config tab content (when `_expandedPayerTab === 'config'`): `<div class="payer-form">` with 7 fields mirroring `renderNewPayerForm()` but using `ep-` IDs and pre-populated `value` attributes via `escapeHtml()`; client secret pre-populates but shows masked; auth method sets `selected` on matching option; useProxy checkbox sets `checked` attribute; Save button `id="ep-save"`, Cancel `id="ep-cancel"`
  - Roster tab content (when `_expandedPayerTab === 'roster'`): `<div class="payer-form"><p class="roster-stub">Member roster management coming in Epic 2.</p></div>`

- [x] `app.html` UIModule.bindPreviousPayersEvents — Extend with five new binding blocks (append after existing add-payer-btn binding, before the `if (_expandedPayerId !== 'new') return` block):
  1. **Header expand/collapse**: `querySelectorAll('.payer-card-header[data-payer-id]').forEach` → click handler: `if (e.target.closest('.payer-delete-btn')) return;` then toggle `_expandedPayerId` (same UUID = null; different UUID = new UUID + `_expandedPayerTab='config'` + `_deleteConfirmPayerId=null`); call `showView`
  2. **Delete buttons**: `querySelectorAll('.payer-delete-btn[data-payer-id]').forEach` → click handler: `e.stopPropagation(); _deleteConfirmPayerId = btn.dataset.payerId; if (_expandedPayerId === that id) _expandedPayerId = null; showView`
  3. **Delete confirm/cancel** (only when `_deleteConfirmPayerId` is set): wire `#delete-confirm-{id}` → `ConfigModule.deletePayer`, clear state, `showView`; wire `#delete-cancel-{id}` → clear `_deleteConfirmPayerId`, `showView`
  4. **Tab buttons**: `querySelectorAll('.tab-btn[data-tab]').forEach` → `_expandedPayerTab = btn.dataset.tab; showView`
  5. **Edit form** (only when `_expandedPayerId` is a UUID !== 'new' and `_expandedPayerTab === 'config'`): wire `#ep-secret-toggle` (password↔text), `#ep-cancel` (clear `_expandedPayerId`, `showView`), `#ep-save` (validate 5 required fields using `ep-` IDs, on valid call `ConfigModule.updatePayer(_expandedPayerId, values)`, clear `_expandedPayerId`, `showView`)

  Remove the `if (UIModule._expandedPayerId !== 'new') return;` early-return guard since the new bindings must also run when `_expandedPayerId` is a UUID. Replace it with two separate conditional blocks: one for `_expandedPayerId === 'new'` (existing new-payer form bindings) and one for `_expandedPayerId` is a UUID !== 'new' and `_expandedPayerTab === 'config'` (new edit form bindings).

**Acceptance Criteria:**
- Given I click a collapsed payer card header, then the card expands showing Config and Roster tabs; the Config tab is active; the edit form is pre-populated with the payer's stored values
- Given the edit form is open, when I click Save with all fields filled, then `ConfigModule.getConfig().previousPayers` shows the updated values; the card collapses showing the new name
- Given the edit form is open, when I click Cancel, then the card collapses; the config is unchanged
- Given the Config tab is active, when I click the Roster tab, then the Config form disappears and the Roster stub message appears
- Given I click Delete on a collapsed payer card, then the card header is replaced with "Delete {name}? This will also delete its {n}-member Roster." plus Cancel/Delete buttons
- Given I click Delete on an expanded payer card, then the card body is hidden and the confirm row appears
- Given the delete confirm row is shown, when I click Confirm Delete, then the payer is removed from the list; `ConfigModule.getConfig().previousPayers` no longer contains that payer
- Given the delete confirm row is shown, when I click Cancel, then the card returns to its normal collapsed state; the config is unchanged
- Given I navigate away from Previous Payers while the confirm row is showing, then on return the confirm row is gone and the card is collapsed normally
- Given a payer name contains `<script>`, the confirm row displays the literal text without executing JS

## Design Notes

**`bindPreviousPayersEvents()` guard removal:** The existing `if (UIModule._expandedPayerId !== 'new') return;` guard was fine for Story 1.4 (only the new-payer form needed wiring when expanded). Story 1.5 adds bindings for card headers, delete buttons, and the edit form — all of which must wire regardless of which card is expanded. Remove the early return and replace with two explicit `if`-blocks scoped to each form type.

**Pre-populating client secret:** `value="..."` in HTML shows the stored value in the field (masked as `type="password"`). The toggle still works identically to the new-payer form. This is intentional — client secrets are stored plaintext in localStorage per project security posture.

**Tab switching via full re-render:** Switching tabs re-renders the entire previous-payers view via `innerHTML`. This preserves consistency with the established pattern. Unsaved edit form values are lost on tab switch — that is acceptable for this story.

## Verification

**Manual checks:**
- Click a payer card header → expands with Config tab and pre-populated form; click again → collapses
- Click a different card header while one is open → first closes, second opens
- Edit a payer name, Save → name updates in collapsed card header
- Edit with blank name → inline error, no save
- Click Roster tab → stub message shows
- Click Delete on collapsed card → confirm row with correct microcopy
- Click Delete on expanded card → body hides, confirm row shows
- Confirm Delete → payer gone from list; localStorage confirms removal
- Cancel → card normal; localStorage unchanged
- Navigate to Exchange while confirm showing → return to Previous Payers shows normal collapsed card
- Zero console errors

## Spec Change Log

## Review Triage Log

### 2026-07-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 1)
- defer: 3: (low 3)
- reject: 7
- addressed_findings:
  - `[high]` `[patch]` Delete handler now unconditionally clears `_expandedPayerId` and resets `_expandedPayerTab` — conditional guard only cleared them when the deleted payer matched the expanded payer, allowing simultaneous display of an edit form (or add form) alongside a delete confirmation row

## Auto Run Result

**Status:** done

**Summary:** Implemented expand/collapse on payer cards (`_expandedPayerId`), Config/Roster tab bar (`_expandedPayerTab`), pre-populated edit form with inline validation calling `ConfigModule.updatePayer`, and inline delete confirmation (`_deleteConfirmPayerId`) replacing the card header with confirm/cancel buttons. Review patch: delete handler unconditionally collapses any open card/form before entering confirm mode.

**Files changed:**
- `PayerToPayerClient/app.html` — modified; expand/delete/tab CSS, `_expandedPayerTab`/`_deleteConfirmPayerId` properties, `showView()` nav-away cleanup, `renderPreviousPayers()` three-way branch, `renderEditPayerForm()`, `bindPreviousPayersEvents()` extended

**Review findings:** 1 patch applied (high: delete handler unconditional clear). 3 deferred (stopPropagation redundancy, tab switch data loss, tab value unvalidated). 7 rejected (null guards present, by-design data loss on header click, coherent delete cancel, cosmetic attributes, collapse tab reset moot).

**Follow-up review recommended:** false

**Verification:** Manual — expand/collapse works, Config tab shows pre-populated edit form, Roster tab shows stub, Save updates payer name, Delete shows confirm row with correct microcopy, Confirm deletes, Cancel dismisses, nav-away clears state, zero console errors.

**Residual risks:** Unsaved edit form data lost on tab switch (by design for this story). `stopPropagation` redundancy is a latent issue for future document-level handlers.
