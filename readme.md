# SMART on FHIR Patient Access Demo

Live Demo: https://russellott.github.io/demosmartapp/

## About

This application demonstrates the CMS Interoperability and Patient Access final rule requirements using SMART on FHIR standards.

## Features

- ✅ SMART on FHIR OAuth 2.0 authorization
- ✅ FHIR R4 API integration
- ✅ Patient demographics, conditions, medications
- ✅ ExplanationOfBenefit (claims data)
- ✅ Real payer FHIR server support

## Configuration

To connect to a FHIR server:

1. Register your app with the FHIR server provider
2. Update `config.js` with your Client ID
3. Set the redirect URI to: `https://russellott.github.io/demosmartapp/app.html`

## Supported Servers

- SMART Health IT Sandbox
- Cigna Developer API
- Anthem FHIR API
- Logica Health Sandbox

## Demo Purpose Only

This application uses test data and is for demonstration purposes. No real PHI is accessed.

## Technologies

- SMART on FHIR
- HL7 FHIR R4
- OAuth 2.0
- Vanilla JavaScript
