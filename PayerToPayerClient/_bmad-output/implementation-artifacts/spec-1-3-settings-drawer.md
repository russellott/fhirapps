---
title: 'Story 1.3: Settings Drawer — New Payer Identity & CORS Proxy URL'
type: 'feature'
created: '2026-07-30'
status: 'done'
baseline_revision: 'cfe025b6c1cd41c4a2a3e5b80f15023e87a41b63'
final_revision: 'b63fa03b2fb5f03b059e565e248cab1a4504e962'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<intent-contract>

## Intent

**Problem:** The settings gear button has a stub handler (no-op). Users have no way to configure their New Payer identity (name, clientId, clientSecret) or the global CORS Proxy URL. `UIModule.updateNewPayerChip()` already reads from config but config.newPayer.name is always `''` until the user saves.

**Approach:** Implement the Settings drawer entirely in `app.html` — CSS for the overlay/drawer/focus-trap, HTML rendered via `UIModule.showSettings()` into a dedicated `#settings-overlay` element injected at body end, JS for open/close/save/show-hide-secret/focus-trap. Wire the gear button to `UIModule.showSettings()`. On Save, call `ConfigModule.saveConfig()` with merged values and call `UIModule.updateNewPayerChip()`. No new files.

## Boundaries & Constraints

**Always:**
- Drawer HTML is injected via `document.getElementById('settings-overlay').innerHTML = html` — use the standard innerHTML pattern
- The `#settings-overlay` `<div>` is a permanent empty shell in the `<body>` (like `#app-main`); its content is set by `UIModule.showSettings()` and cleared on close
- Focus trap: Tab/Shift+Tab must cycle through focusable elements inside `#settings-drawer` only while it is open; closing the drawer returns focus to the gear button
- Escape key and backdrop click close without saving
- Client secret field is `<input type="password">` by default; a show/hide toggle button switches to `type="text"` and back
- `role="dialog" aria-modal="true" aria-labelledby="settings-title"` on the drawer element
- On Save: read values from the form inputs, call `ConfigModule.saveConfig(mergedConfig)` with the FULL config (patch newPayer and corsProxyUrl into the existing config object, not a replacement), close drawer, call `UIModule.updateNewPayerChip()`
- On close (Escape/backdrop/Cancel): remove drawer content, return focus to gear button, no config change
- `referrerPolicy: 'no-referrer'` on all external fetches — no fetches in this story
- All strings placed into innerHTML (form field values) must be escaped via `UIModule.escapeHtml()`
- `UIModule.escapeHtml()` is already implemented (Story 1.2)
- CSS transition: drawer slides in from right, 200ms ease-out on `transform: translateX()`
- Drawer width: 360px; full viewport height; positioned fixed to viewport right edge

**Block If:** None — all decisions fully specified.

**Never:**
- No browser `confirm()`, `alert()`, or `prompt()`
- No modal libraries or dialogs outside the inline pattern
- Do not close the drawer on Save if form is invalid (no validation in this story — all fields optional)
- Do not persist drawer-open state to localStorage
- Do not call `ConfigModule.saveConfig()` on backdrop/Escape/Cancel — read-only close only

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Open drawer | Click gear icon | Drawer slides in from right; fields pre-filled from `config.newPayer` and `config.corsProxyUrl`; focus moves to first field | — |
| Open drawer — no config | `ConfigModule.getConfig()` returns null | Fields pre-filled as empty strings (fall back gracefully) | — |
| Save with values | Fill fields, click Save | Config updated; drawer closes; chip shows New Payer name if non-empty | — |
| Save with empty name | Clear name field, click Save | Config updated (empty name); drawer closes; chip hidden | — |
| Cancel | Click Cancel button | Drawer closes; config unchanged | — |
| Backdrop click | Click `#settings-overlay` (not drawer) | Drawer closes; config unchanged | — |
| Escape key | Press Escape while drawer open | Drawer closes; config unchanged | — |
| Tab at last focusable element | Tab from Save button | Focus wraps to first focusable element in drawer | — |
| Shift+Tab at first focusable element | Shift+Tab from first field | Focus wraps to last focusable element (Save button) | — |
| Show/hide toggle on secret field | Click toggle | Input type switches text↔password; button label updates | — |
| Open drawer with existing name containing `<` | `newPayer.name = "A&B <Payer>"` | Field `value` attribute shows escaped value; no XSS | escapeHtml on value attr |
| Close drawer | Any close path | `#settings-overlay` innerHTML cleared; keyboard listener removed; focus returns to gear button | — |

</intent-contract>

## Code Map

- `app.html` `<style>` block — add: `#settings-overlay` backdrop styles; `#settings-drawer` panel styles; drawer slide-in animation; `.settings-field`, `.settings-label`, `.field-row`, `.drawer-footer` layout; `.secret-toggle` button style
- `app.html` `<body>` — add `<div id="settings-overlay"></div>` immediately before the closing `</body>` tag (after the `<script>` block)
- `app.html` `<script>` block — `UIModule`: add `showSettings()`, `closeSettings()`, and `_settingsKeyHandler` property; wire `#settings-btn` click in `bindEvents()` to call `UIModule.showSettings()`

