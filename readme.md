# FHIR Apps

A collection of browser-based FHIR and SMART on FHIR demonstration applications.

## Applications

- **Provider Directory** - Browse practitioners, organizations, locations, healthcare services, and practitioner roles from public FHIR R4 directory endpoints. Open [ProviderDirectory/index.html](ProviderDirectory/index.html).
- **SMART Patient Access** - Demonstrate SMART on FHIR authorization and patient-access data retrieval, including demographics, conditions, medications, and claims. Open [PatientAccess/standalone-launch.html](PatientAccess/standalone-launch.html).
- **Payer-to-Payer Exchange Tester** - Test CMS-0057-F payer-to-payer data exchange using the Da Vinci PDex `$member-match` flow. Open [PayerToPayerClient/app.html](PayerToPayerClient/app.html).

The top-level [index.html](index.html) provides a launcher for all applications.

## Running Locally

These applications are static browser apps. Open `index.html` in a modern browser, or serve this folder with a local web server if browser security restrictions prevent requests to configured FHIR endpoints.

For example:

```text
python -m http.server 8000
```

Then visit `http://localhost:8000/`.

## Notes

- The applications use FHIR R4 and SMART on FHIR standards where applicable.
- Configured endpoints are intended for demonstrations, testing, or sandbox use.
- Do not use these demos with real protected health information.
- Browser applications cannot securely protect confidential client secrets. Production deployments should use appropriate backend protections and public-client flows such as PKCE where supported.

See each application's local README or configuration files for endpoint-specific details.
