# Epic 3 Context: Exchange Execution

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A tester can select a configured Previous Payer and one of its Roster members, trigger a P2P Exchange, and watch four sequential steps execute with real-time per-step status: system token acquisition, `$member-match`, member-scoped token, and parallel FHIR resource retrieval. Any step failure halts the exchange immediately, surfaces a specific actionable message, and leaves subsequent steps in pending state. A successful run stores results in session memory and unlocks the Results view.

## Stories

- Story 3.1: Exchange Setup Panel
- Story 3.2: ExchangeModule Scaffold & System Token (Step 1)
- Story 3.3: $member-match & Member Match Failure Handling (Step 2)
- Story 3.4: Member-Scoped Token (Step 3)
- Story 3.5: Resource Retrieval & Exchange Completion (Step 4)

## Requirements & Constraints

**Selectors (FR-12, FR-13):** The Previous Payer dropdown populates from `ConfigModule.getConfig().previousPayers`. The Member dropdown is disabled and shows "Select a Previous Payer first" until a payer is chosen; then it populates from that payer's roster. "Run Exchange" is disabled until both are selected. When both are selected, display summary: `"Testing {Payer Name} for {First Last} ({dateOfBirth})"`.

**System token (FR-14):** POST to `payer.tokenUrl`, `Content-Type: application/x-www-form-urlencoded`, body as `URLSearchParams`, `grant_type=client_credentials`, `scope=system/*.rs`, `referrerPolicy: 'no-referrer'`. Never send as JSON.

**$member-match (FR-15):** POST to `{fhirBaseUrl}/Patient/$member-match`, `Authorization: Bearer {systemToken}`, `Content-Type: application/fhir+json`, `referrerPolicy: 'no-referrer'`. A 422 response is a business outcome — parse the OperationOutcome and display the appropriate failure message; do not treat as a fetch error.

**Member-scoped token (FR-16):** After a successful member match, request a new token with `scope=patient/{fhirId}.rs`. If this fails, halt with the server-capability error message. No fallback to the system token — ever.

**Resource retrieval (FR-17):** Fetch all 8 resource types: ExplanationOfBenefit, Condition, MedicationRequest, MedicationDispense, Observation, AllergyIntolerance, Immunization, Provenance. Each: `GET {fhirBaseUrl}/{ResourceType}?patient={fhirId}`, `Accept: application/fhir+json`, `Authorization: Bearer {memberToken}`, `referrerPolicy: 'no-referrer'`. Zero-result bundles are success, not errors.

**Step display (FR-18):** All 4 steps render in pending state at exchange start. Steps activate sequentially. A failed step shows `error` styling; subsequent steps remain pending. Each completed or failed step is clickable to expand a detail sub-panel.

**422 failure messages (FR-19):** Member not found: `"Member not found at Previous Payer — check demographics or member ID. Submitted: {name}, DOB {dob}, Member ID {id}."` Consent denied: `"Consent denied by Previous Payer. Verify Consent resource construction."` Scoped token failure: `"Member-scoped token not supported by this server — this Previous Payer's auth server may not support patient-scoped client credentials. Data retrieval cannot proceed."`

**Other microcopy:** Token success: `"Access token acquired — expires in {n}s"`. Member match success: `"Member matched — FHIR ID: {patient-id}"`. Scoped token success: `"Member-scoped token acquired — scope: patient/{patient-id}.rs"`. Data retrieval complete: `"{n} resource types queried — {total} resources retrieved"`.

**Security:** Never log `access_token` values to the browser console at any point (NFR-6).

## Technical Decisions

**ExchangeModule ownership:** `UIModule` calls `ExchangeModule.runExchange(payer, member, newPayerConfig)`, passing all config as function arguments. `ExchangeModule` never reads `ConfigModule` directly (AD-13).

**Step functions and halt logic (AD-7):** Each step function returns `{ ok: boolean, data: any, error: string|null }`. If `ok === false`, the exchange halts. No exception throwing across module boundaries. Steps 1–3 are strictly sequential; Step 4 (resource retrieval) runs all 8 queries in parallel via `Promise.all` (AD-14).

**Token auth methods (AD-11):** `client_secret_basic` — send `Authorization: Basic {btoa(clientId + ':' + clientSecret)}`, omit credentials from body. `client_secret_post` — include `client_id` and `client_secret` in the `URLSearchParams` body.

**$member-match body (AD-10):** FHIR R4 Parameters resource with four named parameters: `MemberPatient` (Patient from member demographics), `CoverageToMatch` (Coverage using `member.memberIdAtOldPayer`), `CoverageToLink` (Coverage from New Payer identity), `Consent` (scope "everything", 5-year lookback). [ASSUMPTION — validate against real servers.]

**CORS proxy (AD-6):** When `payer.useProxy === true` and `config.corsProxyUrl` is non-empty, wrap the target URL: `config.corsProxyUrl + '?url=' + encodeURIComponent(originalUrl)`. Applies to both token and FHIR requests. `referrerPolicy: 'no-referrer'` still applies to the proxied URL.

**Session result state (AD-3):** After Step 4 completes, `ExchangeModule` stores the result in an in-memory module variable. `ExchangeModule.hasResult()` returns `true`. Results are never written to `localStorage` or `sessionStorage`; they clear when a new exchange starts.

**Debug logging (AD-13):** `ExchangeModule` calls `DebugModule.appendEntry(...)` after each step. Client secret values are redacted before logging (first 4 chars + `****`).

**FHIR compatibility:** Accept resources conforming to either US Core 3.1.1 or 6.1.0; never check `meta.profile` values (NFR-8).

## UX & Interaction Patterns

**Panel swap:** Clicking "Run Exchange" immediately replaces the setup panel with the 4-step progress tracker. All steps render in pending state first (dashed circle icon), then activate sequentially.

**Step tracker states (UX-DR9):** Pending = dashed circle; In Progress = teal circle with CSS `@keyframes spin` spinner; Success = filled teal circle + white checkmark; Failed = filled red circle + white ×. The step-status container must be wrapped in `aria-live="polite"` (UX-DR15).

**Step detail sub-panels:** Clicking a completed or failed step expands a detail sub-panel. Token step shows scope and expiry. Member Match step shows submitted demographics and matched FHIR ID (or failure detail). Scoped Token step shows patient parameter and scope. Data Retrieval step shows per-resource-type icon + name + count; individual failed types show `"{ResourceType}: HTTP {status}"`.

**Post-exchange:** After all 4 steps complete, a "View Results" CTA appears below the step tracker. The Results sidebar item becomes interactive. A "Run New Exchange" link also appears alongside to re-trigger.

**Failure recovery:** On any failure, a "Try Again" button re-shows the setup panel with prior payer and member selections intact.

**Debug panel (UX-DR10):** Dark strip docked to the bottom of the Exchange view; collapsed = 40px, expanded = 280px, 150ms CSS transition. Entry count badge in header. Append-only within the session; not persisted.

## Cross-Story Dependencies

- Story 3.1 (setup panel) must exist before 3.2–3.5 can run, as it captures the payer and member passed to `runExchange()`.
- Stories 3.2 → 3.3 → 3.4 → 3.5 are execution-order dependent: each step receives output from the previous one (system token → FHIR ID → member token → resources).
- Epic 3 depends on Epic 1 (`ConfigModule` fully operational, payers seeded) and Epic 2 (Roster populated so members appear in the member selector).
- Epic 4 (Results & Diagnostics) depends on `ExchangeModule.hasResult()` being true, which this epic is responsible for setting.
