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
  }
};
// Client secrets above are intentionally visible — demo/testing use only
