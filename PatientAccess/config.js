// Configuration for GitHub Pages Deployment
// IMPORTANT: No trailing slashes on base URLs

// --- Dynamic Environment Detection ---
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const LOCAL_BASE_URL = `http://${window.location.hostname}:${window.location.port || 80}/fhirapps/PatientAccess`;
const LOCAL_ORIGIN = `http://${window.location.hostname}:${window.location.port || 80}`;
const GITHUB_PAGES_URL = "https://russellott.github.io/fhirapps/PatientAccess";
const GITHUB_ORIGIN = "https://russellott.github.io";

const APP_BASE_URL = isLocalhost ? LOCAL_BASE_URL : GITHUB_PAGES_URL;
const APP_ORIGIN = isLocalhost ? LOCAL_ORIGIN : GITHUB_ORIGIN;

// CORS Proxy — Deploy the included cors-proxy-worker.js to Cloudflare Workers
// and paste your worker URL here.  Leave blank to disable proxy fallback.
const CORS_PROXY_URL = isLocalhost ? "" : "https://autumn-leaf-a71d.russellott.workers.dev/";

const FHIR_SERVERS = {

    // MT Medicaid UAT Environment (HealthInteractive / Keycloak)
    deloitte: {
        name: "MT Medicaid Sandbox Environment",
        clientId: "pXvr4dePyqNheYuc",
        clientSecret: "Al4Kp0m2QCH1Y6D8mrMZXetIvSbit0ly",
        usePkce: false,
        tokenAuthMethod: "client_secret_post",
        tokenReferrerPolicy: "no-referrer",
        allowBasicAuthFallback: false,
        scope: "patient/*.read",
        // CRITICAL: These must EXACTLY match what's registered with the FHIR server
        redirectUri: `${APP_BASE_URL}/app.html`,
        launchUri: `${APP_BASE_URL}/launch.html`,
        // Keycloak realm ISS (used for OAuth authorize / token endpoints)
        iss: "https://auth.platform.sbx.mt.healthinteractive.net/realms/authsbx",
        authorizeUrl: "https://auth.platform.sbx.mt.healthinteractive.net/realms/authsbx/protocol/openid-connect/auth",
        tokenUrl: "https://auth.platform.sbx.mt.healthinteractive.net/realms/authsbx/protocol/openid-connect/token",
        // FHIR base URL — the actual data endpoint (different from the Keycloak ISS)
        fhirBaseUrl: "https://api.platform.sbx.mt.healthinteractive.net/patient-access/",
        // Enable OIDC auto-discovery as fallback (will fetch .well-known/openid-configuration)
        useOidcDiscovery: true,
        // Route token exchange through CORS proxy (server does not send Access-Control-Allow-Origin)
        useCorsProxy: true,
        description: "MT Medicaid sandbox server with sample patients (R4)",
        requiresStateNonce: true,
        useNumericStateNonce: true,
        expectedOrigin: APP_ORIGIN
    },

    // Deloitte HealthInteractive Connectathon Demo Server
    deloitte_demo: {
        name: "Deloitte HealthInteractive Server",
        clientId: "sharedClient2",
        clientSecret: "CJoSQwBfBmweH8WzEqpEGa10HkCEIOr6",
        usePkce: false,
        tokenAuthMethod: "client_secret_post",
        tokenReferrerPolicy: "no-referrer",
        allowBasicAuthFallback: false,
        scope: "patient/Patient.read patient/Condition.read patient/AllergyIntolerance.read patient/MedicationRequest.read patient/ExplanationOfBenefit.read",
        // CRITICAL: These must EXACTLY match what's registered with the FHIR server
        redirectUri: `${APP_BASE_URL}/app.html`,
        launchUri: `${APP_BASE_URL}/launch.html`,
        iss: "https://deloitte.connectathons.com/realms/demo",
        authorizeUrl: "https://deloitte.connectathons.com/realms/demo/protocol/openid-connect/auth",
        tokenUrl: "https://deloitte.connectathons.com/realms/demo/protocol/openid-connect/token",
        fhirBaseUrl: "https://deloitte.connectathons.com",
        useOidcDiscovery: true,
        useCorsProxy: !isLocalhost,
        description: "Deloitte connectathon sandbox server with sample patients (R4)",
        requiresStateNonce: true,
        useNumericStateNonce: true,
        expectedOrigin: APP_ORIGIN
    },

    // SMART Health IT Sandbox - Public Testing Sandbox (No Registration Required)
    sandbox: {
        name: "SMART Health IT Sandbox",
        clientId: "demo_app_whatever",
        clientSecret: null,
        usePkce: true,
        scope: "launch/patient patient/*.read openid fhirUser offline_access",
        redirectUri: `${APP_BASE_URL}/app.html`,
        launchUri: `${APP_BASE_URL}/launch.html`,
        iss: "https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMSwiIl0/fhir",
        authorizeUrl: "https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMSwiIl0/auth/authorize",
        tokenUrl: "https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMSwiIl0/auth/token",
        description: "Public testing sandbox with sample patients (R4, AUTO simulation)",
        isPublic: true,
        expectedOrigin: APP_ORIGIN
    },

    // Cigna FHIR Server
    cigna: {
        name: "Cigna Developer API",
        clientId: "5f965408-7972-4813-b25a-288d7169031c",
        clientSecret: null,
        usePkce: true,
        tokenAuthMethod: "client_secret_post",
        tokenReferrerPolicy: "no-referrer",
        allowBasicAuthFallback: false,
        scope: "patient/*.read launch/patient openid fhirUser offline_access",
        redirectUri: `${APP_BASE_URL}/app.html`,
        launchUri: `${APP_BASE_URL}/launch.html`,
        iss: "https://fhir.cigna.com/PatientAccess/v1-devportal",
        authorizeUrl: "https://r-hi2.cigna.com/mga/sps/oauth/oauth20/authorize",
        tokenUrl: "https://r-hi2.cigna.com/mga/sps/oauth/oauth20/token",
        description: "Real payer FHIR API for CMS Patient Access",
        requiresStateNonce: true,
        useNumericStateNonce: true,
        expectedOrigin: APP_ORIGIN
    },

    // Epic Sandbox FHIR Server
    epic: {
        name: "Epic Sandbox FHIR API",
        clientId: "ada7f357-1f77-4b67-ba77-ea676f089243",
        clientSecret: "hrKQtSvnsvCfMzv8WBlQA1rULhF5X4Tq5wxyUMfMUrOYQtdxKsIEqF0LVZI7tVZRuvBTKSkPBpHnMCDyMUsc5g==",
        usePkce: true,
        tokenAuthMethod: "client_secret_post",
        scope: "patient/*.read launch/patient openid fhirUser offline_access",
        redirectUri: `${APP_BASE_URL}/app.html`,
        launchUri: `${APP_BASE_URL}/launch.html`,
        iss: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
        authorizeUrl: "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize",
        tokenUrl: "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
        description: "Epic's CMS-compliant Patient Access API",
        requiresStateNonce: true,
        useNumericStateNonce: true,
        expectedOrigin: APP_ORIGIN
    },

    // Logica Health Sandbox
    logica: {
        name: "Logica Health Sandbox",
        clientId: "demo_app_logica",
        clientSecret: null,
        usePkce: true,
        scope: "launch/patient patient/*.read openid fhirUser offline_access",
        redirectUri: `${APP_BASE_URL}/app.html`,
        launchUri: `${APP_BASE_URL}/launch.html`,
        iss: "https://api.logicahealth.org/FHIRResearchSandbox/open/",
        description: "Advanced testing sandbox with rich test data",
        isPublic: true,
        expectedOrigin: APP_ORIGIN
    }
};

