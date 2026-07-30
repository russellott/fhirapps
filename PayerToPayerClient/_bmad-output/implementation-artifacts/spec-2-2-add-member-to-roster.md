---
title: 'Story 2.2: Add Member to Roster'
type: 'feature'
created: '2026-07-30'
status: 'done'
baseline_revision: '5928972'
final_revision: 'see commit after review patch'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
---

<intent-contract>

## Intent

**Problem:** The "Add Member" button on the Roster tab is not wired — clicking it does nothing. There is no way to add members to a Previous Payer's roster.

**Approach:** Add `_rosterAddingMember: false` state to UIModule. Modify `renderRosterTab(payer)` to render an inline add-form row (or table) when that flag is true. Wire `#roster-add-btn` in `bindPreviousPayersEvents()`. On Save: validate all 5 required fields, build a member object with `crypto.randomUUID()`, append it to the payer's roster via `ConfigModule.updatePayer()`, and re-render. Save button is disabled until all fields are non-empty (live `input`/`change` check).

## Boundaries & Constraints

**Always:**
- New UIModule property: `_rosterAddingMember: false` (alongside the other UIModule state properties)
- Reset `_rosterAddingMember = false` in two places: (a) the `showView()` nav-away guard (`if (name !== 'previous-payers')`), and (b) the payer card expand handler's `else` branch (where `_expandedPayerId` is set to a new payer ID)
- `renderRosterTab(payer)` must check `_rosterAddingMember` and render differently when true:
  - `roster.length === 0` AND adding: render a full table (`<thead>` + one form `<tr>`) instead of the empty state; no "Add Member" button (it would re-open the form)
  - `roster.length > 0` AND adding: render the normal table with member rows, then append a form `<tr>` at the bottom; no "Add Member" button
  - Not adding (either case): existing behavior unchanged
- Add form row HTML IDs: `ma-first-name`, `ma-last-name`, `ma-dob`, `ma-gender`, `ma-member-id`, `member-add-cancel`, `member-add-save`
- Gender `<select>`: starts with a `<option value="" disabled selected>Select gender</option>` placeholder; then `male`, `female`, `other`, `unknown`
- Save button starts `disabled`; a helper wired to `input`/`change` on all 5 fields enables it only when all are non-empty (trimmed for text inputs; non-empty value for date and select)
- On Save: read values, build `{ id: crypto.randomUUID(), firstName, lastName, dateOfBirth, gender, memberIdAtOldPayer }`, read current roster fresh from `ConfigModule.getConfig().previousPayers.find(p => p.id === payerId).roster`, spread-append new member, call `ConfigModule.updatePayer(payerId, { roster: updatedRoster })`, set `_rosterAddingMember = false`, call `UIModule.showView('previous-payers')`
- On Cancel: set `_rosterAddingMember = false`, call `UIModule.showView('previous-payers')`
- All form inputs need `aria-label` (table row has no visible label column): e.g., `aria-label="First name"`, `aria-label="Last name"`, `aria-label="Date of birth"`, `aria-label="Gender"`, `aria-label="Member ID at Previous Payer"`
- All inputs need `aria-required="true"` on the five required fields
- Add one new CSS rule: `button:disabled, .btn:disabled { opacity: 0.5; cursor: not-allowed; }` — used for the Save button's disabled state

**Block If:** None — all decisions fully specified.

**Never:**
- Do not add `id` or any payer field (fhirBaseUrl, clientId, etc.) to the member object
- Do not call `ConfigModule.addPayer()` — member addition uses `ConfigModule.updatePayer()` with a new roster array
- No `window.confirm()`, `alert()`, or `prompt()`
- Do not re-use the `np-` or `ep-` ID prefixes — use `ma-` for member-add fields

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Click "Add Member" (empty roster) | `roster.length === 0`, `_rosterAddingMember = false` | Empty state replaced by table with header row + add form row; no "Add Member" button visible | — |
| Click "Add Member" (roster has members) | `roster.length > 0`, `_rosterAddingMember = false` | Existing member rows shown + add form row at bottom; no "Add Member" button | — |
| Fields partially filled | Some of 5 fields empty | Save stays disabled | — |
| All 5 fields filled | All non-empty | Save button enables | — |
| Click Save (all valid) | All 5 fields non-empty | New member appears in table; `_rosterAddingMember = false`; card header count increments | — |
| Click Cancel | Any form state | Form dismissed; roster unchanged; `_rosterAddingMember = false` | — |
| Expand different payer card | `_rosterAddingMember = true` | `_rosterAddingMember` reset to false; new card opens on Config tab | — |
| Navigate away | `_rosterAddingMember = true` | `_rosterAddingMember` reset via showView() nav-away guard | — |

</intent-contract>

## Code Map

- `app.html` `<style>` — add `button:disabled, .btn:disabled` rule
- `app.html` UIModule — add `_rosterAddingMember: false` property
- `app.html` UIModule.showView() — add `UIModule._rosterAddingMember = false` to nav-away guard
- `app.html` UIModule.renderRosterTab() — extend to handle `_rosterAddingMember === true` (form row, no Add button)
- `app.html` UIModule.bindPreviousPayersEvents() — three changes: (1) add `_rosterAddingMember = false` to payer expand handler's else branch; (2) add new roster-tab wiring block