## Tasks & Acceptance

**Execution:**
- [ ] `app.html` CSS — Add to `<style>` block:
  ```css
  /* Settings drawer */
  #settings-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    z-index: 100;
  }
  #settings-overlay.open { display: block; }
  #settings-drawer {
    position: absolute;
    top: 0;
    right: 0;
    width: 360px;
    height: 100%;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.2s ease-out;
  }
  #settings-overlay.open #settings-drawer { transform: translateX(0); }
  .drawer-header { padding: 20px 20px 0; border-bottom: 1px solid var(--color-border); padding-bottom: 16px; }
  .drawer-header h2 { font-size: 17px; font-weight: 600; }
  .drawer-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
  .drawer-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--color-border);
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .settings-field { display: flex; flex-direction: column; gap: 4px; }
  .settings-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
  .settings-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 14px;
    background: var(--color-surface);
    color: var(--color-text-primary);
  }
  .settings-input:focus { outline: 2px solid var(--color-primary); outline-offset: -1px; }
  .field-row { display: flex; gap: 8px; align-items: flex-end; }
  .field-row .settings-input { flex: 1; }
  .secret-toggle {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 12px;
    cursor: pointer;
    color: var(--color-text-secondary);
    white-space: nowrap;
    min-height: 36px;
  }
  .secret-toggle:hover { background: var(--color-surface-alt); }
  .drawer-section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 4px; }
  .btn-secondary { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-primary); }
  .btn-secondary:hover { background: var(--color-surface-alt); }
  ```

- [ ] `app.html` `<body>` — Add `<div id="settings-overlay"></div>` immediately before `</body>` (after `</script>`)

- [ ] `app.html` UIModule — Add `_settingsKeyHandler: null` property to UIModule (alongside `currentView`)

- [ ] `app.html` UIModule — Add `showSettings()` method that:
  1. Gets config via `ConfigModule.getConfig()`, falls back to `{ newPayer: { name: '', clientId: '', clientSecret: '' }, corsProxyUrl: '' }` if null
  2. Reads `newPayer.name`, `newPayer.clientId`, `newPayer.clientSecret`, `corsProxyUrl` (default to `''` for any missing)
  3. Builds HTML string for the overlay content:
     - `<div id="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title">` containing:
       - `.drawer-header` with `<h2 id="settings-title">Settings</h2>`
       - `.drawer-body` with three `.settings-field` groups:
         - "New Payer Name" — `<input id="settings-name" class="settings-input" type="text" value="{escaped name}">`
         - "Client ID" — `<input id="settings-client-id" class="settings-input" type="text" value="{escaped clientId}">`
         - "Client Secret" — `.field-row` containing `<input id="settings-secret" class="settings-input" type="password" value="{escaped clientSecret}">` + `<button id="settings-secret-toggle" class="secret-toggle" type="button" aria-label="Show client secret">Show</button>`
         - "CORS Proxy URL" — `<input id="settings-proxy-url" class="settings-input" type="url" value="{escaped corsProxyUrl}">`
       - `.drawer-footer` with `<button id="settings-cancel" class="btn btn-secondary">Cancel</button>` + `<button id="settings-save" class="btn btn-primary">Save</button>`
  4. Sets `document.getElementById('settings-overlay').innerHTML = html`
  5. Adds class `open` to `#settings-overlay`
  6. Attaches event listeners (via `addEventListener`, not onclick):
     - `#settings-secret-toggle` click: toggle input type between `password`/`text`, update button text Show/Hide, update aria-label
     - `#settings-cancel` click: calls `UIModule.closeSettings()`
     - `#settings-save` click: reads form values, calls `ConfigModule.saveConfig()` with merged config, calls `UIModule.updateNewPayerChip()`, calls `UIModule.closeSettings()`
     - `#settings-overlay` click: if `event.target === overlay` (backdrop click), calls `UIModule.closeSettings()`
     - Keydown handler stored in `UIModule._settingsKeyHandler`: on Escape calls `closeSettings()`; implements focus trap (Tab/Shift+Tab cycles within drawer focusable elements)
  7. Moves focus to `document.getElementById('settings-name')`

- [ ] `app.html` UIModule — Add `closeSettings()` method that:
  1. Removes class `open` from `#settings-overlay`
  2. Removes the keydown listener via `document.removeEventListener('keydown', UIModule._settingsKeyHandler)`
  3. Sets `UIModule._settingsKeyHandler = null`
  4. After a 200ms timeout (matching the CSS transition), clears `#settings-overlay.innerHTML = ''`
  5. Returns focus to `document.getElementById('settings-btn')`

- [ ] `app.html` UIModule.bindEvents — Replace the stub settings-btn handler (`// Settings drawer — Story 1.3`) with `UIModule.showSettings()`

