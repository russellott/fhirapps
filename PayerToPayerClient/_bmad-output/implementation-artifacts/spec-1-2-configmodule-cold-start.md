---
title: 'Story 1.2: ConfigModule & FHIR_SERVERS Cold-Start'
type: 'feature'
created: '2026-07-30'
status: 'in-progress'
baseline_revision: 'ed58e9f12445aca66fc709439e85d99c5a356e1b'
final_revision: ''
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<intent-contract>

## Intent

**Problem:** `ConfigModule` is a stub (all methods empty); `localStorage` is never seeded on first load; `renderPreviousPayers()` always shows the empty state even when payer data exists.

**Approach:** Replace the `ConfigModule` stub with full implementations of all five methods plus `seedFromDefaults()`; add an `escapeHtml` helper to `UIModule`; add CSS for the payer card; replace `renderPreviousPayers()` to render collapsed payer cards when data exists and the empty state when it does not; update `UIModule.init()` to call `seedFromDefaults()` on cold start. All changes are contained in `app.html` — no other files change.

## Boundaries & Constraints

**Always:**
- All code lives in the single `<script>` block in `app.html`; `config.js` is unchanged
- `FHIR_SERVERS` is a global defined by `config.js` (loaded via `<script src="config.js">` in `<head>` — always available by the time the inline `<script>` runs)
- `ConfigModule.seedFromDefaults()` must only write to `localStorage` — never call UIModule methods
- `addPayer(payerObj)` assigns `id: crypto.randomUUID()` and `roster: []`; callers must not pass those fields
- `updatePayer(id, fields)` merges `fields` into the matching entry via `Object.assign`; silently no-ops if `id` not found
- `deletePayer(id)` filters out the matching entry; silently no-ops if `id` not found
- All HTML accumulated in `let html = ''` and assigned atomically to `element.innerHTML` — no createElement/appendChild
- `UIModule.escapeHtml(str)` must be used on every payer-controlled string placed into innerHTML (specifically `payer.name`); at minimum replace `&`, `<`, `>`, `"`, `'`
- ES2020+: use `const`/`let`, arrow functions are allowed in short helpers, but stick to `function` keyword inside module method bodies for consistency with Story 1.1 style
- `referrerPolicy: 'no-referrer'` is required on external fetch — no fetches in this story, but pattern must not be broken

**Block If:** None identified — all decisions are fully specified by AD-8, AD-12, and the Epic 1 context.

**Never:**
- Never call `UIModule` methods from `ConfigModule` — ConfigModule is a pure data layer
- Never log `access_token` or `clientSecret` values to the browser console
- Never use `sessionStorage` or `indexedDB` — only `localStorage['p2pConfig']`
- Never implement expand/collapse, Config tab, or Roster tab — those are Story 1.4/1.5 scope
- Never add `id` or `roster` to a `FHIR_SERVERS` entry before reading it — assign them inside `seedFromDefaults()`
- Never validate field presence in `addPayer`/`updatePayer` — Story 1.4 owns validation at the form level

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Cold start | `localStorage['p2pConfig']` absent | `seedFromDefaults()` called; payer cards rendered | — |
| Warm start | `localStorage['p2pConfig']` present with valid JSON | Restored; `seedFromDefaults()` NOT called | — |
| Malformed config | `localStorage['p2pConfig']` = `"not json"` | `getConfig()` returns null; `seedFromDefaults()` called | try/catch in `getConfig()` |
| FHIR_SERVERS is empty object | `FHIR_SERVERS = {}` | Seeds with `previousPayers: []`; empty state renders | — |
| Payer with 0 members | `roster: []` | Card shows "0 members" | — |
| Payer with 1 member | `roster: [{...}]` | Card shows "1 member" (singular) | — |
| Payer with N > 1 members | `roster: [{...}, ...]` | Card shows "N members" (plural) | — |
| Payer name contains `<` or `"` | `name: '<script>alert(1)</script>'` | `escapeHtml()` neutralizes; renders as visible text | escapeHtml applied before innerHTML |
| `updatePayer` with unknown id | id not in array | Silently no-ops (idx === -1 guard) | — |
| `deletePayer` with unknown id | id not in array | Config unchanged; no error | — |
| `addPayer` called | payerObj passed without id/roster | New entry gets `crypto.randomUUID()` id + `roster: []` | — |

</intent-contract>

## Code Map

- `app.html` — only file modified; all changes inside `<style>` and `<script>` blocks
  - `ConfigModule` (line ~263): replace stub with full implementation including `seedFromDefaults()`
  - `UIModule` (line ~289): add `escapeHtml()` helper; replace `renderPreviousPayers()`; update `init()`
  - `<style>` block: add `.payer-list`, `.payer-card`, `.payer-card-header`, `.payer-name`, `.payer-member-count` rules

## Tasks & Acceptance

**Execution:**
- [ ] `app.html` CSS — Add payer card styles to `<style>`: `.payer-list { display: flex; flex-direction: column; gap: 8px; }`, `.payer-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }`, `.payer-card-header { display: flex; align-items: center; padding: 12px 16px; gap: 12px; }`, `.payer-name { font-weight: 500; color: var(--color-text-primary); flex: 1; }`, `.payer-member-count { font-size: 13px; color: var(--color-text-secondary); background: var(--color-surface-alt); padding: 2px 8px; border-radius: 10px; }`; and `.payer-list-actions { margin-top: 16px; }`