## Tasks & Acceptance

**Execution:**

- [ ] `app.html` CSS — Add to `<style>` block (after `.roster-action-btn:hover`):
  ```css
  button:disabled, .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  ```

- [ ] `app.html` UIModule — Add `_rosterAddingMember: false,` property after `_importPendingConfig: null,`

- [ ] `app.html` UIModule.showView() — Add `UIModule._rosterAddingMember = false;` to the `if (name !== 'previous-payers')` guard block (alongside the existing `_expandedPayerId = null` etc.)

- [ ] `app.html` UIModule.renderRosterTab() — Extend to handle adding state:
  - When `_rosterAddingMember === false`: existing behavior (unchanged)
  - When `_rosterAddingMember === true`: build a `var addRow` string containing the form `<tr>`:
    ```js
    var addRow = '<tr id="member-add-row">';
    addRow += '<td><input id="ma-first-name" class="form-input" type="text" aria-label="First name" aria-required="true" autocomplete="off"></td>';
    addRow += '<td><input id="ma-last-name" class="form-input" type="text" aria-label="Last name" aria-required="true" autocomplete="off"></td>';
    addRow += '<td><input id="ma-dob" class="form-input" type="date" aria-label="Date of birth" aria-required="true"></td>';
    addRow += '<td><select id="ma-gender" class="form-input" aria-label="Gender" aria-required="true">';
    addRow += '<option value="" disabled selected>Select gender</option>';
    addRow += '<option value="male">male</option><option value="female">female</option>';
    addRow += '<option value="other">other</option><option value="unknown">unknown</option>';
    addRow += '</select></td>';
    addRow += '<td><input id="ma-member-id" class="form-input" type="text" aria-label="Member ID at Previous Payer" aria-required="true" autocomplete="off"></td>';
    addRow += '<td><div class="roster-actions">';
    addRow += '<button id="member-add-cancel" class="btn btn-secondary" type="button">Cancel</button>';
    addRow += '<button id="member-add-save" class="btn btn-primary" type="button" disabled>Save</button>';
    addRow += '</div></td>';
    addRow += '</tr>';
    ```
  - If adding AND `roster.length === 0`: render full table with header + `addRow` (no "Add Member" button, no empty-state message)
  - If adding AND `roster.length > 0`: render `.roster-container` with table containing header + existing member rows + `addRow` (no "Add Member" button)

- [ ] `app.html` UIModule.bindPreviousPayersEvents() — In the payer expand/collapse forEach handler, add `UIModule._rosterAddingMember = false;` to the `else` branch where a new payer is expanded (alongside `UIModule._expandedPayerTab = 'config'` and `UIModule._deleteConfirmPayerId = null`)

- [ ] `app.html` UIModule.bindPreviousPayersEvents() — After the existing `if (_expandedPayerId && !== 'new' && _expandedPayerTab === 'config')` block (just before `},` closing `bindPreviousPayersEvents`), add a new roster-tab wiring block:
  ```js
  // Wire roster add-member form (Story 2.2)
  if (UIModule._expandedPayerId && UIModule._expandedPayerId !== 'new' && UIModule._expandedPayerTab === 'roster') {
    var rosterAddBtn = document.getElementById('roster-add-btn');
    if (rosterAddBtn) {
      rosterAddBtn.addEventListener('click', function() {
        UIModule._rosterAddingMember = true;
        UIModule.showView('previous-payers');
      });
    }

    if (UIModule._rosterAddingMember) {
      var maPayerId = UIModule._expandedPayerId;

      function updateMaButtonState() {
        var fn = document.getElementById('ma-first-name');
        var ln = document.getElementById('ma-last-name');
        var dob = document.getElementById('ma-dob');
        var gen = document.getElementById('ma-gender');
        var mid = document.getElementById('ma-member-id');
        var saveBtn = document.getElementById('member-add-save');
        if (!fn || !saveBtn) return;
        saveBtn.disabled = !(fn.value.trim() && ln.value.trim() && dob.value && gen.value && mid.value.trim());
      }

      ['ma-first-name','ma-last-name','ma-dob','ma-gender','ma-member-id'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', updateMaButtonState);
          el.addEventListener('change', updateMaButtonState);
        }
      });

      var maCancelBtn = document.getElementById('member-add-cancel');
      if (maCancelBtn) {
        maCancelBtn.addEventListener('click', function() {
          UIModule._rosterAddingMember = false;
          UIModule.showView('previous-payers');
        });
      }

      var maSaveBtn = document.getElementById('member-add-save');
      if (maSaveBtn) {
        maSaveBtn.addEventListener('click', function() {
          var fn = document.getElementById('ma-first-name').value.trim();
          var ln = document.getElementById('ma-last-name').value.trim();
          var dob = document.getElementById('ma-dob').value;
          var gen = document.getElementById('ma-gender').value;
          var mid = document.getElementById('ma-member-id').value.trim();
          if (!fn || !ln || !dob || !gen || !mid) return;
          var config = ConfigModule.getConfig();
          var payer = config.previousPayers.find(function(p) { return p.id === maPayerId; });
          if (!payer) return;
          var roster = Array.isArray(payer.roster) ? payer.roster.slice() : [];
          roster.push({ id: crypto.randomUUID(), firstName: fn, lastName: ln, dateOfBirth: dob, gender: gen, memberIdAtOldPayer: mid });
          ConfigModule.updatePayer(maPayerId, { roster: roster });
          UIModule._rosterAddingMember = false;
          UIModule.showView('previous-payers');
        });
      }
    }
  }
  ```

