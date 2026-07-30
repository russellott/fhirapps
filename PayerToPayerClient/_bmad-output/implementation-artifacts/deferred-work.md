# Deferred Work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-app-shell-navigation.md`
  summary: localStorage SecurityError in private browsing crashes init() before the app renders.
  evidence: All localStorage calls are unguarded; Safari private mode and locked-down environments throw SecurityError on any localStorage access. Demo tool so low priority, but a real crash path.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-app-shell-navigation.md`
  summary: Results nav `tabindex="-1"` removes the item from tab order so keyboard users cannot discover it or its disabled tooltip.
  evidence: Spec-specified pattern, but WCAG 2.1 guidance for disabled controls recommends keeping them in tab order with aria-disabled so screen-reader users can discover what's coming; this trade-off should be revisited when a11y is prioritized.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-configmodule-cold-start.md`
  summary: seedFromDefaults throws TypeError if FHIR_SERVERS global is undefined (config.js load failure).
  evidence: config.js is a sync <script> in <head> so load failure already breaks the page before init() runs; low practical risk for demo tool but worth a typeof guard in future hardening.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-configmodule-cold-start.md`
  summary: updatePayer does not protect id or roster fields — caller can pass {id:'x'} and silently corrupt the entry's UUID.
  evidence: Story 1.5 will call updatePayer with only form-controlled fields (never id/roster); internal-only API makes this low risk, but could be hardened by explicitly deleting those keys from fields before Object.assign.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-configmodule-cold-start.md`
  summary: renderPreviousPayers reads roster.length without confirming roster is an Array; truthy non-array roster yields garbled member count.
  evidence: Only reachable via manual localStorage editing; all code paths that write roster use arrays. Low priority for demo tool.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-add-previous-payer.md`
  summary: fhirBaseUrl and tokenUrl fields accept any non-empty string; type="url" browser validation is bypassed because save is triggered by a button outside a <form> element.
  evidence: Spec specified empty-check validation only; invalid URLs will surface as network errors at exchange time. Reasonable to add `new URL()` validation in a hardening pass.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-add-previous-payer.md`
  summary: New-payer form provides no Escape key shortcut, no Enter-to-submit, and no focus management — inconsistent with settings drawer keyboard pattern.
  evidence: Settings drawer uses _settingsKeyHandler + initial focus move; new-payer form has neither. Low priority for demo tool but worth aligning for keyboard accessibility.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-add-previous-payer.md`
  summary: Required form fields lack aria-required="true" attribute; screen readers receive no signal that fields are required until validation fires.
  evidence: Visual asterisk is aria-hidden; no required attribute; WCAG 2.1 SC 1.3.1. Low priority for demo tool.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-add-previous-payer.md`
  summary: No duplicate payer detection before ConfigModule.addPayer; two entries with identical FHIR Base URLs are silently stored.
  evidence: Downstream exchange logic will need to handle ambiguous entries. Reasonable to add in a hardening pass.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-edit-delete-previous-payer.md`
  summary: `e.stopPropagation()` on delete button is redundant — header click already guards with `e.target.closest('.payer-delete-btn')`; latent trap for future document-level listeners.
  evidence: No functional bug today; stop-propagation prevents any future document-level click handler from firing for delete-button clicks.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-edit-delete-previous-payer.md`
  summary: Tab switch and header click silently discard unsaved edit form values — spec accepted this as intentional but worth revisiting for UX hardening.
  evidence: Full re-render on tab switch reads from ConfigModule, not DOM; any typed-but-unsaved values in ep-* fields are lost on every tab switch or card collapse.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-edit-delete-previous-payer.md`
  summary: btn.dataset.tab not validated against known values before assignment to _expandedPayerTab; unknown value renders empty tab content with no error.
  evidence: Only reachable via DOM manipulation; low practical risk for demo tool.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-config-export-import.md`
  summary: FileReader.onload callback has no null guards — if closeSettings() fires during async read, getElementById returns null and throws a TypeError.
  evidence: Race window is < 1ms for any plausible config file; dismissed as extremely low practical risk for demo tool. Fix: add `if (!errorEl) return;` after the getElementById block in the onload callback.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-roster-tab-member-table.md`
  summary: payer.roster is checked via `|| []` (falsy guard only); a truthy non-array value from corrupted localStorage would pass through and crash roster.forEach.
  evidence: Only reachable via manual localStorage corruption; all code paths that write roster use arrays. Low priority for demo tool. Fix: replace `payer.roster || []` with `Array.isArray(payer.roster) ? payer.roster : []`.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-roster-tab-member-table.md`
  summary: Roster table has no overflow-x: auto wrapper; on narrow viewports the 5-column table will overflow the payer card body without a horizontal scroll container.
  evidence: App is primarily desktop-oriented; narrow viewport use is minimal for this demo tool. Fix: wrap `.roster-table` in a `<div style="overflow-x:auto">` container.
