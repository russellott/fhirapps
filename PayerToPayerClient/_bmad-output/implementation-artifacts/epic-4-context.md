# Epic 4 Context: Results & Diagnostics

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A tester can inspect retrieved FHIR resources by type and in raw JSON, download the full payload as NDJSON, and diagnose API issues via the debug panel — completing the full testing workflow. This epic consumes the in-memory exchange result produced by Epic 3 and exposes it through three surfaces: the Results view (stat cards + resource explorer) in the main content area, the NDJSON download, and the debug panel that lives in the Exchange view and is populated throughout the exchange run.

## Stories

- Story 4.1: Results View & Stat Card Row
- Story 4.2: Resource Explorer & JSON Viewer
- Story 4.3: NDJSON Download
- Story 4.4: Debug Panel

## Requirements & Constraints

**Functional:**
- FR-20: Stat card row shows counts for all 8 resource types including zeros.
- FR-21: Resource explorer tab bar (8 tabs); Prev/Next navigation; view raw FHIR JSON per resource.
- FR-22: NDJSON download — one JSON object per line, all types; filename: `{payerName}_{memberLastName}-{memberFirstName}_{YYYY-MM-DD}.ndjson` (spaces → `-`). Date is the exchange run date.
- FR-23: Exchange results are session-only in-memory state; never written to `localStorage` or `sessionStorage`.
- FR-24: Collapsible debug panel on Exchange view; logs full HTTP request + response for each step; client secrets redacted.

**Non-Functional:**
- NFR-6: Never log `access_token` values to the browser console at any point.
- NFR-7: Client secret redaction — first 4 chars visible + `****` for remainder; applied by `DebugModule` before storing any entry.
- NFR-8: Accept FHIR resources conforming to US Core 3.1.1 or 6.1.0 without inspecting `meta.profile`.

## Technical Decisions

**Module ownership (AD-13):**
- `ResultsModule` owns resource count helpers and NDJSON serialization. It is independent — receives data passed to it by `UIModule`; never calls `ExchangeModule` or `ConfigModule` directly.
- `DebugModule` is a passive append-only sink. Only `ExchangeModule` calls `DebugModule.appendEntry({ step, request, response })`. `UIModule` calls `DebugModule.render()` to update the panel DOM.
- `UIModule` owns `showView('results')` and renders stat cards and the explorer via `innerHTML` template literals (AD-2).

**State (AD-3):**
- Exchange result lives in an in-memory JS variable inside `ExchangeModule`. Access via `ExchangeModule.hasResult()` (boolean gate) and a data getter. Session-scoped: cleared when a new exchange starts; lost on page reload. Never written to `localStorage` or `sessionStorage`.

**View routing (AD-9):**
- Results sidebar nav item is rendered `aria-disabled="true"` and non-interactive until `ExchangeModule.hasResult()` returns true. `UIModule.showView('results')` replaces `#app-main` innerHTML. No URL changes.

**DOM rendering (AD-2):**
- All DOM mutations use `element.innerHTML = html` with HTML built up in a `let html = ''` variable and assigned once, atomically. No `createElement` or `appendChild`.

**NDJSON serialization:**
- One `JSON.stringify(resource)` per line. Zero-count types contribute zero lines — no empty lines or placeholders. Blob download triggered via a temporary `<a>` element.

## UX & Interaction Patterns

**Results view layout:**
- Header area (always visible): "New Exchange" (secondary button) and "Download NDJSON" (primary/teal button).
- Stat card row: horizontal scrolling row of 8 cards, one per resource type. Each card shows type label + count. Zero-count cards use `text-secondary` color (`#6b7d8d`) but are not hidden. Clicking a card activates that type's tab in the explorer.
- Resource explorer below: two-column layout — resource list (left) + JSON viewer (right).

**Tab bar (UX-DR12):**
- 8 tabs, one per resource type. Zero-result tabs are rendered disabled, not hidden. Active tab indicated by a `primary` (#17b3b3) underline.

**JSON Viewer (UX-DR13):**
- Syntax-highlighted `<pre>` in a `#f8fafb` container; `lg` radius (12px); monospace font at 0.8rem; max height 480px with vertical scroll.
- Syntax colors: keys `#17b3b3`, string values `#22863a`, numbers `#005cc5`, booleans/null `#e36209`.
- Navigation bar: "← Prev" | "{n} of {total}" | "Next →"; keyboard ← → arrow keys also cycle within the active type.
- Copy button (top-right of viewer): copies displayed JSON to clipboard; shows "Copied!" for 1.5 s then reverts.

**Debug panel (UX-DR10):**
- Docked to the bottom of the Exchange view (not the Results view). Collapsed: 40px tall; expanded: 280px. CSS transition 150ms ease.
- Dark background `#263238` / `#1e272e` (alternating entry rows); green monospace text `#aed581`.
- Collapsed header: "▶ Debug Panel" label + entry count badge.
- Entry rows: `METHOD URL` + HTTP status code (2xx green, 4xx/5xx red). Expanding an entry shows full request headers, request body, response headers, response body.
- Panel open/closed state persists across Exchange view renders within the session. Entries are append-only within a session.

**Navigation:**
- "New Exchange" button navigates to Exchange view and preserves prior payer/member selection if both are still configured.
- Results sidebar tooltip when disabled: "Run an exchange to see results."
- Zero-result tab if activated: "No {ResourceType} resources returned by this Previous Payer."

## Cross-Story Dependencies

- Stories 4.1, 4.2, and 4.3 all gate on `ExchangeModule.hasResult() === true` — this state is set in Epic 3 Story 3.5. The Results nav item and "Download NDJSON" are unavailable until Epic 3 completes at least one full exchange.
- Story 4.4 (Debug Panel) depends on `ExchangeModule` calling `DebugModule.appendEntry()` after each step — those call sites live in the Epic 3 story implementations. The panel UI can be scaffolded independently; it will only receive entries once Epic 3 is wired.
- NDJSON filename requires payer name, member last/first name, and exchange run date: `ResultsModule` must receive or store these alongside resource data when the exchange completes (passed from `UIModule` after `ExchangeModule` returns its result).
- "New Exchange" button must restore prior payer/member selection: `UIModule` must retain that selection in memory across view transitions to Exchange.