**Acceptance Criteria:**
- Given the Roster tab is active, when I click "Add Member", then an inline form row appears with fields for First Name, Last Name, Date of Birth, Gender (dropdown), and Member ID at Previous Payer; the "Add Member" button disappears
- Given the add form is open, when I fill only 3 of 5 fields, then Save remains disabled
- Given all 5 fields are filled, when all have non-empty values, then Save enables
- Given all 5 fields are filled and I click Save, then the new member appears as a read-only row in the table; the form row disappears; the payer card header shows the incremented count
- Given the add form is open, when I click Cancel, then the form row disappears and the roster is unchanged
- Given the add form is open on Payer A, when I click Payer B's card header to expand it, then Payer A collapses, Payer B opens on Config tab, and the add form state is cleared
- Given the add form is open, when I navigate to Exchange via sidebar, then returning to Previous Payers shows the roster without an open form

## Design Notes

**Table structure when adding to an empty roster:** Rendering a table with header + form row (instead of the empty-state div) avoids a structural layout change between empty and non-empty states. It ensures the column widths are set by the header, making the form row predictably aligned.

**`updateMaButtonState` as a named function inside the if-block:** Defined as a `function` declaration inside the event-wiring block so it can be passed to multiple `addEventListener` calls. It reads from the DOM each time — no closure over input values needed.

**Save guard on maSaveBtn handler:** The `if (!fn || !ln || !dob || !gen || !mid) return;` guard is defense-in-depth — the button's `disabled` state already prevents click events in most browsers, but the guard protects against programmatic triggers.

**Roster fresh-read pattern:** `ConfigModule.getConfig().previousPayers.find(...)` is called inside the Save handler, not captured at wiring time. This ensures no stale reference if other tabs have modified config between the form open and Save click.

## Verification

**Manual checks:**
- Expand payer → Roster tab → "Add Member" shows; click → form row appears, Save is disabled
- Fill all 5 fields → Save enables
- Click Save → member appears in table with correct data; header count increments
- Click Cancel → form gone, roster unchanged
- Add member to empty roster → table appears with new row (not empty state message)
- Open add form, expand different payer card → form gone, new card on Config tab
- Zero console errors throughout

## Review Triage Log

### 2026-07-30 — Review pass
- intent_gap: 0
- bad_spec: 1
- patch: 1: (high 1, medium 0, low 0)
- defer: 2: (low 2)
- reject: 0
- addressed_findings:
  - `[high]` `[patch]` `addRow` had 6 `<td>` cells (separate First Name and Last Name cells) while the table header has 5 columns — fixed by combining both name inputs into a single `<td>` with a flex div wrapper (`display:flex;gap:4px`); `updateMaButtonState` and Save handler unchanged since they query by ID
- deferred_findings:
  - `[low]` `[defer]` Collapsing the same card (if-branch in expand handler) does not reset `_rosterAddingMember`; self-healing since any subsequent expand (else-branch) clears it; no user-visible defect
  - `[low]` `[defer]` `function updateMaButtonState` declaration inside an if-block is ES5-implementation-defined; modern browsers apply ES2015 Annex B semantics uniformly so there is no practical risk; could be converted to `var updateMaButtonState = function(){}` in a future pass

## Auto Run Result

**Status:** done

**Summary:** Wired the full Add Member flow on the Roster tab. Clicking Add Member shows an inline form row (empty-roster case: full table replaces empty state; non-empty case: form row appended below existing members). Save is disabled until all five required fields are non-empty (live `input`/`change` wiring). On Save: member appended via `ConfigModule.updatePayer`; `_rosterAddingMember` reset; view re-renders with updated count. Cancel resets state without saving. Review patch: collapsed first/last name `addRow` cells from 2 `<td>` to 1 `<td>` (flex wrapper) to match the 5-column header.

**Files changed:**
- `PayerToPayerClient/app.html` — modified; disabled-button CSS, `_rosterAddingMember` state property, showView nav-away reset, renderRosterTab extended for add-form row, expand handler reset, new roster-wiring block in bindPreviousPayersEvents

**Review findings:** 1 patch applied (high: column count mismatch in addRow). 2 deferred (both low: collapse-handler missing reset, function-in-block style). 0 rejected.

**Follow-up review recommended:** false

**Residual risks:** Action buttons (Edit, Delete) on existing member rows are not yet wired — expected; Story 2.3 completes those interactions.
