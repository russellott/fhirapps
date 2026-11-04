// Local credential overrides for PatientAccess.
// Copy this file to config.local.js and fill in your actual values.
// config.local.js is gitignored and must never be committed.
window.__localSecrets = {
    corsProxyUrl: 'https://your-cloudflare-worker.workers.dev/',
    deloitte: {
        clientId: 'YOUR_DELOITTE_CLIENT_ID',
        clientSecret: 'YOUR_DELOITTE_CLIENT_SECRET'
    },
    deloitte_demo: {
        clientId: 'YOUR_DELOITTE_DEMO_CLIENT_ID',
        clientSecret: 'YOUR_DELOITTE_DEMO_CLIENT_SECRET'
    },
    cigna: {
        clientId: 'YOUR_CIGNA_CLIENT_ID'
    },
    epic: {
        clientId: 'YOUR_EPIC_CLIENT_ID',
        clientSecret: 'YOUR_EPIC_CLIENT_SECRET'
    }
};
