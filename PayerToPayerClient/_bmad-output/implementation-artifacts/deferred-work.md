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
