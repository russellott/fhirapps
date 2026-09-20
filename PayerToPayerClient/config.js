const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const APP_BASE_URL = isLocalhost
  ? `${window.location.protocol}//${window.location.host}/PayerToPayerClient`
  : 'https://russellott.github.io/fhirapps/PayerToPayerClient';
// Use the same CORS proxy URL as PatientAccess (cors-proxy-worker.js deployed to Cloudflare Workers)
const CORS_PROXY_URL = isLocalhost ? '' : 'https://autumn-leaf-a71d.russellott.workers.dev/';

const FHIR_SERVERS = {
  healthInteractiveUAT: {
    name: 'HealthInteractive UAT',
    fhirBaseUrl: 'https://fhir.platform.uat.mt.healthinteractive.net/fhir',
    tokenUrl: 'https://auth.platform.uat.mt.healthinteractive.net/auth/realms/payer/protocol/openid-connect/token',
    clientId: 'p2p-new-payer-client',
    clientSecret: 'demo-secret-change-me',
    tokenAuthMethod: 'client_secret_post',
    useProxy: !isLocalhost  // localhost can reach token endpoints directly; deployed GitHub Pages needs the CORS proxy
  },
  deloitteConnectathon: {
    name: 'Deloitte Connectathon',
    fhirBaseUrl: 'https://fhir.deloitte.connectathons.com/fhir/r4',
    tokenUrl: 'https://auth.deloitte.connectathons.com/auth/realms/pdex/protocol/openid-connect/token',
    clientId: 'p2p-demo-client',
    clientSecret: 'demo-secret-change-me',
    tokenAuthMethod: 'client_secret_post',
    useProxy: true
  },
  cignaDevSandbox: {
    name: 'Cigna Developer Sandbox',
    fhirBaseUrl: 'https://fhir.cigna.com/PayerToPayer/v1-devportal',
    tokenUrl: 'https://fhir.cigna.com/PayerToPayer/v1-devportal/oauth2/token',
    clientId: '9ffe6e94-9a21-473d-8e7b-759b4c431b13',
    clientSecret: '706170b4-3f2f-464f-8acd-6b1eeb84aa7c',
    tokenAuthMethod: 'client_secret_post',
    // Cigna requires an explicit per-resource scope list rather than system/*.read or system/*.rs
    systemScope: 'patient/Patient.read patient/AllergyIntolerance.read patient/CarePlan.read patient/CareTeam.read patient/Condition.read patient/Device.read patient/DiagnosticReport.read patient/DocumentReference.read patient/Encounter.read patient/Goal.read patient/Immunization.read patient/Location.read patient/Medication.read patient/MedicationDispense.read patient/MedicationRequest.read patient/Observation.read patient/Organization.read patient/Practitioner.read patient/PractitionerRole.read patient/Procedure.read patient/Provenance.read',
    useProxy: true
  }
};
// Client secrets above are intentionally visible — demo/testing use only
