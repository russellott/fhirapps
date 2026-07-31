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

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-add-member-to-roster.md`
  summary: Collapsing the currently-expanded card (the `if` branch in the expand/collapse handler) does not reset `_rosterAddingMember`; only the `else` branch and the showView nav-away guard do.
  evidence: Self-healing because any subsequent expand runs the else-branch which clears the flag; no user-visible defect. Fix: add `UIModule._rosterAddingMember = false` to the `if` branch alongside `UIModule._expandedPayerId = null`.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-add-member-to-roster.md`
  summary: `function updateMaButtonState` is declared as a function declaration inside an `if` block in non-strict mode, which is ES5-implementation-defined behavior.
  evidence: All modern browsers apply identical ES2015 Annex B semantics; no practical risk for this demo tool. Fix: convert to `var updateMaButtonState = function() { ... }` for idiomatic ES5 style.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-edit-delete-member.md`
  summary: Delete-confirm actions `<div>` uses inline `style="flex-wrap:wrap;gap:4px;"` beyond the spec; purely additive, no functional impact.
  evidence: Accepted as-is; fine to remove in a cleanup pass.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-exchange-setup-panel.md`
  summary: renderExchange uses truthy check `config.previousPayers ?` instead of `Array.isArray`; a truthy non-array previousPayers would crash payers.forEach.
  evidence: Only reachable via manual localStorage corruption; all code paths that write previousPayers use arrays. Same low-priority pattern as deferred spec-2-1 roster guard.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-exchange-setup-panel.md`
  summary: No helper text explaining why the Previous Payer dropdown is empty when previousPayers array is empty; user sees only a disabled placeholder option with no guidance.
  evidence: Spec specified setup panel with dropdowns only; low UX impact for a demo tool since users can navigate to Previous Payers to add one.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-exchange-setup-panel.md`
  summary: Stale `_exchangeSelectedPayerId` or `_exchangeSelectedMemberId` after a payer is deleted from the Roster view; render silently falls back to disabled button state with no explanation.
  evidence: Same stale-config pattern as existing deferred items across other specs; low practical risk for demo tool.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-exchange-setup-panel.md`
  summary: `aria-live="polite"` on the step-tracker container won't announce step state changes driven by CSS class mutations; only text content changes inside the region are announced.
  evidence: Story 3.1 only renders static pending state; Story 3.2+ will add text content updates to step-detail elements which will be announced correctly. The class-only change gap will resolve naturally.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-exchangemodule-scaffold-system-token.md`
  summary: `payer.tokenUrl` undefined or empty with proxy enabled wraps as `?url=undefined`; fetch to the proxy receives a nonsense URL with no early diagnostic.
  evidence: Only reachable via corrupted localStorage or missing tokenUrl in payer config; tokenUrl is a required field in the Add Payer form. Same config-validation-gap pattern as deferred spec-1-4 URL validation item.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-exchangemodule-scaffold-system-token.md`
  summary: Null or undefined clientId/clientSecret serializes as the literal string `"null"` in URLSearchParams body; server receives wrong credentials with no obvious diagnostic.
  evidence: Only reachable via corrupted localStorage; credentials are required fields validated on save. Low practical risk for demo tool.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-exchangemodule-scaffold-system-token.md`
  summary: No AbortController timeout on the token fetch; a hung auth server leaves step 1 in-progress state indefinitely with no user recovery path.
  evidence: Realistic failure mode in connectathon/demo environments with flaky external servers. Fix: wrap fetch with AbortController + 15s timeout. Deferred as out-of-scope for Story 3.2; could be added in a hardening pass.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-5-resource-retrieval-exchange-completion.md`
  summary: Step detail sub-panel click behavior (FR-18) not implemented — completed/failed steps are not clickable to expand per-step detail panels.
  evidence: Adds significant UI complexity (accordion pattern, step-scoped detail data); step detail text is already visible inline in the step-detail span. Epic 4 or a hardening story could add this. The step tracker HTML (step-row-N IDs) provides stable hooks for click handlers.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-5-resource-retrieval-exchange-completion.md`
  summary: No AbortController timeout on the 8 parallel resource fetches in _retrieveResources; a single hung FHIR server can leave step 4 in-progress indefinitely.
  evidence: Same class of issue as the step 1 token fetch timeout (deferred in Story 3.2). Fix: wrap each per-type fetch with a shared AbortController + 15–30s timeout. Low priority for demo tool.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-results-view-stat-card-row.md`
  summary: Download NDJSON button renders as a primary CTA with no click handler and no disabled state, giving users zero feedback when clicked; wired in Story 4.3.
  evidence: By-spec deferral; Story 4.3 owns the download logic. A button with no click handler silently does nothing, which is poor UX. Fix: add disabled attribute and tooltip until Story 4.3 lands, or render the button only after Story 4.3 is implemented.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-results-view-stat-card-row.md`
  summary: Stat cards rendered as <div> elements with no role="button", tabindex, or keydown handler; unreachable by keyboard-only users.
  evidence: Consistent with the demo tool's existing accessibility level (see deferred spec-1-1 entry on tabindex). Fix: add role="button" tabindex="0" to each card and a keydown handler for Enter/Space in bindResultsEvents().

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-resource-explorer-json-viewer.md`
  summary: JSON syntax-highlight colors (#22863a strings, #005cc5 numbers) are GitHub Light theme hex values with no dark-mode CSS overrides; these colors have poor contrast on dark backgrounds.
  evidence: Colors are spec-specified (from UX-DR13); the background (`var(--color-surface-alt)`) adapts to dark mode but the span colors don't. Fix: add `@media (prefers-color-scheme: dark)` overrides for `.json-str` and `.json-num` using lighter tones (e.g. `#56d364` and `#79c0ff`).

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-resource-explorer-json-viewer.md`
  summary: Explorer tab bar uses `<button>` elements but lacks role="tablist" / role="tab" / aria-selected semantics; screen readers cannot identify the tab pattern.
  evidence: Pre-existing accessibility pattern across the app (see deferred spec-1-1 entries). Fix: add role="tablist" to the tab bar container, role="tab" and aria-selected="true/false" to each tab button.
