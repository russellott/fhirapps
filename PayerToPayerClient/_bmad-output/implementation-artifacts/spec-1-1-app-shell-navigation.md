---
title: 'Story 1.1: App Shell & Navigation Structure'
type: 'feature'
created: '2026-07-29'
status: 'in-review'
baseline_revision: '7c25198deb85f2d5e1c7113f8f14d0b5f1447469'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: ['oversized']
---

<intent-contract>

## Intent

**Problem:** `app.html`, `config.js`, and `index.html` do not exist; the P2P Exchange Tester has no runnable entry point, no CSS token system, no navigation shell, and no module scaffold.

**Approach:** Create `config.js` (P2P `FHIR_SERVERS` seed entries), `app.html` (full SPA shell with CSS token system, layout, `UIModule`, four module stubs, and `init()`), `PayerToPayerClient/index.html` (redirect to `app.html`), and update the monorepo root `index.html` to add the P2P card.

## Boundaries & Constraints

**Always:**
- All CSS in `<style>` in `<head>`; all JS in a single `<script>` at end of `<body>`; only `config.js` is an external script file
- No `import`/`export`/`type="module"` — all code is global scope
- DOM mutations use `element.innerHTML = html`; accumulate HTML in `let html = ''`, assign once, atomically
- `init()` is a named synchronous function called immediately at the bottom of the script block; no `DOMContentLoaded` wrapper
- CSS custom property token system: `--color-primary: #17b3b3`, `--color-page-bg: #f0f5f9`, `--color-surface: #ffffff` on `:root`; dark mode via `@media(prefers-color-scheme:dark)` with `:root[data-theme="dark"]` / `:root[data-theme="light"]` overrides
- `FHIR_SERVERS` in `config.js` must use the AD-8 P2P field set: `{name, fhirBaseUrl, tokenUrl, clientId, clientSecret, tokenAuthMethod, useProxy}` — no `redirectUri`, `usePkce`, `authorizeUrl`
- Sidebar collapse state: `localStorage['p2pSidebarCollapsed']`; `'true'` = collapsed, absent or `'false'` = expanded
- `ExchangeModule.hasResult()` returns `false` in this story so Results nav renders `aria-disabled="true"`
- `referrerPolicy: 'no-referrer'` on all external fetch calls — no external calls in this story, but the pattern must be visible in any fetch written

**Block If:** None identified — all decisions are fully specified.

**Never:**
- No `createElement`, `appendChild`, or other DOM API manipulation
- No ES modules, no `type="module"` on script tags
- No Bootstrap, jQuery, Axios, fhirclient, or any external CSS/JS library
- No hash routing, `history.pushState`, or URL changes on nav clicks
- Do not copy PatientAccess auth fields (`launchUri`, `iss`, `usePkce`, `authorizeUrl`, `redirectUri`) into P2P `FHIR_SERVERS`
- Do not implement Settings drawer, ConfigModule persistence, or payer CRUD in this story — stub only

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| First load, no sidebar state | `localStorage['p2pSidebarCollapsed']` absent | Sidebar renders at 220px; nav labels visible | — |
| Sidebar was collapsed | `localStorage['p2pSidebarCollapsed'] === 'true'` | Sidebar renders at 56px (icon-only) on load | — |
| Click "Previous Payers" nav | user clicks active-by-default nav item | `UIModule.showView('previous-payers')` called; stub view renders; item active | — |
| Click "Exchange" nav | user clicks nav item | `UIModule.showView('exchange')` called; stub view renders; item active | — |
| Click "Results" nav item | `aria-disabled="true"` on element | Navigation blocked; no `showView` call; tooltip visible on hover | — |
| Collapse toggle click | sidebar expanded | Sidebar width → 56px; labels hidden; `localStorage['p2pSidebarCollapsed'] = 'true'` | — |
| Expand toggle click | sidebar collapsed | Sidebar width → 220px; labels visible; `localStorage.removeItem('p2pSidebarCollapsed')` or set `'false'` | — |

</intent-contract>

## Code Map

