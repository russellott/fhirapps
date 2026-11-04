const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const APP_BASE_URL = isLocalhost
  ? `${window.location.protocol}//${window.location.host}/PayerToPayerClient`
  : 'https://russellott.github.io/fhirapps/PayerToPayerClient';
// Secrets loaded from config.local.js (gitignored). Copy config.local.example.js → config.local.js and fill in values.
const _s = window.__localSecrets || {};

// Use the same CORS proxy URL as PatientAccess (cors-proxy-worker.js deployed to Cloudflare Workers)
const CORS_PROXY_URL = isLocalhost ? '' : (_s.corsProxyUrl || '');

const FHIR_SERVERS = {
  healthInteractiveUAT: {
    name: 'HealthInteractive UAT',
    fhirBaseUrl: 'https://fhir.platform.uat.mt.healthinteractive.net/fhir',
    tokenUrl: 'https://auth.platform.uat.mt.healthinteractive.net/auth/realms/payer/protocol/openid-connect/token',
    clientId: 'p2p-new-payer-client',
    clientSecret: _s.healthInteractiveUAT?.clientSecret || null,
    tokenAuthMethod: 'client_secret_post',
    useProxy: !isLocalhost  // localhost can reach token endpoints directly; deployed GitHub Pages needs the CORS proxy
  },
  deloitteConnectathon: {
    name: 'Deloitte Connectathon',
    fhirBaseUrl: 'https://fhir.deloitte.connectathons.com/fhir/r4',
    tokenUrl: 'https://auth.deloitte.connectathons.com/auth/realms/pdex/protocol/openid-connect/token',
    clientId: 'p2p-demo-client',
    clientSecret: _s.deloitteConnectathon?.clientSecret || null,
    tokenAuthMethod: 'client_secret_post',
    useProxy: true
  },
  cignaDevSandbox: {
    name: 'Cigna Developer Sandbox',
    fhirBaseUrl: 'https://fhir.cigna.com/PayerToPayer/v1-devportal',
    tokenUrl: 'https://fhir.cigna.com/PayerToPayer/v1-devportal/oauth2/token',
    clientId: _s.cignaDevSandbox?.clientId || null,
    clientSecret: _s.cignaDevSandbox?.clientSecret || null,
    tokenAuthMethod: 'client_secret_post',
    // Cigna requires an explicit per-resource scope list rather than system/*.read or system/*.rs
    systemScope: 'patient/Patient.read patient/AllergyIntolerance.read patient/CarePlan.read patient/CareTeam.read patient/Condition.read patient/Device.read patient/DiagnosticReport.read patient/DocumentReference.read patient/Encounter.read patient/Goal.read patient/Immunization.read patient/Location.read patient/Medication.read patient/MedicationDispense.read patient/MedicationRequest.read patient/Observation.read patient/Organization.read patient/Practitioner.read patient/PractitionerRole.read patient/Procedure.read patient/Provenance.read',
    useProxy: true
  }
};
