# Deferred Work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-app-shell-navigation.md`
  summary: localStorage SecurityError in private browsing crashes init() before the app renders.
  evidence: All localStorage calls are unguarded; Safari private mode and locked-down environments throw SecurityError on any localStorage access. Demo tool so low priority, but a real crash path.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-app-shell-navigation.md`
  summary: Results nav `tabindex="-1"` removes the item from tab order so keyboard users cannot discover it or its disabled tooltip.
  evidence: Spec-specified pattern, but WCAG 2.1 guidance for disabled controls recommends keeping them in tab order with aria-disabled so screen-reader users can discover what's coming; this trade-off should be revisited when a11y is prioritized.