- `config.js` — new file; P2P `FHIR_SERVERS` exports; `isLocalhost`, `APP_BASE_URL`, `CORS_PROXY_URL` environment detection
- `app.html` — new file; entire SPA: CSS token system + shell layout + `ConfigModule` stub + `ExchangeModule` stub + `ResultsModule` stub + `DebugModule` stub + `UIModule` + `init()`
- `index.html` — new file; simple `<meta http-equiv="refresh">` redirect to `app.html`
- `c:\Users\rott\Documents\GitHub\fhirapps\index.html` — existing monorepo launcher; add PayerToPayerClient card

## Tasks & Acceptance

**Execution:**
- [x] `config.js` — Create: export `isLocalhost` (detect localhost/127.0.0.1), `APP_BASE_URL` (ternary: localhost URL vs. GitHub Pages URL), `CORS_PROXY_URL` (empty on localhost, Cloudflare worker URL in prod), `FHIR_SERVERS` object with at least two seed entries in AD-8 P2P field set (HealthInteractive UAT + one other); no `id` or `roster` fields in seeds — those are assigned at runtime by ConfigModule
- [x] `index.html` — Create: minimal HTML with `<meta http-equiv="refresh" content="0; url=app.html">` and a fallback `<a href="app.html">` link
- [x] `app.html` — Create shell structure: `<head>` with `<meta charset>`, `<meta viewport>`, `<title>P2P Exchange Tester</title>`, `<script src="config.js">`, `<style>` block; `<body>` with header, sidebar, `<main id="app-main">`, `</body>` with `<script>` block
- [x] `app.html` `<style>` — Implement full CSS custom property token system on `:root` (at minimum: `--color-primary`, `--color-primary-dark`, `--color-primary-light`, `--color-page-bg`, `--color-surface`, `--color-text-primary`, `--color-text-secondary`, `--color-border`, `--color-error`); add `@media(prefers-color-scheme:dark)` overrides; add `:root[data-theme="dark"]` and `:root[data-theme="light"]` overrides; implement CSS Grid shell: 56px header + 220px sidebar + 1fr main; sidebar `.collapsed` class: `width: 56px`; sidebar `transition: width 0.15s ease`; nav active state: 3px solid `var(--color-primary)` left border + `var(--color-primary)` text + `var(--color-primary-light)` bg; spinner `@keyframes spin` animation class `.loading` (for future use)
- [x] `app.html` header HTML — Logo mark: `.logo-mark` div with 4 child divs in 2×2 CSS grid (each div `background: var(--color-primary)`, 8×8px, 1px radius); app title `<h1>P2P Exchange Tester</h1>`; New Payer chip `<span id="new-payer-chip" class="new-payer-chip" style="display:none">` (hidden until configured); settings `<button id="settings-btn" aria-label="Open settings">⚙</button>`
- [x] `app.html` sidebar HTML — `<nav aria-label="Main navigation">` with 3 `<button>` nav items: data-view="previous-payers" (default active class), data-view="exchange", data-view="results" (aria-disabled="true", tabindex="-1", title="Run an exchange to see results."); collapse toggle `<button id="sidebar-toggle" aria-label="Toggle sidebar">`
- [x] `app.html` module stubs — In the `<script>` block, define 5 global objects: `const ConfigModule = { getConfig() {}, saveConfig() {}, addPayer() {}, updatePayer() {}, deletePayer() {} }; const ExchangeModule = { hasResult() { return false; } }; const ResultsModule = {}; const DebugModule = {}; const UIModule = { ... };`
- [x] `app.html` UIModule — Implement: `currentView` string variable; `showView(name)` function that updates `currentView`, replaces `#app-main` innerHTML with stub content, and updates active nav item class; `renderPreviousPayers()` returns stub HTML "No Previous Payers configured. Add your first Previous Payer to get started." with Add button placeholder; `renderExchange()` returns Exchange stub HTML; `renderResults()` returns Results stub HTML (not reachable via nav in this story); `bindEvents()` attaches click handlers to nav buttons (skipping aria-disabled="true" items) and the collapse toggle; `init()` function: reads `localStorage['p2pSidebarCollapsed']`, applies `.collapsed` class if true, calls `bindEvents()`, calls `showView('previous-payers')`
- [x] `app.html` — Call `init()` as the last statement in the `<script>` block
- [x] `c:\Users\rott\Documents\GitHub\fhirapps\index.html` — Add third `.app-card` inside `.apps-grid` for "P2P Exchange Tester" with description and link to `PayerToPayerClient/app.html`; match existing card markup style

