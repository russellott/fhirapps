# Epic 2 Context: Member Roster Management

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic 2 activates the Roster tab on each Previous Payer card. By the end of this epic a tester can add test Members with their FHIR demographics, edit them inline, and delete them with inline confirmation — populating the Roster data that Epic 3's Exchange flow will consume. The Roster tab already exists as a stub from Story 1.5 ("Member roster management coming in Epic 2."); this epic replaces that stub with a fully functional member table.

## Stories

- Story 2.1: Roster Tab & Member Table
- Story 2.2: Add Member to Roster
- Story 2.3: Edit & Delete Member

## Requirements & Constraints

- The Roster for each Previous Payer is displayed as a table with columns: **Name | Date of Birth | Gender | Member ID at Previous Payer | Actions**.
- When the roster is empty, an inline message with an "Add Member" CTA replaces the table.
- Adding a Member requires all five fields: first name, last name, date of birth (YYYY-MM-DD), gender (`male` | `female` | `other` | `unknown`), and Member ID at Previous Payer. Save is disabled until all fields are filled.
- Editing is inline row edit — a single row switches to editable fields; all other rows remain read-only. Only one row may be in edit mode at a time.
- Deleting triggers an inline confirmation within the row's action area — no browser `confirm()` or modal anywhere.
- After every add or delete, the payer card's compact header must reflect the updated member count.

## Technical Decisions

### Roster mutations via ConfigModule.updatePayer
There is no dedicated `addMember` or `deleteMember` method. All roster changes go through `ConfigModule.updatePayer(payerId, { roster: newRosterArray })`, which merges the `fields` object into the existing payer record and writes the updated config to `localStorage`. Callers own roster array construction — spread-append for add, filter for delete, map-replace for edit.

### Member ID assignment
New member objects get `id: crypto.randomUUID()`, assigned at creation and never reassigned. The `id` is never shown in the UI; it exists solely as a stable key for edit and delete operations.

### Reading the roster
Always read fresh from config: `ConfigModule.getConfig().previousPayers.find(p => p.id === payerId).roster`. Do not hold a reference across user interactions.

### Member data shape
```js
{
  id: string,                   // crypto.randomUUID() at creation
  firstName: string,
  lastName: string,
  dateOfBirth: string,          // 'YYYY-MM-DD'
  gender: 'male' | 'female' | 'other' | 'unknown',
  memberIdAtOldPayer: string
}
```

### DOM rendering rule
Accumulate HTML in a `let html = ''` variable and assign to `element.innerHTML` once, atomically. Never use `createElement` or `appendChild`.

## UX & Interaction Patterns

### Roster table
Columns: Name | Date of Birth | Gender | Member ID at Previous Payer | Actions. Each row's Actions column contains Edit and Delete icon buttons (minimum 40px touch target).

### Empty state
Exact microcopy: **"No members in this roster. Add a member to enable exchanges with {Payer Name}."** with an inline "Add Member" button. Renders inside the Roster tab body — not centered in the page.

### Add Member
A new editable row appends at the bottom of the table (or, when the roster is empty, replaces the empty state message). All five fields are required; Save carries the `disabled` attribute until all are non-empty. Cancel removes the unsaved row.

### Edit Member
Clicking Edit on a row replaces its cells with pre-filled editable inputs. All other rows remain read-only. Save calls `updatePayer` with the updated roster and returns the row to read-only. Cancel restores the original values without saving. Only one row may be in edit mode at a time — starting a second edit should either block or implicitly cancel the active edit. [ASSUMPTION: decide at implementation; check mockup for intended behavior.]

### Delete confirmation
Exact microcopy: **"Remove {First Last} from this roster?"** Renders inline within the row's action area, replacing the Edit/Delete buttons with a [Delete] button (danger style: `background: #ef4444`, white text) and a [Cancel] button (secondary style). No modal, no `confirm()`.

### Member count sync
The payer card compact header shows "{n} members" / "0 members". Re-render this count after every add or delete — either update the count chip in-place or re-render the full compact header row via `innerHTML`.

### Accessibility
All form inputs in the add/edit row require explicit `<label for="...">` bindings or `aria-label` attributes. Required fields carry `aria-required="true"` and a visible asterisk in the label. When the delete confirmation appears, focus moves to the Delete button within the row.

## Cross-Story Dependencies

- The Roster tab stub (payer card body, Roster tab) was created in Story 1.5. Story 2.1 replaces it entirely; Stories 2.2 and 2.3 add interactions on top of the rendered table.
- `ConfigModule.updatePayer(id, fields)` is established in Story 1.2 and must be stable before any story in this epic begins.
- Epic 3 Story 3.1 populates the Member dropdown from each payer's `roster` array. Every member saved by this epic must be in the exact AD-8 shape above or the Exchange setup panel will silently break.
