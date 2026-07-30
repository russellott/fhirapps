---
title: 'Story 2.1: Roster Tab & Member Table'
type: 'feature'
created: '2026-07-30'
status: 'done'
baseline_revision: '0182ac3'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
---

<intent-contract>

## Intent

**Problem:** The Roster tab on each Previous Payer card shows a stub message ("Member roster management coming in Epic 2.") — there is no way to see or interact with a payer's member roster.

**Approach:** Replace the roster stub in `renderEditPayerForm()` with a call to a new `renderRosterTab(payer)` helper. The helper renders either an empty state (with "Add Member" CTA) or a full member table (columns: Name, Date of Birth, Gender, Member ID at Previous Payer, Actions). Edit and Delete buttons are rendered in each row but not yet wired — Stories 2.2 and 2.3 will add those handlers. No new UIModule state properties needed in this story.

## Boundaries & Constraints

**Always:**
- `renderRosterTab(payer)` is a UIModule method that returns an HTML string; it is called from the `else` branch of `renderEditPayerForm()` in place of the current stub
- Read roster fresh each time: `payer.roster || []` — the `payer` object is already passed in from `renderEditPayerForm()`, which already reads from config
- Empty state exact microcopy: `"No members in this roster. Add a member to enable exchanges with {Payer Name}."` — use `UIModule.escapeHtml(payer.name)` for the payer name
- Non-empty state: render a `<table class="roster-table">` with `<thead>` and `<tbody>`; columns in order: Name | Date of Birth | Gender | Member ID at Previous Payer | Actions
- Name column: `{firstName} {lastName}` concatenated, each part `escapeHtml()`-escaped
- "Add Member" button in both states: `id="roster-add-btn"`, `data-payer-id="{payer.id}"` (Stories 2.2/2.3 will wire it); empty state renders it inside `.roster-empty-state`; non-empty renders it in a `.roster-actions-bar` div above the table
- Each member row has two action buttons: `class="roster-action-btn"` with `data-member-id="{member.id}"`, `data-payer-id="{payer.id}"`, `data-action="edit"` or `data-action="delete"`; not wired in this story
- All user-controlled values (payer.name, member fields, IDs) must be passed through `UIModule.escapeHtml()` when placed in HTML attribute values or text content
- `UIModule.escapeHtml()` is already implemented in UIModule (Story 1.2)

**Block If:** None — all decisions fully specified.

**Never:**
- Do not wire the "Add Member", Edit, or Delete buttons in this story — those are Stories 2.2 and 2.3
- Do not add any new UIModule state properties — this story is rendering-only
- Do not change `bindPreviousPayersEvents()` — no new event bindings needed
- No `window.confirm()`, `alert()`, or `prompt()`

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Roster tab, empty roster | `payer.roster === []` | Empty state message with payer name; "Add Member" button | — |
| Roster tab, 1 member | 1 member in roster | Table with header row + 1 data row; Edit/Delete buttons in Actions column | — |
| Roster tab, multiple members | N members in roster | Table with N data rows; "Add Member" button above table | — |
| Payer name contains `<` | `payer.name = "A&B <Payer>"` | `escapeHtml()` prevents XSS in empty state message and button data attribute | escapeHtml guards |
| Member name contains `<` | `member.firstName = "<script>"` | `escapeHtml()` prevents XSS in table cell text | escapeHtml guards |
| Member missing a field | `member.dateOfBirth = undefined` | `escapeHtml(member.dateOfBirth || '')` renders empty string, not "undefined" | Default to `''` |

</intent-contract>

## Code Map

- `app.html` `<style>` — add roster table, empty state, action button CSS
- `app.html` UIModule.renderEditPayerForm() — replace stub `else` branch with `UIModule.renderRosterTab(payer)` call
- `app.html` UIModule — add `renderRosterTab(payer)` method

## Tasks & Acceptance

**Execution:**

- [ ] `app.html` CSS — Add to `<style>` block (after the existing `.roster-stub` rule from Story 1.5):
  ```css
  .roster-container { padding: 12px 16px 16px; }
  .roster-actions-bar { margin-bottom: 10px; }
  .roster-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .roster-table th { text-align: left; padding: 6px 8px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-secondary); border-bottom: 1px solid var(--color-border); }
  .roster-table td { padding: 8px 8px; border-bottom: 1px solid var(--color-border); color: var(--color-text-primary); vertical-align: middle; }
  .roster-table tbody tr:last-child td { border-bottom: none; }
  .roster-empty-state { padding: 20px 16px; }
  .roster-empty-state p { font-size: 14px; color: var(--color-text-secondary); margin-bottom: 12px; }
  .roster-actions { display: flex; gap: 6px; }
  .roster-action-btn { background: none; border: 1px solid var(--color-border); border-radius: 4px; padding: 3px 8px; font-size: 12px; cursor: pointer; color: var(--color-text-secondary); white-space: nowrap; }
  .roster-action-btn:hover { color: var(--color-text-primary); background: var(--color-surface-alt); }
  ```

