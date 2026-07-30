---
title: 'Story 2.3: Edit & Delete Member'
type: 'feature'
created: '2026-07-30'
status: 'done'
baseline_revision: '6fa5b44'
final_revision: 'see commit after review patch'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
---

<intent-contract>

## Intent

**Problem:** Existing member rows show Edit and Delete buttons that are not yet wired. There is no way to correct a member's data or remove them from the roster.

**Approach:** Add two new UIModule state properties (`_rosterEditingMemberId`, `_rosterDeleteConfirmMemberId`). Extend `renderRosterTab(payer)` so the member with a matching edit ID renders as an editable row, and the member with a matching delete-confirm ID shows inline confirmation in its Actions cell. Wire both action types in `bindPreviousPayersEvents()`. All state cleared on nav-away and on expanding a different payer card.

## Boundaries & Constraints

**Always:**
- Two new UIModule properties: `_rosterEditingMemberId: null` and `_rosterDeleteConfirmMemberId: null`, added after `_rosterAddingMember: false`
- Reset both in `showView()` nav-away guard alongside existing resets
- Reset both in the expand/collapse handler's else-branch
- Only one row in edit mode at a time; clicking Edit on any row sets `_rosterEditingMemberId` to that member's ID (implicitly cancels any prior edit, clears delete confirm, clears `_rosterAddingMember`)
- Only one row in delete-confirm at a time; clicking Delete on any row sets `_rosterDeleteConfirmMemberId` to that member's ID (clears edit, clears `_rosterAddingMember`)

**renderRosterTab() changes — in the member `forEach`:**
- If `UIModule._rosterEditingMemberId === member.id`: render edit row (IDs below)
- Else if `UIModule._rosterDeleteConfirmMemberId === member.id`: render read-only data cells + delete-confirm Actions cell
- Else: existing read-only row (unchanged)

**Edit row structure (5 cells to match 5-column header, matching the add form layout):**
- Cell 1 (Name): `<div style="display:flex;gap:4px;">` containing `id="me-first-name"` and `id="me-last-name"`, both `class="form-input" type="text"`, pre-filled with `member.firstName`/`member.lastName`, `aria-label` on each, `style="flex:1;min-width:0;"`, `autocomplete="off"`
- Cell 2 (DOB): `id="me-dob"` `class="form-input" type="date"` pre-filled with `member.dateOfBirth`, `aria-label="Date of birth"`
- Cell 3 (Gender): `id="me-gender"` `class="form-input"` select with 4 options (no placeholder), current gender pre-selected via `selected` attribute, `aria-label="Gender"`
- Cell 4 (Member ID): `id="me-member-id"` `class="form-input" type="text"` pre-filled with `member.memberIdAtOldPayer`, `aria-label="Member ID at Previous Payer"`, `autocomplete="off"`
- Cell 5 (Actions): Cancel (`id="me-cancel"` `class="btn btn-secondary"`) then Save (`id="me-save"` `class="btn btn-primary"`), both with `type="button"`; neither starts `disabled`

**Delete-confirm row structure:**
- Cells 1–4: identical read-only content as normal row
- Cell 5 (Actions): `<div class="roster-actions">` containing:
  - Confirmation text `<span>` with exact microcopy `"Remove {firstName} {lastName} from this roster?"` using `UIModule.escapeHtml` on both name parts; `style="font-size:12px;color:var(--color-text-secondary);white-space:nowrap;"`
  - Cancel button: `id="member-delete-cancel"` `class="roster-action-btn"` `type="button"` `data-member-id="…"`
  - Delete button: `id="member-delete-confirm"` `class="roster-action-btn"` `style="background:#ef4444;color:#fff;border-color:#ef4444;"` `type="button"` `data-member-id="…"` `data-payer-id="…"`

**bindPreviousPayersEvents() roster block additions** (appended inside the existing `if (_expandedPayerTab === 'roster')` block, after the add-form handlers):

