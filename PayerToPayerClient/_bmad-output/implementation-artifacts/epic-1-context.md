# Epic 1 Context: App Foundation & Previous Payer Configuration

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic 1 builds the entire foundation a developer needs before any exchange logic can run: the app shell, navigation, configuration storage, and Previous Payer CRUD. By the end of this epic a tester can open `app.html`, see their seeded payers from `config.js`, configure their own New Payer identity, add/edit/delete Previous Payers with all connection details, and round-trip the full configuration as a portable JSON file. Every subsequent epic depends on the `ConfigModule` API and the localStorage schema established here.

## Stories

- Story 1.1: App Shell & Navigation Structure
- Story 1.2: ConfigModule & FHIR_SERVERS Cold-Start
- Story 1.3: Settings Drawer — New Payer Identity & CORS Proxy URL
- Story 1.4: Add Previous Payer
- Story 1.5: Edit & Delete Previous Payer
- Story 1.6: Config Export & Import

## Requirements & Constraints

- The Settings drawer (gear icon in header) edits **New Payer identity** (name, clientId, clientSecret) and a global **CORS Proxy URL**; saving persists both.
- Previous Payers support full CRUD. Delete requires inline confirmation naming the payer and its member count — no browser `confirm()` or modal dialogs anywhere.
- **Config export** triggers an immediate file download of the full config as pretty-printed JSON. Inline "Config file downloaded." text appears below the button (no toast). **Import** reads the file, validates the shape, shows an inline summary ("This file contains {n} Previous Payers with {m} total members. Replace current configuration?"), and replaces entirely on confirm — no merge.
- All configuration persists in `localStorage['p2pConfig']` and restores automatically on page load, with no user action.
- No build step, no npm, no framework — pure HTML/CSS/JS (ES2020+). `config.js` is the only external script file; everything else is inline in `app.html`.
- Client secrets are intentionally visible in the browser and the Config File export. This is the demo security posture; do not attempt to hide them server-side.
- The CSS custom property token system (full color palette + dark mode) must be in place by Story 1.1 so all later stories render correctly.

## Technical Decisions

### Single-file, global-scope architecture
`app.html` contains all inline CSS (`<style>` in `<head>`) and inline JS (`<script>` at end of `<body>`). No `import`/`export`/`type="module"`. All cross-concern helpers are exposed as `window.ModuleName` singletons. The five module namespaces — `ConfigModule`, `ExchangeModule`, `ResultsModule`, `UIModule`, `DebugModule` — are all globally scoped within `app.html`.

### DOM rendering rule
All DOM mutations use `element.innerHTML = html`. Accumulate HTML in a local `let html = ''` variable and assign once, atomically. Never use `createElement` or `appendChild`.

### Canonical config shape
One shape governs both `localStorage` and Config File export/import. Deviation between the two is a bug.

```js
{
  newPayer: { name, clientId, clientSecret },
  corsProxyUrl: string,
  previousPayers: [
    {
      id: string,        // crypto.randomUUID() at creation; never reassigned
      name, fhirBaseUrl, tokenUrl, clientId, clientSecret,
      tokenAuthMethod: 'client_secret_post' | 'client_secret_basic',
      useProxy: boolean,
      roster: [{ id, firstName, lastName, dateOfBirth, gender, memberIdAtOldPayer }]
    }
  ]
}
```

`dateOfBirth`: `YYYY-MM-DD`. `gender`: `'male' | 'female' | 'other' | 'unknown'`. Empty `corsProxyUrl` disables proxy globally. Import is replace-only.

### config.js and cold-start seeding
`config.js` exports `FHIR_SERVERS` — an object keyed by payer handle. Each value is the Previous Payer field set **without** `id` or `roster`. On cold-start (when `localStorage['p2pConfig']` is absent), `ConfigModule.seedFromDefaults()` assigns `crypto.randomUUID()` IDs, adds `roster: []` to each entry, sets `newPayer` to `{name:'', clientId:'', clientSecret:''}`, sets `corsProxyUrl` to `''`, and writes the full AD-8 shape to `localStorage`. `newPayer` and `corsProxyUrl` are always empty until the user configures them via Settings.