// Set which server to use by default
const ACTIVE_SERVER = 'sandbox'; // Use SMART sandbox for easiest local testing

// Helper function to generate numeric state/nonce
function generateNumericToken(length = 10) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10);
    }
    return result;
}

// Helper function to get current configuration
function getCurrentConfig() {
    return FHIR_SERVERS[ACTIVE_SERVER];
}

// Helper to check if server is configured
function isServerConfigured(serverKey) {
    const server = FHIR_SERVERS[serverKey];
    if (!server || !server.clientId) return false;
    if (server.isPublic) {
        return true;
    }
    const placeholders = [
        'YOUR_CLIENT_ID',
        'YOUR_' + serverKey.toUpperCase() + '_CLIENT_ID',
        'YOUR_SANDBOX_CLIENT_ID',
        'YOUR_ANTHEM_CLIENT_ID',
        'YOUR_LOGICA_CLIENT_ID'
    ];
    return !placeholders.some(p => server.clientId.includes(p));
}

// Log configuration on load
console.log('=== App Configuration ===');
console.log('App Base URL:', APP_BASE_URL);
console.log('Expected Origin:', APP_ORIGIN);
console.log('Active Server:', ACTIVE_SERVER);
console.log('Server Config:', {
    ...FHIR_SERVERS[ACTIVE_SERVER],
    clientSecret: FHIR_SERVERS[ACTIVE_SERVER]?.clientSecret ? '***HIDDEN***' : 'not provided'
});