Wire edit action buttons:
```js
document.querySelectorAll('.roster-action-btn[data-action="edit"]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    UIModule._rosterAddingMember = false;
    UIModule._rosterDeleteConfirmMemberId = null;
    UIModule._rosterEditingMemberId = btn.dataset.memberId;
    UIModule.showView('previous-payers');
  });
});
```

Wire delete action buttons:
```js
document.querySelectorAll('.roster-action-btn[data-action="delete"]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    UIModule._rosterAddingMember = false;
    UIModule._rosterEditingMemberId = null;
    UIModule._rosterDeleteConfirmMemberId = btn.dataset.memberId;
    UIModule.showView('previous-payers');
    var focusTarget = document.getElementById('member-delete-confirm');
    if (focusTarget) focusTarget.focus();
  });
});
```

Wire edit form Save/Cancel (guarded `if (UIModule._rosterEditingMemberId)`):
- `var meEditPayerId = UIModule._expandedPayerId; var meEditMemberId = UIModule._rosterEditingMemberId;` captured inside the block
- Cancel: `_rosterEditingMemberId = null; showView('previous-payers')`
- Save: validate all 5 fields (`.invalid` class on empties, return if any invalid); build updated member object preserving `member.id`; `roster.map(m => m.id === meEditMemberId ? updatedMember : m)`; `ConfigModule.updatePayer(meEditPayerId, { roster: updatedRoster })`; `_rosterEditingMemberId = null`; `showView('previous-payers')`

Wire delete confirm/cancel (guarded `if (UIModule._rosterDeleteConfirmMemberId)`):
- `var meDeletePayerId = UIModule._expandedPayerId; var meDeleteMemberId = UIModule._rosterDeleteConfirmMemberId;` captured inside the block
- Confirm: read config, `roster.filter(m => m.id !== meDeleteMemberId)`; `ConfigModule.updatePayer(meDeletePayerId, { roster: filteredRoster })`; `_rosterDeleteConfirmMemberId = null`; `showView('previous-payers')`
- Cancel: `_rosterDeleteConfirmMemberId = null`; `showView('previous-payers')`

**Edit form validation pattern:**
```js
var meFieldIds = ['me-first-name','me-last-name','me-dob','me-gender','me-member-id'];
meFieldIds.forEach(function(id) { var el=document.getElementById(id); if(el) el.classList.remove('invalid'); });
var meValid = true;
var meValues = {};
meFieldIds.forEach(function(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var val = el.tagName === 'SELECT' ? el.value : el.value.trim();
  meValues[id] = val;
  if (!val) { el.classList.add('invalid'); meValid = false; }
});
if (!meValid) return;
```
Then build the updated member:
```js
{ id: member.id, firstName: meValues['me-first-name'], lastName: meValues['me-last-name'],
  dateOfBirth: meValues['me-dob'], gender: meValues['me-gender'], memberIdAtOldPayer: meValues['me-member-id'] }
```

**Block If:** None — all decisions fully specified.

**Never:**
- No `window.confirm()`, `alert()`, or `prompt()`
- Do not add a `roster-action-btn:disabled` rule — action buttons are always active in read-only rows; the editing/confirm row replaces them entirely
- Do not change `id` when saving an edit — preserve `member.id` exactly
- Do not use `np-` / `ep-` / `ma-` ID prefixes for new fields — use `me-` for member-edit

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Click Edit on member row | `_rosterEditingMemberId = null` | That row replaces with editable inputs pre-filled with member data; other rows unchanged | — |
| Click Edit on a different row while editing | `_rosterEditingMemberId = X` | Row X returns to read-only, row Y switches to edit | Implicit cancel — no save |
| Click Cancel on edit row | Any field state | Row returns to read-only with original values | — |
| Click Save with all fields filled | 5 non-empty fields | Member updated; row returns to read-only with new values | — |
| Click Save with an empty field | One or more blank | `.invalid` class on empties; no save | Visual indication only |
| Click Delete on member row | `_rosterDeleteConfirmMemberId = null` | Actions cell shows "Remove {name} from this roster?" + Cancel + Delete (danger); focus moves to Delete button | — |
| Click Cancel on delete confirm | Confirm showing | Row returns to normal Edit/Delete buttons | — |
| Click Delete (confirm) | Confirm showing | Member removed from roster; table re-renders without that row; count in card header decrements | — |
| Click Edit while delete confirm showing | Any | Confirm cleared; clicked row enters edit mode | — |
| Click Delete while editing | Any | Edit cleared; clicked row shows delete confirm | — |
| Add form open, user clicks Edit | `_rosterAddingMember = true` | Add form dismissed; clicked row enters edit mode | — |

