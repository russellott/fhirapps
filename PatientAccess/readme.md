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



## ⚠️ Security Warning: Client Secrets in Browser Apps

**Important:** This implementation includes client secrets in browser-based JavaScript, which is **NOT recommended for production** use because:

1. Client secrets are visible in page source
2. Anyone can extract them from network traffic
3. They cannot be kept confidential in a browser environment

### Recommended Approaches:

**For Production:**
- Use a **backend proxy** that handles token exchange
- Keep client secrets on the server side
- Use PKCE (Proof Key for Code Exchange) for public clients

**For Testing/Demo:**
- Use public client flow (no client secret)
- Or use confidential client with understanding it's for demo only
- Rotate secrets regularly
- Use separate credentials for development

**Backend Proxy Example:**
```javascript
// Frontend makes request to your backend
fetch('/api/token-exchange', {
    method: 'POST',
    body: JSON.stringify({ code, redirectUri })
});

// Backend handles actual token exchange with secret
// Server-side code (Node.js example):
const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET // Safe on server
    })
});