**Acceptance Criteria:**
- Given `app.html` opens in a browser, when the page loads, then the header, 220px sidebar, and `#app-main` content area are all visible with no JS console errors
- Given the page loads, then the header shows the 2×2 teal logo mark, "P2P Exchange Tester" title, and a settings gear button; the New Payer chip is hidden
- Given the page loads, then "Previous Payers" is the active nav item and `#app-main` shows the empty-state stub with exact text "No Previous Payers configured. Add your first Previous Payer to get started."
- Given "Results" nav item is present, then it has `aria-disabled="true"` and shows tooltip "Run an exchange to see results." on hover; clicking it does NOT call `showView`
- Given I click "Exchange" nav item, then the Exchange stub renders in `#app-main` and "Exchange" becomes the active nav item
- Given I click the sidebar collapse toggle, then the sidebar narrows to 56px, nav labels disappear, and `localStorage['p2pSidebarCollapsed']` is set; clicking again restores 220px
- Given `localStorage['p2pSidebarCollapsed']` is `'true'` before the page loads, then the sidebar starts at 56px without animation flash
- Given the DOM is inspected, then `<header>`, `<nav aria-label="Main navigation">`, and `<main id="app-main">` ARIA landmarks are present
- Given the `<style>` block is inspected, then `:root` declares `--color-primary: #17b3b3`, `--color-page-bg: #f0f5f9`, and both `@media(prefers-color-scheme:dark)` and `:root[data-theme="dark"]` blocks override the same token names
- Given `ExchangeModule.hasResult()` is called in the console, then it returns `false`

## Design Notes

**Logo mark** — 4 `<div>` squares in a 2×2 CSS grid:
```css
.logo-mark { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; width: 20px; height: 20px; }
.logo-mark div { background: var(--color-primary); border-radius: 1px; }
```

**Sidebar collapse without flash** — On page load, apply `.collapsed` class synchronously in `init()` before first render; avoid toggling the class after layout so the 150ms transition doesn't play on load.

**Results nav disabled pattern** — Use `<button>` not `<a>`; set `aria-disabled="true"` and `tabindex="-1"`; in the click handler check for `aria-disabled` and return early, do not call `showView`. This gives accessible keyboard behavior without `pointer-events: none` which can be bypassed.

## Verification

**Manual checks:**
- Open `app.html` directly in Chrome/Edge (no server needed) — shell renders, nav works, sidebar collapses and persists across reload
- Browser console shows zero JS errors on initial load and after nav clicks
- Inspect Elements panel: `<header>`, `<nav aria-label="Main navigation">`, `<main id="app-main">` present
- Toggle OS dark mode — page switches color scheme; if browser supports `data-theme` injection, test that override as well
- Open root `index.html` — three app cards visible; PayerToPayerClient card link resolves to `PayerToPayerClient/app.html`

## Spec Change Log

## Review Triage Log

### 2026-07-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 1, medium 1, low 3)
- defer: 2: (medium 1, low 1)
- reject: 8
- addressed_findings:
  - `[high]` `[patch]` `ConfigModule.getConfig()` wrapped `JSON.parse()` in try/catch to prevent crash on malformed localStorage
  - `[medium]` `[patch]` Removed static `aria-label="New payer configured"` from new-payer-chip span; screen reader now reads dynamic textContent
  - `[low]` `[patch]` Removed `onclick="UIModule.showAddPayer()"` from Add Previous Payer stub button (pattern inconsistency)
  - `[low]` `[patch]` Fixed fallback link text in index.html from "Click here if not redirected" to "P2P Exchange Tester"
  - `[low]` `[patch]` Added explanatory comment on `useProxy: !isLocalhost` asymmetry in config.js