</intent-contract>

## Code Map

- `app.html` UIModule — add `_rosterEditingMemberId: null` and `_rosterDeleteConfirmMemberId: null` properties
- `app.html` UIModule.showView() — add two resets to nav-away guard
- `app.html` UIModule.renderRosterTab() — extend member forEach with editing/delete-confirm branch
- `app.html` UIModule.bindPreviousPayersEvents() expand handler — add two resets to else-branch
- `app.html` UIModule.bindPreviousPayersEvents() roster block — wire edit buttons, delete buttons, edit form, delete confirm

## Tasks & Acceptance

**Execution:**

- [ ] `app.html` UIModule — Add after `_rosterAddingMember: false,`:
  ```js
  _rosterEditingMemberId: null,
  _rosterDeleteConfirmMemberId: null,
  ```

- [ ] `app.html` UIModule.showView() — Add to nav-away guard:
  ```js
  UIModule._rosterEditingMemberId = null;
  UIModule._rosterDeleteConfirmMemberId = null;
  ```

- [ ] `app.html` UIModule.renderRosterTab() — Replace the `roster.forEach` block. For each member:
  - If `UIModule._rosterEditingMemberId === member.id`: emit edit row (5 cells with inputs pre-filled, `me-` IDs)
  - Else if `UIModule._rosterDeleteConfirmMemberId === member.id`: emit read-only data cells + delete-confirm Actions cell
  - Else: existing row (unchanged)

- [ ] `app.html` expand/collapse handler else-branch — Add:
  ```js
  UIModule._rosterEditingMemberId = null;
  UIModule._rosterDeleteConfirmMemberId = null;
  ```

- [ ] `app.html` bindPreviousPayersEvents() roster block — Append inside the `if (_expandedPayerTab === 'roster')` block (after existing add-form handlers):
  - Wire `.roster-action-btn[data-action="edit"]` querySelectorAll handler
  - Wire `.roster-action-btn[data-action="delete"]` querySelectorAll handler (with focus call after showView)
  - `if (UIModule._rosterEditingMemberId)` block: wire `#me-cancel`, wire `#me-save` with validation + `roster.map` update
  - `if (UIModule._rosterDeleteConfirmMemberId)` block: wire `#member-delete-confirm` with `roster.filter` delete, wire `#member-delete-cancel`

**Acceptance Criteria:**
- Given a roster has members, when I click Edit on a row, then that row switches to editable fields pre-filled with the member's current data; all other rows remain read-only
- Given the edit row is open, when I click Cancel, then the row returns to read-only with original values unchanged
- Given the edit row is open with all fields filled, when I click Save, then the member's data updates and the row returns to read-only showing new values
- Given the edit row is open with a field empty, when I click Save, then that field gets the `.invalid` class (red border) and no save occurs
- Given a roster has members, when I click Delete on a row, then the Actions cell of that row shows "Remove {First Last} from this roster?" with Cancel and Delete (danger red) buttons; focus moves to the Delete button
- Given the delete confirm is showing, when I click Cancel, then the row returns to normal Edit/Delete buttons
- Given the delete confirm is showing, when I click Delete, then that member is removed from the table and the payer card header count decrements
- Given editing row A, when I click Edit on row B, then row A returns to read-only and row B enters edit mode
- Given delete confirm on row A, when I click Delete on row B, then row A's confirm clears and row B shows confirm
- Given add form is open, when I click Edit on any member, then the add form dismisses and that row enters edit mode