- [ ] `app.html` UIModule — Add `renderRosterTab(payer)` method (insert before or after `renderEditPayerForm()`):
  ```js
  renderRosterTab: function(payer) {
    var roster = payer.roster || [];
    var html = '';
    if (roster.length === 0) {
      html += '<div class="roster-empty-state">';
      html += '<p>No members in this roster. Add a member to enable exchanges with ' + UIModule.escapeHtml(payer.name) + '.</p>';
      html += '<button id="roster-add-btn" class="btn btn-secondary" type="button" data-payer-id="' + UIModule.escapeHtml(payer.id) + '">Add Member</button>';
      html += '</div>';
    } else {
      html += '<div class="roster-container">';
      html += '<div class="roster-actions-bar">';
      html += '<button id="roster-add-btn" class="btn btn-secondary" type="button" data-payer-id="' + UIModule.escapeHtml(payer.id) + '">Add Member</button>';
      html += '</div>';
      html += '<table class="roster-table">';
      html += '<thead><tr>';
      html += '<th>Name</th><th>Date of Birth</th><th>Gender</th><th>Member ID at Previous Payer</th><th>Actions</th>';
      html += '</tr></thead>';
      html += '<tbody>';
      roster.forEach(function(member) {
        html += '<tr>';
        html += '<td>' + UIModule.escapeHtml(member.firstName || '') + ' ' + UIModule.escapeHtml(member.lastName || '') + '</td>';
        html += '<td>' + UIModule.escapeHtml(member.dateOfBirth || '') + '</td>';
        html += '<td>' + UIModule.escapeHtml(member.gender || '') + '</td>';
        html += '<td>' + UIModule.escapeHtml(member.memberIdAtOldPayer || '') + '</td>';
        html += '<td><div class="roster-actions">';
        html += '<button class="roster-action-btn" data-member-id="' + UIModule.escapeHtml(member.id) + '" data-payer-id="' + UIModule.escapeHtml(payer.id) + '" data-action="edit" type="button">Edit</button>';
        html += '<button class="roster-action-btn" data-member-id="' + UIModule.escapeHtml(member.id) + '" data-payer-id="' + UIModule.escapeHtml(payer.id) + '" data-action="delete" type="button">Delete</button>';
        html += '</div></td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      html += '</div>';
    }
    return html;
  },
  ```

- [ ] `app.html` UIModule.renderEditPayerForm() — Replace the roster stub `else` branch:
  - Old: `html += '<div class="payer-form"><p class="roster-stub">Member roster management coming in Epic 2.</p></div>';`
  - New: `html += UIModule.renderRosterTab(payer);`

**Acceptance Criteria:**
- Given I expand a payer card and click the Roster tab, and the payer has no members, then the roster body shows "No members in this roster. Add a member to enable exchanges with [Payer Name]." and an "Add Member" button; the old stub text is gone
- Given I expand a payer card and click the Roster tab, and the payer has members, then a table appears with columns Name, Date of Birth, Gender, Member ID at Previous Payer, Actions; each existing member appears as a row
- Given a member row exists, then the Actions column shows Edit and Delete buttons (not yet functional)
- Given a payer with members is shown, then an "Add Member" button appears above the table (not yet functional)
- Given no members exist, when I click the Roster tab on a different payer with members, then that payer's table renders correctly (state not leaked)
- Given the seeded payers from `config.js` all have `roster: []`, then all their Roster tabs show the empty state

## Design Notes

**Rendering approach:** `renderRosterTab()` is a pure HTML-generating method with no side effects. It is called inside `renderEditPayerForm()`, which is itself called from `renderPreviousPayers()`. The entire payer list renders via a single `main.innerHTML = html` assignment — no incremental DOM updates.

**"Add Member" button `id="roster-add-btn"`:** Since only one payer card can be expanded at a time (single `_expandedPayerId`), there is always at most one "Add Member" button in the DOM. Using a simple stable ID (rather than a payer-suffixed ID) makes it easier for Stories 2.2 and 2.3 to find it. The `data-payer-id` attribute carries the payer context for handlers that need it.

**Story 2.2 entry point:** Story 2.2 will add a block to `bindPreviousPayersEvents()` like `if (_expandedPayerId && _expandedPayerId !== 'new' && _expandedPayerTab === 'roster')` and wire `#roster-add-btn`, the add form save/cancel, etc. Story 2.3 will wire the `.roster-action-btn` buttons.

## Verification

**Manual checks:**
- Expand any payer → Roster tab → empty state shows correct payer name in message
- Add a member manually to localStorage (via DevTools), reload → Roster tab shows the member row
- Expand two different payers sequentially → correct roster shown each time, no state leak
- Zero console errors throughout

## Spec Change Log

## Review Triage Log

### 2026-07-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 2, low 0)
- defer: 2: (low 2)
- reject: many
- addressed_findings:
  - `[medium]` `[patch]` Added `scope="col"` to all `<th>` elements — screen readers cannot reliably associate data cells with column headers without it
  - `[medium]` `[patch]` Added `aria-label="Edit/Delete {firstName} {lastName}"` to action buttons — without contextual labels, screen reader users hear a list of identical "Edit"/"Delete" announcements; extracted `memberName` as a local variable to avoid escaping the name twice

## Auto Run Result

**Status:** done

**Summary:** Replaced the Roster tab stub with a functional member table. Empty state shows exact microcopy with payer name and "Add Member" CTA; non-empty state renders a 5-column table with Edit/Delete action buttons per row. Buttons are rendered but not yet wired (Stories 2.2 and 2.3 will add handlers). Review patches: `scope="col"` on headers, contextual `aria-label` on action buttons.

**Files changed:**
- `PayerToPayerClient/app.html` — modified; roster table/empty-state CSS, `renderRosterTab()` method, stub replacement

**Review findings:** 2 patches applied (both medium: accessibility — th scope and button aria-labels). 2 deferred (Array.isArray guard, table overflow-x). Many rejected (by-design unwired buttons, null guards for structurally-guaranteed IDs, pagination scale, etc.).

**Follow-up review recommended:** false

**Verification:** Manual checks per spec — empty state renders with correct payer name, seeded payers all show empty state, member data from localStorage renders in table rows. Zero console errors.

**Residual risks:** Action buttons (Add Member, Edit, Delete) are not yet wired — expected; Stories 2.2 and 2.3 complete the interactions.