**Focus trap implementation note:** In the keydown handler, collect focusable elements with `drawer.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')`, get first/last; on Tab at last → `event.preventDefault()` + focus first; on Shift+Tab at first → `event.preventDefault()` + focus last.

**Acceptance Criteria:**
- Given I click the gear icon, then the settings overlay appears and the drawer slides in from the right within 200ms; the "New Payer Name" input is focused
- Given the current config has `newPayer.name = "Acme Payer"`, when the drawer opens, then the Name field shows "Acme Payer"
- Given the drawer is open, when I press Escape, then the drawer closes and focus returns to the gear icon; config is unchanged
- Given the drawer is open, when I click the semi-transparent backdrop (outside the drawer), then the drawer closes; config is unchanged
- Given I click Cancel, then the drawer closes; config unchanged
- Given I fill in Name="Test Payer", Client ID="abc", Client Secret="xyz", CORS Proxy URL="", and click Save, then `ConfigModule.getConfig().newPayer` equals `{name:"Test Payer", clientId:"abc", clientSecret:"xyz"}` and the header chip shows "Test Payer"
- Given I save with Name="", then the header chip is hidden
- Given the Client Secret field shows ●●●●, when I click Show, then the field reveals the secret and the button reads "Hide"; clicking Hide re-masks it
- Given I press Tab from the Save button, then focus moves to the first input (Name) — not outside the drawer
- Given I press Shift+Tab from the Name input, then focus moves to the Save button — not outside the drawer
- Given `config.newPayer.name = "A&B <Payer>"`, when the drawer opens, then the Name input shows the literal characters `A&B <Payer>` (not HTML entities) and no XSS occurs

## Design Notes

**`value` attribute escaping:** `UIModule.escapeHtml()` must be called on values placed into HTML `value="..."` attributes because the value is HTML-serialized. The browser will decode entity references when reading `input.value`, so the user sees the unescaped string in the field.

**Config merge on Save:** Do not replace the entire config. The pattern is:
```js
var config = ConfigModule.getConfig() || { newPayer: {name:'',clientId:'',clientSecret:''}, corsProxyUrl: '', previousPayers: [] };
config.newPayer = { name: nameVal, clientId: clientIdVal, clientSecret: secretVal };
config.corsProxyUrl = proxyUrlVal;
ConfigModule.saveConfig(config);
```
This preserves `previousPayers`.

**closeSettings timeout:** The 200ms `setTimeout` before clearing innerHTML lets the CSS slide-out transition finish before the DOM is wiped (prevents a flash of unstyled/empty content during close).

**`type="url"` on CORS Proxy URL input:** Provides native URL validation hints but does not enforce format — any string is saved as-is. This is intentional (empty string disables proxy).

## Verification

**Manual checks:**
- Open drawer, fill fields, save — header chip updates, re-open drawer shows saved values
- Open drawer, press Escape — drawer closes, no chip change
- Click backdrop — drawer closes, no chip change
- Tab through all drawer elements — focus stays inside drawer, wraps correctly
- Inspect DOM after close — `#settings-overlay` innerHTML is empty
- Dark mode: drawer background uses `--color-surface` dark token; inputs use `--color-surface` bg

## Spec Change Log

## Review Triage Log

### 2026-07-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3: (high 2, medium 1)
- defer: 0
- reject: 1
- addressed_findings:
  - `[high]` `[patch]` Guard at top of `showSettings()` removes existing keydown handler before creating a new one — prevents listener leak on double-open
  - `[high]` `[patch]` `closeSettings()` setTimeout now checks `!overlay.classList.contains('open')` before clearing innerHTML — prevents stale timer from wiping a freshly reopened drawer
  - `[medium]` `[patch]` Backdrop click listener stored in `UIModule._backdropClickHandler` and removed in `closeSettings()` — prevents listener accumulation across multiple opens
  - `[reject]` Save null-fallback `previousPayers:[]` — if localStorage is cleared mid-session, payers are already gone; fallback is correct recovery behavior

## Auto Run Result

**Status:** done

**Summary:** Implemented the Settings drawer — 360px slide-in panel with New Payer Name, Client ID, Client Secret (masked, show/hide), and CORS Proxy URL fields. Focus trap, Escape/backdrop/Cancel close without saving. Save merges into existing config and updates header chip. Review patches: double-open listener leak guard, stale-timer wipe guard, backdrop listener stored for clean removal.

**Files changed:**
- `PayerToPayerClient/app.html` — modified; drawer CSS, `#settings-overlay` shell, `showSettings()`, `closeSettings()`, `_backdropClickHandler` property, gear button wired

**Review findings:** 3 patches applied (2 high: listener leak + stale timer; 1 medium: backdrop listener accumulation). 1 rejected (save null-fallback is correct recovery).

**Verification:** Manual — open drawer, fill fields, save; chip updates. Escape/backdrop/Cancel close without saving. Tab/Shift+Tab stays within drawer. Show/Hide toggle masks secret. Dark mode uses surface/border tokens.

**Residual risks:** None beyond existing deferred items.