## Design Notes

**Edit row cell count:** Same 5-column structure as the table header and all other rows; Name cell uses `display:flex` wrapper for first/last inputs, matching the add-form row pattern from Story 2.2.

**Delete danger button inline style:** Rather than a new CSS class, inline style `background:#ef4444;color:#fff;border-color:#ef4444;` keeps the spec self-contained and avoids polluting the stylesheet for a single-use component.

**`roster.map` for edit, `roster.filter` for delete:** These are the canonical immutable-update patterns for this codebase. Both produce new arrays passed to `ConfigModule.updatePayer`.

**Member count decrement:** Automatic — `renderPreviousPayers()` reads `payer.roster.length` from config to build the compact header; after `ConfigModule.updatePayer(…)` + `showView('previous-payers')`, the full re-render picks up the new count.

**No live-disabled Save on edit row:** The Add form needed live disabling because all 5 fields start blank. The Edit form starts with all fields pre-filled; clearing a field to save would be intentionally destructive. A click-time `.invalid` class is sufficient feedback.

## Verification

**Manual checks:**
- Click Edit → row becomes editable with correct pre-filled values
- Edit first name, click Save → table row shows updated name
- Click Edit, clear a required field, click Save → red border on empty field, no save
- Click Cancel → original values restored
- Click Delete → confirm message shows "Remove {first} {last} from this roster?" with Cancel and red Delete
- Click Cancel on confirm → returns to Edit/Delete buttons
- Click Delete (danger) → member gone from table, count in card header decremented
- Edit row A, click Edit row B → row A returns read-only, row B becomes editable
- Click Delete while add form open → add form gone, delete confirm shows on clicked row
- Open edit row, click Add Member → edit row gone, add form appears at bottom
- Zero console errors throughout

## Review Triage Log

### 2026-07-30 — Review pass
- intent_gap: 1
- bad_spec: 0
- patch: 1: (high 0, medium 1, low 0)
- defer: 1: (low 1)
- reject: 0
- addressed_findings:
  - `[medium]` `[patch]` `rosterAddBtn` handler only set `_rosterAddingMember = true` without clearing `_rosterEditingMemberId` / `_rosterDeleteConfirmMemberId`; opening the add form while an edit or delete-confirm row was active would render both rows simultaneously — fixed by adding the two null-assignments before the `_rosterAddingMember = true` line in the handler
- deferred_findings:
  - `[low]` `[defer]` `flex-wrap:wrap;gap:4px` was added to the delete-confirm actions div beyond what the spec specified; purely additive, no functional impact, fine to keep

## Auto Run Result

**Status:** done

**Summary:** Wired inline Edit and Delete for member rows. Edit replaces the clicked row with pre-filled inputs (5-cell flex layout matching the add form); validation on Save marks empty fields with `.invalid` class; `roster.map` updates the member preserving its `id`. Delete replaces the Actions cell with "Remove {name}?" confirm + Cancel + danger Delete; confirmed delete uses `roster.filter`. Focus moves to the Delete button on confirm render. Both state properties reset on nav-away and on expanding a different payer card. Review patch: Add Member handler was missing the clear of edit/delete-confirm state flags.

**Files changed:**
- `PayerToPayerClient/app.html` — modified; `_rosterEditingMemberId` and `_rosterDeleteConfirmMemberId` state props, showView nav-away guard, renderRosterTab forEach three-way branch, expand handler reset, new edit/delete wiring in bindPreviousPayersEvents roster block, Add Member button handler fix

**Review findings:** 1 patch applied (medium: missing state clear in Add Member handler). 1 deferred (low: additive flex style). 0 rejected.

**Follow-up review recommended:** false

**Residual risks:** Epic 2 fully complete. Epic 3 (Exchange Execution) is next.
