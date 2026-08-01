# PayerToPayerClient — Project Brief

**Project:** Payer-to-Payer FHIR API Demo Client
**Owner:** Russell Ott — Technology Fellow, GPS AI & Engineering, Deloitte
**Repository:** `fhirapps/PayerToPayerClient`
**Status:** Pre-development — BMAD framework initialized, scaffolding not yet started
**Last updated:** 2026-07-30

---

## Table of Contents

1. [Project Purpose](#1-project-purpose)
2. [Regulatory Context — CMS-0057-F](#2-regulatory-context--cms-0057-f)
3. [P2P API Technical Requirements](#3-p2p-api-technical-requirements)
4. [Authentication & Authorization Architecture](#4-authentication--authorization-architecture)
5. [Data Requirements](#5-data-requirements)
6. [Compliance Deadlines & Enforcement](#6-compliance-deadlines--enforcement)
7. [Application Architecture](#7-application-architecture)
8. [Conceptual UI Flows & Wireframes](#8-conceptual-ui-flows--wireframes)
9. [Development Setup](#9-development-setup)
10. [BMAD Workflow Plan](#10-bmad-workflow-plan)
11. [Reference Material](#11-reference-material)

---

## 1. Project Purpose

The **PayerToPayerClient** is a browser-based demo/sandbox tool for exploring and demonstrating the CMS-0057-F Payer-to-Payer (P2P) FHIR API. Its purpose is to:

- Demonstrate the end-to-end P2P member data exchange flow for Deloitte clients, connectathon events, and internal GPS AI & Engineering use
- Exercise the FHIR operations required for CMS compliance (`$member-match`, `$bulk-member-match`, `$davinci-data-export`)
- Serve as a learning and experimentation tool for teams building or evaluating CMS-0057-F implementations
- Complement the two existing sibling demo apps in the `fhirapps` monorepo: `PatientAccess/` (member-facing) and `ProviderDirectory/` (provider-facing)

This is a **demo/sandbox app only** — it intentionally embeds credentials in browser JS (acceptable for demo purposes; explicitly documented as a security trade-off in the sibling apps).

---

## 2. Regulatory Context — CMS-0057-F

### Overview

**Rule:** CMS Interoperability and Prior Authorization Final Rule (CMS-0057-F)
**Finalized:** January 17, 2024
**Effective:** March 25, 2024
**Governing agency:** Centers for Medicare & Medicaid Services (CMS)

### Who Must Comply

| Payer Type | In Scope? |
|---|---|
| Medicare Advantage (MA) organizations | Yes |
| State Medicaid FFS programs | Yes |
| Medicaid managed care plans (MCOs) | Yes |
| CHIP FFS and managed care | Yes |
| Qualified Health Plans (QHPs) on FFEs | Yes |
| Commercial/fully-insured employer plans | No |
| ERISA self-funded plans | No |

### The Four Mandated FHIR APIs

CMS-0057-F requires impacted payers to implement four distinct FHIR R4 APIs:

| API | Audience | Auth Model | Key Operations |
|---|---|---|---|
| **Patient Access API** (expanded) | Members via third-party apps | SMART App Launch (PKCE) | Standard FHIR R4 queries + prior auth data |
| **Provider Access API** | In-network providers / EHRs | SMART Backend Services | Attributed member groups, opt-out model |
| **Payer-to-Payer API** | Other health plans | SMART Backend Services + mTLS | `$member-match`, `$bulk-member-match`, `$davinci-data-export` |
| **Prior Authorization API** | Providers at point of care | CDS Hooks, DTR, PAS | CRD (CDS Hooks), DTR (SMART App Launch), PAS (FHIR REST + X12 278) |

**This application demonstrates the Payer-to-Payer API.**

---

## 3. P2P API Technical Requirements

### FHIR Version

**FHIR R4 (4.0.1) is mandatory.** FHIR R5 is not required and is explicitly deferred to future rulemaking.

### Required Implementation Guides

| IG | Version | Role |
|---|---|---|
| **Da Vinci PDex** (Payer Data Exchange) | v2.1.0 (current STU) / v2.2.0 (CI build) | Core P2P IG — defines $bulk-member-match, $davinci-data-export, and PDex ExplanationOfBenefit profiles |
| **Da Vinci HRex** (Health Record Exchange) | v1.1.0 | Defines $member-match, HRex Coverage/Consent/Patient profiles |
| **US Core** | 6.1.0 (required from Jan 1, 2026 per ONC HTI-1) | Clinical data profiles for USCDI v3 |
| **CARIN IG for Blue Button (C4BB)** | 2.1.0 | Non-financial ExplanationOfBenefit profiles for claims/encounters |
| **Da Vinci PAS** (Prior Authorization Support) | 2.1.0 | PA data exchange profiles carried within P2P |
| **Bulk Data Access IG** | 2.0.0 | Async bulk export pattern |
| **SMART App Launch IG** | 2.0.0 (Backend Services) / STU 2.1 (granular scopes) | OAuth 2.0 authorization |

### Required FHIR Operations

**Single-Member Exchange**

```
POST [base]/Patient/$member-match
```

Input (Parameters resource containing):
- `MemberPatient` — HRex Patient Demographics Profile (name, DOB, gender, address)
- `CoverageToMatch` — HRex Coverage Profile (prior plan: member ID, plan ID)
- `CoverageToLink` *(optional)* — new plan Coverage details
- `Consent` — HRex Consent Profile

Output (success): `Parameters` containing `MemberIdentifier` (business identifier) and optionally `MemberId` (Patient FHIR ID)

Output (failure): HTTP 422 + OperationOutcome — triggered by no demographic match, multiple matches, or consent violation. Only a single unique match is returned; multiple matches are treated as failure.

**Bulk Member Exchange**

```
POST [base]/Group/$bulk-member-match
```

Input: Bundle of per-member Parameters entries (MemberPatient + CoverageToMatch + Consent + optional CoverageToLink)

Output: Up to three Group resources (async NDJSON):
- `PDexMemberMatchGroup` — successfully matched members
- `PDexMemberNoMatchGroup` — no demographic match
- `PDexMemberConsentGroup` — matched but consent violation

Consent failure for one member does NOT fail the batch.

**Data Retrieval**

After member matching, data is retrieved via one of:

1. Individual FHIR queries (`GET Patient/{id}/{ResourceType}?...`)
2. `GET Patient/{id}/$everything` — all in-scope resources; server filters by requester permissions
3. Async bulk export:
   ```
   POST [base]/Group/{id}/$davinci-data-export
   exportType = hl7.fhir.us.davinci-pdex#payertopayer
   ```
   Optional filters: `_since`, `_until`, `_type`, `_typeFilter`
   Returns NDJSON files via async manifest: `HTTP 202 → Content-Location polling → manifest with file URLs`

---

## 4. Authentication & Authorization Architecture

### P2P Auth is NOT PKCE — It Is Server-to-Server

The P2P API uses **SMART Backend Services (client credentials flow)**, not the browser-facing SMART App Launch (PKCE) flow used by the Patient Access API and the sibling `PatientAccess/` app.

### Full Authorization Sequence

```
Requesting Payer (New/Concurrent)               Responding Payer (Prior/Concurrent)
─────────────────────────────────────────────────────────────────────────────────
Step 1: Member opts in, provides prior plan info
Step 2: Discover endpoint via Trust Framework
         (signed mTLS bundle registry — currently GitHub; future: TEFCA)
Step 3: Establish mutual TLS (mTLS)
         Certificates signed by a Trust Manager
Step 4: Dynamic Client Registration (DCRP)
         POST signed JWT → DCRP endpoint → obtain OAuth2 client_id
Step 5: Obtain member-match-scoped access token
         SMART Backend Services (client credentials)
         Scope: http://hl7.org/fhir/us/davinci-hrex/OperationDefinition/member-match
Step 6: POST /Patient/$member-match or /Group/$bulk-member-match
         Input: HRex Patient + Coverage + Consent profiles
         Output: MemberIdentifier (single) or PDex Group resources (bulk)
Step 7: Obtain patient-scoped token for matched member
         Scope: system/<resource>.rs (granular, per SMART App Launch STU 2.1)
Step 8: Retrieve data
         a. Individual FHIR queries (US Core + PDex profiles)
         b. GET Patient/{id}/$everything
         c. POST /Group/{id}/$davinci-data-export (async NDJSON)
```

### Demo App Auth Simplifications

Because this is a browser-based demo app (not a real payer server), the P2P auth flow must be simulated or adapted:

- **mTLS is a server-side requirement** and cannot be implemented in browser JS. The demo will either connect to a test environment that has pre-registered the app's client credentials, or simulate the mTLS layer via a Cloudflare Worker (similar to the CORS proxy pattern in `PatientAccess/`).
- **Client credentials flow** can be executed from the browser by POSTing to the token endpoint with `client_id` + `client_secret`. This is the same `client_secret_post` pattern already used by `PatientAccess/config.js` for Keycloak-backed servers.
- **Dynamic Client Registration** may be skipped for known sandbox environments where client credentials are pre-configured.

### CORS Proxy Applicability

P2P FHIR servers typically do not send `Access-Control-Allow-Origin` headers (they expect server-to-server calls, not browser calls). The Cloudflare Worker CORS proxy pattern from `PatientAccess/cors-proxy-worker.js` will be needed for most servers.

---

## 5. Data Requirements

### Data Classes to Exchange

| Category | Resources | Notes |
|---|---|---|
| **Clinical** | AllergyIntolerance, Condition, Observation, DiagnosticReport, Immunization, Procedure, Goal, CarePlan, CareTeam | USCDI v3 via US Core 6.1.0 |
| **Medication** | MedicationRequest, Medication, MedicationDispense | |
| **Encounter / Care** | Encounter, Device, Location | |
| **Claims** | ExplanationOfBenefit (C4BB non-financial profile) | Non-financial only — no remittances, no cost-sharing amounts |
| **Prior Authorization** | ExplanationOfBenefit (PDex Prior Auth profile) | Active PAs + status changes in prior 12 months |
| **Supporting** | Patient, Practitioner, PractitionerRole, Organization, Coverage, DocumentReference, Provenance | Provenance critical — tracks data origin across payer handoffs |

### What Is Excluded

- Denied drug/pharmacy prior authorizations
- Provider remittances
- Cost-sharing / patient liability amounts
- Plan pricing data

### Temporal Scope

- Minimum **5 years** of historical data from the date of the request
- Plans must have data available back to January 1, 2016 internally, but inter-plan P2P transfers are limited to 5 years

### Member Consent Requirements

The P2P API uses an **opt-in model**:

- Member must actively opt in (no automatic/implied consent)
- Plans must provide plain-language educational materials before or during enrollment
- Consent collection via member portal, mobile app, or customer service
- Member must supply prior payer's name, member ID, and plan details
- Consent must be collected within **one week of coverage start date**
- Member can revoke consent at any time

**Consent timing obligations for the new payer:**
- Must initiate data request to prior payer within **7 days of coverage start** (if opted in)
- For concurrent coverage: exchange must occur at minimum **quarterly**

---

## 6. Compliance Deadlines & Enforcement

### Key Dates

| Date | Requirement |
|---|---|
| **January 1, 2026** *(past)* | PA decision timelines (72 hrs expedited / 7 calendar days standard), specific denial reasons in writing, PA metrics capture begins |
| **March 31, 2026** *(past)* | First public reporting of Patient Access API usage metrics for CY 2025 |
| **January 1, 2027** | All four FHIR APIs in production. For Medicaid/CHIP MCOs: rating period beginning on/after Jan 1, 2027. For QHPs: plan years beginning on/after Jan 1, 2027. |
| **2027 onward** | Medicare Promoting Interoperability program begins measuring electronic prior authorization API usage. |

### Enforcement

- **Primary tool:** Corrective Action Plans (CAPs)
- **Escalation:** Civil Monetary Penalties (CMPs), contract suspension, non-renewal, or termination
- **Medicare Advantage:** CMS uses existing MA contract oversight authority (42 CFR Part 422, 402)
- **Medicaid/CHIP:** State-level enforcement with CMS oversight
- **QHPs:** CMS directly oversees
- **Delegation liability:** Plans remain responsible for delegated entities (TPAs, MSOs, IPAs)

---

## 7. Application Architecture

### Technology Stack

**No build system** — pure HTML/CSS/vanilla JavaScript served statically from GitHub Pages. This follows the identical pattern used by the sibling apps `PatientAccess/` and `ProviderDirectory/`.

### Deployment

GitHub Pages at: `https://russellott.github.io/fhirapps/PayerToPayerClient/`
Push to `main` branch → Pages serves automatically.

### Expected File Layout

```
PayerToPayerClient/
├── index.html              # Server/flow selector — choose environment, initiate consent
├── app.html                # Main exchange UI — member match, data retrieval, results display
├── config.js               # FHIR server configs (P2P endpoints, client credentials, scopes)
├── cors-proxy-worker.js    # Cloudflare Worker for CORS-restricted P2P servers
├── token-handler.js        # OAuth 2.0 client credentials token acquisition
├── docs/
│   └── project-brief.md   # This file
├── _bmad/                  # BMAD framework engine (do not edit manually)
├── _bmad-output/           # Generated planning artifacts (PRD, architecture, stories)
└── .claude/skills/         # 46 BMAD skills for Claude Code
```

### `config.js` Pattern (from sibling apps)

```javascript
const FHIR_SERVERS = {
  serverKey: {
    name: "Display Name",
    clientId: "...",
    clientSecret: "...",          // demo only — not for production
    usePkce: false,               // P2P uses client credentials, not PKCE
    tokenAuthMethod: "client_secret_post",
    scope: "system/*.rs",         // P2P granular system scopes
    tokenUrl: "...",
    fhirBaseUrl: "...",
    useCorsProxy: true,           // P2P servers don't send CORS headers
    description: "...",
  }
};
```

### Key Differences from PatientAccess/

| Aspect | PatientAccess | PayerToPayerClient |
|---|---|---|
| Auth flow | SMART App Launch (authorization code + PKCE) | Client credentials (backend services) |
| Actor | Patient/member via third-party app | Payer acting on behalf of member |
| Consent | Implicit in member authentication | Explicit HRex Consent resource in $member-match |
| Key operation | Read individual patient resources | `$member-match` → `$davinci-data-export` |
| Data scope | Patient-specific clinical + claims | 5-year history, all data classes, Provenance tracking |
| CORS | Some servers need proxy | Almost all P2P servers need proxy (server-to-server expected) |

### Target Test Environments

| Environment | Notes |
|---|---|
| **Acentra Health FHIR Sandbox** (`sandbox.mhbapp.com`) | Supports PDex v2.1.0, $bulk-member-match, $davinci-data-export, error scenario testing |
| **Deloitte connectathon** (`deloitte.connectathons.com`) | Keycloak-backed; already configured in PatientAccess — may support P2P extension |
| **WSO2 Reference Implementation** | Open source; can be run locally; full P2P stack with consent portal |
| **SMART Health IT sandbox** | May support subset of P2P operations; useful for $member-match testing |

---

## 8. Conceptual UI Flows & Wireframes

### Overall App Structure

```
┌─────────────────────────────────────────┐
│  index.html — P2P Exchange Launcher     │
│                                         │
│  [Select Environment]                   │
│  ○ Acentra Health Sandbox               │
│  ○ Deloitte Connectathon                │
│  ○ WSO2 Reference Impl                  │
│  ○ Custom / Manual                      │
│                                         │
│  [Initiate Exchange] →                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  app.html — P2P Exchange Workflow       │
│                                         │
│  Step 1: Member Identity               │
│  Step 2: Prior Coverage Details        │
│  Step 3: Consent Capture               │
│  Step 4: Member Match                  │
│  Step 5: Data Retrieval                │
│  Step 6: Results Display               │
└─────────────────────────────────────────┘
```

### Step-by-Step UI Flow

**Step 1 — Member Identity**
```
┌──────────────────────────────────────┐
│  Member Information                  │
│                                      │
│  First Name: [____________]          │
│  Last Name:  [____________]          │
│  Date of Birth: [MM/DD/YYYY]         │
│  Gender: [Male ▼]                   │
│  Address Line 1: [____________]      │
│  City: [______] State: [__] Zip: [_] │
└──────────────────────────────────────┘
```

**Step 2 — Prior Coverage Details**
```
┌──────────────────────────────────────┐
│  Prior Plan Information              │
│                                      │
│  Prior Payer Name: [____________]    │
│  Member ID (prior plan): [_________] │
│  Subscriber ID: [__________]         │
│  Plan/Group Number: [_______]        │
│  Coverage Start: [MM/DD/YYYY]        │
│  Coverage End:   [MM/DD/YYYY]        │
└──────────────────────────────────────┘
```

**Step 3 — Consent**
```
┌──────────────────────────────────────┐
│  Member Authorization                │
│                                      │
│  □ I authorize [New Payer] to        │
│    request my health records from    │
│    [Prior Payer] including clinical  │
│    data, claims history, and prior   │
│    authorization information for     │
│    the past 5 years.                 │
│                                      │
│  Data Scope: ○ All data             │
│              ○ Non-sensitive only    │
│                                      │
│  Consent Date: [2026-07-30]          │
│  Expiration:   [90 days / end of     │
│                 coverage period]     │
└──────────────────────────────────────┘
```

**Step 4 — Member Match (Live API Call)**
```
┌──────────────────────────────────────┐
│  Member Match                        │
│                                      │
│  Authenticating...     ✓             │
│  POST /Patient/$member-match...  ⟳   │
│                                      │
│  ── Request ──────────────────────   │
│  {                                   │
│    "resourceType": "Parameters",     │
│    "parameter": [                    │
│      { "name": "MemberPatient", ... }│
│      { "name": "CoverageToMatch", …} │
│      { "name": "Consent", ... }      │
│    ]                                 │
│  }                                   │
│                                      │
│  ── Response ──────────────────────  │
│  ✓ Match found                       │
│  Member ID: abc-123-xyz              │
└──────────────────────────────────────┘
```

**Step 5 — Data Retrieval**
```
┌──────────────────────────────────────┐
│  Retrieving Member Data              │
│                                      │
│  Method: ○ Individual queries        │
│           ○ $everything              │
│           ● $davinci-data-export     │
│                                      │
│  Date range: [2021-07-30] to [today] │
│  Resource types: [All ▼]            │
│                                      │
│  Status:                             │
│  POST /Group/{id}/$davinci-data-...  │
│  → HTTP 202 Accepted                 │
│  Polling... [▓▓▓▓▓░░░░░] 52%        │
└──────────────────────────────────────┘
```

**Step 6 — Results**
```
┌──────────────────────────────────────┐
│  Exchange Results                    │
│                                      │
│  ✓ 247 resources retrieved           │
│                                      │
│  Conditions         (14)  [View]     │
│  Medications        (22)  [View]     │
│  Encounters         (31)  [View]     │
│  Observations       (88)  [View]     │
│  ExplanationOf...   (41)  [View]     │
│    └─ Claims        (38)             │
│    └─ Prior Auth    (3)              │
│  Immunizations      (12)  [View]     │
│  Procedures         (18)  [View]     │
│  Provenance         (21)  [View]     │
│                                      │
│  [Download NDJSON] [View Debug Log]  │
└──────────────────────────────────────┘
```

### Debug Panel (matching PatientAccess pattern)
```
┌──────────────────────────────────────┐
│  Debug Console               [Hide]  │
│                                      │
│  [14:23:01] POST /Patient/$member-   │
│    match → 200 OK (342ms)            │
│  [14:23:02] GET /token → 200 OK      │
│  [14:23:04] POST /Group/$davinci-    │
│    data-export → 202 Accepted        │
│  [14:23:06] GET /job/status → 200    │
│    progress: 52%                     │
│  ...                                 │
└──────────────────────────────────────┘
```

---

## 9. Development Setup

### Prerequisites

- Node.js (for running local static server only; no build system)
- A modern browser (Chrome/Edge 90+, Firefox 88+, Safari 14+)
- (Optional) Cloudflare account for deploying the CORS proxy worker

### Running Locally

```sh
# From the PayerToPayerClient directory
npx serve .
# or
python -m http.server 8080
# Then open http://localhost:8080/index.html
```

### Environment Detection

Like the sibling apps, `config.js` uses `window.location.hostname` to detect localhost vs. GitHub Pages and switches URLs accordingly:

```javascript
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const APP_BASE_URL = isLocalhost ? LOCAL_BASE_URL : GITHUB_PAGES_URL;
```

### CORS Proxy Deployment

1. Copy `cors-proxy-worker.js` (from `PatientAccess/`) to `PayerToPayerClient/`
2. Deploy to Cloudflare Workers (free tier sufficient)
3. Update `config.js` with the worker URL
4. Set `useCorsProxy: true` for servers that require it

### Adding a P2P Server

In `config.js`, add an entry to `FHIR_SERVERS`:

```javascript
acentra: {
  name: "Acentra Health FHIR Sandbox",
  clientId: "YOUR_CLIENT_ID",
  clientSecret: "YOUR_CLIENT_SECRET",
  usePkce: false,
  tokenAuthMethod: "client_secret_post",
  scope: "system/*.rs http://hl7.org/fhir/us/davinci-hrex/OperationDefinition/member-match",
  tokenUrl: "https://sandbox.mhbapp.com/auth/token",
  fhirBaseUrl: "https://sandbox.mhbapp.com/fhir/r4",
  useCorsProxy: true,
  description: "Acentra Health P2P sandbox — PDex v2.1.0",
}
```

---

## 10. BMAD Workflow Plan

BMAD v6.10.0 is installed with the `bmm` module and `claude-code` tool integration. **46 skills** are available in `.claude/skills/`.

### Recommended Sequence

**Use a fresh chat for each phase.**

| Phase | Skill | Output | Agent |
|---|---|---|---|
| **0. Context** | `/bmad-generate-project-context` | `docs/project-context.md` | Auto |
| **1. Research** | `/bmad-domain-research` | Research report on PDex/HRex specifics for this implementation | Mary (Analyst) |
| **2. PRD** | `/bmad-create-prd` | `_bmad-output/planning-artifacts/prd.md` | John (PM) |
| **3. UX** | `/bmad-ux` | `_bmad-output/planning-artifacts/DESIGN.md` | Sally (UX) |
| **4. Architecture** | `/bmad-create-architecture` | `_bmad-output/planning-artifacts/ARCHITECTURE-SPINE.md` | Winston (Architect) |
| **5. Readiness** | `/bmad-check-implementation-readiness` | Go/no-go gate report | Winston |
| **6. Stories** | `/bmad-create-epics-and-stories` | Epic and story files | John |
| **7. Implement** | `/bmad-dev-story` | Code (per story) | Amelia (Dev) |
| **8. Review** | `/bmad-code-review` | Review findings | Amelia |

### Quick Path (for small, well-understood features)

```
/bmad-quick-dev
```
Compresses the full cycle: clarify → spec → implement → review in one session.

### Key Compliance-Specific Stories to Plan

The following features are regulatory requirements, not optional features:

1. **Consent capture UI** — member opt-in with scope selection (all data vs. non-sensitive)
2. **`$member-match` operation** — single-member HRex compliant request/response
3. **`$bulk-member-match`** — batch matching with three output groups
4. **`$davinci-data-export`** — async bulk export with polling
5. **Provenance display** — show data origin chain across payer handoffs
6. **Error handling** — 422 OperationOutcome cases (no match, multiple matches, consent violation)
7. **Data scope filtering** — `_since`, `_until`, `_type` filter UI
8. **Debug/audit log** — all API calls logged for demonstration and learning purposes

---

## 11. Reference Material

### Regulatory

- [CMS-0057-F Fact Sheet](https://www.cms.gov/newsroom/fact-sheets/cms-interoperability-prior-authorization-final-rule-cms-0057-f)
- [Payer-to-Payer API FAQ — CMS](https://www.cms.gov/priorities/burden-reduction/overview/interoperability/frequently-asked-questions/payer-payer-api)
- [CMS APIs and Standards Reference](https://www.cms.gov/priorities/burden-reduction/overview/interoperability/implementation-guides-standards/application-programming-interfaces-apis-relevant-standards-implementation-guides-igs)

### Implementation Guides

- [Da Vinci PDex v2.1.0 (current STU)](https://hl7.org/fhir/us/davinci-pdex/)
- [Da Vinci PDex v2.2.0 (CI build — latest)](https://build.fhir.org/ig/HL7/davinci-epdx/introduction.html)
- [P2P Single Member Exchange — PDex v2.2.0](https://build.fhir.org/ig/HL7/davinci-epdx/payertopayerexchange.html)
- [P2P Bulk Exchange — PDex v2.2.0](https://build.fhir.org/ig/HL7/davinci-epdx/payertopayerbulkexchange.html)
- [HRex $member-match — Da Vinci HRex v1.1.0](http://hl7.org/fhir/us/davinci-hrex/OperationDefinition-member-match.html)
- [US Core 6.1.0](https://www.hl7.org/fhir/us/core/STU6.1/)
- [CARIN BB (C4BB) 2.1.0](http://hl7.org/fhir/us/carin-bb/)
- [SMART Backend Services](https://hl7.org/fhir/uv/bulkdata/authorization/)
- [Bulk Data Access IG 2.0.0](https://hl7.org/fhir/uv/bulkdata/)

### Test Environments

- [Acentra Health FHIR Sandbox](https://sandbox.mhbapp.com/index.html)
- [WSO2 Reference Implementation — GitHub](https://github.com/wso2/reference-implementation-cms0057f)
- [SMART Health IT Sandbox](https://launch.smarthealthit.org)

### Sibling Apps (code patterns)

- `../PatientAccess/config.js` — FHIR server config pattern, CORS proxy config, environment detection
- `../PatientAccess/token-handler.js` — OAuth 2.0 token acquisition implementation
- `../PatientAccess/cors-proxy-worker.js` — Cloudflare Worker CORS proxy
- `../PatientAccess/app.html` — FHIR query + results display patterns
- `../ProviderDirectory/config.js` — Simpler (unauthenticated) FHIR server config example

### BMAD Framework

- [BMAD Method GitHub](https://github.com/bmad-code-org/BMAD-METHOD/)
- [BMAD Docs](https://bmadcode.com/)
- Local skills: `.claude/skills/` (46 skills installed)
- Engine config: `_bmad/config.toml`
- Output artifacts: `_bmad-output/planning-artifacts/` and `_bmad-output/implementation-artifacts/`