- [ ] `app.html` ConfigModule — Replace the stub `ConfigModule` object (currently lines ~263–275) with the full implementation:
  - `getConfig()`: reads `localStorage.getItem('p2pConfig')`, returns null if absent, wraps `JSON.parse` in try/catch returning null on failure — this method already has the try/catch from Story 1.1's patch; preserve it
  - `saveConfig(config)`: `localStorage.setItem('p2pConfig', JSON.stringify(config))` — already implemented in stub; keep
  - `seedFromDefaults()`: new method — reads global `FHIR_SERVERS`, maps `Object.entries(FHIR_SERVERS)` to previousPayers array assigning `crypto.randomUUID()` ids and `roster: []` to each, builds full AD-8 config with `newPayer: { name: '', clientId: '', clientSecret: '' }` and `corsProxyUrl: ''`, calls `this.saveConfig(config)`, returns the config
  - `addPayer(payerObj)`: reads config, creates new entry via `Object.assign({}, payerObj, { id: crypto.randomUUID(), roster: [] })`, pushes to `config.previousPayers`, saves, returns the new entry's id
  - `updatePayer(id, fields)`: reads config, finds index by id, guards `if (idx === -1) return`, merges via `Object.assign(config.previousPayers[idx], fields)`, saves
  - `deletePayer(id)`: reads config, filters `config.previousPayers` to exclude id, saves

- [ ] `app.html` UIModule — Add `escapeHtml` method to `UIModule`: takes a string, returns it with `&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`, `"`→`&quot;`, `'`→`&#39;` replaced; handles non-string input by coercing to String first

- [ ] `app.html` UIModule.renderPreviousPayers — Replace current method body with logic that: (1) reads `const config = ConfigModule.getConfig()` and `const payers = config && config.previousPayers ? config.previousPayers : []`, (2) when `payers.length === 0` renders the existing empty state HTML unchanged (exact microcopy: "No Previous Payers configured. Add your first Previous Payer to get started." + "Add Previous Payer" button), (3) when payers exist renders a `<div class="payer-list">` containing one `.payer-card` per payer with `.payer-card-header` showing `UIModule.escapeHtml(payer.name)` in `.payer-name` and member count in `.payer-member-count` ("N members" / "1 member"), followed by a `.payer-list-actions` div containing the "Add Previous Payer" button

- [ ] `app.html` UIModule.init — After the `p2pSidebarCollapsed` check and before `this.bindEvents()`, add: `if (!ConfigModule.getConfig()) { ConfigModule.seedFromDefaults(); }` — this handles both absent and malformed config; warm starts with valid config skip this branch

**Acceptance Criteria:**
- Given `localStorage['p2pConfig']` is absent and `app.html` loads, then the Previous Payers view shows one collapsed card per entry in `FHIR_SERVERS`, each displaying the payer name and "0 members"
- Given `localStorage['p2pConfig']` already contains valid config and `app.html` loads, then the Previous Payers view shows those payers without re-seeding (no UUIDs change)
- Given `localStorage['p2pConfig']` contains malformed JSON and `app.html` loads, then the app does not crash; `seedFromDefaults()` is called and the Previous Payers view renders the seeded cards
- Given a payer has `roster.length === 1`, then its card header shows "1 member" (not "1 members")
- Given a payer has `roster.length === 0`, then its card header shows "0 members"
- Given a payer name contains `<script>`, then the rendered card displays the literal text `<script>` without executing JS or displaying broken HTML
- Given `ConfigModule.addPayer({name:'Test', fhirBaseUrl:'...', tokenUrl:'...', clientId:'x', clientSecret:'y', tokenAuthMethod:'client_secret_post', useProxy:false})` is called in the browser console, then the returned id is a valid UUID and calling `ConfigModule.getConfig().previousPayers` shows the new entry with `roster: []`
- Given `ConfigModule.updatePayer('nonexistent-id', {name:'x'})` is called, then no exception is thrown and `ConfigModule.getConfig()` is unchanged
- Given `ConfigModule.deletePayer('nonexistent-id')` is called, then no exception is thrown
- Given the Previous Payers view is visible with payers, then the "Add Previous Payer" button is present below the payer list

## Design Notes

**`seedFromDefaults()` reads `Object.entries(FHIR_SERVERS)`** so the order of entries in the resulting `previousPayers` array matches the declaration order in `config.js`.

**`init()` seeding guard is `!ConfigModule.getConfig()`** — getConfig already wraps JSON.parse in try/catch returning null, so this gate handles both absent and malformed config with one check.

**payer-member-count pill** uses `background: var(--color-surface-alt)` to be visually distinct from the card background without needing a new token.

**`addPayer` returns the new id** so Story 1.4 can scroll to or focus the new card.

## Verification

**Manual checks:**
- Clear `localStorage` (DevTools Application tab → clear site data), reload `app.html` — payer cards render for HealthInteractive UAT and Deloitte Connectathon showing "0 members"
- Reload again without clearing — same payer cards appear; DevTools confirms `p2pConfig` key was not re-written (UUID values unchanged)
- Manually set `localStorage['p2pConfig'] = 'bad'` in console, reload — app doesn't crash, cards appear
- In DevTools console: `ConfigModule.addPayer({name:'Test', fhirBaseUrl:'', tokenUrl:'', clientId:'', clientSecret:'', tokenAuthMethod:'client_secret_post', useProxy:false})` → reload → "Test" card appears with "0 members"
- Inject name with `<img onerror=alert(1)>` via `ConfigModule.updatePayer(id, {name:'<img onerror=alert(1)>'})` → reload → literal text visible, no alert fires
- Dark mode: payer cards adopt `--color-surface` and `--color-border` dark tokens

## Spec Change Log

## Review Triage Log

## Auto Run Result