Config read idiom: `const config = JSON.parse(localStorage.getItem('p2pConfig') ?? 'null')`.

### ConfigModule API
`getConfig()`, `saveConfig(config)`, `addPayer(payerObj)`, `updatePayer(id, fields)`, `deletePayer(id)`. All reads/writes use the canonical shape above. IDs are assigned by `addPayer` via `crypto.randomUUID()` and never changed.

### Module dependency direction
`UIModule` is the sole orchestrator: `UIModule → {ConfigModule, ExchangeModule, ResultsModule, DebugModule}`. Data modules never call back into `UIModule` — they return values. `ConfigModule` and `ResultsModule` are independent of each other.

### State tiers
- **Config tier**: `localStorage['p2pConfig']` — owned by `ConfigModule`, written on every save, read at startup.
- **UI state**: `localStorage['p2pSidebarCollapsed']` — owned by `UIModule`.
- **Exchange results**: in-memory only — not involved in Epic 1.

### View routing
`UIModule` owns a string variable (`'previous-payers' | 'exchange' | 'results'`). `showView(name)` replaces `#app-main` innerHTML. No URL changes on navigation. Results nav item is non-interactive until `ExchangeModule.hasResult()` is true.

## UX & Interaction Patterns

### Shell layout
CSS Grid: 220px sidebar (collapsible to 56px; state in `localStorage['p2pSidebarCollapsed']`) + 56px fixed header + scrollable main. Base color token: `--color-primary: #17b3b3`. Full palette via CSS custom properties; dark mode via `@media(prefers-color-scheme:dark)` plus `:root[data-theme="dark"/"light"]` override (toggle stamps `data-theme` on root).

### Header
"P2P Exchange Tester" title; New Payer identity chip (teal `primary-light` bg, hidden when name is empty); settings gear icon. The 2×2 teal square logo mark is the app identity mark.

### Sidebar
3 nav items: Previous Payers (default active), Exchange, Results. Active item: 3px solid teal left border + teal text + `primary-light` bg. Results is `aria-disabled="true"` with hover tooltip "Run an exchange to see results." when no session results exist.

### Payer card
Compact header row (click anywhere to expand/collapse). Only one card expanded at a time — expanding a second collapses the first. Expanded body has Config tab (edit form) and Roster tab (member table, but Roster is Epic 2's content). Delete replaces the header row with inline text: "Delete {Payer Name}? This will also delete its {n}-member Roster." with Confirm/Cancel — never a browser dialog or modal.

### Settings drawer
360px panel slides in from the right in 200ms (`ease-out`). Semi-transparent backdrop; backdrop click or Escape closes without saving. `role="dialog" aria-modal="true" aria-labelledby="settings-title"`. Focus trap: Tab cycles within drawer only; closing returns focus to gear icon. Client secret field is `type="password"` masked by default with show/hide toggle. Sticky Save/Cancel footer.

### Microcopy (exact strings)
- Empty state: "No Previous Payers configured. Add your first Previous Payer to get started."
- Delete confirm: "Delete {Payer Name}? This will also delete its {n}-member Roster."
- Export feedback: "Config file downloaded." (inline, no toast).
- Import confirm: "This will replace your current configuration. All existing Previous Payers and Rosters will be overwritten. Continue?"
- Field labels: "Token URL", "FHIR Base URL", "Member ID at Previous Payer" (use these exactly).

### Accessibility floor
ARIA landmarks: `<header>`, `<nav aria-label="Main navigation">`, `<main>`. Explicit `<label for="...">` on all inputs. Error messages linked via `aria-describedby`. Required fields: `aria-required="true"` + visible asterisk. Minimum 40px touch targets.

## Cross-Story Dependencies

- Story 1.1 (shell + routing) must land first; every other story renders into `#app-main` via `UIModule.showView()`.
- Story 1.2 (ConfigModule) must be complete before 1.3–1.6; all config operations depend on its API and the cold-start seed.
- Epic 2 (Member Roster Management) extends the payer card and `ConfigModule.updatePayer()` established here; the `roster` array in the AD-8 shape must be present from Story 1.2 forward.
- Epic 3 depends on `ConfigModule.getConfig().previousPayers` to populate the Exchange payer selector.
